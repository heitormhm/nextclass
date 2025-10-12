import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// =========================
// HELPER FUNCTIONS
// =========================

function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 120000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

async function executeWebSearch(
  query: string,
  braveApiKey: string,
  numResults: number = 5
): Promise<Array<{ url: string; title: string; snippet: string }>> {
  console.log(`🔍 Searching: "${query}"`);

  try {
    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${numResults}`,
      {
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': braveApiKey,
        },
      }
    );

    if (!response.ok) {
      console.error(`Brave API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const results = data.web?.results || [];

    return results.slice(0, numResults).map((r: any) => ({
      url: r.url || '',
      title: r.title || '',
      snippet: r.description || '',
    }));
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}

// =========================
// STATE MACHINE HANDLERS
// =========================

async function handlePendingState(job: any, supabaseAdmin: any, lovableApiKey: string) {
  console.log(`🔄 [${job.id}] Handling PENDING state - Decomposing query`);
  
  const query = job.input_payload.query;
  
  const systemPrompt = `Você é um assistente de pesquisa académica especializado em engenharia. 
Sua tarefa é decompor uma pergunta complexa em 3-5 sub-perguntas mais simples e específicas que, quando respondidas em conjunto, fornecem uma resposta completa à pergunta original.

INSTRUÇÕES:
- Gere entre 3 e 5 sub-perguntas
- Cada sub-pergunta deve ser clara, específica e focada
- As sub-perguntas devem cobrir diferentes aspectos do tópico
- Use terminologia técnica apropriada para engenharia
- Responda APENAS com um array JSON de strings, sem texto adicional

Exemplo de formato de resposta:
["Sub-pergunta 1", "Sub-pergunta 2", "Sub-pergunta 3"]`;

  try {
    const response = await withTimeout(
      fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Pergunta: ${query}` }
          ],
          temperature: 0.7,
        }),
      }),
      120000
    );

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    // Parse JSON response
    const jsonMatch = content.match(/\[.*\]/s);
    if (!jsonMatch) {
      throw new Error('No valid JSON array found in response');
    }

    const decomposedQuestions = JSON.parse(jsonMatch[0]);
    console.log(`✅ Decomposed into ${decomposedQuestions.length} questions`);

    // Update job status and save intermediate data
    await supabaseAdmin
      .from('jobs')
      .update({
        status: 'DECOMPOSING',
        intermediate_data: {
          decomposed_questions: decomposedQuestions
        }
      })
      .eq('id', job.id);

    // Self-invoke for next state
    await selfInvoke(job.id);
  } catch (error) {
    console.error('Error in PENDING state:', error);
    throw error;
  }
}

async function handleDecomposingState(job: any, supabaseAdmin: any, braveApiKey: string) {
  console.log(`🔍 [${job.id}] Handling DECOMPOSING state - Executing web searches`);
  
  const decomposedQuestions = job.intermediate_data.decomposed_questions || [];
  
  if (decomposedQuestions.length === 0) {
    throw new Error('No decomposed questions found');
  }

  const MAX_ITERATIONS = 5;
  const TARGET_SOURCES = 5;
  const searchResults: Array<{ question: string; sources: any[] }> = [];

  // Execute searches for each question
  for (let i = 0; i < decomposedQuestions.length; i++) {
    const question = decomposedQuestions[i];
    console.log(`📝 Searching for question ${i + 1}/${decomposedQuestions.length}: ${question}`);
    
    const sources = await executeWebSearch(question, braveApiKey, TARGET_SOURCES);
    searchResults.push({
      question,
      sources: sources.slice(0, TARGET_SOURCES)
    });
    
    console.log(`✓ Found ${sources.length} sources for question ${i + 1}`);
  }

  console.log(`✅ Total search results collected: ${searchResults.reduce((acc, r) => acc + r.sources.length, 0)} sources`);

  // Update job status and save search results
  await supabaseAdmin
    .from('jobs')
    .update({
      status: 'RESEARCHING',
      intermediate_data: {
        ...job.intermediate_data,
        search_results: searchResults
      }
    })
    .eq('id', job.id);

  // Self-invoke for next state
  await selfInvoke(job.id);
}

async function handleResearchingState(job: any, supabaseAdmin: any, lovableApiKey: string) {
  console.log(`📝 [${job.id}] Handling RESEARCHING state - Synthesizing report`);
  
  const query = job.input_payload.query;
  const searchResults = job.intermediate_data.search_results || [];

  if (searchResults.length === 0) {
    throw new Error('No search results found');
  }

  // Build context from search results
  let researchContext = '\n\n**FONTES ENCONTRADAS:**\n\n';
  searchResults.forEach((result: any, idx: number) => {
    researchContext += `\n### ${result.question}\n`;
    result.sources.forEach((source: any, sourceIdx: number) => {
      researchContext += `\n**Fonte ${idx + 1}.${sourceIdx + 1}:**\n`;
      researchContext += `- Título: ${source.title}\n`;
      researchContext += `- URL: ${source.url}\n`;
      researchContext += `- Resumo: ${source.snippet}\n`;
    });
  });

  const systemPrompt = `Você é um assistente de pesquisa académica especializado em engenharia.
Sua tarefa é sintetizar um relatório académico completo, profundo e bem estruturado em português brasileiro, com base nas fontes de pesquisa fornecidas.

**FORMATO OBRIGATÓRIO DO RELATÓRIO:**

# [Título do Tópico]

## 1. Introdução
[Contextualização do tema com citações das fontes]

## 2. Fundamentação Teórica
[Explicação detalhada dos conceitos principais, com citações inline após cada afirmação]

## 3. Análise Técnica
[Discussão técnica aprofundada com referências às fontes]

## 4. Aplicações Práticas
[Exemplos do contexto brasileiro quando relevante]

## 5. Conclusão
[Síntese dos pontos principais]

## Referências Bibliográficas
[Lista numerada de todas as fontes citadas no formato: 
1. Título da Fonte - URL]

**REGRAS CRÍTICAS:**
- TODAS as afirmações factuais devem ser seguidas por citação inline: "Segundo [Fonte X], ..." ou "[Fonte: Nome]"
- Use APENAS informações das fontes fornecidas
- Não invente ou alucine referências
- Use linguagem técnica mas clara
- Mínimo 800 palavras
- Máximo 2000 palavras`;

  const userPrompt = `Pergunta Original: ${query}

${researchContext}

Sintetize um relatório académico completo sobre este tema, usando APENAS as fontes fornecidas acima.`;

  try {
    console.log('🤖 Calling AI for report synthesis...');
    const response = await withTimeout(
      fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-pro',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
        }),
      }),
      180000 // 3 minutes for synthesis
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const report = data.choices?.[0]?.message?.content;

    if (!report) {
      throw new Error('No report content in AI response');
    }

    console.log(`✅ Report generated (${report.length} characters)`);

    // Update job as completed
    await supabaseAdmin
      .from('jobs')
      .update({
        status: 'COMPLETED',
        result: report
      })
      .eq('id', job.id);

    console.log(`✅ [${job.id}] Job completed successfully`);
  } catch (error) {
    console.error('Error in RESEARCHING state:', error);
    throw error;
  }
}

