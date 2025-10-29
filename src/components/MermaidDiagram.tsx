import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { MermaidErrorBoundary } from './MermaidErrorBoundary';

interface MermaidDiagramProps {
  code: string;
  title: string;
  description: string;
  icon: string;
}

// ✅ PHASE 3: Sanitize HTML and markdown markers
const sanitizeMermaidCode = (code: string): string => {
  if (!code || code.trim().length < 10) {
    console.warn('[MermaidDiagram] Code too short or empty');
    return '';
  }

  console.log(`[MermaidDiagram] 🧹 Sanitizing ${code.length} chars...`);
  const htmlTagsFound = (code.match(/<[^>]+>/g) || []).length;

  // Remove markdown markers and sanitize HTML
  let sanitized = code.trim()
    .replace(/^```mermaid\s*/i, '')
    .replace(/^```\s*$/, '')
    .replace(/```$/, '')
    .replace(/<br\s*\/>/gi, '<br>')  // Convert self-closing <br/> to <br>
    .replace(/<\/?[^>]+(>|$)/g, '');  // Remove all other HTML tags

  const charsRemoved = code.length - sanitized.trim().length;
  console.log(`[MermaidDiagram] ✅ Result: ${sanitized.length} chars (removed ${charsRemoved} chars, ${htmlTagsFound} HTML tags)`);
  return sanitized.trim();
};

export const MermaidDiagram = ({ code, title, description, icon }: MermaidDiagramProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const renderTimeoutRef = useRef<number | null>(null);

  // ✅ PHASE 2: Safety timeout to prevent infinite loading (8 seconds)
  useEffect(() => {
    renderTimeoutRef.current = window.setTimeout(() => {
      if (isLoading && !error && !svgContent) {
        console.error('[MermaidDiagram] ⏱️ Rendering timeout (8s) - diagram may have syntax issues');
        setError('timeout-exceeded');
        setIsLoading(false);
      }
    }, 8000);

    return () => {
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
        renderTimeoutRef.current = null;
      }
    };
  }, [isLoading, error, svgContent]);

  // Inject CSS to forcefully hide mermaid error messages
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'mermaid-error-suppression';
    style.innerHTML = `
      /* Hide all Mermaid error messages globally */
      .error-icon,
      .error-text,
      [id*="mermaid-error"],
      [class*="error"]:has(svg),
      svg text:contains("Syntax error"),
      svg text:contains("version 10.9.4") {
        display: none !important;
        visibility: hidden !important;
      }
    `;
    
    if (!document.getElementById('mermaid-error-suppression')) {
      document.head.appendChild(style);
    }
    
    return () => {
      const existingStyle = document.getElementById('mermaid-error-suppression');
      if (existingStyle) existingStyle.remove();
    };
  }, []);

  // ✅ PHASE 3: Fixed race condition with isMounted flag
  useEffect(() => {
    let isMounted = true;
    let safetyTimeoutId: ReturnType<typeof setTimeout> | null = null;
    
    const renderDiagram = async () => {
      if (!ref.current || !code || !isMounted) return;

      console.log('[Mermaid] Attempting to render diagram');
      setIsLoading(true);
      setError(null);

      // Safety timeout with explicit cleanup tracking (reduced to 8s)
      safetyTimeoutId = setTimeout(() => {
        if (isMounted) {
          console.warn('[Mermaid] Safety timeout triggered at 8s');
          setIsLoading(false);
          setError('timeout');
        }
      }, 8000);

      try {
        const sanitizedCode = sanitizeMermaidCode(code);
        
        if (!sanitizedCode || sanitizedCode.length < 10) {
          console.warn('[Mermaid] Empty code, showing placeholder');
          if (safetyTimeoutId) clearTimeout(safetyTimeoutId);
          if (isMounted) {
            setIsLoading(false);
            setError('invalid');
          }
          return;
        }

        // Initialize mermaid with custom config
        await mermaid.initialize({
          startOnLoad: false,
          theme: 'base',
          themeVariables: {
            primaryColor: '#9b87f5',
            primaryTextColor: '#1A1F2C',
            primaryBorderColor: '#7E69AB',
            lineColor: '#6E59A5',
            secondaryColor: '#D6BCFA',
            tertiaryColor: '#E5DEFF',
            background: '#ffffff',
            mainBkg: '#ffffff',
            textColor: '#1A1F2C',
            fontSize: '16px',
          },
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
            curve: 'basis',
          },
          sequence: {
            useMaxWidth: true,
          },
          gantt: {
            useMaxWidth: true,
          },
        });

        // Multiple strategies for rendering
        const renderStrategies = [
          () => mermaid.render(`mermaid-${Date.now()}`, sanitizedCode),
          () => mermaid.render(`mermaid-${Date.now()}-alt`, sanitizedCode.replace(/\n\s*\n/g, '\n')),
          () => mermaid.render(`mermaid-${Date.now()}-clean`, sanitizedCode.replace(/style\s+\w+\s+fill:[^,\n]+/g, '')),
        ];

        let rendered = false;
        let lastError: Error | null = null;

        for (const strategy of renderStrategies) {
          try {
            const renderTimeout = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Render timeout')), 10000)
            );

            const renderPromise = strategy();
            const { svg } = (await Promise.race([renderPromise, renderTimeout])) as { svg: string };

            if (ref.current && isMounted) {
              ref.current.innerHTML = svg;
              setSvgContent(svg);
              rendered = true;
              
              // Clear timeout since rendering succeeded
              if (renderTimeoutRef.current) {
                clearTimeout(renderTimeoutRef.current);
                renderTimeoutRef.current = null;
              }
              break;
            }
          } catch (strategyError) {
            lastError = strategyError as Error;
            console.warn('[Mermaid] Strategy failed, trying next...', strategyError);
          }
        }

        if (safetyTimeoutId) clearTimeout(safetyTimeoutId);

        if (!rendered) {
          throw lastError || new Error('All rendering strategies failed');
        }

        if (isMounted) {
          console.log('[Mermaid] ✅ Rendered successfully');
          setIsLoading(false);
        }
      } catch (err) {
        if (safetyTimeoutId) clearTimeout(safetyTimeoutId);
        console.error('[Mermaid] Render failed:', err);
        if (isMounted) {
          setIsLoading(false);
          setError('hidden');
        }
      }
    };
    
    renderDiagram();

    // Cleanup on unmount
    return () => {
      isMounted = false;
      if (safetyTimeoutId) clearTimeout(safetyTimeoutId);
      if (ref.current) {
        ref.current.innerHTML = '';
      }
    };
  }, [code]);

  return (
    <MermaidErrorBoundary>
      <div className="bg-muted/30 p-4 rounded-xl border-2 border-border my-6 w-full overflow-hidden">
        <h4 className="font-bold text-foreground mb-2 text-base flex items-center gap-2">
          {icon && <span>{icon}</span>}
          <span>{title}</span>
        </h4>
        <p className="text-sm text-muted-foreground italic mb-4">{description}</p>
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[300px] bg-purple-50/50 rounded-lg">
            <div className="animate-spin h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-start p-6 bg-red-50 dark:bg-red-950/20 rounded-lg border-2 border-red-200 dark:border-red-800">
            <div className="flex items-start gap-3 w-full">
              <div className="text-4xl flex-shrink-0">⚠️</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-red-700 dark:text-red-300 mb-1">
                  Erro ao renderizar diagrama
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 mb-3">
                {error === 'timeout-exceeded' 
                    ? 'Tempo de renderização excedido - possível erro de sintaxe no diagrama'
                    : 'O sistema está processando este conteúdo visual'}
                </p>
                
                <details className="mt-3 w-full">
                  <summary className="cursor-pointer text-red-700 dark:text-red-300 hover:text-red-800 dark:hover:text-red-200 font-semibold text-sm flex items-center gap-2 mb-2 bg-red-100 dark:bg-red-900/30 px-3 py-2 rounded">
                    🔍 Ver código do diagrama para debug
                    <span className="text-xs font-normal opacity-75">(clique para expandir)</span>
                  </summary>
                  <div className="mt-2 space-y-2">
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800 rounded text-xs">
                      <p className="font-semibold text-amber-800 dark:text-amber-300 mb-1">💡 Possíveis causas:</p>
                      <ul className="list-disc list-inside text-amber-700 dark:text-amber-400 space-y-1">
                        <li><strong>Nós sem conexões (setas faltando)</strong> - Cada nó precisa de pelo menos uma seta</li>
                        <li>Tags HTML no código Mermaid (&lt;br/&gt;, &lt;sup&gt;, etc.)</li>
                        <li>Estilos definidos antes dos nós</li>
                        <li>Linhas vazias dentro do diagrama</li>
                        <li>Quebras de linha entre nó e seta (ex: `A[Node]\n--&gt;` em vez de `A[Node] --&gt;`)</li>
                        <li>Sintaxe Mermaid inválida</li>
                      </ul>
                      
                      <div className="mt-2 p-2 bg-white dark:bg-gray-900 rounded border border-amber-200">
                        <p className="font-mono text-xs text-amber-900 dark:text-amber-200">
                          <strong>Diagnóstico rápido:</strong><br/>
                          Nós detectados: {(code.match(/[A-Z0-9_]+\[/g) || []).length}<br/>
                          Setas detectadas: {(code.match(/(-->|---|==>|->)/g) || []).length}<br/>
                          {(() => {
                            const nodes = (code.match(/[A-Z0-9_]+\[/g) || []).length;
                            const arrows = (code.match(/(-->|---|==>|->)/g) || []).length;
                            const minArrows = Math.max(1, nodes - 1);
                            return arrows < minArrows 
                              ? `❌ Insuficiente! Precisa de pelo menos ${minArrows} setas para ${nodes} nós.`
                              : `✅ Quantidade OK, mas pode haver nós órfãos.`;
                          })()}
                        </p>
                      </div>
                    </div>
                    
                    <pre className="p-4 bg-white dark:bg-gray-900 rounded border-2 border-red-200 dark:border-red-800 overflow-x-auto text-xs text-gray-800 dark:text-gray-200 font-mono leading-relaxed max-h-80">
{code.substring(0, 1200)}{code.length > 1200 ? '\n\n... (código truncado)' : ''}
                    </pre>
                  </div>
                </details>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full overflow-x-auto overflow-y-hidden">
            <div 
              ref={ref} 
              className="mermaid-diagram-container"
              style={{
                minWidth: '100%',
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '300px',
              }}
            />
          </div>
        )}
      </div>
    </MermaidErrorBoundary>
  );
};
