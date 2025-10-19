import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  code: string;
  title: string;
  description: string;
  icon: string;
}

// Função de sanitização para limpar código Mermaid antes de renderizar
const sanitizeMermaidCode = (code: string): string => {
  let sanitized = code;
  
  // 0. FIRST: Replace problematic arrow characters BEFORE processing brackets
  sanitized = sanitized
    .replace(/→/g, '-->')
    .replace(/←/g, '<--')
    .replace(/↔/g, '<-->')
    .replace(/⇒/g, '==>')
    .replace(/⇐/g, '<==')
    .replace(/⇔/g, '<==>');
  
  // 1. Remover caracteres problemáticos em labels com colchetes []
  sanitized = sanitized.replace(/([A-Z]\[)([^\]]+)(\])/g, (match, open, content, close) => {
    let cleanContent = content;
    
    // Only replace problematic parentheses, not all of them
    // Keep parentheses if they're balanced and contain commas (likely a list)
    const hasBalancedParens = (content.match(/\(/g) || []).length === (content.match(/\)/g) || []).length;
    const hasCommaInsideParens = /\([^)]*,[^)]*\)/.test(content);
    
    if (hasBalancedParens && hasCommaInsideParens) {
      // Keep parentheses but remove special chars
      cleanContent = content
        .replace(/[&<>"']/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    } else {
      // Original sanitization for problematic cases
      cleanContent = content
        .replace(/\(/g, ' - ')
        .replace(/\)/g, '')
        .replace(/[&<>"']/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    }
    
    return `${open}${cleanContent}${close}`;
  });
  
  // 2. Limpar labels em chaves {} (para mapas mentais)
  sanitized = sanitized.replace(/(\{)([^\}]+)(\})/g, (match, open, content, close) => {
    let cleanContent = content
      .replace(/\(/g, ' - ')
      .replace(/\)/g, '')
      .replace(/[&<>"']/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    return `${open}${cleanContent}${close}`;
  });
  
  // 3. Validar estrutura básica
  if (!sanitized.includes('graph') && !sanitized.includes('flowchart') && !sanitized.includes('mindmap')) {
    console.warn('[Mermaid] Código sem tipo de diagrama reconhecido');
  }
  
  return sanitized;
};

export const MermaidDiagram = ({ code, title, description, icon }: MermaidDiagramProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const renderDiagram = async () => {
      if (ref.current && code) {
        try {
          mermaid.initialize({ 
            theme: 'default',
            themeVariables: {
              primaryColor: '#3b82f6',
              primaryTextColor: '#fff',
              primaryBorderColor: '#2563eb',
              lineColor: '#8b5cf6',
              secondaryColor: '#10b981',
              tertiaryColor: '#f59e0b',
              background: '#ffffff',
              mainBkg: '#dbeafe',
              secondBkg: '#e9d5ff',
              tertiaryBkg: '#fef3c7',
            },
            startOnLoad: false,
            securityLevel: 'loose',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          });
          
          const uniqueId = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const sanitizedCode = sanitizeMermaidCode(code);
          
          // Debug logging
          console.log('[Mermaid] === RENDERING ATTEMPT ===');
          console.log('[Mermaid] Original code:', code);
          console.log('[Mermaid] Sanitized code:', sanitizedCode);
          
          // Create temporary hidden div to capture any rendering errors
          const tempDiv = document.createElement('div');
          tempDiv.style.display = 'none';
          document.body.appendChild(tempDiv);
          
          try {
            const { svg } = await mermaid.render(uniqueId, sanitizedCode);
            ref.current.innerHTML = svg;
            setError(null);
            console.log('[Mermaid] ✅ Rendered successfully');
          } finally {
            // Clean up temp div
            if (document.body.contains(tempDiv)) {
              document.body.removeChild(tempDiv);
            }
          }
        } catch (err) {
          // Log error details to console only - DO NOT show to user
          console.error('[Mermaid] ❌ RENDER ERROR (hidden from user):', err);
          console.error('[Mermaid] Original code:', code);
          const sanitizedCode = sanitizeMermaidCode(code);
          console.error('[Mermaid] Sanitized code:', sanitizedCode);
          console.error('[Mermaid] Error message:', (err as Error).message);
          console.error('[Mermaid] Full error stack:', (err as Error).stack);
          
          // Set error flag but don't expose technical details to user
          setError('hidden');
        }
      }
    };
    
    renderDiagram();
  }, [code]);

  return (
    <div className="bg-muted/30 p-6 rounded-xl border-2 border-border my-6">
      <h4 className="font-bold text-foreground mb-2 text-lg">{icon} {title}</h4>
      <p className="text-sm text-muted-foreground italic mb-4">{description}</p>
      {error ? (
        <div className="flex flex-col items-center justify-center min-h-[200px] bg-muted/10 rounded-lg p-4">
          <div className="text-5xl mb-2 opacity-50">{icon}</div>
          <p className="text-xs text-muted-foreground/70">Visualização em construção</p>
        </div>
      ) : (
        <div ref={ref} className="flex justify-center items-center min-h-[200px] bg-white rounded-lg p-4" />
      )}
    </div>
  );
};
