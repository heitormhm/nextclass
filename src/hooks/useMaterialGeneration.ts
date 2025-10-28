import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useMaterialGeneration = (lectureId: string) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const { toast } = useToast();

  const generateMaterial = useCallback(async () => {
    try {
      setIsGenerating(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: 'Erro de Autenticação',
          description: 'Você precisa estar logado para gerar material.',
          variant: 'destructive',
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('generate-deep-search-report', {
        body: { lectureId },
      });

      if (error) throw error;

      if (data?.jobId) {
        setCurrentJobId(data.jobId);
        toast({
          title: '🧠 Geração Iniciada',
          description: 'Material didático sendo gerado com IA...',
        });
      }
    } catch (error: any) {
      console.error('Erro ao gerar material:', error);
      toast({
        title: 'Erro na Geração',
        description: error.message || 'Falha ao iniciar geração do material',
        variant: 'destructive',
      });
      setIsGenerating(false);
    }
  }, [lectureId, toast]);

  const cancelGeneration = useCallback(() => {
    setIsGenerating(false);
    setCurrentJobId(null);
  }, []);

  return {
    isGenerating,
    currentJobId,
    generateMaterial,
    cancelGeneration,
    setIsGenerating,
  };
};
