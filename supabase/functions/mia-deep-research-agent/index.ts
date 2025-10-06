import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, deepSearchSessionId } = await req.json();
    console.log('Deep research request:', { query, deepSearchSessionId });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Helper to update progress
    const updateProgress = async (step: string) => {
      if (!deepSearchSessionId) return;
      try {
        await supabaseAdmin
          .from('deep_search_sessions')
          .update({ progress_step: step })
          .eq('id', deepSearchSessionId);
        console.log('Progress:', step);
      } catch (error) {
        console.error('Error updating progress:', error);
      }
    };

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Step 1: Decompose the question with Gemini 2.5 Pro
    await updateProgress("A decompor a pergunta em tópicos...");
    console.log('Step 1: Decomposing question with Gemini 2.5 Pro');

    const decomposeResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          {
            role: 'user',
            content: `Você é um assistente de IA especialista em engenharia.

**TÓPICO DO ALUNO:** "${query}"

**TAREFA:** Decomponha o tópico em até 15 perguntas-chave que explorem as suas aplicações práticas na engenharia.

**REGRAS:**
- Gere entre 8 a 15 sub-perguntas focadas nos aspectos mais relevantes
- Cada sub-pergunta deve explorar aplicações práticas, conceitos fundamentais ou implicações na engenharia
- Priorize perguntas que levem a informação técnica detalhada e academicamente relevante
- Retorne apenas as perguntas, uma por linha, numeradas (ex: "1. ...", "2. ...", etc.)`
          }
        ],
        temperature: 0.7,
        max_tokens: 1200,
      }),
    });

    if (!decomposeResponse.ok) {
      throw new Error('Failed to decompose question');
    }

    const decomposeData = await decomposeResponse.json();
    const subQuestions = decomposeData.choices?.[0]?.message?.content?.split('\n').filter((q: string) => q.trim());
    console.log(`Generated ${subQuestions?.length || 0} sub-questions`);

    // Step 2: Execute searches using Google Search grounding
    await updateProgress("A executar buscas na web...");
    console.log('Step 2: Executing web searches');

    interface ResearchResult {
      question: string;
      content: string;
      sources: string[];
    }

    const researchResults: ResearchResult[] = [];

    for (const subQuestion of subQuestions) {
      console.log('Researching:', subQuestion);
      
      try {
        const researchResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: `Você é um investigador académico especializado em engenharia.

**TAREFA:** Pesquise informação académica e técnica sobre a pergunta usando fontes reais da web.

**REGRAS CRÍTICAS:**
- Use APENAS informação de fontes reais encontradas na pesquisa
- Cite SEMPRE a URL completa de cada fonte no formato [Fonte: URL]
- Seja conciso mas completo, foque nos pontos essenciais
- Inclua dados técnicos e definições quando disponíveis
- NÃO invente informações ou referências`
              },
              {
                role: 'user',
                content: subQuestion
              }
            ],
            tools: [
              {
                googleSearchRetrieval: {
                  dynamicRetrievalConfig: {
                    mode: "MODE_DYNAMIC",
                    dynamicThreshold: 0.7
                  }
                }
              }
            ],
            temperature: 0.5,
            max_tokens: 1500,
          }),
        });

        if (researchResponse.ok) {
          const researchData = await researchResponse.json();
          const result = researchData.choices?.[0]?.message?.content;
          if (result) {
            // Extract URLs from citations
            const urlMatches = result.match(/https?:\/\/[^\s\]]+/g) || [];
            researchResults.push({
              question: subQuestion,
              content: result,
              sources: urlMatches
            });
            console.log(`✓ Completed research for question ${researchResults.length}/${subQuestions.length}`);
          }
        } else {
          console.warn(`Failed to research: ${subQuestion}`);
        }
      } catch (error) {
        console.error(`Error researching question:`, error);
        // Continue with next question instead of failing completely
      }

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`Completed ${researchResults.length} research results`);

    // Step 3 & 4: Generate final report with OpenAI GPT-5
    await updateProgress("A sintetizar conteúdo...");
    await updateProgress("A gerar relatório final...");
    console.log('Step 3: Generating final report with OpenAI GPT-5');

    // Compile all research results into a structured format
    const compiledResearch = researchResults
      .map((result, idx) => {
        return `--- EXTRATO ${idx + 1} ---
PERGUNTA: ${result.question}
CONTEÚDO SINTETIZADO:
${result.content}

FONTES CONSULTADAS:
${result.sources.map((s, i) => `[${idx * 10 + i + 1}] ${s}`).join('\n')}
`;
      })
      .join('\n\n');

    const masterPrompt = `Você é um redator técnico especialista em engenharia, encarregado de compilar um relatório académico detalhado.

**CONTEXTO:**
Você recebeu um conjunto de extratos de pesquisa, cada um associado a uma URL de origem. A sua única fonte de verdade é este material.

**TAREFA:**
Com base exclusivamente nas informações fornecidas, escreva um documento explicativo detalhado, com 3 a 10 páginas, sobre o tópico "${query}". Estruture o documento de forma lógica com:

1. **Introdução:** Apresente o tópico e a sua relevância na engenharia.

2. **Desenvolvimento:** Organize os conceitos em secções lógicas com subtítulos. Use ## para secções principais e ### para subsecções.

3. **Aplicações Práticas:** Explore aplicações do tópico na engenharia com exemplos concretos.

4. **Conclusão:** Sintetize os pontos principais.

5. **Referências Bibliográficas:** No final do documento, crie uma secção com este título e liste todas as fontes numeradas.

**REGRAS DE CITAÇÃO (OBRIGATÓRIAS):**
- Para cada citação ou informação usada, insira um número de referência entre parêntesis retos no texto (ex: [1], [2], [3]).
- Pode usar múltiplas referências no mesmo parágrafo (ex: [1][2]).
- Na secção "Referências Bibliográficas", liste cada fonte com o seu número e URL completo.
- Formato: [1] https://exemplo.com/artigo

**RESTRIÇÃO CRÍTICA:**
NÃO INVENTE INFORMAÇÕES OU REFERÊNCIAS. A sua principal diretriz é a fidelidade absoluta às fontes fornecidas. Se a informação for insuficiente, declare isso explicitamente.

**FORMATAÇÃO:**
- Use markdown para estruturar o documento
- Use # para o título principal
- Use ## para secções
- Use ### para subsecções
- Mantenha tom formal e académico

---

**MATERIAL DE PESQUISA FORNECIDO:**

${compiledResearch}

---

Agora, escreva o relatório final seguindo todas as diretrizes acima.`;

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const reportResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5',
        messages: [
          {
            role: 'user',
            content: masterPrompt
          }
        ],
        max_completion_tokens: 16000,
      }),
    });

    if (!reportResponse.ok) {
      const errorText = await reportResponse.text();
      console.error('Report generation failed:', errorText);
      throw new Error('Failed to generate report');
    }

    const reportData = await reportResponse.json();
    const finalReport = reportData.choices?.[0]?.message?.content;

    if (!finalReport) {
      throw new Error('No report generated');
    }

    console.log('Report generated successfully, length:', finalReport.length);

    // Update session as completed with report
    await updateProgress("Concluído");
    console.log('Updating session with completed status...');
    
    const { data: updateData, error: updateError } = await supabaseAdmin
      .from('deep_search_sessions')
      .update({
        status: 'completed',
        result: finalReport,
        progress_step: 'Concluído',
        updated_at: new Date().toISOString()
      })
      .eq('id', deepSearchSessionId)
      .select();

    if (updateError) {
      console.error('Error updating session:', updateError);
      throw new Error(`Failed to save report: ${updateError.message}`);
    }

    console.log('Session updated successfully:', updateData);
    console.log('Deep research completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        report: finalReport,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in deep research agent:', error);
    
    // Try to update session with error
    try {
      const { deepSearchSessionId } = await req.json();
      if (deepSearchSessionId) {
        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        
        await supabaseAdmin
          .from('deep_search_sessions')
          .update({
            status: 'error',
            progress_step: 'Erro na pesquisa. Por favor tente novamente.'
          })
          .eq('id', deepSearchSessionId);
      }
    } catch (updateError) {
      console.error('Failed to update error status:', updateError);
    }
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
