/**
 * Lecture Service
 * Handles persistence of educational materials to the lectures table
 */

import { fixLatexErrors } from '../converters/latex-normalizer.ts';

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
  
  // ✅ PHASE A: Pre-validate markdown content
  if (!fixedReport || fixedReport.length < 200) {
    throw new Error(`[Job ${jobId}] ❌ Markdown content too short for HTML conversion (${fixedReport?.length || 0} chars)`);
  }
  console.log(`[Job ${jobId}] ✅ Markdown validation passed: ${fixedReport.length} chars`);
  
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
    
    // 🛟 FALLBACK: Improved markdown → HTML conversion
    console.log(`[Job ${jobId}] 🛟 Applying fallback HTML conversion...`);
    
    htmlContent = fixedReport
      // Headers (must come before other replacements)
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      // Lists
      .replace(/^\* (.+)$/gm, '<li>$1</li>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      // Links
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Inline code
      .replace(/`(.+?)`/g, '<code>$1</code>')
      // LaTeX (preserve for frontend rendering)
      .replace(/\$\$(.+?)\$\$/g, '<span class="math-display">$$$$1$$</span>')
      // Paragraphs (double newlines)
      .replace(/\n\n+/g, '</p><p>');
    
    // Wrap lists properly
    htmlContent = htmlContent.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
    
    // Wrap in div and paragraphs
    htmlContent = `<div class="generated-content"><p>${htmlContent}</p></div>`;
    
    console.log(`[Job ${jobId}] 🛟 Fallback HTML generated: ${htmlContent.length} chars`);
  }
  
  // ✅ PHASE A: Lowered validation threshold (was 50, now 20)
  if (!htmlContent || htmlContent.length < 20) {
    throw new Error(`[Job ${jobId}] ❌ CRITICAL: HTML content is empty or too short (${htmlContent?.length || 0} chars)`);
  }
  
  console.log(`[Job ${jobId}] ✅ Final HTML length: ${htmlContent.length} chars`);
  console.log(`[Job ${jobId}] 📄 HTML preview: ${htmlContent.substring(0, 200)}...`);

  // Update lecture with HTML ONLY (JSON conversion removed - Phase 2)
  // ✅ PHASE 1: Save to teacher_lectures table (correct table)
  const { error: updateError } = await supabase
    .from('teacher_lectures')
    .update({
      material_didatico: fixedReport,  // Save markdown too for reference
      material_didatico_html: htmlContent,  // ✅ Cleaned HTML saved here
      updated_at: new Date().toISOString()
    })
    .eq('id', lectureId);
  
  if (updateError) {
    console.error(`[Job ${jobId}] ❌ Failed to save to teacher_lectures:`, updateError);
    throw new Error(`Database save failed: ${updateError.message}`);
  }
  
  console.log(`[Job ${jobId}] ✅ Material saved to lecture ${lectureId}`);
}
