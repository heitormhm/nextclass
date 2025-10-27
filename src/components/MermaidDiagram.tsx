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
        
        // AGGRESSIVE PRE-VALIDATION: Reject invalid code BEFORE attempting render
        if (!sanitizedCode || sanitizedCode.length < 10) {
          console.warn('[Mermaid] Empty or too short code, showing placeholder');
          setError('invalid');
          return;
        }

        if (!sanitizedCode.match(/^(graph|flowchart|sequenceDiagram|stateDiagram-v2|classDiagram|gantt)/m)) {
          console.warn('[Mermaid] Invalid diagram type, showing placeholder');
          setError('invalid');
          return;
        }

        if (sanitizedCode.match(/[→←↔⇒⇐⇔Δ∆Σαβγθλμπσω]/)) {
          console.warn('[Mermaid] Problematic Unicode characters detected, showing placeholder');
          setError('invalid');
          return;
        }

        // Configure Mermaid silently
        mermaid.initialize({ 
          theme: 'default',
          logLevel: 'fatal',
          startOnLoad: false,
          securityLevel: 'loose',
        });

        const uniqueId = `mermaid-${Date.now()}`;
        
        // Attempt render with timeout
        const renderTimeout = setTimeout(() => {
          console.error('[Mermaid] Render timeout');
          setError('timeout');
        }, 5000);

        try {
          const { svg } = await mermaid.render(uniqueId, sanitizedCode);
          clearTimeout(renderTimeout);
          
          // Validate SVG doesn't contain errors before inserting
          if (svg.includes('Syntax error') || svg.includes('error-icon') || svg.includes('Parse error')) {
            console.warn('[Mermaid] ⚠️ Error detected in rendered SVG, showing placeholder');
            setError('render_error');
            return;
          }
          
          if (ref.current) {
            ref.current.innerHTML = svg;
          }
          
          setError(null);
        } catch (renderErr) {
          clearTimeout(renderTimeout);
          console.error('[Mermaid] Render failed silently');
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
          <div className="flex flex-col items-center justify-center min-h-[200px] bg-muted/10 rounded-lg p-4">
            <div className="text-5xl mb-2 opacity-50">📊</div>
            <p className="text-xs text-muted-foreground/70">Visualização em construção</p>
          </div>
        ) : (
          <div ref={ref} className="flex justify-center items-center min-h-[200px] bg-white rounded-lg p-4" />
        )}
      </div>
    </MermaidErrorBoundary>
  );
};
