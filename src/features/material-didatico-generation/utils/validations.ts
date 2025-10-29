/**
 * Validações para geração de material
 */
export const validateRegenerationConditions = (
  currentMaterial: string | undefined,
  isGenerating: boolean,
  lectureId: string | undefined,
): { isValid: boolean; error?: string } => {
  if (!lectureId) {
    return { isValid: false, error: 'ID da aula não encontrado' };
  }
  
  if (isGenerating) {
    return { isValid: false, error: 'Já existe uma geração em andamento' };
  }
  
  if (!currentMaterial) {
    return { isValid: false, error: 'Nenhum material para regenerar' };
  }
  
  return { isValid: true };
};
