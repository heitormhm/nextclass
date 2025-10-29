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
    .replace(/```mermaid[\s\S]*?```/g, '[DIAGRAM]')
    .replace(/```json[\s\S]*?```/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2).length;
  
  console.log(`[Job ${jobId}] 📊 Word count validation: ${wordCount} palavras`);
  
  if (wordCount < 1500) {
    console.warn(`[Job ${jobId}] ⚠️ Material com ${wordCount} palavras (recomendado: 3000+)`);
  }

  // ✅ FASE 1: Convert markdown to HTML (same as TeacherAnnotationPage)
  console.log(`[Job ${jobId}] 🎨 Converting markdown to HTML...`);
  
  let htmlContent = fixedReport; // Fallback to original markdown
  
  try {
    const { data: htmlData, error: htmlError } = await supabase.functions.invoke(
      'format-lecture-content',
      { body: { markdown: fixedReport } }
    );
    
    if (!htmlError && htmlData?.cleanedMarkdown) {
      htmlContent = htmlData.cleanedMarkdown;
      console.log(`[Job ${jobId}] ✅ HTML generated: ${htmlContent.length} chars`);
    } else {
      console.warn(`[Job ${jobId}] ⚠️ HTML conversion failed, using markdown:`, htmlError);
    }
  } catch (err) {
    console.error(`[Job ${jobId}] ❌ HTML conversion exception:`, err);
  }

  // Convert markdown to structured JSON format (backward compatibility)
  const structuredJSON = await convertMarkdownToStructuredJSON(
    fixedReport,
    'Material Didático',
    jobId
  );
  
  // Update lecture with HTML + JSON (backward compatibility)
  await supabase.from('lectures').update({
    structured_content: {
      ...existingContent,
      material_didatico_html: htmlContent,  // ✅ PRIMARY: HTML format
      material_didatico: structuredJSON      // ✅ FALLBACK: JSON for old lectures
    },
    updated_at: new Date().toISOString()
  }).eq('id', lectureId);
  
  console.log(`[Job ${jobId}] ✅ Material saved to lecture ${lectureId}`);
}
