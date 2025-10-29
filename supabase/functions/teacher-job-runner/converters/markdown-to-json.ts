/**
 * Markdown to Structured JSON Converter
 * ✅ REFATORADO: Agora usa o módulo unificado
 */

import { convertMarkdownToStructuredJSON as convertUnified } from '../../shared/markdown-to-structured-json.ts';

export async function convertMarkdownToStructuredJSON(
  markdown: string,
  title: string,
  jobId: string
): Promise<any> {
  console.log(`[Job ${jobId}] 🔄 Using unified converter...`);
  
  const result = await convertUnified(markdown, title, {
    jobId,
    enableLatexFix: true,
    enableMermaidValidation: true,
    enableReferenceFormatting: false,
    enableMarkdownToHtml: false,
  });
  
  if (!result.success) {
    throw new Error(`Conversion failed: ${result.error}`);
  }
  
  if (result.warnings) {
    result.warnings.forEach(w => console.warn(`[Job ${jobId}] ⚠️ ${w}`));
  }
  
  return result.data;
}
