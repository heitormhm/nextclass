import { useState, useCallback, useEffect } from 'react';
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
        // FIX: Read from material_didatico_html (new schema) instead of material_didatico (old/empty)
        const materialDidatico = data.structured_content.material_didatico_html || data.structured_content.material_didatico;
        
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
        console.log('[useLectureData] 📋 Lecture needs processing, creating job...');
        
        try {
          await createTranscriptProcessingJob(lectureId, data.raw_transcript);
        } catch (jobError) {
          console.error('[useLectureData] Job creation failed:', jobError);
        }
      }
    } catch (error) {
      console.error('[useLectureData] Error loading lecture:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar aula',
        description: 'Não foi possível carregar os dados da aula',
      });
    } finally {
      setIsLoading(false);
    }
  }, [lectureId, toast]);

  // Auto-load lecture when lectureId changes
  useEffect(() => {
    if (lectureId) {
      loadLecture();
    }
  }, [lectureId, loadLecture]);

  const createTranscriptProcessingJob = async (lectureId: string, transcript: string) => {
    console.log('[useLectureData] 🚀 Starting createTranscriptProcessingJob', { lectureId });
    
    try {
      // 1. Verificar se já existe job ativo
      console.log('[useLectureData] 🔍 Checking for existing jobs...');
      const { data: existingJob, error: checkError } = await supabase
        .from('teacher_jobs')
        .select('id, status')
        .eq('lecture_id', lectureId)
        .eq('job_type', 'PROCESS_TRANSCRIPT')
        .in('status', ['PENDING', 'PROCESSING'])
        .maybeSingle();

      if (checkError) {
        console.error('[useLectureData] ❌ Error checking jobs:', checkError);
        throw new Error(`Erro ao verificar jobs existentes: ${checkError.message}`);
      }

      if (existingJob) {
        console.log('[useLectureData] ✅ Job already exists:', existingJob.id);
        toast({
          title: '⏳ Processamento em andamento',
          description: 'A transcrição já está sendo processada.',
        });
        return;
      }

      // 2. Obter usuário autenticado
      console.log('[useLectureData] 👤 Getting authenticated user...');
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('[useLectureData] ❌ Auth error:', userError);
        throw new Error('Usuário não autenticado');
      }

      console.log('[useLectureData] ✅ User authenticated:', user.id);

      // 3. Criar novo job
      console.log('[useLectureData] 📝 Creating new job...');
      const { data: jobData, error: jobError } = await supabase
        .from('teacher_jobs')
        .insert({
          teacher_id: user.id,
          lecture_id: lectureId,
          job_type: 'PROCESS_TRANSCRIPT',
          status: 'PENDING',
          input_payload: { lectureId, transcript },
          progress: 0,
          progress_message: 'Iniciando processamento...'
        })
        .select()
        .single();

      if (jobError) {
        console.error('[useLectureData] ❌ Job creation error:', jobError);
        throw new Error(`Erro ao criar job: ${jobError.message}`);
      }

      if (!jobData) {
        throw new Error('Job foi criado mas não retornou dados');
      }

      console.log('[useLectureData] ✅ Job created successfully:', jobData.id);

      // 4. Invocar teacher-job-runner
      console.log('[useLectureData] 🚀 Invoking teacher-job-runner...');
      const { error: functionError } = await supabase.functions.invoke('teacher-job-runner', {
        body: { jobId: jobData.id },
      });

      if (functionError) {
        console.error('[useLectureData] ❌ Function invocation error:', functionError);
        // Deletar job órfão
        await supabase.from('teacher_jobs').delete().eq('id', jobData.id);
        throw new Error(`Erro ao iniciar processamento: ${functionError.message}`);
      }

      console.log('[useLectureData] ✅ teacher-job-runner invoked successfully');

      toast({
        title: '🤖 Processamento iniciado',
        description: 'A IA está gerando o material didático. Aguarde...',
      });

    } catch (err) {
      console.error('[useLectureData] ❌ Failed to create job:', err);
      toast({
        variant: 'destructive',
        title: 'Erro ao processar transcrição',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
      });
      throw err;
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
