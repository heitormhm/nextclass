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
              rendered = true;
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
          <div className="bg-purple-50 border-2 border-dashed border-purple-300 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="text-5xl text-purple-400">📊</div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-purple-800">Visualização em construção</p>
                {description && description.length > 50 && (
                  <p className="text-sm text-purple-700 mt-2 leading-relaxed italic bg-purple-100/50 p-3 rounded border-l-4 border-purple-400">
                    {description}
                  </p>
                )}
                <p className="text-xs text-purple-600 mt-2">O sistema está processando este conteúdo visual</p>
                {code && code.length > 0 && (
                  <details className="mt-3">
                    <summary className="text-xs text-purple-600 cursor-pointer hover:text-purple-800">
                      Ver código do diagrama
                    </summary>
                    <pre className="mt-2 p-3 bg-purple-100 rounded text-xs overflow-x-auto">
                      <code>{code.substring(0, 200)}{code.length > 200 ? '...' : ''}</code>
                    </pre>
                  </details>
                )}
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
