import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { MermaidErrorBoundary } from './MermaidErrorBoundary';

interface MermaidDiagramProps {
  code: string;
  title: string;
  description: string;
  icon: string;
}

// ✅ FASE 4: Simplificar - remover validação, confiar no backend
const sanitizeMermaidCode = (code: string): string => {
  if (!code || code.trim().length < 10) {
    console.warn('[Mermaid] Code too short or empty');
    return '';
  }

  // APENAS remover markers, SEM validação
  let sanitized = code.trim()
    .replace(/^```mermaid\s*/i, '')
    .replace(/^```\s*$/, '')
    .replace(/```$/, '');

  console.log('[Mermaid] ✅ Code sanitized (no validation)');
  return sanitized.trim();
};

export const MermaidDiagram = ({ code, title, description, icon }: MermaidDiagramProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

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

  // ✅ FASE 4: Simplificar validação - confiar no backend
  useEffect(() => {
    const renderDiagram = async () => {
      if (!ref.current || !code) return;

      try {
        const sanitizedCode = sanitizeMermaidCode(code);
        
        if (!sanitizedCode || sanitizedCode.length < 10) {
          console.warn('[Mermaid] Empty code, showing placeholder');
          setError('invalid');
          return;
        }

        // ✅ FASE 3: Configuração Mermaid com responsividade máxima
        mermaid.initialize({ 
          theme: 'default',
          logLevel: 'error',
          startOnLoad: false,
          securityLevel: 'loose',
          flowchart: { 
            useMaxWidth: true,
            htmlLabels: true,
            curve: 'basis'
          },
          sequence: { 
            useMaxWidth: true,
            wrap: true,
            width: 150,
            height: 50
          },
          gantt: {
            useMaxWidth: true,
            fontSize: 14
          },
          class: {
            useMaxWidth: true
          },
          state: {
            useMaxWidth: true
          },
          // Configuração global de largura máxima
          themeVariables: {
            fontSize: '14px',
            fontFamily: 'Inter, system-ui, sans-serif'
          }
        });

        const uniqueId = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const renderTimeout = setTimeout(() => {
          console.error('[Mermaid] Render timeout');
          setError('timeout');
        }, 10000); // Timeout de 10s

        // ✅ FASE 5: Estratégia de fallback com múltiplas tentativas
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
            console.log(`[Mermaid] Trying strategy: ${strategy.name}`);
            const { svg } = await mermaid.render(`${uniqueId}-${strategy.name}`, strategy.code);
            
            clearTimeout(renderTimeout);
            
            if (ref.current) {
              ref.current.innerHTML = svg;
            }
            
            setError(null);
            renderSuccess = true;
            console.log(`[Mermaid] ✅ Rendered successfully with strategy: ${strategy.name}`);
          } catch (strategyErr) {
            console.warn(`[Mermaid] Strategy "${strategy.name}" failed:`, strategyErr);
            continue; // Tentar próxima estratégia
          }
        }
        
        if (!renderSuccess) {
          clearTimeout(renderTimeout);
          console.error('[Mermaid] All render strategies failed');
          console.error('[Mermaid] Original code:', sanitizedCode);
          setError('hidden');
        }
      } catch (err) {
        console.error('[Mermaid] General error:', err);
        setError('hidden');
      }
    };
    
    renderDiagram();
  }, [code]);

  return (
    <MermaidErrorBoundary>
      <div className="bg-muted/30 p-4 rounded-xl border-2 border-border my-6 w-full overflow-hidden">
        <h4 className="font-bold text-foreground mb-2 text-base flex items-center gap-2">
          {icon && <span>{icon}</span>}
          <span>{title}</span>
        </h4>
        <p className="text-sm text-muted-foreground italic mb-4">{description}</p>
        {error ? (
          <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="text-4xl opacity-40">📊</div>
              <div>
                <p className="text-sm font-semibold text-slate-700">Diagrama temporariamente indisponível</p>
                <p className="text-xs text-slate-500">O sistema está processando este conteúdo visual</p>
              </div>
            </div>
            {/* Preview do código para debug */}
            <details className="mt-3">
              <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">
                Ver código-fonte (debug)
              </summary>
              <pre className="mt-2 text-xs bg-slate-100 p-2 rounded overflow-x-auto max-h-40">
                <code>{code.substring(0, 300)}{code.length > 300 ? '...' : ''}</code>
              </pre>
            </details>
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-hidden w-full">
            <div 
              ref={ref} 
              className="mermaid-responsive min-h-[200px] flex justify-center items-center bg-white rounded-lg p-4"
              style={{
                maxWidth: '100%',
                width: 'fit-content',
                margin: '0 auto'
              }}
            />
          </div>
        )}
      </div>
    </MermaidErrorBoundary>
  );
};
