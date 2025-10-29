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

  // ✅ FASE 1: Convert markdown to HTML with ROBUST fallback
  console.log(`[Job ${jobId}] 🎨 Converting markdown to HTML...`);
  console.log(`[Job ${jobId}] 📊 Input markdown length: ${fixedReport.length} chars`);
  
  let htmlContent: string;
  
  try {
    const { data: htmlData, error: htmlError } = await supabase.functions.invoke(
      'format-lecture-content',
      { body: { markdown: fixedReport } }
    );
    
    // ✅ Validação robusta: HTML deve existir E ter conteúdo real
    if (!htmlError && htmlData?.cleanedMarkdown && htmlData.cleanedMarkdown.length > 100) {
      htmlContent = htmlData.cleanedMarkdown;
      console.log(`[Job ${jobId}] ✅ HTML generated successfully: ${htmlContent.length} chars`);
    } else {
      console.warn(`[Job ${jobId}] ⚠️ format-lecture-content returned empty/invalid, using fallback`);
      throw new Error('HTML conversion returned empty or invalid content');
    }
  } catch (err) {
    console.error(`[Job ${jobId}] ❌ HTML conversion failed:`, err);
    
    // 🛟 FALLBACK: Basic markdown → HTML conversion
    console.log(`[Job ${jobId}] 🛟 Applying fallback HTML conversion...`);
    
    htmlContent = fixedReport
      // Paragraphs
      .replace(/\n\n+/g, '</p><p>')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Inline code
      .replace(/`(.+?)`/g, '<code>$1</code>')
      // Headers
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      // LaTeX (preserve for frontend rendering)
      .replace(/\$\$(.+?)\$\$/g, '<span class="math-display">$$$$1$$</span>');
    
    // Wrap in paragraphs
    htmlContent = `<div class="generated-content"><p>${htmlContent}</p></div>`;
    
    console.log(`[Job ${jobId}] 🛟 Fallback HTML generated: ${htmlContent.length} chars`);
  }
  
  // ✅ Final validation: HTML must never be empty
  if (!htmlContent || htmlContent.length < 50) {
    throw new Error(`[Job ${jobId}] ❌ CRITICAL: HTML content is empty or too short (${htmlContent?.length || 0} chars)`);
  }
  
  console.log(`[Job ${jobId}] ✅ Final HTML length: ${htmlContent.length} chars`);

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
