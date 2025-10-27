import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Brain, Loader2, Search, FileText, Check, AlertCircle, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface GenerateLectureDeepSearchSummaryProps {
  lectureId: string;
  lectureTitle: string;
  tags: string[];
  currentMaterial?: string;
  fullTranscript: string;
  onUpdate: () => void;
  onProgressUpdate?: (progress: number, message: string) => void;
  onGeneratingChange?: (isGenerating: boolean) => void;
}

const PROCESSING_STEPS = [
  { id: 1, label: 'Analisando tópico da aula', icon: Search },
  { id: 2, label: 'Pesquisando fontes na web', icon: Search },
  { id: 3, label: 'Coletando dados educacionais', icon: FileText },
  { id: 4, label: 'Gerando material didático', icon: Brain },
  { id: 5, label: 'Adicionando gráficos e diagramas', icon: BarChart3 },
];

export const GenerateLectureDeepSearchSummary: React.FC<GenerateLectureDeepSearchSummaryProps> = ({
  lectureId,
  lectureTitle,
  tags,
  currentMaterial,
  fullTranscript,
  onUpdate,
  onProgressUpdate,
  onGeneratingChange,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const { toast } = useToast();
  const hasProcessedCompletion = useRef(false);
  const pollInterval = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);
  const abortPolling = useRef(false);
  
  // Use refs to avoid re-creating the effect when these change
  const onUpdateRef = useRef(onUpdate);
  const toastRef = useRef(toast);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
    toastRef.current = toast;
  }, [onUpdate, toast]);

  // Helper function to stop polling
  const stopPolling = () => {
    abortPolling.current = true;
    if (pollInterval.current) {
      console.log('🛑 [Deep Search] Stopping polling explicitly');
      clearInterval(pollInterval.current);
      pollInterval.current = null;
    }
  };

  // Global cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🔌 [Deep Search] Component unmounting, cleaning up...');
      isMounted.current = false;
      stopPolling();
      onGeneratingChange?.(false);
    };
  }, [onGeneratingChange]);

  // Subscribe to job updates via realtime with polling fallback
  useEffect(() => {
    if (!jobId) return;

    console.log('🔔 [Deep Search] Subscribing to job:', jobId);

    const handleJobUpdate = (job: any) => {
      if (!isMounted.current || abortPolling.current) {
        console.log('⚠️ [Deep Search] Polling aborted, ignoring update');
        return;
      }
      
      console.log(`🔄 [Deep Search] Job update:`, job.status, job.progress);
      
      // Map progress to steps (0-1 → 0-4), cap at 4 during processing
      const step = Math.min(Math.floor((job.progress || 0) * 5), 4);
      setCurrentStep(step);
      const progressPercent = Math.round((job.progress || 0) * 100);
      
      if (job.progress_message) {
        console.log('📋 [Deep Search] Progress:', `${progressPercent}% - ${job.progress_message}`);
        setProgressMessage(job.progress_message);
        onProgressUpdate?.(progressPercent, job.progress_message);
      } else {
        onProgressUpdate?.(progressPercent, PROCESSING_STEPS[step]?.label || 'Processando...');
      }

      if (job.status === 'COMPLETED') {
        if (hasProcessedCompletion.current) {
          console.log('⏭️ [Deep Search] Completion already processed, skipping');
          return;
        }
        hasProcessedCompletion.current = true;
        abortPolling.current = true;
        
        console.log('✅ [Deep Search] Job COMPLETED!');
        
        stopPolling();
        
        if (!isMounted.current) {
          console.log('⚠️ [Deep Search] Component unmounted after completion, skipping state updates');
          return;
        }
        
        setCurrentStep(5);
        setProgressMessage('Concluído!');
        setJobId(null);
        onProgressUpdate?.(100, 'Concluído!');
        
        setTimeout(() => {
          if (!isMounted.current) return;
          setIsGenerating(false);
          setCurrentStep(0);
          setError(null);
          setProgressMessage('');
          onGeneratingChange?.(false);
          onUpdateRef.current();
          toastRef.current({
            title: 'Material didático gerado!',
            description: 'Pesquisa profunda concluída com sucesso.',
          });
        }, 1000);
      } else if (job.status === 'FAILED') {
        console.error('❌ [Deep Search] Job FAILED:', job.error_message);
        setError(job.error_message || 'Erro desconhecido');
        setIsGenerating(false);
        onGeneratingChange?.(false);
        onProgressUpdate?.(0, 'Erro na geração');
        toastRef.current({
          variant: 'destructive',
          title: 'Erro na geração',
          description: job.error_message || 'Não foi possível gerar o material didático',
        });
      }
    };

    const channel = supabase
      .channel(`teacher-jobs-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'teacher_jobs',
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          console.log('📬 [Deep Search] Realtime update:', payload);
          handleJobUpdate(payload.new as any);
        }
      )
      .subscribe((status) => {
        console.log('🔌 [Deep Search] Subscription status:', status);
        
        // If subscription fails, fallback to polling
        if (status !== 'SUBSCRIBED') {
          console.warn('⚠️ [Deep Search] Realtime subscription not active, starting polling fallback...');
          
          pollInterval.current = setInterval(async () => {
            const { data: job } = await supabase
              .from('teacher_jobs')
              .select('*')
              .eq('id', jobId)
              .single();
              
            if (job) {
              console.log('🔄 [Deep Search] Poll update:', job.status, `${Math.round((job.progress || 0) * 100)}%`);
              handleJobUpdate(job);
            }
          }, 3000);
        }
      });

    return () => {
      console.log('🔌 [Deep Search] Unsubscribing from job');
      stopPolling();
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  const handleGenerate = async () => {
    console.log('🚀 [Deep Search] === INÍCIO DO PROCESSO ===');
    console.log('📋 [Deep Search] Parâmetros:', {
      lectureId,
      lectureTitle,
      tags: tags?.length || 0,
      currentMaterial: !!currentMaterial
    });

    setError(null);
    setProgressMessage('');
    hasProcessedCompletion.current = false;
    abortPolling.current = false;
    
    try {
      setIsGenerating(true);
      setCurrentStep(0);
      onGeneratingChange?.(true);
      onProgressUpdate?.(5, 'Iniciando geração...');

      // Validar dados básicos
      if (!lectureId || !lectureTitle) {
        console.error('❌ [Deep Search] Dados incompletos:', { lectureId, lectureTitle });
        throw new Error('Dados da aula incompletos');
      }
      console.log('✅ [Deep Search] Dados básicos validados');

      // Obter usuário
      console.log('👤 [Deep Search] Obtendo usuário autenticado...');
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('❌ [Deep Search] Erro ao obter usuário:', userError);
        throw new Error(`Erro de autenticação: ${userError.message}`);
      }
      
      if (!user) {
        console.error('❌ [Deep Search] Usuário não encontrado (NULL)');
        throw new Error('Usuário não autenticado. Faça login novamente.');
      }

      console.log('✅ [Deep Search] Usuário autenticado:', {
        userId: user.id,
        email: user.email
      });

      // Verificar role
      console.log('🔐 [Deep Search] Verificando role do usuário...');
      const { data: userRole, error: roleError } = await supabase
        .from('user_roles')
        .select('role, is_validated')
        .eq('user_id', user.id)
        .single();

      if (roleError) {
        console.error('❌ [Deep Search] Erro ao buscar role:', roleError);
        throw new Error(`Erro ao verificar permissões: ${roleError.message}`);
      }

      if (!userRole) {
        console.error('❌ [Deep Search] Role não encontrada (NULL)');
        throw new Error('Permissões não configuradas. Entre em contato com suporte.');
      }

      console.log('✅ [Deep Search] Role encontrada:', {
        role: userRole.role,
        isValidated: userRole.is_validated
      });

      if (userRole.role !== 'teacher') {
        console.error('❌ [Deep Search] Role inválida:', userRole.role);
        throw new Error('Apenas professores podem gerar material didático.');
      }

      if (!userRole.is_validated) {
        console.warn('⚠️ [Deep Search] Professor não validado');
        throw new Error('Sua conta de professor ainda não foi validada. Aguarde aprovação.');
      }

      console.log('✅ [Deep Search] Permissões validadas');

      // Get teacher's name from user metadata (same as Navbar)
      console.log('👤 [Deep Search] Obtendo nome do professor...');
      const fullName = user.user_metadata?.full_name || '';
      const nameParts = fullName.split(' ').filter(Boolean);
      const firstName = nameParts[0] || user.email?.split('@')[0] || 'Professor';
      const lastName = nameParts[nameParts.length - 1] || '';
      const teacherName = firstName && lastName 
        ? `${firstName} ${lastName}` 
        : firstName;

      console.log('✅ [Deep Search] Nome do professor:', teacherName);
      console.log('📋 [Deep Search] user_metadata.full_name:', user.user_metadata?.full_name);

      // Preparar payload do job
      const jobPayload = {
        teacher_id: user.id,
        lecture_id: lectureId,
        job_type: 'GENERATE_LECTURE_DEEP_SEARCH',
        status: 'PENDING',
        input_payload: {
          lectureId,
          lectureTitle,
          tags,
          userId: user.id,
          teacherName: teacherName
        },
        progress: 0,
        progress_message: 'Iniciando pesquisa profunda...'
      };

      console.log('💾 [Deep Search] Criando job no database...');
      console.log('📊 [Deep Search] Job payload:', JSON.stringify(jobPayload, null, 2));

      // Criar job
      const { data: job, error: jobError } = await supabase
        .from('teacher_jobs')
        .insert(jobPayload)
        .select()
        .single();

      // Tratar erro de inserção
      if (jobError) {
        console.error('❌ [Deep Search] ===== JOB CREATION FAILED =====');
        console.error('📋 [Deep Search] Error object:', jobError);
        console.error('📋 [Deep Search] Error details:', {
          message: jobError.message,
          code: jobError.code,
          details: jobError.details,
          hint: jobError.hint,
        });
        console.error('📋 [Deep Search] User context:', {
          userId: user.id,
          email: user.email,
          role: userRole.role
        });
        console.error('📋 [Deep Search] Lecture context:', {
          lectureId: lectureId,
          lectureTitle: lectureTitle,
          tagsCount: tags?.length || 0
        });
        
        setError(`Erro ao criar job: ${jobError.message}`);
        throw new Error(`Falha ao criar job no database: ${jobError.message}`);
      }

      if (!job) {
        console.error('❌ [Deep Search] Job criado mas data é NULL');
        throw new Error('Job criado mas sem dados retornados');
      }

      console.log('✅ [Deep Search] Job criado com sucesso!');
      console.log('📋 [Deep Search] Job ID:', job.id);
      console.log('📋 [Deep Search] Job data:', job);
      
      setJobId(job.id);
      setProgressMessage('Job criado. Iniciando processamento...');

      // Invocar edge function
      console.log('🔄 [Deep Search] Invocando teacher-job-runner...');
      const { data: runnerData, error: runnerError } = await supabase.functions.invoke('teacher-job-runner', {
        body: { jobId: job.id }
      });

      if (runnerError) {
        console.error('❌ [Deep Search] Runner invocation error:', runnerError);
        throw new Error(`Erro ao iniciar processamento: ${runnerError.message}`);
      }

      console.log('✅ [Deep Search] Job runner invocado com sucesso');
      console.log('📋 [Deep Search] Runner response:', runnerData);
      setProgressMessage('Processamento iniciado...');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('❌ [Deep Search] ===== FATAL ERROR =====');
      console.error('📋 [Deep Search] Error message:', errorMessage);
      console.error('📋 [Deep Search] Error stack:', error);
      
      setError(errorMessage);
      setIsGenerating(false);
      onGeneratingChange?.(false);
      onProgressUpdate?.(0, 'Erro ao iniciar');
      
      toast({
        variant: 'destructive',
        title: 'Erro ao gerar material didático',
        description: errorMessage,
      });
    }
  };

  const handleButtonClick = () => {
    if (currentMaterial) {
      const confirm = window.confirm(
        '⚠️ Já existe material didático gerado para esta aula. Deseja substituí-lo por um novo material com pesquisa profunda?\n\nEsta ação não pode ser desfeita.'
      );
      if (!confirm) return;
    }
    handleGenerate();
  };

  return (
    <div className="space-y-3">
      <Button 
        size="sm"
        disabled={isGenerating}
        onClick={handleButtonClick}
        className="gap-2 h-10 bg-gradient-to-r from-purple-600 to-purple-700 text-white border-0 hover:from-purple-700 hover:to-purple-800 shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Gerando Material...
          </>
        ) : (
          <>
            <Brain className="h-4 w-4" />
            Gerar Material Didático
          </>
        )}
      </Button>

      {isGenerating && (
        <div className="flex items-center gap-3 px-4 py-3 bg-purple-50 border border-purple-200 rounded-lg">
          <Loader2 className="h-4 w-4 animate-spin text-purple-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-purple-900">
                {Math.round((currentStep / PROCESSING_STEPS.length) * 100)}%
              </span>
              <span className="text-xs text-purple-600 truncate">
                {progressMessage || PROCESSING_STEPS[currentStep - 1]?.label || 'Processando...'}
              </span>
            </div>
            <div className="w-full bg-purple-200 rounded-full h-1.5">
              <div 
                className="bg-gradient-to-r from-purple-600 to-pink-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / PROCESSING_STEPS.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error === 'TIMEOUT' 
              ? 'A geração demorou mais que o esperado. Tente novamente.' 
              : error === 'AUTH_ERROR'
              ? 'Erro de autenticação. Faça login novamente.'
              : error === 'PERMISSION_DENIED'
              ? 'Você não tem permissão para gerar material.'
              : `Erro ao gerar material: ${error}`
            }
          </AlertDescription>
        </Alert>
      )}

      {/* Dialog removed - using inline progress badge */}
      <Dialog open={false} onOpenChange={() => {}}>
      </Dialog>
    </div>
  );
};
