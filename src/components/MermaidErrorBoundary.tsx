import React, { Component, ReactNode } from 'react';

interface MermaidErrorBoundaryProps {
  children: ReactNode;
}

interface MermaidErrorBoundaryState {
  hasError: boolean;
  errorMessage?: string;
}

/**
 * Error Boundary to catch and handle Mermaid rendering errors gracefully.
 * Prevents the entire app from crashing when a Mermaid diagram fails to render.
 */
export class MermaidErrorBoundary extends Component<
  MermaidErrorBoundaryProps,
  MermaidErrorBoundaryState
> {
  constructor(props: MermaidErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): MermaidErrorBoundaryState {
    console.error('[MermaidErrorBoundary] Caught render error:', error.message);
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details silently without disrupting the user experience
    console.error('[MermaidErrorBoundary] Component stack:', errorInfo.componentStack);
    console.error('[MermaidErrorBoundary] Full error:', error);
  }

  render() {
    if (this.state.hasError) {
      // Friendly fallback UI - matches the placeholder shown by MermaidDiagram itself
      return (
        <div className="bg-muted/30 p-6 rounded-xl border-2 border-border my-6">
          <div className="flex flex-col items-center justify-center min-h-[200px] bg-muted/10 rounded-lg p-4">
            <div className="text-5xl mb-2 opacity-50">📊</div>
            <p className="text-xs text-muted-foreground/70">Visualização em construção</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
