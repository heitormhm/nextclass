import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { MermaidErrorBoundary } from './MermaidErrorBoundary';

interface MermaidDiagramProps {
  code: string;
  title: string;
  description: string;
  icon: string;
}

const sanitizeMermaidCode = (code: string): string => {
  if (!code || code.trim().length < 10) {
    console.warn('[Mermaid] Code too short or empty');
    return '';
  }
  
  // Remove code block markers if present
  let sanitized = code.trim()
    .replace(/^```mermaid\s*/i, '')
    .replace(/^```\s*$/, '')
    .replace(/```$/, '');
  
  // ONLY validate - do NOT correct (backend already did corrections)
  const hasValidType = /^(graph|flowchart|sequenceDiagram|stateDiagram-v2|classDiagram|gantt|pie|erDiagram)/m.test(sanitized);
  
  if (!hasValidType) {
    console.warn('[Mermaid] No valid diagram type detected');
    return '';
  }
  
  console.log('[Mermaid] ✅ Basic validation passed');
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

  useEffect(() => {
    const renderDiagram = async () => {
      if (!ref.current || !code) return;

      try {
        const sanitizedCode = sanitizeMermaidCode(code);
        
        // Minimal validation (only extreme cases)
        if (!sanitizedCode || sanitizedCode.length < 10) {
          console.warn('[Mermaid] Empty code, showing placeholder');
          setError('invalid');
          return;
        }

        if (!sanitizedCode.match(/^(graph|flowchart|sequenceDiagram|stateDiagram-v2|classDiagram|gantt)/m)) {
          console.warn('[Mermaid] Invalid diagram type, showing placeholder');
          setError('invalid');
          return;
        }

        // ✅ REMOVED Unicode validation - trust backend sanitization
        // We now attempt to render even if there are minor issues
        
        // Configure Mermaid with tolerant settings
        mermaid.initialize({ 
          theme: 'default',
          logLevel: 'fatal',
          startOnLoad: false,
          securityLevel: 'loose',
        });

        const uniqueId = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Timeout de 5s
        const renderTimeout = setTimeout(() => {
          console.error('[Mermaid] Render timeout');
          setError('timeout');
        }, 5000);

        try {
          const { svg } = await mermaid.render(uniqueId, sanitizedCode);
          clearTimeout(renderTimeout);
          
          // Validate AFTER render (check IF it rendered with errors)
          if (svg.includes('Syntax error') || svg.includes('error-icon') || svg.includes('Parse error')) {
            console.warn('[Mermaid] Error detected in SVG, showing placeholder');
            setError('render_error');
            return;
          }
          
          // ✅ SUCCESS
          if (ref.current) {
            ref.current.innerHTML = svg;
          }
          
          setError(null);
        } catch (renderErr) {
          clearTimeout(renderTimeout);
          console.error('[Mermaid] Render failed:', renderErr);
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
      <div className="bg-muted/30 p-6 rounded-xl border-2 border-border my-6">
        <h4 className="font-bold text-foreground mb-2 text-lg">{icon} {title}</h4>
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
          <div ref={ref} className="flex justify-center items-center min-h-[200px] bg-white rounded-lg p-4" />
        )}
      </div>
    </MermaidErrorBoundary>
  );
};
