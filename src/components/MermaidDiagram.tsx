import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Button } from './ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MermaidErrorBoundary } from './MermaidErrorBoundary';
import { useToast } from '@/hooks/use-toast';

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
  const [isRegenerating, setIsRegenerating] = useState(false);
  const { toast } = useToast();

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

  const handleRegenerateDiagram = async () => {
    setIsRegenerating(true);
    
    try {
      console.log('[Mermaid] 🔄 Requesting diagram fix...');
      
      // STEP 1: Call edge function
      const { data, error: funcError } = await supabase.functions.invoke('fix-mermaid-diagram', {
        body: {
          brokenCode: code,
          context: `${title} - ${description}`
        }
      });

      if (funcError) {
        console.error('[Mermaid] ❌ Edge function error:', funcError);
        throw new Error(`Edge function failed: ${funcError.message}`);
      }

      if (!data?.fixedCode) {
        throw new Error('No fixed code returned from edge function');
      }

      console.log('[Mermaid] ✅ Received fixed code');
      
      // STEP 2: CRITICAL - Re-sanitize fixed code received from AI
      const sanitizedFixed = sanitizeMermaidCode(data.fixedCode);
      
      if (!sanitizedFixed || sanitizedFixed.length < 10) {
        throw new Error('Fixed code is still invalid after sanitization');
      }
      
      console.log('[Mermaid] ✅ Fixed code re-sanitized');
      
      // STEP 3: Re-initialize Mermaid before attempting render
      mermaid.initialize({ 
        theme: 'default',
        logLevel: 'fatal',
        startOnLoad: false,
        securityLevel: 'loose',
      });
      
      // Attempt render with timeout protection
      const uniqueId = `mermaid-fix-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const renderPromise = mermaid.render(uniqueId, sanitizedFixed);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Render timeout')), 5000)
      );
      
      const result = await Promise.race([renderPromise, timeoutPromise]) as { svg: string };
      
      // STEP 4: Validate rendered SVG doesn't contain errors
      if (result.svg.includes('Syntax error') || result.svg.includes('error-icon') || result.svg.includes('Parse error')) {
        throw new Error('Rendered SVG contains syntax errors');
      }
      
      // STEP 5: Success - update DOM
      if (ref.current) {
        ref.current.innerHTML = result.svg;
      }
      
      setError(null);
      
      toast({
        title: 'Diagrama corrigido! ✅',
        description: 'O diagrama foi renderizado com sucesso',
      });
      
    } catch (err) {
      console.error('[Mermaid] ❌ Regeneration failed:', err);
      
      // Generic toast without exposing technical details
      toast({
        title: 'Não foi possível corrigir 😔',
        description: 'Este diagrama possui erros complexos. A visualização ficará em modo simplificado.',
        variant: 'destructive',
      });
      
      // Keep error hidden, don't show to user
      setError('hidden');
      
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <MermaidErrorBoundary>
      <div className="bg-muted/30 p-6 rounded-xl border-2 border-border my-6">
        <h4 className="font-bold text-foreground mb-2 text-lg">{icon} {title}</h4>
        <p className="text-sm text-muted-foreground italic mb-4">{description}</p>
        {error ? (
          <div className="flex flex-col items-center justify-center min-h-[200px] bg-muted/10 rounded-lg p-4">
            <div className="text-5xl mb-2 opacity-50">📊</div>
            <p className="text-xs text-muted-foreground/70 mb-3">Visualização em construção</p>
            <Button
              size="sm"
              variant="outline"
              className="border-muted-foreground/30 text-muted-foreground/70 hover:bg-muted/20"
              onClick={handleRegenerateDiagram}
              disabled={isRegenerating}
            >
              {isRegenerating ? (
                <>
                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                  Corrigindo...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-2" />
                  Tentar Novamente
                </>
              )}
            </Button>
          </div>
        ) : (
          <div ref={ref} className="flex justify-center items-center min-h-[200px] bg-white rounded-lg p-4" />
        )}
      </div>
    </MermaidErrorBoundary>
  );
};
