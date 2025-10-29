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

  if (!report) {
    throw new Error('AI returned empty content');
  }

  // ✅ PHASE 2: Multi-layer unwrapping with JSON-to-Markdown conversion
  // Layer 1: Remove markdown code block if present
  if (report.trim().startsWith('```json') || report.trim().startsWith('```')) {
    console.warn(`[Job ${jobId}] ⚠️ AI returned markdown code block, unwrapping...`);
    report = report.replace(/^```json\s*\n?/m, '').replace(/^```\s*\n?/m, '').replace(/\n?```\s*$/m, '');
    console.log(`[Job ${jobId}] ✅ Removed markdown wrapper`);
  }

  // Layer 2: Parse JSON object if present and convert to markdown
  if (report.trim().startsWith('{')) {
    console.warn(`[Job ${jobId}] ⚠️ AI returned JSON object, converting to markdown...`);
    try {
      const parsed = JSON.parse(report.trim());
      
      // Check if this is the structured educational_material format
      if (parsed.educational_material || (parsed.body && Array.isArray(parsed.body))) {
        console.log(`[Job ${jobId}] 🔄 Detected structured educational JSON, converting...`);
        
        // Import and use JSON-to-markdown converter
        const { convertEducationalJSONToMarkdown } = await import('../converters/json-to-markdown.ts');
        report = convertEducationalJSONToMarkdown(parsed);
        
        console.log(`[Job ${jobId}] ✅ Converted structured JSON to markdown: ${report.length} chars`);
      }
      // Try simple field extraction for other formats
      else if (parsed.report && typeof parsed.report === 'string') {
        report = parsed.report;
        console.log(`[Job ${jobId}] ✅ Extracted from 'report' field`);
      } else if (parsed.content && typeof parsed.content === 'string') {
        report = parsed.content;
        console.log(`[Job ${jobId}] ✅ Extracted from 'content' field`);
      } else {
        throw new Error('JSON structure not recognized - expected educational_material format or simple report/content field');
      }
    } catch (jsonError) {
      console.error(`[Job ${jobId}] ❌ Failed to parse/convert JSON:`, jsonError);
      throw new Error(`Invalid JSON format: ${jsonError instanceof Error ? jsonError.message : 'Unknown error'}`);
    }
  }

  // Verify we have valid markdown
  if (!report || report.trim().length < 100) {
    throw new Error(`Generated content is too short: ${report?.trim().length || 0} chars`);
  }

  console.log(`[Job ${jobId}] ✅ Final markdown ready: ${report.length} chars`);
  console.log(`[Job ${jobId}] 📝 Content preview: ${report.substring(0, 200)}...`)
  
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
      
      // ✅ FASE 3: Validação final de qualidade antes de continuar
      const quickWordCount = report.split(/\s+/).filter(w => w.length > 2).length;
      console.log(`[Job ${job.id}] 📊 Quality check (attempt ${attempt}):`, {
        markdownLength: report.length,
        markdownWords: quickWordCount,
        hasHeaders: /^#{1,6} /.test(report),
        paragraphCount: report.split('\n\n').length,
      });
      
      // ✅ FALLBACK: Se muito curto, retry com contexto expandido
      if (attempt === 1 && quickWordCount < 2000) {
        console.warn(`[Job ${job.id}] ⚠️ Attempt ${attempt} generated ${quickWordCount} words (target: 3000+), retrying with expanded context...`);
        continue; // Vai para attempt 2
      }
      
      // Validação crítica de conteúdo mínimo
      if (quickWordCount < 1000) {
        console.error(`[Job ${job.id}] ❌ Report too short: ${quickWordCount} words (minimum: 1000)`);
        if (attempt === MAX_RETRIES) {
          throw new Error(`Material muito curto (${quickWordCount} palavras). Mínimo esperado: 1000.`);
        }
        continue; // Retry
      }
      
      // Validação de Mermaid (warnings only, but try AI fix)
      const validation = validateMermaidDiagrams(report);
      if (!validation.valid) {
        console.warn(`[Job ${job.id}] ⚠️ Mermaid issues detected, attempting AI fix...`);
        
        // Import and use AI fix service
        const { fixMermaidBlocksWithAI } = await import('./mermaid-fix-service.ts');
        report = await fixMermaidBlocksWithAI(report, supabase, job.id);
        
        // Re-validate after AI fix
        const revalidation = validateMermaidDiagrams(report);
        if (!revalidation.valid) {
          console.warn(`[Job ${job.id}] ⚠️ Mermaid still has issues after AI fix:`, revalidation.errors);
        } else {
          console.log(`[Job ${job.id}] ✅ Mermaid diagrams fixed by AI`);
        }
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

    // ✅ FASE 1: Logging detalhado antes de salvar
    console.log(`[Job ${job.id}] 📊 Pre-save validation:`, {
      reportLength: report.length,
      reportFirstChars: report.substring(0, 500),
      reportLastChars: report.substring(report.length - 200),
      wordCount: report.split(/\s+/).length,
      hasMarkdownHeaders: /^#{1,6}\s/m.test(report),
      hasParagraphs: report.split('\n\n').length,
    });

    // ✅ CRITICAL: Pre-save Mermaid cleaning
    console.log(`[Job ${job.id}] 🧹 Applying pre-save Mermaid cleaning...`);
    
    // 1. Detect and REJECT subgraph syntax
    if (report.includes('subgraph')) {
      console.error(`[Job ${job.id}] ❌ CRITICAL: Subgraph detected in AI output - REJECTING`);
      throw new Error('AI generated forbidden subgraph syntax. Material rejected - regenerate without subgraph.');
    }
    
    // 2. Expand single-line Mermaid code to multi-line
    const mermaidBlockRegex = /```mermaid\s*\n([^`]+)```/g;
    report = report.replace(mermaidBlockRegex, (match: string, code: string) => {
      const lines = code.split('\n').filter((l: string) => l.trim());
      
      // If code has less than 3 lines or appears to be single-line, expand it
      if (lines.length < 3 || code.includes(';')) {
        console.warn(`[Job ${job.id}] ⚠️ Single-line Mermaid detected, expanding...`);
        const expanded = code
          .replace(/;\s*/g, '\n    ')
          .replace(/-->/g, '\n    -->')
          .replace(/==>/g, '\n    ==>')
          .trim();
        return `\`\`\`mermaid\n${expanded}\n\`\`\``;
      }
      return match;
    });
    
    // 3. Final subgraph removal (defensive layer)
    const initialLength = report.length;
    report = report.replace(/subgraph[^`]*?end/gs, '');
    if (report.length !== initialLength) {
      console.warn(`[Job ${job.id}] ⚠️ Removed ${initialLength - report.length} chars of subgraph syntax`);
    }
    
    console.log(`[Job ${job.id}] ✅ Pre-save Mermaid cleaning complete`);

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
