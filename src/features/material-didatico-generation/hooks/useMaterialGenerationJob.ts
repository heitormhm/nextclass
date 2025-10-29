import { useState, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { MaterialGenerationService } from '../services/materialGenerationService';
import { useMaterialGenerationRealtime } from './useMaterialGenerationRealtime';
import { MaterialGenerationCallbacks, MaterialGenerationJob } from '../types/materialGeneration.types';
import {
  validateGenerationInputs,
  getErrorMessage,
  mapProgressToStep,
  isTerminalState,
} from '../utils/materialGenerationHelpers';

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
    console.log('📊 [Job] Update:', job.status, job.progress);
    
    // Map progress to UI step using helper
    const step = mapProgressToStep(job.progress || 0);
    setCurrentStep(step);
    
    if (job.progress_message) {
      setProgressMessage(job.progress_message);
      callbacks?.onProgress?.(step, job.progress_message);
    }

    // Handle terminal states
    if (isTerminalState(job.status)) {
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
        
        const errorMsg = getErrorMessage(job.error_message);
        setError(errorMsg);
        setIsGenerating(false);
        setJobId(null);
        callbacks?.onError?.(errorMsg);
        
        // Specific error toasts
        if (errorMsg.includes('fontes não confiáveis') || errorMsg.includes('fontes banidas')) {
          toast({
            variant: 'destructive',
            title: '❌ Fontes não confiáveis',
            description: 'Material usou fontes não acadêmicas. Refaça a pesquisa.',
            duration: 8000,
          });
        } else if (errorMsg.includes('timeout') || errorMsg.includes('tempo')) {
          toast({
            variant: 'destructive',
            title: '⏰ Tempo limite excedido',
            description: 'Tente novamente em alguns instantes.',
            duration: 6000,
          });
        } else if (errorMsg.includes('validation') || errorMsg.includes('validação')) {
          toast({
            variant: 'destructive',
            title: '⚠️ Erro de validação',
            description: 'Problema ao validar conteúdo gerado.',
            duration: 6000,
          });
        } else if (errorMsg.includes('vazio') || errorMsg.includes('empty') || errorMsg.includes('parsing')) {
          // ✅ FASE 3: Toast específico para parsing
          toast({
            variant: 'destructive',
            title: '🔧 Erro no Processamento',
            description: 'Falha ao estruturar o material. Tente regenerar ou entre em contato com o suporte.',
            duration: 10000,
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Erro na geração',
            description: errorMsg,
          });
        }
      }
    }
  }, [callbacks, toast]);

  // Use realtime hook
  const { stopPolling } = useMaterialGenerationRealtime({
    jobId,
    onJobUpdate: handleJobUpdate,
    enabled: isGenerating,
  });

  // Start generation with validation
  const startGeneration = async (lectureId: string, lectureTitle: string, transcript?: string) => {
    console.log('🚀 [Job] Starting generation for:', lectureTitle);
    
    try {
      // Validate inputs before starting
      validateGenerationInputs(lectureId, lectureTitle, transcript);
      
      // ✅ FASE 2: Notify parent IMMEDIATELY (before any state changes)
      // This ensures loader appears instantly without async delay
      callbacks?.onProgress?.(0, 'Iniciando...');
      
      setError(null);
      setProgressMessage('');
      hasProcessedCompletion.current = false;
      setIsGenerating(true);
      setCurrentStep(0);

      const newJobId = await MaterialGenerationService.createJob({
        lectureId,
        lectureTitle,
        transcript,
      });
      
      console.log('✅ [Job] Created:', newJobId);
      setJobId(newJobId);
      setProgressMessage('Processamento iniciado...');
      
    } catch (err) {
      const errorMsg = getErrorMessage(err);
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
