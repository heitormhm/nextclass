import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks
 * Removes dangerous tags, attributes, and JavaScript
 */
export const sanitizeHTML = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'a', 'pre', 'code', 'blockquote',
      'table', 'thead', 'tbody', 'tr', 'td', 'th',
      'img', 'div', 'span', 'sup', 'sub'
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'style', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur']
  });
};

/**
 * Sanitiza e valida símbolos markdown para renderização correta
 * Corrige formatação incorreta e garante consistência
 */
export const sanitizeMarkdown = (markdown: string): string => {
  let sanitized = markdown;
  
  // 1. Corrigir espaçamento após cabeçalhos
  sanitized = sanitized.replace(/^(#{1,6})([^\s#])/gm, '$1 $2');
  
  // 2. Corrigir negrito mal formatado (*** ou **** para **)
  sanitized = sanitized.replace(/\*{3,}([^*]+)\*{3,}/g, '**$1**');
  
  // 3. Corrigir itálico mal formatado
  sanitized = sanitized.replace(/\*\*\*([^*]+)\*\*\*/g, '*$1*');
  
  // 4. Corrigir espaçamento em listas
  sanitized = sanitized.replace(/^(\d+\.)([^\s])/gm, '$1 $2');
  sanitized = sanitized.replace(/^([-*])([^\s])/gm, '$1 $2');
  
  // 5. Normalizar quebras de linha (máximo 2 consecutivas)
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n');
  
  // 6. Corrigir code blocks sem linguagem
  sanitized = sanitized.replace(/```\n/g, '```texto\n');
  
  // 7. Garantir espaço após blockquotes
  sanitized = sanitized.replace(/^>([^\s])/gm, '> $1');
  
  // 8. Corrigir links mal formatados
  sanitized = sanitized.replace(/\[([^\]]+)\]\s*\(([^)]+)\)/g, '[$1]($2)');
  
  // 9. Garantir que negrito/itálico não iniciem/terminem com espaço
  sanitized = sanitized.replace(/\*\*\s+([^*]+?)\s+\*\*/g, ' **$1** ');
  sanitized = sanitized.replace(/\*\s+([^*]+?)\s+\*/g, ' *$1* ');
  
  return sanitized.trim();
};

/**
 * Valida e normaliza markdown antes de processar para PDF ou anotações
 */
export const validateAndNormalizeMarkdown = (content: string): string => {
  console.log('🔍 [Markdown Validator] Iniciando validação...');
  
  // Primeiro sanitiza HTML perigoso
  const htmlSanitized = sanitizeHTML(content);
  
  // Depois normaliza markdown
  const markdownSanitized = sanitizeMarkdown(htmlSanitized);
  
  console.log('✅ [Markdown Validator] Validação concluída');
  console.log('📝 [Markdown Validator] Antes:', content.substring(0, 100));
  console.log('📝 [Markdown Validator] Depois:', markdownSanitized.substring(0, 100));
  
  return markdownSanitized;
};
