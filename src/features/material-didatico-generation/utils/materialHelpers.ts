/**
 * Material Didático Helper Functions
 * Utilitários para processar e validar material didático
 */

/**
 * Extrai string de material didático de diferentes formatos
 */
export const extractMaterialString = (
  material: any
): string | undefined => {
  if (!material) return undefined;
  
  return typeof material === 'string' 
    ? material 
    : JSON.stringify(material);
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
