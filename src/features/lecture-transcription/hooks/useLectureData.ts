import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { LectureService } from '../services/lectureService';
import { Lecture, StructuredContent } from '../types/lecture.types';

export const useLectureData = (lectureId: string | undefined) => {
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [structuredContent, setStructuredContent] = useState<StructuredContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadLecture = useCallback(async () => {
    if (!lectureId) return;

    try {
      setIsLoading(true);
      const data = await LectureService.loadLecture(lectureId);
      setLecture(data);

      if (data?.structured_content) {
        const materialDidatico = data.structured_content.material_didatico;
        
        if (materialDidatico) {
          const cleanedMarkdown = await LectureService.postProcessMaterialDidatico(
            typeof materialDidatico === 'object' ? JSON.stringify(materialDidatico) : materialDidatico
          );
          
          setStructuredContent({
            ...data.structured_content,
            material_didatico: cleanedMarkdown
          } as StructuredContent);
        } else {
          setStructuredContent(data.structured_content as StructuredContent);
        }
      } else if (data?.status === 'processing' && data?.raw_transcript) {
        processTranscript(data.raw_transcript);
      }
    } catch (error) {
      console.error('Error loading lecture:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar aula',
        description: 'Não foi possível carregar os dados da aula',
      });
    } finally {
      setIsLoading(false);
    }
  }, [lectureId]);

  const processTranscript = async (transcript: string) => {
    try {
      toast({
        title: 'Processando transcrição',
        description: 'A IA está gerando o material didático...',
      });

      const data = await LectureService.processTranscript(lectureId!, transcript);

      if (data?.structuredContent) {
        setStructuredContent(data.structuredContent);
        toast({
          title: 'Processamento concluído',
          description: 'Material didático gerado com sucesso',
        });
      }
    } catch (error) {
      console.error('Error processing transcript:', error);
      toast({
        variant: 'destructive',
        title: 'Erro no processamento',
        description: 'Não foi possível processar a transcrição',
      });
    }
  };

  return { 
    lecture, 
    setLecture,
    structuredContent,
    setStructuredContent,
    isLoading, 
    reloadLecture: loadLecture 
  };
};
