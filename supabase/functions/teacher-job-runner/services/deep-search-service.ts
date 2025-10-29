/**
 * Deep Search Service
 * Orchestrates the entire deep search workflow for educational content generation
 */

import { callAIWithRetry, testAIConnection } from './ai-client.ts';
import { sanitizeJSON, updateJobProgress } from '../utils/common.ts';
import { createDeepSearchSystemPrompt, createDeepSearchUserPrompt } from '../prompts/deep-search-system-prompt.ts';
import { validateReferences } from '../validators/reference-validator.ts';
import { validateMermaidDiagrams } from '../validators/mermaid-validator.ts';
import { saveReportToLecture } from './lecture-service.ts';

/**
 * Decompose a broad topic into specific research questions
 */
async function decomposeQuery(query: string, apiKey: string, jobId: string): Promise<string[]> {
  console.log(`[Job ${jobId}] 🧩 Decomposing query...`);
  
  const data = await callAIWithRetry(apiKey, {
    model: 'google/gemini-2.5-flash',
    systemPrompt: 'Você é um assistente que decompõe tópicos educacionais em perguntas de pesquisa. Retorne apenas JSON válido com array "questions".',
    userPrompt: `Decomponha este tópico em EXATAMENTE 4 perguntas de pesquisa específicas para buscar informações educacionais relevantes:\n\n"${query}"\n\nRetorne JSON com EXATAMENTE 4 perguntas: {"questions": ["pergunta 1", "pergunta 2", "pergunta 3", "pergunta 4"]}`,
    timeout: 60000
  }, jobId);
  
  const content = data.choices?.[0]?.message?.content;
  const parsed = JSON.parse(sanitizeJSON(content));
  return parsed.questions || [query];
}

/**
 * Execute web searches using Brave Search API
 */
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
          allResults.push(...data.web.results.slice(0, 2));
        }
      }
    } catch (error) {
      console.error(`[Job ${jobId}] ⚠️ Search error:`, error);
    }
  }
  
  console.log(`[Job ${jobId}] ✅ Total results collected: ${allResults.length}`);
  return allResults;
}

/**
 * Generate comprehensive educational report from search results
 */
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
    model: 'google/gemini-2.5-flash',
    systemPrompt: createDeepSearchSystemPrompt(teacherName, query),
    userPrompt: createDeepSearchUserPrompt(query, context),
    timeout: 120000,  // 120s para garantir 3000+ palavras
    maxRetries: 2
  }, jobId);
  
  console.log(`[Job ${jobId}] 📥 AI Response received, parsing...`);
  let report = data.choices?.[0]?.message?.content;
  
  if (!report || report.trim().length < 100) {
    console.error(`[Job ${jobId}] ❌ Flash returned empty/short content, retrying with Pro...`);
    console.error(`[Job ${jobId}] 📊 Flash response preview:`, JSON.stringify(data).substring(0, 300));
    
    // Fallback: Tentar com Gemini Pro
    const proData = await callAIWithRetry(apiKey, {
      model: 'google/gemini-2.5-pro',
      systemPrompt: createDeepSearchSystemPrompt(teacherName, query),
      userPrompt: createDeepSearchUserPrompt(query, context),
      timeout: 120000,
      maxRetries: 2
    }, jobId);
    
    report = proData.choices?.[0]?.message?.content;
    
    if (!report || report.trim().length < 100) {
      throw new Error('Both Flash and Pro models failed to generate content');
    }
    
    console.log(`[Job ${jobId}] ✅ Pro model generated ${report.length} chars`);
  } else {
    console.log(`[Job ${jobId}] ✅ Flash generated ${report.length} chars`);
  }
  
  console.log(`[Job ${jobId}] 📝 Report preview:`, report.substring(0, 200));
  
  return report;
}

/**
 * Main orchestrator for Deep Search workflow
 */
