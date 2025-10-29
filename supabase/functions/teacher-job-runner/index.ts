import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Import modular components
import { createDeepSearchSystemPrompt, createDeepSearchUserPrompt } from './prompts/deep-search-system-prompt.ts';
import { QUIZ_SYSTEM_PROMPT, createQuizUserPrompt } from './prompts/quiz-generation-prompt.ts';
import { FLASHCARDS_SYSTEM_PROMPT, createFlashcardsUserPrompt } from './prompts/flashcards-generation-prompt.ts';
import { validateReferences } from './validators/reference-validator.ts';
import { validateMermaidDiagrams } from './validators/mermaid-validator.ts';
import { callAIWithRetry } from './services/ai-client.ts';
import { sanitizeJSON, updateJobProgress } from './utils/common.ts';

// Import legacy functions (to be refactored in future iterations)
import { 
  preprocessMermaidBlocks,
  fixLatexErrors,
  convertMarkdownToStructuredJSON,
  saveReportToLecture,
  processTranscript
} from './legacy/index.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Decompose query into sub-questions
async function decomposeQuery(query: string, apiKey: string, jobId: string): Promise<string[]> {
  console.log(`[Job ${jobId}] 🧩 Decomposing query...`);
  
  const data = await callAIWithRetry(apiKey, {
    model: 'google/gemini-2.5-flash',
    systemPrompt: 'Você é um assistente que decompõe tópicos educacionais em perguntas de pesquisa. Retorne apenas JSON válido com array "questions".',
    userPrompt: `Decomponha este tópico em 3-5 perguntas de pesquisa específicas para buscar informações educacionais relevantes:\n\n"${query}"\n\nRetorne JSON: {"questions": ["pergunta 1", "pergunta 2", ...]}`,
    timeout: 60000
  }, jobId);
  
  const content = data.choices?.[0]?.message?.content;
  const parsed = JSON.parse(sanitizeJSON(content));
  return parsed.questions || [query];
}

// Execute web searches using Brave API
async function executeWebSearches(questions: string[], braveApiKey: string, jobId: string): Promise<any[]> {
  console.log(`[Job ${jobId}] 🔍 Executing ${questions.length} web searches...`);
  
  const allResults: any[] = [];
  
  for (const question of questions) {
    try {
      const searchQuery = `${question} (site:.edu OR site:.gov OR site:scielo.org OR site:ieeexplore.ieee.org OR site:springer.com OR site:.ac.uk)`;
      
      const response = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(searchQuery)}&count=10&safesearch=strict`,
        {
          headers: {
            'Accept': 'application/json',
            'X-Subscription-Token': braveApiKey,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.web?.results) {
          allResults.push(...data.web.results.slice(0, 3));
        }
      }
    } catch (error) {
      console.error(`[Job ${jobId}] ⚠️ Search error:`, error);
    }
  }
  
  console.log(`[Job ${jobId}] ✅ Total results collected: ${allResults.length}`);
  return allResults;
}

// Generate educational report from search results
async function generateEducationalReport(
  query: string,
  searchResults: any[],
  teacherName: string | undefined,
  apiKey: string,
  jobId: string
): Promise<string> {
  console.log(`[Job ${jobId}] 📝 Generating educational report...`);
  
  const context = searchResults
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.description || ''}\nURL: ${r.url}`)
    .join('\n\n');

  const data = await callAIWithRetry(apiKey, {
    model: 'google/gemini-2.5-pro',
    systemPrompt: createDeepSearchSystemPrompt(teacherName, query),
    userPrompt: createDeepSearchUserPrompt(query, context),
    timeout: 120000,
    maxRetries: 3
  }, jobId);
  
  const report = data.choices?.[0]?.message?.content;
  if (!report) throw new Error('No report generated');
  
  return report;
}

