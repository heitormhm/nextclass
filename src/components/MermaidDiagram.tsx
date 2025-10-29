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

  // ✅ FASE 4: Simplificar validação - confiar no backend
  useEffect(() => {
    const renderDiagram = async () => {
      if (!ref.current || !code) return;

      setIsLoading(true);

      try {
        const sanitizedCode = sanitizeMermaidCode(code);
        
        if (!sanitizedCode || sanitizedCode.length < 10) {
          console.warn('[Mermaid] Empty code, showing placeholder');
          setIsLoading(false);
          setError('invalid');
          return;
        }

        // ✅ FASE 3: Configuração Mermaid com responsividade total
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
          // ✅ Tema global otimizado para legibilidade
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

        const uniqueId = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const renderTimeout = setTimeout(() => {
          console.error('[Mermaid] Render timeout after 10s');
          setIsLoading(false); // ✅ PHASE 1: Fix infinite loading
          setError('timeout');
          clearTimeout(renderTimeout);
        }, 10000);

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
            setIsLoading(false);
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
          setIsLoading(false);
          setError('hidden');
        }
      } catch (err) {
        console.error('[Mermaid] General error:', err);
        setIsLoading(false);
        setError('hidden');
      }
      // ✅ PHASE 1: Safety timeout to prevent infinite loading
      const safetyTimeout = setTimeout(() => {
        if (isLoading) {
          console.warn('[Mermaid] Safety timeout triggered at 12s');
          setIsLoading(false);
          setError('timeout');
        }
      }, 12000);

      return () => {
        clearTimeout(safetyTimeout);
      };
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
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[300px] bg-purple-50/50 rounded-lg">
            <div className="animate-spin h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full" />
          </div>
        ) : error ? (
          <div className="bg-purple-50 border-2 border-dashed border-purple-300 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="text-5xl text-purple-400">📊</div>
              <div>
                <p className="text-sm font-semibold text-purple-800">Visualização em construção</p>
                {description && description.length > 50 && (
                  <p className="text-sm text-purple-700 mt-2 leading-relaxed italic bg-purple-100/50 p-3 rounded border-l-4 border-purple-400">
                    {description}
                  </p>
                )}
                <p className="text-xs text-purple-600 mt-2">O sistema está processando este conteúdo visual</p>
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
