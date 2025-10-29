/**
 * Lecture Service
 * Handles persistence of educational materials to the lectures table
 */

import { fixLatexErrors } from '../converters/latex-normalizer.ts';
import { convertMarkdownToStructuredJSON } from '../converters/markdown-to-json.ts';

/**
 * Save generated educational report to lecture's structured content
 */
export async function saveReportToLecture(
  supabase: any,
  lectureId: string,
  report: string,
  jobId: string
) {
  const { data: lecture } = await supabase
    .from('lectures')
    .select('structured_content')
    .eq('id', lectureId)
    .single();
    
  const existingContent = lecture?.structured_content || {};
  
  // Fix LaTeX syntax errors
  let fixedReport = await fixLatexErrors(report, jobId);
  
  // Validate minimum word count (diagrams count as content)
  const wordCount = fixedReport
    .replace(/```mermaid[\s\S]*?```/g, '[DIAGRAM]') // Keep diagrams as token
    .replace(/```json[\s\S]*?```/g, '') // Remove JSON metadata blocks
    .replace(/```[\s\S]*?```/g, '') // Remove other code blocks
    .split(/\s+/)
    .filter(w => w.length > 2).length; // Ignore very short tokens
  
  console.log(`[Job ${jobId}] 📊 Word count validation: ${wordCount} palavras`);
  
  if (wordCount < 1500) {
    console.warn(`[Job ${jobId}] ⚠️ Material com ${wordCount} palavras (recomendado: 3000+)`);
    // Não bloquear - permitir salvar para análise do professor
  }

  // Convert markdown to structured JSON format
  const structuredJSON = await convertMarkdownToStructuredJSON(
    fixedReport,
    'Material Didático',
    jobId
  );
  
  // ✅ FASE 1: Validar estrutura antes de salvar
  const structuredWordCount = JSON.stringify(structuredJSON.conteudo)
    .split(/\s+/)
    .filter(w => w.length > 2).length;
  
  console.log(`[Job ${jobId}] 📊 Structured content validation:`, {
    blockCount: structuredJSON.conteudo.length,
    wordCount: structuredWordCount,
    hasContent: structuredWordCount > 0,
  });
  
  if (structuredWordCount === 0 || structuredJSON.conteudo.length === 0) {
    console.error(`[Job ${jobId}] ❌ CRITICAL: Structured content is empty after conversion`);
    throw new Error('Conteúdo estruturado vazio após conversão. Verifique o formato do markdown.');
  }
  
  // Update lecture with new structured content
  await supabase.from('lectures').update({
    structured_content: {
      ...existingContent,
      material_didatico: structuredJSON
    },
    updated_at: new Date().toISOString()
  }).eq('id', lectureId);
  
  console.log(`[Job ${jobId}] ✅ Material saved to lecture ${lectureId}`);
}
