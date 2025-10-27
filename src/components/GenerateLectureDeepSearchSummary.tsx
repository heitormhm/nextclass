import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Brain, Loader2, Search, FileText, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';

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
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const { toast } = useToast();

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
        console.log('✅ [Deep Search] Job COMPLETED!');
        setCurrentStep(4);
        setProgressMessage('Concluído!');
        setTimeout(() => {
          setIsGenerating(false);
          setIsOpen(false);
          onUpdate();
          toast({
            title: 'Material didático gerado!',
            description: 'Pesquisa profunda concluída com sucesso.',
          });
        }, 2000);
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
    setError(null);
    setProgressMessage('');
    
    try {
      console.log('🚀 [Deep Search] Starting with JOB system...');
      console.log('📋 [Deep Search] Lecture:', { id: lectureId, title: lectureTitle, tags });
      
      setIsGenerating(true);
      setCurrentStep(0);

      // Validate data
      if (!lectureId || !lectureTitle) {
        throw new Error('Dados da aula incompletos');
      }

      console.log('👤 [Deep Search] Getting authenticated user...');
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('❌ [Deep Search] User error:', userError);
        throw new Error('Usuário não autenticado. Por favor, faça login novamente.');
      }

      console.log('✅ [Deep Search] User authenticated:', user.id);

      // Validate user role
      const { data: userRole, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (roleError || !userRole) {
        console.error('❌ [Deep Search] Role error:', roleError);
        throw new Error('Não foi possível verificar permissões.');
      }

      if (userRole.role !== 'teacher') {
        throw new Error('Apenas professores podem gerar material didático.');
      }

      console.log('✅ [Deep Search] User role validated: teacher');

      // Create JOB
      console.log('💾 [Deep Search] Creating job in database...');
      console.log('📊 [Deep Search] Job payload:', {
        teacher_id: user.id,
        lecture_id: lectureId,
        job_type: 'GENERATE_LECTURE_DEEP_SEARCH',
        status: 'PENDING',
        progress: 0,
        progress_message: 'Iniciando pesquisa profunda...',
        input_payload: { lectureId, lectureTitle, tags, userId: user.id }
      });
      
      const { data: job, error: jobError } = await supabase
        .from('teacher_jobs')
        .insert({
          teacher_id: user.id,
          lecture_id: lectureId,
          job_type: 'GENERATE_LECTURE_DEEP_SEARCH',
          status: 'PENDING',
          input_payload: {
            lectureId,
            lectureTitle,
            tags,
            userId: user.id
          },
          progress: 0,
          progress_message: 'Iniciando pesquisa profunda...'
        })
        .select()
        .single();

      if (jobError) {
        console.error('❌ [Deep Search] Job creation FAILED');
        console.error('📋 [Deep Search] Full error:', jobError);
        console.error('📋 [Deep Search] Error details:', {
          message: jobError.message,
          code: jobError.code,
          details: jobError.details,
          hint: jobError.hint,
        });
        console.error('👤 [Deep Search] User context:', {
          userId: user.id,
          lectureId: lectureId,
          lectureTitle: lectureTitle
        });
        setError(`Erro ao criar job: ${jobError.message}`);
        throw new Error(`Erro ao criar job: ${jobError.message}`);
      }

      console.log('✅ [Deep Search] Job created:', job.id);
      setJobId(job.id);
      setProgressMessage('Job criado. Iniciando processamento...');

      // Call job runner edge function to start processing
      console.log('🔄 [Deep Search] Invoking job runner...');
      const { error: runnerError } = await supabase.functions.invoke('teacher-job-runner', {
        body: { jobId: job.id }
      });

      if (runnerError) {
        console.error('❌ [Deep Search] Runner invocation error:', runnerError);
        throw new Error(`Erro ao iniciar processamento: ${runnerError.message}`);
      }

      console.log('✅ [Deep Search] Job runner invoked successfully');
      setProgressMessage('Processamento iniciado...');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('❌ [Deep Search] Error:', errorMessage);
      console.error('❌ [Deep Search] Error stack:', error);
      setError(errorMessage);
      setIsGenerating(false);
      toast({
        variant: 'destructive',
        title: 'Erro ao gerar material didático',
        description: errorMessage,
      });
    }
  };

  const handleClose = () => {
    if (isGenerating) {
      const confirm = window.confirm(
        'A geração do material didático está em andamento. Tem certeza que deseja fechar?'
      );
      if (!confirm) return;
      setIsGenerating(false);
    }
    setIsOpen(false);
    setCurrentStep(0);
    setJobId(null);
    setError(null);
    setProgressMessage('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button 
          size="sm"
          className="gap-2 h-10 bg-gradient-to-r from-purple-600 to-purple-700 text-white border-0 hover:from-purple-700 hover:to-purple-800 shadow-lg hover:shadow-xl transition-all"
        >
          <Brain className="h-4 w-4" />
          Gerar Material Didático
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Gerar Material Didático com Pesquisa Profunda
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {isGenerating ? (
            <div className="space-y-6 py-4">
              <div className="text-center space-y-2">
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                <h3 className="text-lg font-semibold">
                  Gerando material didático com pesquisa profunda...
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
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-300 dark:border-red-800 rounded-lg p-4">
                  <p className="text-sm text-red-800 dark:text-red-200 font-medium">❌ Erro:</p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
                </div>
              )}

              <div className="space-y-3">
                {PROCESSING_STEPS.map((step, index) => {
                  const Icon = step.icon;
                  const isCompleted = currentStep > step.id;
                  const isCurrent = currentStep === step.id;

                  return (
                    <Card
                      key={step.id}
                      className={`p-4 transition-all ${
                        isCurrent
                          ? 'border-primary shadow-md bg-primary/5'
                          : isCompleted
                          ? 'border-green-500/50 bg-green-500/5'
                          : 'border-border/50 bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full ${
                            isCurrent
                              ? 'bg-primary/10'
                              : isCompleted
                              ? 'bg-green-500/10'
                              : 'bg-muted'
                          }`}
                        >
                          {isCompleted ? (
                            <Check className="h-5 w-5 text-green-500" />
                          ) : (
                            <Icon
                              className={`h-5 w-5 ${
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
          ) : (
            <>
              <div className="space-y-4">
                <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
                  <h4 className="text-sm font-medium mb-2">Sobre esta aula:</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    <span className="font-medium">Título:</span> {lectureTitle}
                  </p>
                  {tags.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Tags:</span> {tags.join(', ')}
                    </p>
                  )}
                </div>

                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-start gap-3">
                    <Search className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="text-sm font-semibold text-primary mb-1">
                        Deep Search Ativado
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        O material será gerado com pesquisa web profunda, incluindo:
                      </p>
                      <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                        <li>• Busca em múltiplas fontes educacionais</li>
                        <li>• Análise de estudos de caso reais</li>
                        <li>• Recursos bibliográficos atualizados</li>
                        <li>• Material didático estruturado</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {currentMaterial && (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    ⚠️ Ao gerar um novo material, o material atual será substituído.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleGenerate} 
                  className="gap-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
                >
                  <Brain className="h-4 w-4" />
                  Iniciar Pesquisa Profunda
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};