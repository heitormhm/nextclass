/**
 * ==========================================
 * MATERIAL DIDÁTICO GENERATOR V2 - JOB-BASED
 * ==========================================
 * 
 * ✅ PHASE 1: Critical Blockers
 * - Retry logic with exponential backoff
 * - Lovable AI rate limit handling (402/429)
 * 
 * ✅ PHASE 2: High Priority  
 * - Global edge function timeout (3 minutes)
 * - Job-based async system
 * - Markdown validation before save
 * 
 * ✅ PHASE 3: Polish
 * - Improved LaTeX regex
 * - Telemetry tracking
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ==========================================
// PHASE 1: Retry Logic with Exponential Backoff
// ==========================================

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  operation: string,
  maxRetries = 3,
  baseDelay = 5000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`[Retry] Attempt ${attempt + 1}/${maxRetries} for ${operation}`);
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on auth errors or validation errors
      if (error.status === 401 || error.status === 403 || error.status === 400) {
        throw error;
      }
      
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
        console.warn(`[Retry] ${operation} failed, retrying in ${delay}ms:`, error.message);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error(`[Retry] All ${maxRetries} attempts failed for ${operation}`);
  throw lastError || new Error(`Failed after ${maxRetries} attempts`);
}

// ==========================================
// PHASE 1: Web Search with Retry
// ==========================================

async function searchWeb(
  query: string,
  braveApiKey: string,
  numResults = 10
): Promise<Array<{ url: string; title: string; snippet: string }>> {
  return retryWithBackoff(async () => {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodedQuery}&count=${numResults}`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': braveApiKey,
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('RATE_LIMITED: Brave API rate limit exceeded');
      }
      throw new Error(`Brave API error: ${response.status}`);
    }

    const data = await response.json();
    const results = data.web?.results || [];
    
    return results
      .filter((r: any) => r.url && r.title)
      .map((r: any) => ({
        url: r.url,
        title: r.title,
        snippet: r.description || '',
      }))
      .slice(0, numResults);
  }, `Brave Search: ${query}`);
}

// ==========================================
// PHASE 1: AI Call with Rate Limit Handling
// ==========================================

async function callLovableAI(
  messages: any[],
  lovableApiKey: string,
  operation: string
): Promise<string> {
  return retryWithBackoff(async () => {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('RATE_LIMITED: Excesso de requisições. Aguarde alguns minutos.');
      }
      if (response.status === 402) {
        throw new Error('NO_CREDITS: Créditos insuficientes. Adicione créditos ao seu workspace Lovable.');
      }
      const errorText = await response.text();
      throw new Error(`AI Error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }, operation, 2, 10000); // Only 2 retries for AI calls, 10s delay
}

// ==========================================
// PHASE 2: Update Job Progress
// ==========================================

async function updateJobProgress(
  supabase: any,
  jobId: string,
  progress: number,
  step: string
) {
  await supabase
    .from('material_v2_jobs')
    .update({
      progress,
      progress_step: step,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);
  
  console.log(`[Job ${jobId}] Progress: ${progress}% - ${step}`);
}

// ==========================================
// PHASE 3: Improved LaTeX Regex
// ==========================================

function fixLaTeXFormulas(markdown: string): string {
  console.log('[LaTeX] Fixing formulas with improved regex...');
  
  let cleaned = markdown;

  // Remove corrupted placeholders
  cleaned = cleaned.replace(/___LATEX_\w+_\d+___/g, '');
  cleaned = cleaned.replace(/\*\*\s*\d+\$\s*\*\*/g, '');

  // ✅ IMPROVED: Only convert mathematical expressions
  // Matches patterns like: $x^2$, $\Delta T$, $E = mc^2$, $T_1 > T_2$
  // Ignores: "$50", "$100K"
  cleaned = cleaned.replace(
    /(?<!\$)\$(?!\$)([^\$\n]*?[\+\-\*\/\^\=\\{}_\(\)<>≤≥∆∫∂∇][^\$\n]*?)(?<!\$)\$(?!\$)/g,
    '$$$$$1$$$$'
  );

  // Also handle Greek letters and subscripts without operators
  cleaned = cleaned.replace(
    /(?<!\$)\$(?!\$)(\\[a-zA-Z]+|[a-zA-Z]+_\{?[a-zA-Z0-9]+\}?)(?<!\$)\$(?!\$)/g,
    '$$$$$1$$$$'
  );

  // Ensure spacing
  cleaned = cleaned.replace(/([^\s])(\$\$)/g, '$1 $2');
  cleaned = cleaned.replace(/(\$\$)([^\s])/g, '$1 $2');

  console.log('[LaTeX] ✅ Formulas fixed with improved validation');
  return cleaned;
}

// ==========================================
// PHASE 2: Markdown Validation
// ==========================================

