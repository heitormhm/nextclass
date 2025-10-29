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
  
  // ✅ PHASE 4: NEW - Fix space after opening $ delimiter
  sanitized = sanitized.replace(/\$ \\dot\{/g, '$\\dot{');
  sanitized = sanitized.replace(/\$ \\frac\{/g, '$\\frac{');
  sanitized = sanitized.replace(/\$ \\/g, '$\\');
  fixCount += 3;
  
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
  
  // ✅ PHASE 2: NEW - Fix inline math inside display math
  sanitized = sanitized.replace(
    /\$\$([^$]*)\$([^$]+)\$([^$]*)\$\$/g,
    (match, before, formula, after) => {
      fixCount++;
      console.log(`[Job ${jobId}] 🔧 Fixed inline in display math: ${match.substring(0, 50)}...`);
      return `$$ ${before}${formula}${after} $$`.replace(/\s+/g, ' ').trim();
    }
  );
  
  // ✅ PHASE 2: NEW - Remove any $ inside $$ ... $$
  sanitized = sanitized.replace(
    /\$\$([^$]+(?:\$[^$]+)*)\$\$/g,
    (match, content) => {
      if (content.includes('$')) {
        fixCount++;
        const cleaned = content.replace(/\$/g, '');
        console.log(`[Job ${jobId}] 🔧 Removed $ inside display math: ${match.substring(0, 50)}...`);
        return `$$ ${cleaned.trim()} $$`;
      }
      return match;
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
  
  // ✅ PHASE 2: NEW - Normalize inline math
  sanitized = sanitized.replace(/\$\s+([^$]+?)\s+\$/g, '$ $1 $');
  
  // ✅ PHASE 7: Fix missing space between formula blocks
  // Pattern: $...$WORD or $...$Q = (no space after closing $)
  sanitized = sanitized.replace(
    /\$([^$]+)\$([A-Z])/g,
    (match, formula, after) => {
      fixCount++;
      console.log(`[Job ${jobId}] 🔧 Added space after formula: ${match.substring(0, 30)}...`);
      return `$ ${formula.trim()} $ ${after}`;
    }
  );
  
  // ✅ PHASE 2.1: Fix \text{...}$$WORD (missing space after display math)
  sanitized = sanitized.replace(
    /\$\$([^$]+)\$\$([A-Z_])/g,
    (match, formula, after) => {
      fixCount++;
      console.log(`[Job ${jobId}] 🔧 Added space after display math: ${match.substring(0, 30)}...`);
      return `$$ ${formula.trim()} $$ ${after}`;
    }
  );
  
  // ✅ PHASE 2.2: Fix formula$ TEXT (inline math followed by text without space)
  sanitized = sanitized.replace(
    /\$([^$]+)\$([A-Za-z])/g,
    (match, formula, after) => {
      fixCount++;
      console.log(`[Job ${jobId}] 🔧 Added space after inline math: ${match.substring(0, 30)}...`);
      return `$ ${formula.trim()} $ ${after}`;
    }
  );
  
  // ✅ PHASE 2.3: Fix orphaned \text{} commands outside delimiters (convert to plain text)
  sanitized = sanitized.replace(
    /(?<!\$)\\text\{([^}]+)\}(?!\$)/g,
    (match, text) => {
      fixCount++;
      console.log(`[Job ${jobId}] 🔧 Converted orphaned \\text to plain: ${text}`);
      return text;
    }
  );
  
  // ✅ PHASE 8: Fix invalid \cdotpt command (AI mistake) → \cdot
  sanitized = sanitized.replace(
    /\\cdotpt\b/g,
    () => {
      fixCount++;
      console.log(`[Job ${jobId}] 🔧 Fixed invalid \\cdotpt → \\cdot`);
      return '\\cdot';
    }
  );
  
  // ✅ PHASE 9: Merge consecutive inline math delimiters ($...$...$) → ($...$)
  sanitized = sanitized.replace(
    /\$\s*([^$]+?)\s*\$\s*([^$\n]+?)\s*\$/g,
    (match, part1, part2) => {
      // Only merge if part2 starts with LaTeX command or contains math symbols
      if (/^\\[a-z]+/i.test(part2.trim()) || /[\\(){}\[\]^_=+\-*/]/.test(part2)) {
        fixCount++;
        console.log(`[Job ${jobId}] 🔧 Unified fragmented delimiters: ${match.substring(0, 50)}...`);
        return `$ ${part1.trim()} ${part2.trim()} $`;
      }
      return match; // Keep separate if normal text
    }
  );
  
  // ✅ PHASE 10: Wrap orphaned LaTeX commands outside delimiters
  sanitized = sanitized.replace(
    /(?<![$$\\])(\\(?:dot|frac|text|times|Delta|sum|int|sqrt|partial|infty|alpha|beta|gamma|theta|lambda|mu|sigma|omega|cdot|pm|div|leq|geq|neq|approx|equiv)\{)/g,
    (match) => {
      fixCount++;
      console.log(`[Job ${jobId}] 🔧 Wrapped orphaned LaTeX command: ${match.substring(0, 30)}...`);
      return `$ ${match}`;
    }
  );
  
  // Close orphaned commands before next word
  sanitized = sanitized.replace(
    /\$\s*(\\[a-z]+(?:\{[^}]+\})+)\s+(?=[A-Z_][a-z])/g,
    (match, latexCmd) => {
      if (!match.includes('$ ')) { // Only if not already closed
        fixCount++;
        console.log(`[Job ${jobId}] 🔧 Closed orphaned delimiter: ${match.substring(0, 40)}...`);
        return `$ ${latexCmd.trim()} $ `;
      }
      return match;
    }
  );
  
  // ✅ PHASE 11: Iterative merging of complex fragmented inline math
  let prevSanitized = '';
  let passCount = 0;
  const maxPasses = 5;
  
  while (prevSanitized !== sanitized && passCount < maxPasses) {
    prevSanitized = sanitized;
    passCount++;
    
    sanitized = sanitized.replace(
      /\$\s*([^$\n]+?)\s*\$\s*([^$\n]{1,30}?)\s*\$/g,
      (match, part1, part2) => {
        // Merge if part2 is LaTeX-like (backslash, parentheses, or math symbols)
        const isLatexLike = /^[\s\\()\[\]{}+\-*/=^_0-9A-Za-z,\.<>]+$/.test(part2);
        const isShort = part2.length < 30;
        const hasNoWords = !/\b[A-Z][a-z]{4,}\b/.test(part2); // No long words like "Example"
        
        if (isLatexLike && isShort && hasNoWords) {
          fixCount++;
          return `$ ${part1.trim()} ${part2.trim()} $`;
        }
        return match;
      }
    );
  }
  
  if (passCount > 1) {
    console.log(`[Job ${jobId}] 🔁 Multi-pass merging completed in ${passCount} iterations, ${fixCount} total fixes`);
  }
  
  // ✅ PHASE 2: NEW - Fix unbalanced delimiters (emergency cleanup)
  const displayMatches = sanitized.match(/\$\$/g);
  const displayCount = displayMatches ? displayMatches.length : 0;
  
  if (displayCount % 2 !== 0) {
    console.warn(`[Job ${jobId}] ⚠️ Unbalanced display math delimiters detected: ${displayCount} occurrences - attempting fix`);
    // Remove the last unpaired $$
    const lastIndex = sanitized.lastIndexOf('$$');
    if (lastIndex !== -1) {
      sanitized = sanitized.substring(0, lastIndex) + sanitized.substring(lastIndex + 2);
      fixCount++;
    }
  }
  
  // Validation: Check for remaining nested delimiters
  const nestedPattern = /\$\$[^$]*\$[^$]+\$[^$]*\$\$/;
  if (nestedPattern.test(sanitized)) {
    console.warn(`[Job ${jobId}] ⚠️ Potential nested delimiters still present after sanitization`);
  }
  
  console.log(`[Job ${jobId}] ✅ LaTeX sanitization complete: ${fixCount} fixes applied`);
  
  return sanitized;
}
