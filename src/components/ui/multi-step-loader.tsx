import { useState, useEffect } from "react";
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
      <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        
        {/* Header com gradiente */}
        <div className="bg-gradient-to-r from-pink-500 to-pink-600 px-6 py-6 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-2">
                🎓 A gerar o seu plano de aula...
              </h3>
              <p className="text-pink-100 text-sm">
                ⏱️ Este processo pode demorar <span className="font-semibold">2 a 3 minutos</span>
              </p>
              <p className="text-pink-100 text-xs mt-1">
                Estamos a analisar conteúdo académico e a estruturar pedagogicamente
              </p>
            </div>
            
            {onClose && (
              <button
                onClick={onClose}
                className="flex-shrink-0 px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-sm font-medium transition-all shadow-lg border border-white/30 whitespace-nowrap"
              >
                Minimizar
              </button>
            )}
          </div>
        </div>

        {/* Corpo do card */}
        <div className="p-6 space-y-6 bg-background">
          
          {/* Aviso de background */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-pink-50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-800">
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-pink-500 flex items-center justify-center mt-0.5">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-pink-900 dark:text-pink-100">
                💡 Pode fechar este aviso
              </p>
              <p className="text-xs text-pink-700 dark:text-pink-300 mt-1">
                O processamento continuará em background e será notificado quando concluir.
              </p>
            </div>
          </div>

          {/* Spinner central */}
          <div className="flex items-center justify-center py-4">
            <div className="relative">
              <div className="h-16 w-16 animate-spin rounded-full border-4 border-pink-200 dark:border-pink-800 border-t-pink-500" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-pink-600 dark:text-pink-400">
                  {currentState + 1}/{loadingStates.length}
                </span>
              </div>
            </div>
          </div>

          {/* Lista de etapas */}
          <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
            {loadingStates.map((state, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition-all duration-500",
                  index === currentState
                    ? "bg-pink-100 dark:bg-pink-950/50 border-2 border-pink-400 dark:border-pink-600 shadow-sm scale-105"
                    : index < currentState
                    ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800"
                    : "bg-muted border border-border opacity-60"
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-all font-semibold",
                    index === currentState
                      ? "bg-pink-500 text-white shadow-md"
                      : index < currentState
                      ? "bg-green-500 text-white"
                      : "bg-muted-foreground/20 text-muted-foreground"
                  )}
                >
                  {index < currentState ? (
                    <svg
                      className="h-4 w-4"
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
                    <div className="h-3 w-3 animate-pulse rounded-full bg-white" />
                  ) : (
                    <span className="text-xs">{index + 1}</span>
                  )}
                </div>
                <span className={cn(
                  "flex-1",
                  index === currentState 
                    ? "font-semibold text-pink-900 dark:text-pink-100" 
                    : index < currentState
                    ? "text-green-800 dark:text-green-200"
                    : "text-muted-foreground"
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
