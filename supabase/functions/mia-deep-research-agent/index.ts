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

    // Step 1: Decompose the question
    await updateProgress("A decompor a pergunta em tópicos...");
    console.log('Step 1: Decomposing question');

    const decomposeResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: 'Você é um especialista em decomposição de perguntas académicas. Analise a pergunta e divida-a em 3-5 sub-perguntas específicas que devem ser pesquisadas. Retorne apenas as perguntas, uma por linha, numeradas.'
          },
          {
            role: 'user',
            content: query
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!decomposeResponse.ok) {
      throw new Error('Failed to decompose question');
    }

    const decomposeData = await decomposeResponse.json();
    const subQuestions = decomposeData.choices?.[0]?.message?.content?.split('\n').filter((q: string) => q.trim());
    console.log('Sub-questions:', subQuestions);

    // Step 2: Research each sub-question using Gemini grounding
    await updateProgress("A pesquisar fontes académicas...");
    console.log('Step 2: Researching sub-questions');

    const researchResults: string[] = [];

    for (const subQuestion of subQuestions) {
      console.log('Researching:', subQuestion);
      
      const researchResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-pro',
          messages: [
            {
              role: 'system',
              content: 'Você é um investigador académico. Pesquise a pergunta usando fontes reais e forneça um resumo com as URLs das fontes citadas.'
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
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      if (researchResponse.ok) {
        const researchData = await researchResponse.json();
        const result = researchData.choices?.[0]?.message?.content;
        if (result) {
          researchResults.push(`\n### ${subQuestion}\n\n${result}\n`);
        }
      }
    }

    // Step 3: Synthesize into final report
    await updateProgress("A sintetizar informação...");
    console.log('Step 3: Synthesizing report');

    const synthesisPrompt = `Você é um assistente de IA especialista em pesquisa e redação académica para o campo da engenharia.

**CONTEXTO FORNECIDO:**
${researchResults.join('\n---\n')}

**TAREFA:**
Com base **exclusivamente** nas informações fornecidas acima, escreva um documento explicativo detalhado e coeso sobre: "${query}"

**ESTRUTURA OBRIGATÓRIA:**
1. **Introdução** (1-2 parágrafos): Contextualização do tópico
2. **Desenvolvimento** (3-8 parágrafos): Explicação detalhada com subtópicos
3. **Aplicações Práticas** (2-3 parágrafos): Exemplos no contexto brasileiro quando relevante
4. **Conclusão** (1-2 parágrafos): Síntese dos pontos principais
5. **Referências Bibliográficas**: Liste todas as fontes citadas

**REGRAS CRÍTICAS:**
- **CITE A FONTE** após cada parágrafo ou afirmação factual (ex: [Fonte: Nome/Link])
- **NÃO INVENTE INFORMAÇÕES** que não estejam no contexto fornecido
- Se a informação for insuficiente, declare isso explicitamente
- Use linguagem técnica mas clara
- Mantenha fidelidade absoluta às fontes fornecidas
- O documento deve ter entre 3-10 páginas (estimado: 1500-5000 palavras)`;

    console.log('Generating final synthesis...');

    await updateProgress("A gerar relatório final...");
    console.log('Step 4: Generating final report');

    const reportResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: synthesisPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 16000,
      }),
    });

    if (!reportResponse.ok) {
      throw new Error('Failed to generate report');
    }

    const reportData = await reportResponse.json();
    const finalReport = reportData.choices?.[0]?.message?.content;

    if (!finalReport) {
      throw new Error('No report generated');
    }

    // Update session as completed with report
    await updateProgress("Concluído");
    const { error: updateError } = await supabaseAdmin
      .from('deep_search_sessions')
      .update({
        status: 'completed',
        result: finalReport,
        progress_step: 'Concluído'
      })
      .eq('id', deepSearchSessionId);

    if (updateError) {
      console.error('Error updating session:', updateError);
      throw new Error('Failed to save report');
    }

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
