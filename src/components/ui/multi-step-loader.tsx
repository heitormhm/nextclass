import { cn } from "@/lib/utils";

interface LoadingState {
  text: string;
}

interface MultiStepLoaderProps {
  loadingStates: LoadingState[];
  loading: boolean;
  currentState?: number;
  duration?: number;
  onClose?: () => void;
}

export const MultiStepLoader = ({
  loadingStates,
  loading,
  currentState = 0,
  duration = 2000,
  onClose,
}: MultiStepLoaderProps) => {

  if (!loading) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-3 sm:px-4">
      <div className="relative w-full max-w-lg sm:max-w-xl md:max-w-2xl rounded-2xl border border-pink-200 dark:border-pink-800 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden">
        
        {/* Header com gradiente */}
        <div className="bg-gradient-to-r from-pink-500 to-pink-600 px-4 sm:px-6 py-5 sm:py-6 text-white">
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg sm:text-xl font-bold mb-1.5 sm:mb-2">
                🎓 A gerar o seu plano de aula...
              </h3>
              <p className="text-pink-100 text-xs sm:text-sm">
                ⏱️ Este processo pode demorar <span className="font-semibold">2 a 3 minutos</span>
              </p>
              <p className="text-pink-100 text-[10px] sm:text-xs mt-0.5 sm:mt-1">
                Estamos a analisar conteúdo académico e a estruturar pedagogicamente
              </p>
            </div>
            
            {onClose && (
              <button
                onClick={onClose}
                className="flex-shrink-0 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-xs sm:text-sm font-medium transition-all shadow-lg border border-white/30 whitespace-nowrap"
              >
                Minimizar
              </button>
            )}
          </div>
        </div>

        {/* Corpo do card */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 bg-white dark:bg-gray-900">
          
          {/* Aviso de background */}
          <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl bg-pink-50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-800">
            <div className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-pink-500 flex items-center justify-center mt-0.5">
              <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-pink-900 dark:text-pink-100">
                💡 Pode fechar este aviso
              </p>
              <p className="text-[10px] sm:text-xs text-pink-700 dark:text-pink-300 mt-0.5 sm:mt-1">
                O processamento continuará em background e será notificado quando concluir.
              </p>
            </div>
          </div>

          {/* Spinner central */}
          <div className="flex items-center justify-center py-3 sm:py-4">
            <div className="relative">
              <div className="h-14 w-14 sm:h-16 sm:w-16 animate-spin rounded-full border-4 border-pink-200 dark:border-pink-800 border-t-pink-500" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-pink-600 dark:text-pink-400">
                  {currentState + 1}/{loadingStates.length}
                </span>
              </div>
            </div>
          </div>

          {/* Lista de etapas */}
          <div className="space-y-1.5 sm:space-y-2 max-h-64 sm:max-h-96 overflow-y-auto pr-1 sm:pr-2">
            {loadingStates.map((state, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-2 sm:gap-3 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm transition-all duration-500",
                  index === currentState
                    ? "bg-pink-100 dark:bg-pink-950/50 border-2 border-pink-400 dark:border-pink-600 shadow-sm scale-105"
                    : index < currentState
                    ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800"
                    : "bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 opacity-60"
                )}
              >
                <div
                  className={cn(
                    "flex h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0 items-center justify-center rounded-full transition-all font-semibold",
                    index === currentState
                      ? "bg-pink-500 text-white shadow-md"
                      : index < currentState
                      ? "bg-green-500 text-white"
                      : "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300"
                  )}
                >
                  {index < currentState ? (
                    <svg
                      className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : index === currentState ? (
                    <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 animate-pulse rounded-full bg-white" />
                  ) : (
                    <span className="text-[10px] sm:text-xs">{index + 1}</span>
                  )}
                </div>
                <span className={cn(
                  "flex-1 min-w-0 leading-snug",
                  index === currentState 
                    ? "font-semibold text-pink-900 dark:text-pink-100" 
                    : index < currentState
                    ? "text-green-800 dark:text-green-200"
                    : "text-gray-500 dark:text-gray-400"
                )}>
                  {state.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
