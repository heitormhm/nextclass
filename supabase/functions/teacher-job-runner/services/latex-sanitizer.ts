/**
 * LaTeX Sanitizer Service
 * 
 * Cleans up malformed LaTeX syntax before storing in database.
 * Primary focus: removing nested dollar signs that break KaTeX rendering.
 */

/**
 * Sanitizes LaTeX formulas in markdown content
 * 
 * Fixes common AI mistakes:
 * - Nested dollar signs: $$ $\frac{a}{b}$ $$ → $$ \frac{a}{b} $$
 * - Mixed delimiters: $ $$...$$ $ → $$...$$
 * - Extra whitespace inside formulas
 * - Validates balanced delimiters
 * 
 * @param markdown - Markdown content with LaTeX formulas
 * @param jobId - Job ID for logging
 * @returns Sanitized markdown
 */
export function sanitizeLaTeX(markdown: string, jobId: string): string {
  console.log(`[Job ${jobId}] 🔬 Starting LaTeX sanitization...`);
  
  let sanitized = markdown;
  let fixCount = 0;
  
  // Fix 1: Remove nested dollar signs in display math: $$ $..$ $$ → $$ .. $$
  sanitized = sanitized.replace(
    /\$\$\s*\$([^$]+)\$\s*\$\$/g,
    (match, inner) => {
      fixCount++;
      console.log(`[Job ${jobId}] 🔧 Fixed nested display math: ${match.substring(0, 50)}...`);
      return `$$ ${inner.trim()} $$`;
    }
  );
  
  // Fix 2: Remove nested dollar signs (reversed): $ $$..$$ $ → $$..$$
  sanitized = sanitized.replace(
    /\$\s*\$\$([^$]+)\$\$\s*\$/g,
    (match, inner) => {
      fixCount++;
      console.log(`[Job ${jobId}] 🔧 Fixed reversed nested math: ${match.substring(0, 50)}...`);
      return `$$ ${inner.trim()} $$`;
    }
  );
  
  // Fix 3: Normalize whitespace around display math delimiters
  sanitized = sanitized.replace(
    /\$\$\s{2,}([^$]+?)\s{2,}\$\$/g,
    (match, formula) => {
      return `$$ ${formula.trim()} $$`;
    }
  );
  
  // Fix 4: Remove spaces between $$ delimiters at start/end
  sanitized = sanitized.replace(/\$\$\s+\$/g, '$$');
  sanitized = sanitized.replace(/\$\s+\$\$/g, '$$');
  
  // Validation: Check for balanced display math delimiters
  const displayMatches = sanitized.match(/\$\$/g);
  const displayCount = displayMatches ? displayMatches.length : 0;
  
  if (displayCount % 2 !== 0) {
    console.warn(`[Job ${jobId}] ⚠️ Unbalanced display math delimiters detected: ${displayCount} occurrences`);
  }
  
  // Validation: Check for remaining nested delimiters
  const nestedPattern = /\$\$[^$]*\$[^$]+\$[^$]*\$\$/;
  if (nestedPattern.test(sanitized)) {
    console.warn(`[Job ${jobId}] ⚠️ Potential nested delimiters still present after sanitization`);
  }
  
  console.log(`[Job ${jobId}] ✅ LaTeX sanitization complete: ${fixCount} fixes applied`);
  
  return sanitized;
}
