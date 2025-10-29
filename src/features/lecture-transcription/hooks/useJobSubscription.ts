import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface JobSubscriptionCallbacks {
  onQuizCompleted?: () => void;
  onQuizFailed?: () => void;
  onFlashcardsCompleted?: () => void;
  onFlashcardsFailed?: () => void;
  onMaterialCompleted?: () => void;
  onMaterialFailed?: (error: string) => void;
}

export const useJobSubscription = (
  lectureId: string | undefined,
  callbacks: JobSubscriptionCallbacks
) => {
  const { toast } = useToast();
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!lectureId) return;

    console.log('🔔 [JobSubscription] Setting up for lecture:', lectureId);

    const channel = supabase
      .channel(`teacher-jobs-${lectureId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teacher_jobs',
          filter: `lecture_id=eq.${lectureId}`
        },
        (payload) => {
          const job = payload.new as any;
          if (!job) return;

          // Clear timeout on any update
          if (processingTimeoutRef.current) {
            clearTimeout(processingTimeoutRef.current);
            processingTimeoutRef.current = null;
          }

          // Set timeout for PROCESSING status
          if (job.status === 'PROCESSING') {
            processingTimeoutRef.current = setTimeout(() => {
              toast({
                variant: 'destructive',
                title: 'Tempo esgotado',
                description: 'A geração está demorando. Tente recarregar.',
              });
            }, 180000); // 3 minutes
          }

          // Handle COMPLETED jobs
          if (job.status === 'COMPLETED') {
            if (job.job_type === 'PROCESS_TRANSCRIPT') {
              toast({ 
                title: '✅ Transcrição processada!', 
                description: 'O material didático foi gerado com sucesso.' 
              });
              // Recarregar página para exibir novo conteúdo
              setTimeout(() => window.location.reload(), 1000);
            } else if (job.job_type === 'GENERATE_QUIZ') {
              callbacks.onQuizCompleted?.();
              toast({ title: 'Quiz gerado!', description: 'Seu quiz foi gerado com sucesso' });
            } else if (job.job_type === 'GENERATE_FLASHCARDS') {
              callbacks.onFlashcardsCompleted?.();
              toast({ title: 'Flashcards gerados!', description: 'Seus flashcards foram gerados com sucesso' });
            } else if (job.job_type === 'GENERATE_LECTURE_DEEP_SEARCH') {
              callbacks.onMaterialCompleted?.();
              toast({ title: 'Material gerado!', description: 'Seu material didático foi gerado com sucesso' });
            }
          }

          // Handle FAILED jobs
          if (job.status === 'FAILED') {
            if (job.job_type === 'PROCESS_TRANSCRIPT') {
              toast({
                variant: 'destructive',
                title: '❌ Erro ao processar transcrição',
                description: job.error_message || 'Não foi possível processar a transcrição',
              });
            } else if (job.job_type === 'GENERATE_QUIZ') {
              callbacks.onQuizFailed?.();
              toast({
                variant: 'destructive',
                title: 'Erro ao gerar quiz',
                description: job.error_message || 'Não foi possível gerar o quiz',
              });
            } else if (job.job_type === 'GENERATE_FLASHCARDS') {
              callbacks.onFlashcardsFailed?.();
              toast({
                variant: 'destructive',
                title: 'Erro ao gerar flashcards',
                description: job.error_message || 'Não foi possível gerar os flashcards',
              });
            } else if (job.job_type === 'GENERATE_LECTURE_DEEP_SEARCH') {
              callbacks.onMaterialFailed?.(job.error_message || 'Não foi possível gerar o material didático');
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('🔌 [JobSubscription] Status:', status);
      });

    return () => {
      console.log('🔌 [JobSubscription] Cleaning up');
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [lectureId, callbacks]);
};
