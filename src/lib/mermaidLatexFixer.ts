/**
 * ==========================================
 * MERMAID LATEX FIXER - Consolidated Logic
 * ==========================================
 * 
 * Converts single $ to $$ in Mermaid diagram labels
 * Compatible with Deno and all browsers (no lookbehind)
 */

/**
 * Converts $ → $$ in Mermaid labels WITHOUT using lookbehind regex
 * This approach is compatible with Deno/V8 and older browsers
 * 
 * @param mermaidCode - The Mermaid diagram code
 * @returns Fixed Mermaid code with $$ in labels
 */
export function convertSingleToDoubleDollar(mermaidCode: string): string {
  let conversionsCount = 0;
  
  const processed = mermaidCode.replace(/\[(".*?")\]/gs, (match, quotedLabel) => {
    let inner = quotedLabel.slice(1, -1); // Remove outer quotes
    const original = inner;
    
    // Step 1: Protect existing $$ with placeholders
    inner = inner.replace(/\$\$/g, '___PROTECTED_DOUBLE___');
    
    // Step 2: Convert single $ → $$
    inner = inner.replace(/\$([^\$]+?)\$/g, (m, formula) => {
      conversionsCount++;
      console.log(`[LatexFixer] 💱 Converting: $${formula}$ → $$${formula}$$`);
      return `$$${formula}$$`;
    });
    
    // Step 3: Restore protected $$
    inner = inner.replace(/___PROTECTED_DOUBLE___/g, '$$');
    
    if (inner !== original) {
      console.log(`[LatexFixer] ✓ Label fixed (${original.length} → ${inner.length} chars)`);
    }
    
    return `["${inner}"]`;
  });
  
  console.log(`[LatexFixer] ✅ Total conversions: ${conversionsCount}`);
  return processed;
}

/**
 * Processes entire markdown content to fix Mermaid blocks
 * 
 * @param markdown - Full markdown content
 * @returns Fixed markdown with corrected Mermaid diagrams
 */
export function fixMermaidLatexInMarkdown(markdown: string): string {
  console.log('[LatexFixer] 🔄 Starting Mermaid LaTeX fix...');
  
  const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
  let blocksProcessed = 0;
  
  const fixed = markdown.replace(mermaidRegex, (fullMatch, diagramContent) => {
    blocksProcessed++;
    const processedContent = convertSingleToDoubleDollar(diagramContent);
    return `\`\`\`mermaid\n${processedContent}\`\`\``;
  });
  
  console.log(`[LatexFixer] ✅ Processed ${blocksProcessed} Mermaid blocks`);
  return fixed;
}

/**
 * Validates if Mermaid labels have proper $$ syntax
 * 
 * @param markdown - Markdown content to validate
 * @returns true if all labels use $$, false if single $ found
 */
export function validateMermaidLatex(markdown: string): {
  valid: boolean;
  singleDollarCount: number;
  examples: string[];
} {
  const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
  let singleDollarCount = 0;
  const examples: string[] = [];
  
  let match;
  while ((match = mermaidRegex.exec(markdown)) !== null) {
    const diagramContent = match[1];
    
    // Find labels with single $
    const labelRegex = /\["([^"]*)"\]/g;
    let labelMatch;
    while ((labelMatch = labelRegex.exec(diagramContent)) !== null) {
      const labelContent = labelMatch[1];
      
      // Check for single $ (not part of $$)
      // Simple approach: if has $ but after removing all $$, still has $
      const withoutDouble = labelContent.replace(/\$\$/g, '');
      if (withoutDouble.includes('$')) {
        singleDollarCount++;
        if (examples.length < 3) {
          examples.push(labelContent.substring(0, 60));
        }
      }
    }
  }
  
  return {
    valid: singleDollarCount === 0,
    singleDollarCount,
    examples
  };
}
