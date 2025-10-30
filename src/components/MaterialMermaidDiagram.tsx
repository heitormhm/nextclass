import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { initializeMermaid, sanitizeMermaidCode, injectMermaidErrorSuppression } from '@/lib/mermaidConfig';

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
        const sanitizedCode = sanitizeMermaidCode(code);
        
        if (!sanitizedCode || sanitizedCode.length < 10) {
          console.warn('[MaterialMermaid] Empty code, showing placeholder');
          setError('invalid');
          return;
        }

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
    <div className="bg-muted/30 p-4 rounded-lg border border-border my-4 w-full overflow-x-auto">
      {error ? (
        <div className="bg-muted/10 border-2 border-dashed border-border rounded-lg p-6">
          <div className="flex flex-col items-center justify-center min-h-[200px]">
            <div className="text-5xl mb-2 opacity-50">📊</div>
            <p className="text-xs text-muted-foreground/70">Visualização em construção</p>
          </div>
          {/* Debug code preview */}
          <details className="mt-3">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
              🔍 Ver código-fonte (debug)
            </summary>
            <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto max-h-40 font-mono">
              <code>{code.substring(0, 500)}{code.length > 500 ? '...' : ''}</code>
            </pre>
          </details>
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
