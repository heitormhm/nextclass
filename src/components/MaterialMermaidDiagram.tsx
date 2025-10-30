import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { initializeMermaid, sanitizeMermaidCode, injectMermaidErrorSuppression, autoFixMermaidCode } from '@/lib/mermaidConfig';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { ExternalLink } from 'lucide-react';

interface MaterialMermaidDiagramProps {
  code: string;
}

/**
 * Standalone Mermaid renderer for Material Didático system
 * Replicates all robust features from MermaidDiagram.tsx but as an independent component
 * NOT to be used outside of MaterialDidaticoRenderer
 */

export const MaterialMermaidDiagram = ({ code }: MaterialMermaidDiagramProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Use global Mermaid configuration
  useEffect(() => {
    initializeMermaid();
    injectMermaidErrorSuppression();
  }, []);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!ref.current || !code) return;

      try {
        let sanitizedCode = sanitizeMermaidCode(code);
        
        if (!sanitizedCode || sanitizedCode.length < 10) {
          console.warn('[MaterialMermaid] Empty code, showing placeholder');
          setError('invalid');
          return;
        }

        // Apply automatic fixes for common syntax issues
        sanitizedCode = autoFixMermaidCode(sanitizedCode);

        // Mermaid already initialized globally - no need to reinitialize

        const uniqueId = `material-mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // 10-second timeout protection
        const renderTimeout = setTimeout(() => {
          console.error('[MaterialMermaid] Render timeout');
          setError('timeout');
        }, 10000);

        // 4 fallback strategies for progressive rendering
        const renderStrategies = [
          { name: 'Original', code: sanitizedCode },
          { 
            name: 'Add space after graph type', 
            code: sanitizedCode.replace(/^graph([A-Z]{2,})/m, 'graph $1 ') 
          },
          { 
            name: 'Remove quotes from labels', 
            code: sanitizedCode.replace(/\["([^"]+)"\]/g, '[$1]') 
          },
          { 
            name: 'Simplify text in labels', 
            code: sanitizedCode.replace(/\[([^\]]{50,})\]/g, (match, content) => {
              return `[${content.substring(0, 40)}...]`;
            })
          },
        ];

        let renderSuccess = false;
        
        for (const strategy of renderStrategies) {
          if (renderSuccess) break;
          
          try {
            console.log(`[MaterialMermaid] Trying strategy: ${strategy.name}`);
            const { svg } = await mermaid.render(`${uniqueId}-${strategy.name}`, strategy.code);
            
            clearTimeout(renderTimeout);
            
            if (ref.current) {
              ref.current.innerHTML = svg;
            }
            
            setError(null);
            renderSuccess = true;
            console.log(`[MaterialMermaid] ✅ Rendered successfully with strategy: ${strategy.name}`);
          } catch (strategyErr) {
            console.warn(`[MaterialMermaid] Strategy "${strategy.name}" failed:`, strategyErr);
            continue;
          }
        }
        
        if (!renderSuccess) {
          clearTimeout(renderTimeout);
          console.error('[MaterialMermaid] All render strategies failed');
          console.error('[MaterialMermaid] Original code:', sanitizedCode);
          setError('hidden');
        }
      } catch (err) {
        console.error('[MaterialMermaid] General error:', err);
        setError('hidden');
      }
    };
    
    renderDiagram();
  }, [code]);

  return (
    <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-lg border-2 border-slate-200 dark:border-slate-800 my-4 w-full overflow-x-auto">
      {error ? (
        <div>
          {/* Error message based on type */}
          {error === 'timeout' && (
            <div className="text-center mb-4">
              <div className="text-5xl mb-3">⏱️</div>
              <p className="text-slate-700 dark:text-slate-300 font-semibold mb-2">Tempo esgotado ao renderizar diagrama</p>
              <p className="text-xs text-muted-foreground">O diagrama é muito complexo. Exibindo código-fonte:</p>
            </div>
          )}
          
          {error === 'invalid' && (
            <div className="text-center mb-4">
              <div className="text-5xl mb-3">📊</div>
              <p className="text-slate-700 dark:text-slate-300 font-semibold mb-2">Diagrama não disponível</p>
              <p className="text-xs text-muted-foreground">Código Mermaid vazio ou inválido</p>
            </div>
          )}
          
          {error === 'hidden' && (
            <div className="text-center mb-4">
              <div className="text-5xl mb-3">🔧</div>
              <p className="text-slate-700 dark:text-slate-300 font-semibold mb-2">Erro ao renderizar diagrama</p>
              <p className="text-xs text-muted-foreground mb-4">Todas as estratégias de renderização falharam</p>
              
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(code);
                  toast({ title: "Código copiado!", description: "Cole em mermaid.live para debug" });
                }}
              >
                📋 Copiar código para debug
              </Button>
            </div>
          )}
          
          {/* Always show source code in case of error */}
          <details className="mt-4">
            <summary className="text-sm text-slate-600 dark:text-slate-400 cursor-pointer hover:text-foreground font-medium">
              🔍 Ver código-fonte Mermaid
            </summary>
            <pre className="mt-3 text-xs bg-slate-100 dark:bg-slate-800 p-3 rounded border border-slate-300 dark:border-slate-700 overflow-x-auto max-h-64 font-mono">
              <code>{code}</code>
            </pre>
          </details>
          
          {/* Link to external debug tool */}
          <div className="mt-4 text-center">
            <a 
              href={`https://mermaid.live/edit#pako:${btoa(code)}`}
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
            >
              🔗 Abrir em Mermaid Live Editor <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      ) : (
        <div
          ref={ref}
          className="mermaid-diagram-container flex justify-center items-center min-h-[200px]"
        />
      )}
    </div>
  );
};
