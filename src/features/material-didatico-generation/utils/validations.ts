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

/**
 * Interface para validação de dados da lecture
 */
export interface LectureDataValidation {
  isValid: boolean;
  warnings: string[];
  errors: string[];
}

/**
 * Valida dados necessários para geração de material
 */
export const validateLectureData = (
  lectureTitle: string,
  tags?: string[],
  transcript?: string
): LectureDataValidation => {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Validação crítica
  if (!lectureTitle || lectureTitle.trim() === '') {
    errors.push('Título da aula é obrigatório');
  }

  // Validações de qualidade
  if (!tags || tags.length === 0) {
    warnings.push('Nenhuma tag encontrada - pesquisa será menos precisa');
  }

  if (!transcript || transcript.trim().length < 100) {
    warnings.push('Transcrição muito curta ou ausente - material pode ser genérico');
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors,
  };
};

/**
 * Loga avisos de validação no console
 */
export const logValidationWarnings = (
  validation: LectureDataValidation,
  context: string
) => {
  if (validation.warnings.length > 0) {
    console.warn(`[${context}] ⚠️ Quality warnings:`, validation.warnings);
  }
  if (validation.errors.length > 0) {
    console.error(`[${context}] ❌ Validation errors:`, validation.errors);
  }
};
