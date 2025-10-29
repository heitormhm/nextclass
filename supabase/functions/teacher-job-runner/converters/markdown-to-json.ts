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
  let currentList: string[] = [];
  
  const finalizeParagraph = () => {
    if (currentParagraph.trim()) {
      conteudo.push({
        tipo: 'paragrafo',
        texto: currentParagraph.trim()
      });
      currentParagraph = '';
    }
  };
  
  const finalizeList = () => {
    if (currentList.length > 0) {
      conteudo.push({
        tipo: 'lista',
        itens: currentList.map(item => item.trim())
      });
      currentList = [];
    }
  };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Handle empty lines (finalize current block)
    if (!trimmedLine) {
      finalizeParagraph();
      finalizeList();
      continue;
    }
    
    // Handle H2 headings
    if (trimmedLine.startsWith('## ')) {
      finalizeParagraph();
      finalizeList();
      conteudo.push({
        tipo: 'h2',
        texto: trimmedLine.replace('## ', '').replace(/\*\*/g, '').trim()
      });
      continue;
    }
    
    // Handle H3 headings
    if (trimmedLine.startsWith('### ')) {
      finalizeParagraph();
      finalizeList();
      conteudo.push({
        tipo: 'h3',
        texto: trimmedLine.replace('### ', '').replace(/\*\*/g, '').trim()
      });
      continue;
    }
    
    // Handle H4 headings
    if (trimmedLine.startsWith('#### ')) {
      finalizeParagraph();
      finalizeList();
      conteudo.push({
        tipo: 'h4',
        texto: trimmedLine.replace('#### ', '').replace(/\*\*/g, '').trim()
      });
      continue;
    }
    
    // Handle Mermaid diagrams
    if (trimmedLine.startsWith('```mermaid')) {
      finalizeParagraph();
      finalizeList();
      
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
    
    // Handle list items (-, *, •)
    if (/^[\-\*•]\s+/.test(trimmedLine)) {
      finalizeParagraph();
      const listItem = trimmedLine.replace(/^[\-\*•]\s+/, '');
      currentList.push(listItem);
      continue;
    }
    
    // Handle highlight boxes (> or **Importante:**)
    if (trimmedLine.startsWith('> ') || /^\*\*[A-Z][^:]+:\*\*/.test(trimmedLine)) {
      finalizeParagraph();
      finalizeList();
      
      let boxContent = trimmedLine.startsWith('> ') 
        ? trimmedLine.replace('> ', '') 
        : trimmedLine;
      
      // Collect multi-line boxes
      while (i + 1 < lines.length && (lines[i + 1].trim().startsWith('> ') || !lines[i + 1].trim())) {
        i++;
        if (lines[i].trim().startsWith('> ')) {
          boxContent += ' ' + lines[i].trim().replace('> ', '');
        }
      }
      
      conteudo.push({
        tipo: 'caixa_de_destaque',
        texto: boxContent.trim(),
        icone: '💡'
      });
      continue;
    }
    
    // Skip code blocks (not mermaid)
    if (trimmedLine.startsWith('```')) {
      while (i + 1 < lines.length && !lines[i + 1].trim().startsWith('```')) {
        i++;
      }
      i++; // Skip closing ```
      continue;
    }
    
    // Accumulate regular text as paragraphs (don't concatenate everything)
    if (!trimmedLine.startsWith('#') && !trimmedLine.startsWith('```')) {
      // If we have a list, finalize paragraph before starting list
      if (currentList.length > 0) {
        finalizeParagraph();
      }
      
      // If this is a new paragraph (previous was finalized), start fresh
      if (!currentParagraph) {
        currentParagraph = trimmedLine;
      } else {
        // Continue same paragraph
        currentParagraph += ' ' + trimmedLine;
      }
    }
  }
  
  // Add final blocks
  finalizeParagraph();
  finalizeList();
  
  // Validate no nested JSON strings
  conteudo.forEach((bloco, index) => {
    if (bloco.texto && typeof bloco.texto === 'string' && bloco.texto.startsWith('{')) {
      console.error(`[Job ${jobId}] ❌ CRITICAL: Nested JSON string detected at block ${index}`);
      throw new Error('Invalid JSON nesting - corrupt data structure');
    }
  });
  
  console.log(`[Job ${jobId}] ✅ Converted to ${conteudo.length} structured blocks`);
  console.log(`[Job ${jobId}] 📝 Block breakdown:`);
  
  const blockTypes = conteudo.reduce((acc: any, bloco) => {
    acc[bloco.tipo] = (acc[bloco.tipo] || 0) + 1;
    return acc;
  }, {});
  
  Object.entries(blockTypes).forEach(([tipo, count]) => {
    console.log(`  - ${tipo}: ${count}`);
  });
  
  return {
    titulo_geral: title,
    conteudo
  };
}
