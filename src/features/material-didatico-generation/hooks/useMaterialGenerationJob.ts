import { useState, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { MaterialGenerationService } from '../services/materialGenerationService';
import { useMaterialGenerationRealtime } from './useMaterialGenerationRealtime';
import { MaterialGenerationCallbacks, MaterialGenerationJob } from '../types/materialGeneration.types';

/**
 * Main hook for managing material generation flow
 */
export const useMaterialGenerationJob = (callbacks?: MaterialGenerationCallbacks) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  
  const { toast } = useToast();
  const hasProcessedCompletion = useRef(false);

  // Handle job updates from realtime/polling
  const handleJobUpdate = useCallback((job: MaterialGenerationJob) => {
    console.log('📊 [Job] Update received:', job.status, job.progress);
    
    const step = Math.min(Math.floor((job.progress || 0) * 5), 4);
    setCurrentStep(step);
    
    if (job.progress_message) {
      setProgressMessage(job.progress_message);
      callbacks?.onProgress?.(step, job.progress_message);
    }

    if (job.status === 'COMPLETED') {
      if (hasProcessedCompletion.current) return;
      hasProcessedCompletion.current = true;
      
      console.log('✅ [Job] COMPLETED');
      setCurrentStep(5);
      setProgressMessage('Concluído!');
      
      setTimeout(() => {
        setIsGenerating(false);
        setCurrentStep(0);
        setError(null);
        setProgressMessage('');
        setJobId(null);
        callbacks?.onSuccess?.(job.result_payload);
        toast({
          title: 'Material didático gerado!',
          description: 'Pesquisa profunda concluída com sucesso.',
        });
      }, 1000);
    } else if (job.status === 'FAILED') {
      console.error('❌ [Job] FAILED:', job.error_message);
      const errorMsg = job.error_message || 'Erro desconhecido';
      setError(errorMsg);
      setIsGenerating(false);
      setJobId(null);
      callbacks?.onError?.(errorMsg);
      
      // Toast mais detalhado baseado no tipo de erro
      if (errorMsg.includes('acadêmica') || errorMsg.includes('referências')) {
        toast({
          variant: 'destructive',
          title: '❌ Material rejeitado',
          description: 'O material foi rejeitado por falta de fontes acadêmicas. Tente novamente ou ajuste o conteúdo.',
          duration: 8000, // Toast mais longo para erros de validação
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro na geração',
          description: errorMsg,
        });
      }
    }
  }, [callbacks, toast]);

  // Use realtime hook
  const { stopPolling } = useMaterialGenerationRealtime({
    jobId,
    onJobUpdate: handleJobUpdate,
    enabled: isGenerating,
  });

  // Start generation
  const startGeneration = async (lectureId: string, lectureTitle: string, transcript?: string) => {
    console.log('🚀 [Job] Starting generation for:', lectureTitle);
    
    setError(null);
    setProgressMessage('');
    hasProcessedCompletion.current = false;
    setIsGenerating(true);
    setCurrentStep(0);

    try {
      const newJobId = await MaterialGenerationService.createJob({
        lectureId,
        lectureTitle,
        transcript,
      });
      
      console.log('✅ [Job] Created:', newJobId);
      setJobId(newJobId);
      setProgressMessage('Processamento iniciado...');
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('❌ [Job] Failed to start:', errorMsg);
      
      setError(errorMsg);
      setIsGenerating(false);
      callbacks?.onError?.(errorMsg);
      toast({
        variant: 'destructive',
        title: 'Erro ao iniciar geração',
        description: errorMsg,
      });
    }
  };

  // Cancel generation
  const cancelGeneration = () => {
    console.log('🛑 [Job] Cancelling generation');
    stopPolling();
    setIsGenerating(false);
    setJobId(null);
    setCurrentStep(0);
    setProgressMessage('');
    hasProcessedCompletion.current = false;
  };

  return {
    isGenerating,
    currentStep,
    progressMessage,
    error,
    startGeneration,
    cancelGeneration,
  };
};
