/**
 * ⚠️ DEPRECATED (Phase 3) - LEGACY SUPPORT ONLY
 * Markdown to Structured JSON Converter
 * This converter is NO LONGER USED for new material generation.
 * New materials use HTML-only format (markdown → HTML).
 * Kept for backward compatibility with old lectures that have JSON format.
 * 
 * Last used: 2025-10-29 (before Phase 2 removal)
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
