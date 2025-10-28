import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
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
        // Criar job em vez de processar diretamente
        await createTranscriptProcessingJob(lectureId, data.raw_transcript);
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

  const createTranscriptProcessingJob = async (lectureId: string, transcript: string) => {
    try {
      // 1. Verificar se já existe job ativo
      const { data: existingJob } = await supabase
        .from('teacher_jobs')
        .select('id, status')
        .eq('lecture_id', lectureId)
        .eq('job_type', 'PROCESS_TRANSCRIPT')
        .in('status', ['PENDING', 'PROCESSING'])
        .maybeSingle();

      if (existingJob) {
        console.log('[useLectureData] Job already exists:', existingJob.id);
        return;
      }

      // 2. Criar novo job
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: jobData, error: jobError } = await supabase
        .from('teacher_jobs')
        .insert({
          teacher_id: user.id,
          lecture_id: lectureId,
          job_type: 'PROCESS_TRANSCRIPT',
          status: 'PENDING',
          input_payload: { lectureId, transcript },
          progress: 0,
        })
        .select()
        .single();

      if (jobError || !jobData) {
        throw new Error(`Erro ao criar job: ${jobError?.message}`);
      }

      // 3. Invocar teacher-job-runner
      const { error: functionError } = await supabase.functions.invoke('teacher-job-runner', {
        body: { jobId: jobData.id },
      });

      if (functionError) {
        throw new Error(`Erro ao iniciar processamento: ${functionError.message}`);
      }

      console.log('[useLectureData] ✅ Job created:', jobData.id);
    } catch (err) {
      console.error('[useLectureData] Failed to create job:', err);
      toast({
        variant: 'destructive',
        title: 'Erro ao processar transcrição',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
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
