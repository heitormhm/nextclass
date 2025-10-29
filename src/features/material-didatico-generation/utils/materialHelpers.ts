/**
 * Material Didático Helper Functions
 * Utilitários para processar e validar material didático
 */

/**
 * Extrai string de material didático de diferentes formatos
 * ✅ FASE 2: Validação robusta de material vazio
 */
export const extractMaterialString = (
  material: any
): string | undefined => {
  if (!material) return undefined;
  
  // Validação para objeto vazio
  if (typeof material === 'object') {
    // Verificar se é o formato estruturado
    if (material.conteudo && Array.isArray(material.conteudo)) {
      // ✅ VALIDAÇÃO: Conteúdo vazio = material inválido
      if (material.conteudo.length === 0) {
        console.warn('[materialHelpers] Material has empty conteudo array');
        return undefined;
      }
      return JSON.stringify(material);
    }
    
    // Objeto genérico vazio
    if (Object.keys(material).length === 0) {
      return undefined;
    }
    
    return JSON.stringify(material);
  }
  
  // String vazia
  if (typeof material === 'string') {
    const trimmed = material.trim();
    if (trimmed === '' || trimmed === '{}' || trimmed === 'null') {
      return undefined;
    }
    return material;
  }
  
  return undefined;
};

/**
 * Verifica se material existe e é válido
 */
export const hasMaterialContent = (
  structuredContent: any
): boolean => {
  return !!(
    structuredContent?.material_didatico &&
    (typeof structuredContent.material_didatico === 'string' ||
     Object.keys(structuredContent.material_didatico).length > 0)
  );
};

/**
 * Valida se conteúdo estruturado possui dados mínimos necessários
 */
export const isValidStructuredContent = (
  content: any
): boolean => {
  return !!(
    content &&
    (content.titulo_aula || content.topicos_principais || content.material_didatico)
  );
};