// =========================
// MAIN JOB RUNNER
// =========================

async function runJob(jobId: string) {
  console.log(`\n========================================`);
  console.log(`🚀 Job Runner started for: ${jobId}`);
  console.log(`========================================\n`);

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const BRAVE_API_KEY = Deno.env.get('BRAVE_SEARCH_API_KEY');

  if (!LOVABLE_API_KEY) {
    console.error('❌ LOVABLE_API_KEY not configured');
    return;
  }

  if (!BRAVE_API_KEY) {
    console.error('❌ BRAVE_SEARCH_API_KEY not configured');
    return;
  }

  try {
    // 1. Fetch job from DB
    const { data: job, error } = await supabaseAdmin
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error || !job) {
      console.error(`❌ Job ${jobId} not found:`, error);
      return;
    }

    console.log(`📋 Job found: ${job.job_type} - Status: ${job.status}`);

    // 2. Check if already in terminal state
    if (job.status === 'COMPLETED' || job.status === 'FAILED') {
      console.log(`⏭️ Job ${jobId} already in terminal state: ${job.status}`);
      return;
    }

    // 3. State machine dispatch
    switch (job.status) {
      case 'PENDING':
        await handlePendingState(job, supabaseAdmin, LOVABLE_API_KEY);
        break;
      case 'DECOMPOSING':
        await handleDecomposingState(job, supabaseAdmin, BRAVE_API_KEY);
        break;
      case 'RESEARCHING':
        await handleResearchingState(job, supabaseAdmin, LOVABLE_API_KEY);
        break;
      default:
        console.warn(`⚠️ Unknown state: ${job.status}`);
    }
  } catch (error) {
    console.error(`❌ Error processing job ${jobId}:`, error);
    
    // Mark job as failed
    try {
      await supabaseAdmin
        .from('jobs')
        .update({
          status: 'FAILED',
          error_log: error instanceof Error ? error.message : String(error)
        })
        .eq('id', jobId);
    } catch (updateError) {
      console.error('Failed to update job as failed:', updateError);
    }
  }
}

async function selfInvoke(jobId: string) {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  console.log(`🔄 Self-invoking for next state: ${jobId}`);

  // Fire and forget
  fetch(`${SUPABASE_URL}/functions/v1/job-runner`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ jobId })
  }).catch(err => console.error('Self-invoke error:', err));
}

// =========================
// HTTP SERVER
// =========================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId } = await req.json();

    if (!jobId) {
      throw new Error('jobId is required');
    }

    console.log(`📨 Received request for job: ${jobId}`);

    // Run job in background (fire and forget)
    runJob(jobId)
      .then(() => console.log(`✅ Background task completed for ${jobId}`))
      .catch((error) => console.error(`❌ Background task failed for ${jobId}:`, error));

    // Return immediately
    return new Response(
      JSON.stringify({ success: true, message: 'Job processing started' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Job runner error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
