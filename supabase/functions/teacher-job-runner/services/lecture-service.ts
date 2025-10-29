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
  
  // Validate minimum word count
  const wordCount = fixedReport
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .split(/\s+/)
    .filter(w => w.length > 0).length;
  
  if (wordCount < 3000) {
    throw new Error(`Material muito curto (${wordCount} palavras). Mínimo: 3000.`);
  }

  // Convert markdown to structured JSON format
  const structuredJSON = await convertMarkdownToStructuredJSON(
    fixedReport,
    'Material Didático',
    jobId
  );
  
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
