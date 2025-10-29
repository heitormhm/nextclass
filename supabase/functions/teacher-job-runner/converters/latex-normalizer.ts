/**
 * LaTeX syntax normalization and fixing utilities
 */

/**
 * Aggressive LaTeX fixing - removes corrupted placeholders and fixes syntax
 */
export function aggressiveLatexFix(text: string): string {
  console.log('[AGGRESSIVE LaTeX Fix] 🔥 Fixing corrupted LaTeX...');
  
  let fixed = text;
  
  // 1. Remover placeholders corrompidos: ** 1$ **, ___LATEX_DOUBLE_2___, etc.
  fixed = fixed.replace(/\*\*\s*\d+\$\s*\*\*/g, ''); // ** 1$ **
  fixed = fixed.replace(/___LATEX_DOUBLE_\d+___/g, ''); // ___LATEX_DOUBLE_2___
  fixed = fixed.replace(/___LATEX_SINGLE_\d+___/g, ''); // ___LATEX_SINGLE_X___
  fixed = fixed.replace(/\*\*\s*\\\w+.*?\$\s*\*\*/g, (match) => {
    // ** \command ...$ ** → $$\command ...$$
    const formula = match.replace(/\*\*/g, '').replace(/\$/g, '').trim();
    return ` $$${formula}$$ `;
  });
  
  // ✅ FASE 2.1: Detectar e remover $ isolados com espaços
  fixed = fixed.replace(/\$\s+/g, ''); // "$ " → ""
  fixed = fixed.replace(/\s+\$/g, ''); // " $" → ""
  
  // ✅ FASE 2.2: Detectar $ sem fechamento (ex: "$dU " sem "$$")
  fixed = fixed.replace(/\$([^$\n]{1,50})(?!\$)/g, '$$$$1$$'); // "$dU " → "$$dU$$"
  
  // ✅ FASE 2.3: Remover variáveis de 1 letra isoladas FORA de LaTeX
  const parts = fixed.split('$$');
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) { // Apenas partes fora de $$
      parts[i] = parts[i].replace(/\s([a-z])\s+/gi, ' '); // " e " → " "
    }
  }
  fixed = parts.join('$$');
  
  // ✅ FASE 2.4: Completar fórmulas incompletas (ex: "dU = Q - W" sem $$)
  fixed = fixed.replace(
    /\b([A-Z][a-z]?)\s*=\s*([A-Z][a-z]?)\s*[-+]\s*([A-Z][a-z]?)/g,
    '$$$$1 = $$2 - $$3$$'
  );
  
  // 2. Detectar expressões matemáticas isoladas (sem $$)
  // Ex: "Onde: \Delta U = Q - W" → "Onde: $$\Delta U = Q - W$$"
  fixed = fixed.replace(
    /(?:^|\n|\s)(\\[A-Za-z]+(?:\{[^}]*\})?(?:\s*[=+\-*/^_]\s*\\?[A-Za-z0-9{}]+)+)/gm,
    (match, formula) => {
      // Só envolver se já não estiver em $$
      if (!match.includes('$$')) {
        return match.replace(formula, ` $$${formula.trim()}$$ `);
      }
      return match;
    }
  );
  
  // 3. Converter $ simples para $$ (mas evitar duplicação)
  fixed = fixed.replace(/\$([^$\n]+?)\$/g, (match, content) => {
    // Se já está em $$, pular
    if (match.startsWith('$$')) return match;
    return `$$${content}$$`;
  });
  
  // 4. Limpar espaços extras ao redor de fórmulas
  fixed = fixed.replace(/\s+\$\$/g, ' $$');
  fixed = fixed.replace(/\$\$\s+/g, '$$ ');
  
  console.log('[AGGRESSIVE LaTeX Fix] ✅ Completed aggressive fix');
  return fixed;
}

/**
 * Normalize LaTeX syntax - ensure proper delimiters and spacing
 */
export function normalizeLatexSyntax(text: string): string {
  let normalized = text;
  
  // Normalizar $ expr $ → $$expr$$
  normalized = normalized.replace(/\$\s+(.+?)\s+\$/g, '$$$$1$$');
  
  // Garantir espaço antes e depois de $$
  normalized = normalized.replace(/([^\s])\$\$/g, '$1 $$');
  normalized = normalized.replace(/\$\$([^\s])/g, '$$ $1');
  
  return normalized;
}

/**
 * Fix common LaTeX errors in markdown content
 */
export async function fixLatexErrors(markdown: string, jobId: string): Promise<string> {
  console.log(`[Job ${jobId}] 🔧 Fixing LaTeX errors...`);
  
  let fixed = markdown;
  
  // Fix 1: CdotB malformed → C × B
  fixed = fixed.replace(/C\s*dot\s*B/gi, 'C × B');
  fixed = fixed.replace(/([A-Z])\\cdot([A-Z])/g, '$1 \\times $2');
  
  // Fix 2: Multiplication with \cdot → \times (unless it's vector dot product)
  fixed = fixed.replace(/(\d+)\s*\\cdot\s*(\d+)/g, '$1 \\times $2');
  
  // Fix 3: Formulas without $$ → add delimiters
  fixed = fixed.replace(/(?<!\$)\\frac\{([^}]+)\}\{([^}]+)\}(?!\$)/g, '$$\\frac{$1}{$2}$$');
  
  // Fix 4: Ensure proper spacing around inline math
  fixed = fixed.replace(/\$\$([^\$]+)\$\$/g, ' $$\$1$$ ');
  
  console.log(`[Job ${jobId}] ✅ LaTeX errors fixed`);
  return fixed;
}
