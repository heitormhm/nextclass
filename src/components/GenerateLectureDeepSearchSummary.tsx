import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Brain, Loader2, Search, FileText, Check, AlertCircle } from 'lucide-react';
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
}

const PROCESSING_STEPS = [
  { id: 1, label: 'Analisando tópico da aula', icon: Search },
  { id: 2, label: 'Pesquisando fontes na web', icon: Search },
  { id: 3, label: 'Coletando dados educacionais', icon: FileText },
  { id: 4, label: 'Gerando material didático', icon: Brain },
];

export const GenerateLectureDeepSearchSummary: React.FC<GenerateLectureDeepSearchSummaryProps> = ({
  lectureId,
  lectureTitle,
  tags,
  currentMaterial,
  fullTranscript,
  onUpdate,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const { toast } = useToast();
  const hasProcessedCompletion = useRef(false);

  // Subscribe to job updates via realtime with polling fallback
  useEffect(() => {
    if (!jobId) return;

    console.log('🔔 [Deep Search] Subscribing to job:', jobId);

    let pollInterval: NodeJS.Timeout | null = null;

    const handleJobUpdate = (job: any) => {
      // Map progress to steps (0-1 → 0-3), cap at 3 during processing
      const step = Math.min(Math.floor((job.progress || 0) * 4), 3);
      setCurrentStep(step);
      
      if (job.progress_message) {
        console.log('📋 [Deep Search] Progress:', `${Math.round((job.progress || 0) * 100)}% - ${job.progress_message}`);
        setProgressMessage(job.progress_message);
      }

      if (job.status === 'COMPLETED') {
        if (hasProcessedCompletion.current) {
          console.log('⏭️ [Deep Search] Completion already processed, skipping');
          return;
        }
        hasProcessedCompletion.current = true;
        
        console.log('✅ [Deep Search] Job COMPLETED!');
        setCurrentStep(4);
        setProgressMessage('Concluído!');
        
        // Limpar jobId ANTES de onUpdate para parar polling
        setJobId(null);
        
        setTimeout(() => {
          setIsGenerating(false);
          setCurrentStep(0);
          setError(null);
          setProgressMessage('');
          onUpdate();
          toast({
            title: 'Material didático gerado!',
            description: 'Pesquisa profunda concluída com sucesso.',
          });
        }, 1000);
      } else if (job.status === 'FAILED') {
        console.error('❌ [Deep Search] Job FAILED:', job.error_message);
        setError(job.error_message || 'Erro desconhecido');
        setIsGenerating(false);
        toast({
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
          
          pollInterval = setInterval(async () => {
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
      if (pollInterval) {
        console.log('🔄 [Deep Search] Stopping polling');
        clearInterval(pollInterval);
      }
      supabase.removeChannel(channel);
    };
  }, [jobId, toast, onUpdate]);

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
    
    try {
      setIsGenerating(true);
      setCurrentStep(0);

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

      // Get teacher name from users table
      console.log('👤 [Deep Search] Buscando nome do professor...');
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      const teacherName = profile?.full_name || user.email?.split('@')[0] || 'Professor';
      console.log('✅ [Deep Search] Nome do professor:', teacherName);

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
    <div className="space-y-4">
      <Button 
        size="sm"
        disabled={isGenerating}
        onClick={handleButtonClick}
        className="gap-2 h-10 bg-gradient-to-r from-purple-600 to-purple-700 text-white border-0 hover:from-purple-700 hover:to-purple-800 shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processando...
          </>
        ) : (
          <>
            <Brain className="h-4 w-4" />
            Gerar Material Didático
          </>
        )}
      </Button>

      <Dialog open={isGenerating} onOpenChange={() => {}}>
        <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-xl border-white/40 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-center">
              Gerando Material Didático
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-6">
            <div className="text-center space-y-2">
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
              <h3 className="text-base font-semibold">
                Pesquisa profunda em andamento...
              </h3>
              <p className="text-sm text-muted-foreground">
                Este processo pode levar até 3 minutos
              </p>
              
              {progressMessage && (
                <p className="text-xs text-primary font-medium mt-2 animate-pulse">
                  {progressMessage}
                </p>
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              {PROCESSING_STEPS.map((step) => {
                const Icon = step.icon;
                const isCompleted = currentStep > step.id;
                const isCurrent = currentStep === step.id;

                return (
                  <Card
                    key={step.id}
                    className={`p-3 transition-all ${
                      isCurrent
                        ? 'border-primary shadow-md bg-primary/5'
                        : isCompleted
                        ? 'border-green-500/50 bg-green-500/5'
                        : 'border-border/50 bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full ${
                          isCurrent
                            ? 'bg-primary/10'
                            : isCompleted
                            ? 'bg-green-500/10'
                            : 'bg-muted'
                        }`}
                      >
                        {isCompleted ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Icon
                            className={`h-4 w-4 ${
                              isCurrent ? 'text-primary animate-pulse' : 'text-muted-foreground'
                            }`}
                          />
                        )}
                      </div>
                      <div className="flex-1">
                        <p
                          className={`text-sm font-medium ${
                            isCurrent || isCompleted ? 'text-foreground' : 'text-muted-foreground'
                          }`}
                        >
                          {step.label}
                        </p>
                      </div>
                      {isCurrent && (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
