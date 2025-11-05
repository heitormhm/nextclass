/**
 * FASE 4.2: MaterialMermaidDiagram - Refatorado do Zero ✅
 * 
 * Mudanças principais:
 * 1. ✅ Removidas estratégias múltiplas de rendering (causavam confusão)
 * 2. ✅ Removida proteção LaTeX explícita (Mermaid.js já suporta nativamente via config)
 * 3. ✅ Simplificado fluxo de erro
 * 4. ✅ Adicionado gradiente roxo no container (visual melhor)
 * 5. ✅ Apenas sanitização básica (remover ```)
 * 6. ✅ Timeout de 10s mantido
 */

import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { initializeMermaid, sanitizeMermaidCode } from '@/lib/mermaidConfig';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

export const MaterialMermaidDiagram = ({ code }: { code: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(true);

  useEffect(() => {
    initializeMermaid();
  }, []);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!ref.current || !code) {
        setError('empty');
        setIsRendering(false);
        return;
      }

      setIsRendering(true);
      setError(null);

      try {
        // Apenas sanitizar (remover ```)
        const sanitized = sanitizeMermaidCode(code);
        
        if (!sanitized || sanitized.length < 5) {
          setError('invalid');
          setIsRendering(false);
          return;
        }

        // Renderizar com timeout de 10s
        const uniqueId = `mermaid-${Date.now()}`;
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 10000)
        );

        const renderPromise = mermaid.render(uniqueId, sanitized);

        const { svg } = await Promise.race([renderPromise, timeoutPromise]) as { svg: string };

        if (ref.current) {
          ref.current.innerHTML = svg;
        }

        console.log('[Mermaid] ✅ Rendered successfully');
        setIsRendering(false);

      } catch (err: any) {
        console.error('[Mermaid] Render failed:', err.message);
        
        if (err.message === 'Timeout') {
          setError('timeout');
        } else {
          setError('syntax');
        }
        setIsRendering(false);
      }
    };

    renderDiagram();
  }, [code]);

  if (error || isRendering) {
    return (
      <div className="bg-slate-50 dark:bg-slate-900 p-8 rounded-lg border-2 border-slate-200 dark:border-slate-800 my-6">
        {isRendering ? (
          <div className="text-center">
            <div className="animate-spin text-4xl mb-2">⏳</div>
            <p className="text-sm text-muted-foreground">Renderizando diagrama...</p>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-5xl mb-3">⚠️</div>
            <p className="font-semibold mb-2">Erro ao renderizar diagrama</p>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(code);
                toast({ title: "Código copiado" });
              }}
            >
              📋 Copiar código
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 to-purple-50 dark:from-slate-900 dark:to-purple-950 p-8 rounded-xl border-2 border-purple-300 dark:border-purple-700 my-6 shadow-lg">
      <div
        ref={ref}
        className="mermaid-container flex justify-center items-center min-h-[300px]"
        style={{ 
          transform: 'scale(1.1)',
          transformOrigin: 'top center',
        }}
      />
    </div>
  );
};