function validateMarkdown(markdown: string): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  
  // Check minimum length
  if (markdown.length < 500) {
    warnings.push('Markdown muito curto (< 500 caracteres)');
  }
  
  // Check for unclosed LaTeX delimiters
  const latexCount = (markdown.match(/\$\$/g) || []).length;
  if (latexCount % 2 !== 0) {
    warnings.push('Delimitadores LaTeX não balanceados');
  }
  
  // Check for broken Mermaid blocks
  const mermaidStarts = (markdown.match(/```mermaid/g) || []).length;
  const codeBlockEnds = (markdown.match(/```\s*$/gm) || []).length;
  if (mermaidStarts > codeBlockEnds) {
    warnings.push('Blocos Mermaid não fechados');
  }
  
  // Check for corrupted artifacts
  if (markdown.includes('___LATEX_')) {
    warnings.push('Artefatos LaTeX corrompidos detectados');
  }
  
  return {
    valid: warnings.length === 0,
    warnings
  };
}

// ==========================================
// PHASE 3: Log Telemetry
// ==========================================

async function logTelemetry(
  supabase: any,
  jobId: string,
  lectureId: string,
  metrics: {
    researchQueriesCount: number;
    webSearchesCount: number;
    markdownLength: number;
    mermaidCount: number;
    latexCount: number;
    generationTimeMs: number;
    success: boolean;
    errorType?: string;
  }
) {
  try {
    await supabase
      .from('material_generation_metrics')
      .insert({
        job_id: jobId,
        lecture_id: lectureId,
        research_queries_count: metrics.researchQueriesCount,
        web_searches_count: metrics.webSearchesCount,
        markdown_length: metrics.markdownLength,
        mermaid_diagrams_count: metrics.mermaidCount,
        latex_formulas_count: metrics.latexCount,
        generation_time_ms: metrics.generationTimeMs,
        success: metrics.success,
        error_type: metrics.errorType,
      });
    
    console.log(`[Telemetry] Metrics logged for job ${jobId}`);
  } catch (error) {
    console.error('[Telemetry] Failed to log metrics:', error);
  }
}

// ==========================================
// Main Job Processor (runs async)
// ==========================================

