import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-lg border border-border bg-white/90 backdrop-blur-lg p-8 shadow-2xl">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <X className="h-4 w-4 text-foreground" />
            <span className="sr-only">Fechar</span>
          </button>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-pink-500/20 border-t-pink-500" />
          </div>

          <div className="space-y-2">
            {loadingStates.map((state, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all",
                  index === currentState
                    ? "bg-pink-500/10 text-pink-500"
                    : index < currentState
                    ? "text-muted-foreground"
                    : "text-muted-foreground/60"
                )}
              >
                <div
                  className={cn(
                    "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all",
                    index === currentState
                      ? "border-pink-500 bg-pink-500"
                      : index < currentState
                      ? "border-pink-500 bg-pink-500"
                      : "border-border"
                  )}
                >
                  {index < currentState ? (
                    <svg
                      className="h-3 w-3 text-white"
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
                    <div className="h-2 w-2 animate-pulse rounded-full bg-white" />
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {index + 1}
                    </span>
                  )}
                </div>
                <span className={cn(index === currentState && "font-medium")}>
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
