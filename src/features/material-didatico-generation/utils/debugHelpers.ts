/**
 * Debug Helpers - Validação e Logging de Material Didático
 */

/**
 * Valida se material estruturado possui conteúdo real
 */
export const validateStructuredMaterial = (
  material: any
): { isValid: boolean; reason?: string; wordCount?: number } => {
  if (!material) {
    return { isValid: false, reason: 'Material is null/undefined' };
  }
  
  // Parse se for string
  let parsed = material;
  if (typeof material === 'string') {
    try {
      parsed = JSON.parse(material);
    } catch {
      return { isValid: false, reason: 'Failed to parse JSON' };
    }
  }
  
  // Verificar estrutura
  if (!parsed.conteudo || !Array.isArray(parsed.conteudo)) {
    return { isValid: false, reason: 'Missing conteudo array' };
  }
  
  // Verificar se array está vazio
  if (parsed.conteudo.length === 0) {
    return { isValid: false, reason: 'Empty conteudo array', wordCount: 0 };
  }
  
  // Contar palavras aproximadamente
  const wordCount = JSON.stringify(parsed.conteudo).split(/\s+/).length;
  
  if (wordCount < 100) {
    return { isValid: false, reason: 'Too short (< 100 words)', wordCount };
  }
  
  return { isValid: true, wordCount };
};

/**
 * Loga estado detalhado do material
 */
export const logMaterialState = (
  context: string,
  material: any,
  structuredContent?: any
) => {
  console.group(`[${context}] Material State`);
  console.log('- Material Type:', typeof material);
  console.log('- Material Preview:', typeof material === 'string' 
    ? material.substring(0, 100) 
    : JSON.stringify(material).substring(0, 100));
  
  const validation = validateStructuredMaterial(material);
  console.log('- Validation:', validation);
  
  if (structuredContent) {
    console.log('- Structured Content Keys:', Object.keys(structuredContent));
    console.log('- Has material_didatico:', !!structuredContent.material_didatico);
  }
  
  console.log('- Timestamp:', new Date().toISOString());
  console.groupEnd();
};
