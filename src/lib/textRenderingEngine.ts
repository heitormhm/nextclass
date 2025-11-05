/**
 * 📝 TEXT RENDERING ENGINE
 * Handles LaTeX/KaTeX rendering in markdown text content
 * Independent from Mermaid diagram rendering
 * 
 * PDF Reference: Page 5-7 (KaTeX Integration Best Practices)
 */

import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css'; // CRITICAL: CSS must match version (PDF pg 5)

export const KATEX_TEXT_CONFIG = {
  // Core rendering options
  throwOnError: false,      // Never crash on LaTeX errors (PDF pg 7)
  errorColor: '#dc2626',    // Red for visible errors
  strict: false,            // Accept relaxed LaTeX syntax
  trust: true,              // Allow advanced commands
  output: 'html',           // HTML output (not MathML - PDF pg 7)
  
  // Cross-browser consistency (PDF pg 7)
  fleqn: false,             // Center equations (default)
  displayMode: false,       // Auto-detect display vs inline
  
  // Common macros for engineering/physics (PDF pg 9-10)
  macros: {
    '\\RR': '\\mathbb{R}',
    '\\CC': '\\mathbb{C}',
    '\\NN': '\\mathbb{N}',
    '\\vect': '\\mathbf{#1}',
    '\\grad': '\\nabla',
    '\\curl': '\\nabla \\times',
    '\\div': '\\nabla \\cdot',
    '\\cdotp': '\\cdot',  // Fix for materials using \cdotp (compatibility)
  }
} as const;

export const getRehypeKatexPlugin = (): [any, any] => {
  return [rehypeKatex, KATEX_TEXT_CONFIG];
};

/**
 * Validate LaTeX syntax quality
 * Prevents common errors from propagating
 */
export const validateLatexQuality = (markdown: string): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check 1: Balanced delimiters
  const dollarCount = (markdown.match(/\$/g) || []).length;
  if (dollarCount % 2 !== 0) {
    errors.push(`Unmatched LaTeX delimiters (${dollarCount} total $ signs)`);
  }
  
  // Check 2: Orphaned placeholders (should NEVER exist in output)
  const placeholders = markdown.match(/___LATEX_(BLOCK|INLINE)_\d+___/g);
  if (placeholders && placeholders.length > 0) {
    errors.push(`CRITICAL: ${placeholders.length} orphaned placeholders detected`);
  }
  
  // Check 3: Spacing issues around delimiters
  const spacedDelimiters = markdown.match(/\$\$\s{2,}|\s{2,}\$\$/g);
  if (spacedDelimiters && spacedDelimiters.length > 0) {
    warnings.push(`${spacedDelimiters.length} spacing issues around $$`);
  }
  
  // Check 4: Display math on same line as text (formatting issue)
  const inlineDisplayMath = markdown.match(/[a-záàâãéêíóôõúçñ]\$\$/gi);
  if (inlineDisplayMath && inlineDisplayMath.length > 0) {
    warnings.push(`${inlineDisplayMath.length} display math ($$) not on separate line`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Verify KaTeX CSS is loaded (PDF pg 5 - most critical dependency)
 */
export const verifyKatexCSSLoaded = (): boolean => {
  const katexCSSLoaded = Array.from(document.styleSheets).some(sheet => 
    sheet.href && sheet.href.includes('katex')
  );
  
  if (!katexCSSLoaded) {
    console.error('[TextRenderingEngine] ❌ CRITICAL: KaTeX CSS not loaded!');
    console.error('[TextRenderingEngine] Formulas will NOT render correctly');
    console.error('[TextRenderingEngine] Add: <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">');
  }
  
  return katexCSSLoaded;
};
