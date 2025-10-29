/**
 * Constantes de UI para componentes de geração de material
 */
export const MATERIAL_UI_CONFIG = {
  REDO_BUTTON: {
    SIZE: 'h-4 w-4',
    HOVER_SCALE: 'hover:scale-110',
    ACTIVE_SCALE: 'active:scale-95',
    TRANSITION: 'transition-all duration-200',
    PADDING: 'p-1.5',
    BORDER_RADIUS: 'rounded-full',
  },
  MODAL: {
    CONFIRM_TEXT: 'Substituir Material',
    CANCEL_TEXT: 'Cancelar',
    WARNING_ICON: '⚠️',
    WARNING_TITLE: 'Esta ação não pode ser desfeita.',
    WARNING_DESCRIPTION: 'O material atual será permanentemente substituído.',
  },
  PROGRESS: {
    CONTAINER_WIDTH: 'w-full max-w-md',
    SPACING: 'space-y-3',
    TEXT_SIZE: 'text-sm',
    SUBTEXT_SIZE: 'text-xs',
  },
} as const;

/**
 * Mensagens de erro para geração de material
 */
export const MATERIAL_ERROR_MESSAGES = {
  MISSING_LECTURE_ID: 'ID da aula não encontrado',
  ALREADY_GENERATING: 'Já existe uma geração em andamento',
  NO_MATERIAL_TO_REGENERATE: 'Nenhum material para regenerar',
  SYSTEM_NOT_READY: 'Sistema de geração não está pronto',
  MISSING_REQUIRED_DATA: 'Dados obrigatórios não fornecidos',
} as const;
