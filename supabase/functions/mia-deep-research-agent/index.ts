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
            content: `Você é um especialista em decomposição de perguntas académicas para o campo da engenharia. 

**TAREFA:** Analise a pergunta do utilizador e divida-a em sub-perguntas específicas e lógicas que devem ser pesquisadas para responder à pergunta original de forma completa.

**REGRAS:**
- Gere entre 8 a 15 sub-perguntas, dependendo da complexidade do tópico
- Cada sub-pergunta deve ser específica e focada
- As perguntas devem cobrir definições, aplicações, limitações e contexto histórico quando relevante
- Retorne apenas as perguntas, uma por linha, numeradas (ex: "1. ...", "2. ...", etc.)`
          },
          {
            role: 'user',
            content: query
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!decomposeResponse.ok) {
      throw new Error('Failed to decompose question');
    }

    const decomposeData = await decomposeResponse.json();
    const subQuestions = decomposeData.choices?.[0]?.message?.content?.split('\n').filter((q: string) => q.trim());
    console.log('Sub-questions:', subQuestions);

    // Step 2: Generate search queries for each sub-question
    await updateProgress("A gerar consultas de pesquisa...");
    console.log('Step 2: Generating search queries');

    const searchQueries: Array<{ subQuestion: string; queries: string[] }> = [];

    for (const subQuestion of subQuestions) {
      const queryResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
              content: 'Gere 2-3 consultas de busca otimizadas para encontrar informação académica sobre a pergunta. Retorne apenas as consultas, uma por linha.'
            },
            {
              role: 'user',
              content: subQuestion
            }
          ],
          temperature: 0.7,
          max_tokens: 200,
        }),
      });

      if (queryResponse.ok) {
        const queryData = await queryResponse.json();
        const queries = queryData.choices?.[0]?.message?.content?.split('\n').filter((q: string) => q.trim());
        searchQueries.push({ subQuestion, queries });
      }
    }

    // Step 3: Execute searches using Google Search grounding
    await updateProgress("A executar buscas na web...");
    console.log('Step 3: Executing web searches');

    const researchResults: string[] = [];

    for (const { subQuestion, queries } of searchQueries) {
      console.log('Researching:', subQuestion);
      
      // Use the most relevant query for searching
      const mainQuery = queries[0];
      
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
              content: `Você é um investigador académico especializado em engenharia.

**TAREFA:** Pesquise informação académica e técnica sobre a pergunta usando fontes reais da web.

**REGRAS CRÍTICAS:**
- Use APENAS informação de fontes reais encontradas na pesquisa
- Cite SEMPRE a URL completa de cada fonte no formato [Fonte: URL]
- Organize a informação de forma clara e estruturada
- Inclua dados técnicos, definições e aplicações práticas quando disponíveis
- NÃO invente informações ou referências`
            },
            {
              role: 'user',
              content: `Pergunta: ${subQuestion}\n\nConsulta de busca: ${mainQuery}`
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
          max_tokens: 3000,
        }),
      });

      if (researchResponse.ok) {
        const researchData = await researchResponse.json();
        const result = researchData.choices?.[0]?.message?.content;
        if (result) {
          researchResults.push(`\n### ${subQuestion}\n\n${result}\n`);
        }
      }

      // Add small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Step 4: Extract and synthesize content
    await updateProgress("A extrair e sintetizar conteúdo...");
    console.log('Step 4: Extracting and synthesizing content');

    // Step 5: Generate final report with Master Prompt
    await updateProgress("A gerar relatório final...");
    console.log('Step 5: Generating final report with Master Prompt');

    const synthesisPrompt = `**PERSONA:**
Você é um assistente de IA especialista em pesquisa e redação académica para o campo da engenharia. A sua função é compilar um relatório detalhado, coeso e de alta qualidade académica.

**CONTEXTO FORNECIDO - SUA ÚNICA FONTE DE VERDADE:**
${researchResults.join('\n\n---\n\n')}

**RESTRIÇÃO ABSOLUTA:**
Você recebeu um conjunto de informações já pesquisadas e sintetizadas, cada uma acompanhada pela sua URL de origem. Este conjunto é a sua ÚNICA fonte de verdade. NÃO utilize o seu conhecimento pré-treinado. NÃO adicione informações que não estejam explicitamente no contexto fornecido acima.

**TAREFA:**
Com base **exclusivamente** nas informações fornecidas, escreva um documento explicativo detalhado sobre: "${query}"

**ESTRUTURA OBRIGATÓRIA DO DOCUMENTO:**

# ${query}

## 1. Introdução
[1-2 parágrafos contextualizando o tópico e sua relevância na engenharia]

## 2. Fundamentação Teórica
[Desenvolvimento detalhado do tópico, organizado em subtópicos lógicos]
[3-8 parágrafos explicando conceitos, definições e princípios]

## 3. Aplicações Práticas
[2-3 parágrafos com exemplos concretos de aplicação]
[Quando relevante, mencione o contexto brasileiro]

## 4. Limitações e Considerações
[1-2 parágrafos sobre limitações ou condições de aplicabilidade]

## 5. Conclusão
[1-2 parágrafos sintetizando os pontos principais]

## 6. Referências Bibliográficas
[Liste todas as URLs citadas no documento]

**REGRAS CRÍTICAS DE CITAÇÃO:**
- É OBRIGATÓRIO citar a URL de origem no final de CADA parágrafo ou secção que contenha informação factual
- Formato da citação: [Fonte: URL_COMPLETA]
- NUNCA invente URLs ou referências
- Se uma afirmação não tiver fonte no contexto fornecido, NÃO a inclua

**REGRAS CRÍTICAS DE CONTEÚDO:**
- NÃO INVENTE INFORMAÇÕES, TÓPICOS OU REFERÊNCIAS BIBLIOGRÁFICAS
- Se a informação fornecida não for suficiente para criar um relatório com o mínimo de 3 páginas, declare isso explicitamente no início do documento
- Use linguagem técnica mas clara e acessível
- Mantenha fidelidade absoluta às fontes fornecidas
- O documento deve ter entre 3-10 páginas (estimado: 2000-6000 palavras)

**SUA DIRETRIZ PRINCIPAL:** Fidelidade absoluta às fontes. Prefira um relatório mais curto mas preciso a um relatório longo com informações inventadas.`;

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
        temperature: 0.3, // Lower temperature for more focused output
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
