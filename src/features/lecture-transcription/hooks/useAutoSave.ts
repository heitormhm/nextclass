import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { LectureService } from '../services/lectureService';
import { StructuredContent } from '../types/lecture.types';

export const useAutoSave = (
  lectureId: string | undefined,
  structuredContent: StructuredContent | null,
  lectureTitle: string,
  thumbnailUrl: string | null,
  hasUnsavedChanges: boolean
) => {
  const { toast } = useToast();

  useEffect(() => {
    const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && lectureId && structuredContent) {
        e.preventDefault();
        e.returnValue = 'Você tem alterações não salvas. Deseja realmente sair?';

        try {
          await saveProgress();
        } catch (err) {
          console.error('Failed to save on exit:', err);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, lectureId, structuredContent, lectureTitle, thumbnailUrl]);

  const saveProgress = async () => {
    if (!lectureId || !structuredContent) return false;

    try {
      const contentToSave = {
        ...structuredContent as any,
        thumbnail: thumbnailUrl || (structuredContent as any).thumbnail || ''
      };

      await LectureService.updateLecture(lectureId, {
        structured_content: contentToSave as any,
        title: lectureTitle,
      } as any);

      toast({ title: 'Salvo! 💾', description: 'Progresso salvo com sucesso' });
      return true;
    } catch (err) {
      console.error('Save error:', err);
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar o progresso',
      });
      return false;
    }
  };

  return { saveProgress };
};
