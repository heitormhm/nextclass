/**
 * Markdown to Structured JSON Converter
 * Converts educational markdown content into structured JSON format
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
  console.log(`[Job ${jobId}] 🔄 Converting markdown to structured JSON...`);
  
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
    
    // Handle empty lines (finalize current block to prevent concatenation)
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
    
    // Accumulate regular text as paragraphs (CRITICAL: don't concatenate all content)
    if (!trimmedLine.startsWith('#') && !trimmedLine.startsWith('```')) {
      // If we have an active list, finalize paragraph before continuing
      if (currentList.length > 0) {
        finalizeParagraph();
      }
      
      // Start new paragraph or continue existing one
      if (!currentParagraph) {
        currentParagraph = trimmedLine;
      } else {
        // Continue same paragraph with space separator
        currentParagraph += ' ' + trimmedLine;
      }
    }
  }
  
  // Finalize remaining content
  finalizeParagraph();
  finalizeList();
  
  // CRITICAL VALIDATION: No nested JSON strings allowed
  conteudo.forEach((bloco, index) => {
    if (bloco.texto && typeof bloco.texto === 'string' && bloco.texto.trim().startsWith('{')) {
      console.error(`[Job ${jobId}] ❌ CRITICAL: Nested JSON detected at block ${index}:`, bloco.texto.substring(0, 100));
      throw new Error('Invalid JSON nesting detected - parser failed');
    }
  });
  
  // Detailed logging for debugging
  console.log(`[Job ${jobId}] ✅ Parsed ${conteudo.length} structured blocks`);
  conteudo.slice(0, 3).forEach((bloco, i) => {
    const preview = bloco.texto?.substring(0, 60) || bloco.definicao_mermaid?.substring(0, 60) || '';
    console.log(`  Block ${i}: ${bloco.tipo} - ${preview}...`);
  });
  
  const blockTypes = conteudo.reduce((acc: any, bloco) => {
    acc[bloco.tipo] = (acc[bloco.tipo] || 0) + 1;
    return acc;
  }, {});
  
  console.log(`[Job ${jobId}] 📊 Block type distribution:`, blockTypes);
  
  return {
    titulo_geral: title,
    conteudo
  };
}
