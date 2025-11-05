/**
 * 📊 UNIFIED MERMAID DIAGRAM COMPONENT
 * Componente unificado - usa mermaidRenderingEngine.ts
 * Production-grade Mermaid renderer with native LaTeX support
 * 
 * PDF-Guided Implementation (Pages 5-14)
 */

import { useEffect, useRef, useState } from 'react';
import { 
  initializeMermaid, 
  sanitizeMermaidCode, 
  renderMermaidWithTimeout,
  getMermaidLiveEditorLink,
  validateMermaidSyntax
} from '@/lib/mermaidRenderingEngine';
import { MermaidErrorBoundary } from './MermaidErrorBoundary';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { ExternalLink, Copy, Info } from 'lucide-react';

interface MermaidDiagramProps {
  code: string;
  title?: string;
  description?: string;
  icon?: string;
}

type RenderStatus = 'initializing' | 'rendering' | 'success' | 'error';

export const MermaidDiagram = ({ code, title, description, icon }: MermaidDiagramProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<RenderStatus>('initializing');
  const [errorType, setErrorType] = useState<string | null>(null);
  const [renderTime, setRenderTime] = useState<number | null>(null);
  const [validationIssues, setValidationIssues] = useState<string[]>([]);

  // Initialize once per component mount
  useEffect(() => {
    const success = initializeMermaid();
    if (!success) {
      setStatus('error');
      setErrorType('initialization_failed');
    }
  }, []);

  // Render diagram whenever code changes
  useEffect(() => {
    const render = async () => {
      if (!containerRef.current || !code) {
        setStatus('error');
        setErrorType('empty_code');
        return;
      }

      setStatus('rendering');
      setErrorType(null);
      setValidationIssues([]);

      const sanitized = sanitizeMermaidCode(code);
      
      // ✅ FASE 4: Log código COMPLETO para debug (não apenas primeiros 200 chars)
      console.log('[MermaidDiagram] 📊 Código Mermaid COMPLETO:');
      console.log('='.repeat(80));
      console.log(sanitized);
      console.log('='.repeat(80));
      console.log('[MermaidDiagram] Tamanho:', sanitized.length, 'caracteres');
      
      // ✅ Validar antes de renderizar
      const validation = validateMermaidSyntax(sanitized);
      
      // ✅ FASE 4: Log validation issues ANTES de decidir se bloqueia
      if (!validation.isValid) {
        console.error('[MermaidDiagram] ❌ Validation issues:', validation.issues);
      }
      
      if (validation.warnings.length > 0) {
        console.warn('[MermaidDiagram] ⚠️ Validation warnings:', validation.warnings);
      }
      
      // ✅ FASE 3: MODO PERMISSIVO - Sempre tentar renderizar, mesmo com validation issues
      // Salvar issues para mostrar depois, mas NÃO bloquear rendering
      if (!validation.isValid) {
        console.warn('[MermaidDiagram] ⚠️ MODO PERMISSIVO: Tentando renderizar mesmo com validation issues...');
        setValidationIssues(validation.issues);
      }

      const { svg, error, metadata } = await renderMermaidWithTimeout(sanitized, 10000);

      if (error) {
        // ✅ FASE 4: Logs DETALHADOS quando falhar
        console.error('[MermaidDiagram] ❌ RENDER FAILED');
        console.error('='.repeat(80));
        console.error('[MermaidDiagram] Error type:', error);
        console.error('[MermaidDiagram] Code length:', metadata.codeLength);
        console.error('[MermaidDiagram] Render time:', metadata.renderTimeMs.toFixed(0), 'ms');
        console.error('[MermaidDiagram] Diagram type:', metadata.diagramType);
        console.error('[MermaidDiagram] Validation issues:', validationIssues);
        console.error('[MermaidDiagram] CÓDIGO COMPLETO QUE FALHOU:');
        console.error('='.repeat(80));
        console.error(sanitized);
        console.error('='.repeat(80));
        setStatus('error');
        setErrorType(error);
        setRenderTime(metadata.renderTimeMs);
      } else if (svg && containerRef.current) {
        containerRef.current.innerHTML = svg;
        setStatus('success');
        setRenderTime(metadata.renderTimeMs);
        console.log(`[MermaidDiagram] ✅ Rendered in ${metadata.renderTimeMs.toFixed(0)}ms`);
        if (metadata.hasLatex) {
          console.log('[MermaidDiagram] 📐 LaTeX formulas detected and rendered');
        }
        // ✅ FASE 3: Se tinha validation issues mas renderizou com sucesso, avisar
        if (validationIssues.length > 0) {
          console.warn('[MermaidDiagram] ⚠️ Renderizado com sucesso APESAR de validation issues:', validationIssues);
        }
      }
    };

    render();
  }, [code]);

  // ERROR STATE
  if (status === 'error') {
    return (
      <MermaidErrorBoundary>
        <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950 dark:to-orange-950 p-8 rounded-xl border-2 border-red-300 dark:border-red-800 my-6 shadow-md">
          <div className="text-center">
            <div className="text-5xl mb-3">
              {errorType === 'timeout' ? '⏱️' : 
               errorType === 'empty_code' ? '📊' : 
               errorType === 'initialization_failed' ? '🔧' : '⚠️'}
            </div>
            
            <p className="font-semibold text-slate-800 dark:text-slate-200 mb-2">
              {errorType === 'timeout' && 'Tempo esgotado ao renderizar diagrama'}
              {errorType === 'empty_code' && 'Código Mermaid vazio'}
              {errorType === 'syntax_error' && 'Erro de sintaxe no diagrama'}
              {errorType === 'validation_failed' && 'Erro de validação do diagrama'}
              {errorType === 'initialization_failed' && 'Falha ao inicializar renderizador'}
              {!errorType && 'Erro desconhecido'}
            </p>
            
            {errorType === 'validation_failed' && validationIssues.length > 0 && (
              <div className="mt-4 mb-4 text-left bg-white dark:bg-slate-900 p-3 rounded-lg border border-red-300 dark:border-red-700">
                <p className="text-sm font-semibold mb-2 text-red-800 dark:text-red-200">🔍 Problemas detectados:</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {validationIssues.map((issue, i) => (
                    <li key={i} className="text-red-700 dark:text-red-300">{issue}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {renderTime !== null && renderTime > 0 && (
              <p className="text-xs text-muted-foreground mb-4">
                Tentativa de renderização: {renderTime.toFixed(0)}ms
              </p>
            )}
            
            <div className="flex gap-2 justify-center flex-wrap mt-4">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(code);
                  toast({ title: "📋 Código copiado para área de transferência" });
                }}
              >
                <Copy className="h-4 w-4 mr-1" /> Copiar código
              </Button>
              
              <Button 
                size="sm" 
                variant="outline"
                asChild
              >
                <a 
                  href={getMermaidLiveEditorLink(code)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-1" /> Abrir em Mermaid Live
                </a>
              </Button>
            </div>
            
            <details className="mt-6 text-left bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
              <summary className="text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:text-primary flex items-center gap-2">
                <Info className="h-4 w-4" /> Ver código-fonte completo
              </summary>
              <pre className="mt-3 text-xs bg-slate-100 dark:bg-slate-800 p-3 rounded overflow-x-auto max-h-64 font-mono border border-slate-300 dark:border-slate-600">
                <code>{code}</code>
              </pre>
            </details>
          </div>
        </div>
      </MermaidErrorBoundary>
    );
  }

  // LOADING STATE
  if (status === 'rendering' || status === 'initializing') {
    return (
      <MermaidErrorBoundary>
        <div className="bg-gradient-to-br from-slate-50 to-purple-50 dark:from-slate-900 dark:to-purple-950 p-8 rounded-xl border-2 border-purple-200 dark:border-purple-800 my-6 min-h-[320px] flex items-center justify-center shadow-sm">
          <div className="text-center">
            <div className="animate-spin text-5xl mb-3">⏳</div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {status === 'initializing' ? 'Inicializando renderizador...' : 'Renderizando diagrama...'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Aguarde até 10 segundos
            </p>
          </div>
        </div>
      </MermaidErrorBoundary>
    );
  }

  // SUCCESS STATE (Purple gradient background)
  return (
    <MermaidErrorBoundary>
      <div className="relative bg-gradient-to-br from-purple-50 via-slate-50 to-purple-100 dark:from-purple-950 dark:via-slate-900 dark:to-purple-950 p-8 rounded-xl border-2 border-purple-300 dark:border-purple-700 my-6 shadow-lg">
        {/* Header (if provided) */}
        {(title || description) && (
          <div className="mb-6">
            {title && (
              <h4 className="font-bold text-foreground mb-2 text-base flex items-center gap-2">
                {icon && <span>{icon}</span>}
                <span>{title}</span>
              </h4>
            )}
            {description && (
              <p className="text-sm text-muted-foreground italic">{description}</p>
            )}
          </div>
        )}
        
        {/* Performance badge */}
        {renderTime && renderTime < 1000 && (
          <div className="absolute top-2 right-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs px-2 py-1 rounded-full font-semibold">
            ⚡ {renderTime.toFixed(0)}ms
          </div>
        )}
        
        <div
          ref={containerRef}
          className="flex justify-center items-center min-h-[300px] mermaid-container"
          style={{
            transform: 'scale(1.05)',
            transformOrigin: 'top center',
          }}
        />
      </div>
    </MermaidErrorBoundary>
  );
};