// Process deep search for lecture material
async function processLectureDeepSearch(job: any, supabase: any, lovableApiKey: string) {
  const { lectureId, lectureTitle, tags, teacherName } = job.input_payload;
  
  console.log(`[Job ${job.id}] 🚀 Deep Search starting for lecture: ${lectureTitle}`);

  const braveApiKey = Deno.env.get('BRAVE_SEARCH_API_KEY');
  if (!braveApiKey) throw new Error('BRAVE_SEARCH_API_KEY not configured');

  try {
    await updateJobProgress(supabase, job.id, 0.1, 'Analisando tópico...');
    const query = `${lectureTitle}${tags?.length > 0 ? ` - Tópicos: ${tags.join(', ')}` : ''}`;
    
    const subQuestions = await decomposeQuery(query, lovableApiKey, job.id);
    
    await updateJobProgress(supabase, job.id, 0.3, 'Pesquisando fontes...');
    const searchResults = await executeWebSearches(subQuestions, braveApiKey, job.id);
    
    await updateJobProgress(supabase, job.id, 0.8, 'Gerando material...');
    const report = await generateEducationalReport(query, searchResults, teacherName, lovableApiKey, job.id);
    
    const validation = validateMermaidDiagrams(report);
    if (!validation.valid) {
      console.warn(`[Job ${job.id}] ⚠️ Mermaid issues:`, validation.errors);
    }
    
    const refValidation = validateReferences(report);
    if (!refValidation.valid) {
      throw new Error(`Material rejeitado: ${refValidation.bannedCount} fontes não confiáveis (máx: 5)`);
    }

    await saveReportToLecture(supabase, lectureId, report, job.id);
    await updateJobProgress(supabase, job.id, 1.0, 'Concluído!');
    
    await supabase.from('teacher_jobs').update({
      status: 'COMPLETED',
      updated_at: new Date().toISOString()
    }).eq('id', job.id);

  } catch (error) {
    await supabase.from('teacher_jobs').update({
      status: 'FAILED',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      updated_at: new Date().toISOString()
    }).eq('id', job.id);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId } = await req.json();
    if (!jobId) {
      return new Response(JSON.stringify({ error: 'jobId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: job, error: jobError } = await supabaseAdmin
      .from('teacher_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return new Response(JSON.stringify({ error: 'Job not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await supabaseAdmin.from('teacher_jobs').update({ 
      status: 'PROCESSING', 
      updated_at: new Date().toISOString() 
    }).eq('id', jobId);

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) throw new Error('LOVABLE_API_KEY not configured');

    if (job.job_type === 'PROCESS_TRANSCRIPT') {
      await processTranscript(job, supabaseAdmin);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (job.job_type === 'GENERATE_LECTURE_DEEP_SEARCH') {
      await processLectureDeepSearch(job, supabaseAdmin, lovableApiKey);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle QUIZ and FLASHCARDS
    const { title, transcript, tags } = job.input_payload;
    let systemPrompt = '';
    let userPrompt = '';

    if (job.job_type === 'GENERATE_QUIZ') {
      systemPrompt = QUIZ_SYSTEM_PROMPT;
      userPrompt = createQuizUserPrompt(title, tags || [], transcript);
    } else if (job.job_type === 'GENERATE_FLASHCARDS') {
      systemPrompt = FLASHCARDS_SYSTEM_PROMPT;
      userPrompt = createFlashcardsUserPrompt(title, tags || [], transcript);
    }

    const aiData = await callAIWithRetry(lovableApiKey, {
      model: 'google/gemini-2.5-flash',
      systemPrompt,
      userPrompt,
      timeout: 60000
    }, jobId);

    const content = aiData.choices?.[0]?.message?.content;
    if (!content) throw new Error('No content in AI response');

    const parsedData = JSON.parse(sanitizeJSON(content));

    if (job.job_type === 'GENERATE_QUIZ') {
      await supabaseAdmin.from('teacher_quizzes').insert({
        lecture_id: job.lecture_id,
        teacher_id: job.teacher_id,
        title: title || 'Quiz',
        questions: parsedData.questions
      });
    } else if (job.job_type === 'GENERATE_FLASHCARDS') {
      await supabaseAdmin.from('teacher_flashcards').insert({
        lecture_id: job.lecture_id,
        teacher_id: job.teacher_id,
        title: title || 'Flashcards',
        cards: parsedData.cards
      });
    }

    await supabaseAdmin.from('teacher_jobs').update({
      status: 'COMPLETED',
      result_payload: parsedData,
      updated_at: new Date().toISOString()
    }).eq('id', jobId);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
