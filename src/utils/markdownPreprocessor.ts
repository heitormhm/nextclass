/**
 * Remove backticks incorretos de variáveis e fórmulas matemáticas
 */
export const preprocessMarkdownContent = (content: string): string => {
  // Remove backticks from math variables (1-5 chars with symbols)
  content = content.replace(/`([A-Za-zΔΣπθλμαβγΩωΦψÁρ]{1,5}[₀-₉⁰-⁹]*)`/g, '$1');
  
  // Remove backticks from simple math formulas (ex: `P = F / A`)
  content = content.replace(/`([A-Za-zΔΣπθλμαβγΩωΦψÁρ₀-₉⁰-⁹\s=+\-*/()]{3,30})`/g, '$1');
  
  // Remove backticks from numbers with subscripts (ex: `P_2`)
  content = content.replace(/`([A-Za-z]_\d+)`/g, '$1');
  
  return content;
};