async function processGenerationJob(jobId: string, lectureId: string, lectureTitle: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const startTime = Date.now();
  const metrics = {
    researchQueriesCount: 0,
    webSearchesCount: 0,
    markdownLength: 0,
    mermaidCount: 0,
    latexCount: 0,
    generationTimeMs: 0,
    success: false,
    errorType: undefined as string | undefined,
  };

  try {
    // Update job to PROCESSING
    await supabase
      .from('material_v2_jobs')
      .update({ status: 'PROCESSING', updated_at: new Date().toISOString() })
      .eq('id', jobId);

    await updateJobProgress(supabase, jobId, 10, 'Iniciando pesquisa...');

    // Get API keys
    const braveApiKey = Deno.env.get('BRAVE_SEARCH_API_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    if (!braveApiKey) {
      throw new Error('MISSING_KEY: BRAVE_SEARCH_API_KEY não configurada. Contate o administrador.');
    }
    if (!lovableApiKey) {
      throw new Error('MISSING_KEY: LOVABLE_API_KEY não configurada. Contate o administrador.');
    }

    // Step 1: Decompose into research questions
    await updateJobProgress(supabase, jobId, 20, 'Gerando perguntas de pesquisa...');
    
    const decomposeResponse = await callLovableAI([
      {
        role: 'system',
        content: 'Você é um assistente de pesquisa. Decomponha o tópico em 5-7 perguntas de pesquisa focadas.'
      },
      {
        role: 'user',
        content: `Tópico: ${lectureTitle}\n\nRetorne apenas as perguntas, uma por linha.`
      }
    ], lovableApiKey, 'Question Decomposition');
    
    const questions = decomposeResponse.split('\n').filter(q => q.trim().length > 10).slice(0, 7);
    metrics.researchQueriesCount = questions.length;
    
    // Step 2: Execute web searches
    await updateJobProgress(supabase, jobId, 40, `Pesquisando na web (${questions.length} consultas)...`);
    
    const searchResults: any[] = [];
    for (const question of questions) {
      const results = await searchWeb(question, braveApiKey, 5);
      searchResults.push({ question, sources: results });
      metrics.webSearchesCount += results.length;
    }
    
    // Step 3: Generate report
    await updateJobProgress(supabase, jobId, 60, 'Gerando material didático...');
    
    const researchContext = searchResults
      .map((r: any) => `**Pergunta:** ${r.question}\n\n${r.sources.map((s: any) => `- ${s.title}: ${s.snippet}`).join('\n')}`)
      .join('\n\n---\n\n');
    
    const systemPrompt = `Você é um professor de Engenharia. Crie material didático EM PORTUGUÊS baseado na pesquisa fornecida.

REGRAS CRÍTICAS:
1. Use APENAS Markdown, LaTeX e Mermaid
2. LaTeX: Use $$formula$$ para equações (NUNCA $formula$)
3. Mermaid: Blocos válidos com \`\`\`mermaid
4. SEM tabelas, SEM HTML, SEM JSON
5. Inclua diagramas Mermaid relevantes
6. Foque em conceitos práticos de Engenharia`;

    const reportMarkdown = await callLovableAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `# ${lectureTitle}\n\n${researchContext}` }
    ], lovableApiKey, 'Report Generation');
    
    // Step 4: Process markdown
    await updateJobProgress(supabase, jobId, 80, 'Processando e validando conteúdo...');
    
    let processedMarkdown = fixLaTeXFormulas(reportMarkdown);
    processedMarkdown = processedMarkdown.replace(/\n{3,}/g, '\n\n'); // Remove excess blank lines
    
    // Validate
    const validation = validateMarkdown(processedMarkdown);
    if (validation.warnings.length > 0) {
      console.warn('[Validation] Warnings:', validation.warnings);
      await supabase
        .from('material_v2_jobs')
        .update({ metadata: { warnings: validation.warnings } })
        .eq('id', jobId);
    }
    
    // Count metrics
    metrics.markdownLength = processedMarkdown.length;
    metrics.mermaidCount = (processedMarkdown.match(/```mermaid/g) || []).length;
    metrics.latexCount = (processedMarkdown.match(/\$\$/g) || []).length / 2;
    
    // Step 5: Save to lecture
    await updateJobProgress(supabase, jobId, 90, 'Salvando material...');
    
    await supabase
      .from('lectures')
      .update({
        material_didatico_v2: processedMarkdown,
        updated_at: new Date().toISOString()
      })
      .eq('id', lectureId);
    
    // Complete job
    metrics.generationTimeMs = Date.now() - startTime;
    metrics.success = true;
    
    await supabase
      .from('material_v2_jobs')
      .update({
        status: 'COMPLETED',
        progress: 100,
        progress_step: 'Concluído!',
        result: processedMarkdown.substring(0, 500) + '...',
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);
    
    await logTelemetry(supabase, jobId, lectureId, metrics);
    
    console.log(`✅ Job ${jobId} completed successfully in ${metrics.generationTimeMs}ms`);
    
  } catch (error: any) {
    console.error(`❌ Job ${jobId} failed:`, error);
    
    metrics.generationTimeMs = Date.now() - startTime;
    metrics.success = false;
    metrics.errorType = error.message.split(':')[0]; // Extract error type
    
    let userMessage = 'Erro ao gerar material. Tente novamente.';
    
    if (error.message.includes('RATE_LIMITED')) {
      userMessage = 'Limite de requisições atingido. Aguarde alguns minutos.';
    } else if (error.message.includes('NO_CREDITS')) {
      userMessage = 'Créditos insuficientes. Contate o administrador.';
    } else if (error.message.includes('MISSING_KEY')) {
      userMessage = 'Configuração pendente. Contate o administrador.';
    } else if (error.message.includes('timeout')) {
      userMessage = 'Tempo esgotado. Verifique sua conexão e tente novamente.';
    }
    
    await supabase
      .from('material_v2_jobs')
      .update({
        status: 'FAILED',
        error_message: userMessage,
        metadata: { technical_error: error.message },
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);
    
    await logTelemetry(supabase, jobId, lectureId, metrics);
  }
}

// ==========================================
// HTTP Handler with Global Timeout
// ==========================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // ✅ PHASE 2: Global 3-minute timeout
  const timeoutPromise = new Promise<Response>((_, reject) => {
    setTimeout(() => reject(new Error('TIMEOUT')), 180000);
  });

  const mainHandler = async (): Promise<Response> => {
    try {
      const { lectureId } = await req.json();

      if (!lectureId) {
        return new Response(
          JSON.stringify({ error: 'lectureId é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate auth
      const authHeader = req.headers.get('authorization');
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Não autenticado' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Token inválido' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify ownership
      const { data: lecture, error: lectureError } = await supabase
        .from('lectures')
        .select('id, title, teacher_id')
        .eq('id', lectureId)
        .single();

      if (lectureError || !lecture || lecture.teacher_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Aula não encontrada ou sem permissão' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create job
      const { data: job, error: jobError } = await supabase
        .from('material_v2_jobs')
        .insert({
          lecture_id: lectureId,
          teacher_id: user.id,
          status: 'PENDING',
          progress: 0,
        })
        .select()
        .single();

      if (jobError || !job) {
        throw new Error('Falha ao criar job');
      }

      // Start async processing (don't await)
      processGenerationJob(job.id, lectureId, lecture.title).catch((err) => {
        console.error('[Async Job] Unhandled error:', err);
      });

      return new Response(
        JSON.stringify({ success: true, jobId: job.id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error: any) {
      console.error('[Handler] Error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  };

  try {
    return await Promise.race([mainHandler(), timeoutPromise]);
  } catch (error: any) {
    if (error.message === 'TIMEOUT') {
      return new Response(
        JSON.stringify({ error: 'Tempo esgotado. A requisição levou mais de 3 minutos.' }),
        { status: 408, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    throw error;
  }
});
