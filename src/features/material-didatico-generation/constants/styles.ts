/**
 * Constantes de estilo para componentes de geração de material
 */
export const MATERIAL_GENERATION_STYLES = {
  // Botão de redo
  redoButton: {
    base: "ml-2 p-1.5 rounded-full transition-all duration-200 flex items-center justify-center",
    hover: "hover:bg-purple-100 dark:hover:bg-purple-900/30 hover:scale-110",
    active: "active:scale-95",
    icon: "h-4 w-4 text-purple-600 dark:text-purple-400",
  },
  
  // Botão principal
  generateButton: {
    base: "gap-2 h-10 font-semibold border-0 shadow-lg hover:shadow-xl transition-all duration-200",
    gradient: "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700",
    disabled: "disabled:opacity-50",
    size: "whitespace-nowrap min-w-[240px]",
  },
  
  // Progress
  progress: {
    container: "w-full max-w-md space-y-3",
    text: "text-sm font-medium text-purple-900 dark:text-purple-100",
    subtext: "text-xs text-purple-600 dark:text-purple-300",
  },
} as const;
