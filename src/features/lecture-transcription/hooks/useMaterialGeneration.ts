/**
 * PHASE 2: New Simple Material Generation Hook
 * Replaces useMaterialGenerationJob + useMaterialGenerationRealtime + useMaterialRegeneration
 */

import { useState, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UseMaterialGenerationReturn {
  isGenerating: boolean;
  progress: number;
  progressMessage: string;
  error: string | null;
  generate: (lectureId: string, lectureTitle: string, tags: string[]) => Promise<boolean>;
}

export const useMaterialGeneration = (): UseMaterialGenerationReturn => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const generate = useCallback(async (
    lectureId: string,
    lectureTitle: string,
    tags: string[]
  ): Promise<boolean> => {
    console.log('[useMaterialGeneration] Starting generation:', lectureId);
    
    // Instant loader with flushSync
    flushSync(() => {
      setIsGenerating(true);
      setProgress(10);
      setProgressMessage('Iniciando geração...');
      setError(null);
    });

    // ✅ PHASE 6: Improved progress simulation with dynamic messages
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev < 25) {
          setProgressMessage('Iniciando pesquisa acadêmica...');
          return prev + 5; // Slow start
        }
        if (prev < 50) {
          setProgressMessage('Analisando fontes de engenharia...');
          return prev + 3; // Steady middle
        }
        if (prev < 70) {
          setProgressMessage('Gerando conteúdo com IA...');
          return prev + 3;
        }
        if (prev < 90) {
          setProgressMessage('Formatando material e diagramas...');
          return prev + 1; // Slow finish
        }
        return 90; // Cap at 90%
      });
    }, 1500);

    try {
      // Initial setup
      setProgress(15);
      setProgressMessage('Iniciando pesquisa acadêmica...');

      // Direct edge function call
      const { data, error: invokeError } = await supabase.functions.invoke(
        'generate-lecture-material',
        {
          body: {
            lectureId,
            lectureTitle,
            tags
          }
        }
      );

      if (invokeError) throw invokeError;
      if (!data?.success) throw new Error(data?.error || 'Falha na geração');

      clearInterval(progressInterval);
      setProgress(100);
      setProgressMessage('Material gerado com sucesso!');

      toast({
        title: 'Material gerado',
        description: 'Material didático criado com sucesso',
      });

      // Reset after short delay
      setTimeout(() => {
        flushSync(() => {
          setIsGenerating(false);
          setProgress(0);
          setProgressMessage('');
        });
      }, 500);

      return true;

    } catch (err) {
      clearInterval(progressInterval);
      console.error('[useMaterialGeneration] Error:', err);
      
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Erro ao gerar material';

      flushSync(() => {
        setError(errorMessage);
        setIsGenerating(false);
        setProgress(0);
        setProgressMessage('');
      });

      toast({
        variant: 'destructive',
        title: 'Erro na geração',
        description: errorMessage,
      });

      return false;
    }
  }, [toast]);

  return {
    isGenerating,
    progress,
    progressMessage,
    error,
    generate,
  };
};
