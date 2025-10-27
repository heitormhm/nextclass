import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  code: string;
  title: string;
  description: string;
  icon: string;
}

const sanitizeMermaidCode = (code: string): string => {
  let sanitized = code;
  
  // STEP 1: Replace ALL unicode arrows FIRST
  const unicodeArrows: Record<string, string> = {
    '→': '-->',
    '←': '<--',
    '↔': '<-->',
    '⇒': '==>',
    '⇐': '<==',
    '⇔': '<==>'
  };
  
  Object.entries(unicodeArrows).forEach(([unicode, ascii]) => {
    sanitized = sanitized.replace(new RegExp(unicode, 'g'), ascii);
  });
  
  // STEP 2: Replace Greek letters in labels
  const greekLetters: Record<string, string> = {
    'Δ': 'Delta',
    '∆': 'Delta',
    'Σ': 'Sigma',
    'α': 'alpha',
    'β': 'beta',
    'γ': 'gamma',
    'θ': 'theta',
    'λ': 'lambda',
    'μ': 'mu',
    'π': 'pi',
    'σ': 'sigma',
    'ω': 'omega'
  };
  
  // Only replace Greek letters inside labels []
  sanitized = sanitized.replace(/(\[)([^\]]+)(\])/g, (match, open, content, close) => {
    let cleanContent = content;
    Object.entries(greekLetters).forEach(([greek, spelled]) => {
      cleanContent = cleanContent.replace(new RegExp(greek, 'g'), spelled);
    });
    return `${open}${cleanContent}${close}`;
  });
  
  // STEP 3: Clean problematic chars in labels
  sanitized = sanitized.replace(/(\[)([^\]]+)(\])/g, (match, open, content, close) => {
    let cleanContent = content
      .replace(/[&<>"']/g, '') // Remove HTML-problematic chars
      .replace(/\(/g, '')       // Remove opening parenthesis
      .replace(/\)/g, '')       // Remove closing parenthesis
      .replace(/\s+/g, ' ')     // Normalize whitespace
      .trim();
    
    return `${open}${cleanContent}${close}`;
  });

  // Clean up any potential HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, '');
  
  // Replace common problematic patterns
  sanitized = sanitized
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, 'and')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

  // Ensure proper spacing around mermaid syntax elements
  sanitized = sanitized.replace(/-->/g, ' --> ');
  sanitized = sanitized.replace(/\|/g, ' | ');
  
  // STEP 4: Validate basic structure
  if (!sanitized.match(/^(graph|flowchart|sequenceDiagram|stateDiagram)/m)) {
    console.warn('[Mermaid] ⚠️ No valid diagram type found');
    return ''; // Return empty to trigger placeholder
  }
  
  console.log('[Mermaid] ✅ Sanitization complete');
  return sanitized.trim();
};

export const MermaidDiagram = ({ code, title, description, icon }: MermaidDiagramProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const renderDiagram = async () => {
      if (ref.current && code) {
        try {
          // Configure Mermaid with error suppression
          mermaid.initialize({ 
            theme: 'default',
            logLevel: 'fatal', // Only fatal logs - suppress error messages
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
          
          // Override global error handler to suppress toasts/notifications
          mermaid.parseError = function(err: any) {
            console.error('[Mermaid] Parse error silenciado (não exibido ao usuário):', err);
            // DO NOT show anything visually - errors are logged only
          };
          
          const uniqueId = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const sanitizedCode = sanitizeMermaidCode(code);
          
          // Debug logging
          console.log('[Mermaid] === RENDERING ATTEMPT ===');
          console.log('[Mermaid] Original code:', code);
          console.log('[Mermaid] Sanitized code:', sanitizedCode);
          
          // PRE-RENDER VALIDATION: Check if diagram type is valid
          if (!sanitizedCode.match(/^(graph|flowchart|mindmap|gantt)/m)) {
            console.warn('[Mermaid] Invalid diagram type detected, skipping render');
            setError('invalid');
            return;
          }
          
          // Add timeout protection to prevent hanging
          const renderTimeout = setTimeout(() => {
            console.error('[Mermaid] Render timeout after 5 seconds');
            setError('timeout');
          }, 5000);
          
          try {
            const { svg } = await mermaid.render(uniqueId, sanitizedCode);
            clearTimeout(renderTimeout);
            ref.current.innerHTML = svg;
            setError(null);
            console.log('[Mermaid] ✅ Rendered successfully');
          } catch (renderErr) {
            clearTimeout(renderTimeout);
            // Error already logged by parseError handler
            setError('hidden');
            console.error('[Mermaid] ❌ Render falhou, mostrando placeholder neutro');
          }
        } catch (err) {
          console.error('[Mermaid] ❌ Erro geral:', err);
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
