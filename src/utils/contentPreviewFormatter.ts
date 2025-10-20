/**
 * Formata preview de conteúdo estruturado (JSON, HTML, Markdown)
 * para exibição em cards de anotações
 */

/**
 * Extrai texto de estruturas JSON aninhadas recursivamente
 */
const extractTextRecursive = (obj: any): string => {
  let extractedText = "";

  // Tipos primitivos
  if (typeof obj === "string") {
    return obj;
  }

  // Arrays
  if (Array.isArray(obj)) {
    return obj.map(extractTextRecursive).join(" ");
  }

  // Objetos
  if (typeof obj === "object" && obj !== null) {
    // Priorizar campos comuns de texto
    const textFields = ["texto", "conteudo", "content", "title", "description", "label", "value"];
    
    for (const field of textFields) {
      if (obj[field]) {
        extractedText += extractTextRecursive(obj[field]) + " ";
      }
    }

    // Processar items de listas
    if (obj.items && Array.isArray(obj.items)) {
      extractedText += obj.items.join(" ") + " ";
    }

    // Processar recursivamente outros campos não capturados
    for (const [key, value] of Object.entries(obj)) {
      if (!textFields.includes(key) && key !== "items" && key !== "tipo" && key !== "type") {
        if (typeof value === "object") {
          extractedText += extractTextRecursive(value) + " ";
        }
      }
    }
  }

  return extractedText;
};

/**
 * Formata conteúdo para preview (máx 200 caracteres)
 */
export const formatContentPreview = (content: string, maxLength: number = 200): string => {
  if (!content || content.trim().length === 0) {
    return "Sem conteúdo disponível";
  }

  let cleanText = content;

  // 1. PROCESSAR JSON ESTRUTURADO (StatefulButtons)
  if (content.includes('"tipo"') || content.includes('"texto"') || content.includes('"content"')) {
    try {
      const parsed = JSON.parse(content);
      let extractedText = extractTextRecursive(parsed).trim();

      if (extractedText) {
        // Limpar múltiplos espaços
        extractedText = extractedText.replace(/\s+/g, " ");
        return extractedText.substring(0, maxLength) + (extractedText.length > maxLength ? "..." : "");
      }
    } catch (e) {
      // Fallback para processamento normal
      console.debug("Failed to parse JSON, continuing with HTML/Markdown processing");
    }
  }

  // 2. REMOVER TAGS HTML
  cleanText = cleanText.replace(/<[^>]*>/g, " ");

  // 3. PROCESSAR MARKDOWN INLINE
  cleanText = cleanText
    .replace(/\*\*(.+?)\*\*/g, "$1")      // Negrito
    .replace(/\*(.+?)\*/g, "$1")          // Itálico
    .replace(/`(.+?)`/g, "$1")            // Code inline
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Links [texto](url) → texto
    .replace(/^#+\s+/gm, "")              // Headers
    .replace(/^[-*]\s+/gm, "");           // Lista bullets

  // 4. LIMPAR MÚLTIPLOS ESPAÇOS E QUEBRAS DE LINHA
  cleanText = cleanText
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // 5. LIMITAR TAMANHO
  if (cleanText.length > maxLength) {
    return cleanText.substring(0, maxLength) + "...";
  }

  return cleanText || "Conteúdo não disponível";
};
