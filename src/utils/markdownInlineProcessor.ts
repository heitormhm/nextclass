/**
 * Processamento de Markdown Inline
 * Converte e normaliza markdown inline (negrito, itálico) para texto formatado ou HTML
 */

/**
 * Processa markdown inline (negrito, itálico) dentro de texto
 * Preserva a estrutura do bloco mas formata o conteúdo interno
 */
export const processInlineMarkdown = (text: string): string => {
  if (!text) return '';
  
  let processed = text;
  
  // 1. Negrito: **texto** (preservar exatamente como está)
  processed = processed.replace(/\*\*([^*]+?)\*\*/g, '**$1**');
  
  // 2. Itálico: *texto* (mas não confundir com asteriscos de lista)
  processed = processed.replace(/(?<!\*)\*(?!\*)([^*\n]+?)(?<!\*)\*(?!\*)/g, '*$1*');
  
  // 3. Remover asteriscos órfãos (solitários sem par)
  processed = processed.replace(/(?<![\*#])\*(?![\*\s])/g, '');
  
  return processed;
};

/**
 * Converte markdown inline para HTML (para PDFs)
 * Usado para renderização visual em PDF
 */
export const markdownToHtml = (text: string): string => {
  if (!text) return '';
  
  return text
    // Negrito: **texto** → <strong>texto</strong>
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Itálico: *texto* → <em>texto</em>
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
    // Quebras de linha
    .replace(/\n/g, '<br>');
};
