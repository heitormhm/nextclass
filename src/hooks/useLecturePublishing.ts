import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useLecturePublishing = () => {
  const [isPublishing, setIsPublishing] = useState(false);
  const { toast } = useToast();

  const publishLecture = useCallback(async (
    lectureId: string,
    turmaId: string,
    studentIds: string[]
  ) => {
    try {
      setIsPublishing(true);

      // Update lecture status
      const { error: updateError } = await supabase
        .from('lectures')
        .update({ status: 'published' })
        .eq('id', lectureId);

      if (updateError) throw updateError;

      toast({
        title: '✅ Publicado com Sucesso',
        description: `Material disponível para ${studentIds.length} alunos`,
      });

      return true;
    } catch (error: any) {
      console.error('Erro ao publicar:', error);
      toast({
        title: 'Erro na Publicação',
        description: error.message || 'Falha ao publicar material',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsPublishing(false);
    }
  }, [toast]);

  return {
    isPublishing,
    publishLecture,
  };
};
