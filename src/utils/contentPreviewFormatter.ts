/**
 * Formata conteúdo estruturado para preview limpo
 * Remove JSON, HTML e processa markdown inline
 */

interface ContentBlock {
  tipo: string;
  texto?: string;
  conteudo?: string;
  nivel?: number;
  items?: string[];
  [key: string]: any;
}

interface StructuredData {
  content?: ContentBlock[];
  [key: string]: any;
}

/**
 * Extrai texto limpo de blocos estruturados
 */
const extractTextFromBlocks = (data: StructuredData): string => {
  if (!data.content || !Array.isArray(data.content)) {
    return '';
  }

  return data.content
    .map((block: ContentBlock) => {
      // Extrair texto de diferentes tipos de blocos
      if (block.texto) return block.texto;
      if (block.conteudo) return block.conteudo;
      if (block.tipo === 'lista' && block.items) {
        return block.items.join(' ');
      }
      return '';
    })
    .filter(Boolean)
    .join(' ');
};

/**
 * Remove tags HTML do texto
 */
const stripHtml = (html: string): string => {
  return html.replace(/<[^>]*>/g, '');
};

/**
 * Processa markdown inline (negrito, itálico)
 */
const processMarkdown = (text: string): string => {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1') // Negrito
    .replace(/\*(.+?)\*/g, '$1')     // Itálico
    .replace(/`(.+?)`/g, '$1')       // Code inline
    .replace(/\[(.+?)\]\(.+?\)/g, '$1'); // Links
};

/**
 * Limpa múltiplos espaços e quebras de linha
 */
const cleanWhitespace = (text: string): string => {
  return text
    .replace(/\s+/g, ' ')    // Múltiplos espaços -> 1 espaço
    .replace(/\n+/g, ' ')    // Quebras de linha -> espaço
    .trim();
};

/**
 * Formata conteúdo para preview (máx 200 caracteres)
 * Detecta e processa JSON estruturado, HTML e Markdown
 */
export const formatContentPreview = (content: string, maxLength: number = 200): string => {
  if (!content || content.trim().length === 0) {
    return 'Sem conteúdo';
  }

  let cleanText = content;

  // 1. DETECTAR JSON ESTRUTURADO
  if (content.includes('"tipo"') || content.includes('"texto"')) {
    try {
      const parsed = JSON.parse(content);
      cleanText = extractTextFromBlocks(parsed);
      
      // Se conseguiu extrair texto do JSON
      if (cleanText.length > 0) {
        cleanText = cleanWhitespace(cleanText);
        return cleanText.substring(0, maxLength) + (cleanText.length > maxLength ? '...' : '');
      }
    } catch (error) {
      // Se falhar o parse, continua com outras estratégias
      console.debug('Not valid JSON, trying other formats');
    }
  }

  // 2. REMOVER HTML
  cleanText = stripHtml(cleanText);

  // 3. PROCESSAR MARKDOWN INLINE
  cleanText = processMarkdown(cleanText);

  // 4. LIMPAR ESPAÇOS
  cleanText = cleanWhitespace(cleanText);

  // 5. TRUNCAR
  if (cleanText.length > maxLength) {
    cleanText = cleanText.substring(0, maxLength) + '...';
  }

  return cleanText || 'Sem conteúdo disponível';
};
