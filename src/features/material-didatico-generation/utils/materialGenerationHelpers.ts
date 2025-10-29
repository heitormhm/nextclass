/**
 * Material Generation Helper Functions
 * Pure utility functions for material generation logic
 */

// Generation steps constants
export const GENERATION_STEPS = {
  INITIALIZING: 0,
  ANALYZING: 1,
  SEARCHING: 2,
  GENERATING: 3,
  VALIDATING: 4,
  COMPLETE: 5,
} as const;

// Progress messages for each step
export const PROGRESS_MESSAGES: Record<number, string> = {
  [GENERATION_STEPS.INITIALIZING]: 'Iniciando pesquisa profunda...',
  [GENERATION_STEPS.ANALYZING]: 'Analisando transcrição...',
  [GENERATION_STEPS.SEARCHING]: 'Buscando fontes acadêmicas...',
  [GENERATION_STEPS.GENERATING]: 'Gerando conteúdo estruturado...',
  [GENERATION_STEPS.VALIDATING]: 'Validando referências e diagramas...',
  [GENERATION_STEPS.COMPLETE]: 'Material gerado com sucesso!',
};

// Validation thresholds
export const VALIDATION_CONFIG = {
  MIN_TITLE_LENGTH: 3,
  MIN_TRANSCRIPT_LENGTH: 100,
  MAX_RETRIES: 3,
  TIMEOUT_MS: 180000, // 3 minutes
} as const;

/**
 * Validate generation inputs
 */
export const validateGenerationInputs = (
  lectureId: string,
  lectureTitle: string,
  transcript?: string
): void => {
  if (!lectureId || !lectureTitle) {
    throw new Error('ID e título da aula são obrigatórios');
  }
  
  if (lectureTitle.length < VALIDATION_CONFIG.MIN_TITLE_LENGTH) {
    throw new Error('Título muito curto para gerar material relevante');
  }
  
  if (transcript && transcript.length < VALIDATION_CONFIG.MIN_TRANSCRIPT_LENGTH) {
    throw new Error('Transcrição muito curta para gerar material de qualidade');
  }
};

/**
 * Get user-friendly error message
 */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'Erro desconhecido na geração de material';
};

/**
 * Map job progress to UI step
 */
export const mapProgressToStep = (progress: number): number => {
  if (progress < 0.2) return GENERATION_STEPS.INITIALIZING;
  if (progress < 0.4) return GENERATION_STEPS.ANALYZING;
  if (progress < 0.6) return GENERATION_STEPS.SEARCHING;
  if (progress < 0.8) return GENERATION_STEPS.GENERATING;
  if (progress < 1.0) return GENERATION_STEPS.VALIDATING;
  return GENERATION_STEPS.COMPLETE;
};

/**
 * Get progress message based on step
 */
export const getProgressMessage = (step: number): string => {
  return PROGRESS_MESSAGES[step] || 'Processando...';
};

/**
 * Check if material generation is in terminal state
 */
export const isTerminalState = (status: string): boolean => {
  return status === 'COMPLETED' || status === 'FAILED';
};
