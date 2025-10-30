import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MaterialMermaidDiagramProps {
  code: string;
}

/**
 * Standalone Mermaid renderer for Material Didático system
 * Replicates all robust features from MermaidDiagram.tsx but as an independent component
 * NOT to be used outside of MaterialDidaticoRenderer
 */

const sanitizeMermaidCode = (code: string): string => {
  if (!code || code.trim().length < 10) {
    console.warn('[MaterialMermaid] Code too short or empty');
    return '';
  }

  // Remove markdown code fences only
  let sanitized = code.trim()
    .replace(/^```mermaid\s*/i, '')
    .replace(/^```\s*$/, '')
    .replace(/```$/, '');

  console.log('[MaterialMermaid] ✅ Code sanitized');
  return sanitized.trim();
};

export const MaterialMermaidDiagram = ({ code }: MaterialMermaidDiagramProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Inject CSS to hide mermaid error messages
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'material-mermaid-error-suppression';
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
    
    if (!document.getElementById('material-mermaid-error-suppression')) {
      document.head.appendChild(style);
    }
    
    return () => {
      const existingStyle = document.getElementById('material-mermaid-error-suppression');
      if (existingStyle) existingStyle.remove();
    };
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

        // Full Mermaid configuration with support for all diagram types
        mermaid.initialize({ 
          theme: 'default',
          logLevel: 'error',
          startOnLoad: false,
          securityLevel: 'loose',
          flowchart: { 
            useMaxWidth: true,
            htmlLabels: true,
            curve: 'basis',
            padding: 20,
          },
          sequence: { 
            useMaxWidth: true,
            wrap: true,
            width: 150,
            height: 50,
            boxMargin: 10,
          },
          gantt: {
            useMaxWidth: true,
            fontSize: 14,
            numberSectionStyles: 4,
          },
          class: {
            useMaxWidth: true,
          },
          state: {
            useMaxWidth: true,
          },
          er: {
            useMaxWidth: true,
          },
          themeVariables: {
            fontSize: '16px',
            fontFamily: 'Inter, system-ui, sans-serif',
            primaryColor: '#f3e5f5',
            primaryTextColor: '#000',
            primaryBorderColor: '#7c3aed',
            lineColor: '#7c3aed',
            secondaryColor: '#e1f5fe',
            tertiaryColor: '#f1f8e9',
          }
        });

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