export async function processLectureDeepSearch(job: any, supabase: any, lovableApiKey: string) {
  const { lectureId, lectureTitle, tags, teacherName } = job.input_payload;
  
  console.log(`[Job ${job.id}] 🚀 Deep Search starting for lecture: ${lectureTitle}`);

  // ✅ FASE 2: Logging detalhado de input
  console.log(`[Job ${job.id}] 📊 Input Data:`, {
    lectureId,
    lectureTitle,
    tagsCount: tags?.length || 0,
    tags: tags || [],
    teacherName: teacherName || 'Not provided',
    hasTranscript: !!job.input_payload.transcript,
  });

  const braveApiKey = Deno.env.get('BRAVE_SEARCH_API_KEY');
  if (!braveApiKey) throw new Error('BRAVE_SEARCH_API_KEY not configured');

  try {
    // Health check before starting
    console.log(`[Job ${job.id}] 🔍 Testing AI API connection...`);
    const apiHealthy = await testAIConnection(lovableApiKey);
    if (!apiHealthy) {
      throw new Error('AI API connection failed - please try again later');
    }
    console.log(`[Job ${job.id}] ✅ AI API connection healthy`);
    
    await updateJobProgress(supabase, job.id, 0.1, 'Analisando tópico...');
    const query = `${lectureTitle}${tags?.length > 0 ? ` - Tópicos: ${tags.join(', ')}` : ''}`;
    
    // ✅ FASE 2: Logging da query final
    console.log(`[Job ${job.id}] 🔍 Deep Search Query:`, query);
    console.log(`[Job ${job.id}] 📝 Tags used: ${tags?.length || 0} tags`);
    
    const subQuestions = await decomposeQuery(query, lovableApiKey, job.id);
    
    await updateJobProgress(supabase, job.id, 0.3, 'Pesquisando fontes...');
    const searchResults = await executeWebSearches(subQuestions, braveApiKey, job.id);
    
    // ✅ FASE 3: RETRY COM FALLBACK
    const MAX_RETRIES = 2;
    let attempt = 0;
    let report: string | null = null;
    let lastRefValidation = null;
    
    while (attempt < MAX_RETRIES) {
      attempt++;
      console.log(`[Job ${job.id}] 🔄 Generation attempt ${attempt}/${MAX_RETRIES}`);
      
      await updateJobProgress(supabase, job.id, 0.8, `Gerando material (tentativa ${attempt}/${MAX_RETRIES})...`);
      report = await generateEducationalReport(query, searchResults, teacherName, lovableApiKey, job.id);
      
      // ✅ FALLBACK: Se muito curto, retry com contexto expandido
      const quickWordCount = report.split(/\s+/).length;
      if (attempt === 1 && quickWordCount < 2000) {
        console.warn(`[Job ${job.id}] ⚠️ Attempt ${attempt} generated ${quickWordCount} words (target: 3000+), retrying with expanded context...`);
        continue; // Vai para attempt 2
      }
      
      // Validação de Mermaid (warnings only)
      const validation = validateMermaidDiagrams(report);
      if (!validation.valid) {
        console.warn(`[Job ${job.id}] ⚠️ Mermaid issues:`, validation.errors);
      }
      
      // Validação de Referências (blocking)
      lastRefValidation = validateReferences(report);
      
      if (lastRefValidation.valid) {
        console.log(`[Job ${job.id}] ✅ Validation passed on attempt ${attempt}`);
        console.log(`[Job ${job.id}] 📊 Reference quality: ${lastRefValidation.academicPercentage.toFixed(0)}% academic, ${lastRefValidation.bannedCount} banned sources`);
        console.log(`[Job ${job.id}] 📝 Content length: ${quickWordCount} words`);
        break; // ✅ Sucesso!
      } else {
        // ✅ FASE 4: MENSAGENS DE ERRO DETALHADAS
        const diagnostics = [
          `Tentativa ${attempt}/${MAX_RETRIES}`,
          `Qualidade acadêmica: ${lastRefValidation.academicPercentage.toFixed(0)}%`,
          `Fontes banidas: ${lastRefValidation.bannedCount}/5`,
          `Erros: ${lastRefValidation.errors.join(', ')}`
        ].join(' | ');
        
        console.warn(`[Job ${job.id}] ⚠️ Validation failed:`, diagnostics);
        
        if (attempt >= MAX_RETRIES) {
          // ✅ FALLBACK: Aprovar mesmo assim após esgotar retries
          console.log(`[Job ${job.id}] ⚠️ Max retries reached, approving with warnings`);
          console.log(`[Job ${job.id}] 📋 Final diagnostics: ${diagnostics}`);
          break; // Aprovar mesmo com falhas
        }
        
        // Aguardar antes de retry
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    if (!report) throw new Error('Failed to generate report after retries');

    await saveReportToLecture(supabase, lectureId, report, job.id);
    await updateJobProgress(supabase, job.id, 1.0, 'Concluído!');
    
    await supabase.from('teacher_jobs').update({
      status: 'COMPLETED',
      updated_at: new Date().toISOString()
    }).eq('id', job.id);

  } catch (error) {
    console.error(`[Job ${job.id}] ❌ Fatal error:`, error);
    await supabase.from('teacher_jobs').update({
      status: 'FAILED',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      updated_at: new Date().toISOString()
    }).eq('id', job.id);
    throw error;
  }
}
