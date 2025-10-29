/**
 * Markdown to JSON Converter
 * Parses markdown content into structured JSON format for database storage
 */

import { aggressiveLatexFix, normalizeLatexSyntax } from './latex-normalizer.ts';
import { validateAndFixMermaidSyntax } from '../validators/mermaid-validator.ts';

/**
 * Convert markdown content to structured JSON format
 */
export async function convertMarkdownToStructuredJSON(
  markdown: string,
  title: string,
  jobId: string
): Promise<any> {
  // Apply LaTeX fixes and normalization
  const fixed = aggressiveLatexFix(markdown);
  const normalized = normalizeLatexSyntax(fixed);
  
  // Clean bold formatting from headings
  const cleanedMarkdown = normalized.replace(/^(#{1,4})\s*(.+)$/gm, (match, hashes, content) => {
    return `${hashes} ${content.replace(/\*\*/g, '').trim()}`;
  });
  
  const lines = cleanedMarkdown.split('\n');
  const conteudo: any[] = [];
  let currentParagraph = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Handle empty lines (paragraph breaks)
    if (!line) {
      if (currentParagraph) {
        conteudo.push({
          tipo: 'paragrafo',
          texto: currentParagraph.trim()
        });
        currentParagraph = '';
      }
      continue;
    }
    
    // Handle H2 headings
    if (line.startsWith('## ')) {
      if (currentParagraph) {
        conteudo.push({
          tipo: 'paragrafo',
          texto: currentParagraph.trim()
        });
        currentParagraph = '';
      }
      conteudo.push({
        tipo: 'h2',
        texto: line.replace('## ', '').replace(/\*\*/g, '').trim()
      });
      continue;
    }
    
    // Handle Mermaid diagrams
    if (line.startsWith('```mermaid')) {
      if (currentParagraph) {
        conteudo.push({
          tipo: 'paragrafo',
          texto: currentParagraph.trim()
        });
        currentParagraph = '';
      }
      
      let mermaidCode = '';
      i++; // Skip the opening ```mermaid line
      
      // Collect mermaid code until closing ```
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        mermaidCode += lines[i] + '\n';
        i++;
      }
      
      // Validate and fix Mermaid syntax
      const validation = await validateAndFixMermaidSyntax(mermaidCode, jobId);
      
      if (validation.valid) {
        conteudo.push({
          tipo: 'fluxograma',
          definicao_mermaid: validation.fixed.trim(),
          titulo: '📊 Diagrama Visual',
          descricao: 'Representação visual do conceito'
        });
      } else {
        console.warn(`[Job ${jobId}] ⚠️ Invalid Mermaid diagram skipped:`, validation.errors);
      }
      continue;
    }
    
    // Accumulate regular text as paragraphs
    if (!line.startsWith('#') && !line.startsWith('```')) {
      currentParagraph += (currentParagraph ? ' ' : '') + line;
    }
  }
  
  // Add final paragraph if exists
  if (currentParagraph.trim()) {
    conteudo.push({
      tipo: 'paragrafo',
      texto: currentParagraph.trim()
    });
  }
  
  console.log(`[Job ${jobId}] ✅ Converted to ${conteudo.length} structured blocks`);
  
  return {
    titulo_geral: title,
    conteudo
  };
}
