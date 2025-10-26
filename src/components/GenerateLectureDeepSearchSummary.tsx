import React, { useState, useEffect, useRef } from 'react';
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
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const { toast } = useToast();

  // Subscribe to session updates
  useEffect(() => {
    if (!sessionId) return;

    console.log('🔔 [Deep Search Frontend] Subscribing to session:', sessionId);

    const channel = supabase
      .channel(`lecture-deep-search-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'lecture_deep_search_sessions',
          filter: `id=eq.${sessionId}`,
        },
        async (payload) => {
          console.log('📬 [Deep Search Frontend] Session update:', payload);
          const session = payload.new as any;

          // Update progress message if available
          if (session.progress_step) {
            console.log('📋 [Deep Search Frontend] Progress:', session.progress_step);
            setProgressMessage(session.progress_step);
          }

          if (session.status === 'analyzing') {
            console.log('📊 [Deep Search Frontend] Status: Analyzing...');
            setCurrentStep(1);
            setProgressMessage('Analisando conteúdo da aula...');
          } else if (session.status === 'researched') {
            console.log('📊 [Deep Search Frontend] Status: Research complete, generating report...');
            setCurrentStep(2);
            setProgressMessage('Pesquisa concluída. Iniciando geração de relatório...');
            
            // Call second edge function to generate report
            try {
              console.log('📝 [Deep Search Frontend] Calling generate-lecture-deep-report...');
              const { error: reportError } = await supabase.functions.invoke(
                'generate-lecture-deep-report',
                {
                  body: {
                    sessionId: sessionId,
                    lectureId: lectureId,
                  },
                }
              );
              
              if (reportError) {
                console.error('❌ [Deep Search Frontend] Report error:', reportError);
                throw reportError;
              }
              
              console.log('✅ [Deep Search Frontend] Report generation started');
            } catch (error) {
              console.error('❌ [Deep Search Frontend] Failed to start report generation:', error);
              setError(error instanceof Error ? error.message : 'Erro ao gerar relatório');
              setIsGenerating(false);
              toast({
                variant: 'destructive',
                title: 'Erro ao gerar relatório',
                description: error instanceof Error ? error.message : 'Erro desconhecido',
              });
            }
            
          } else if (session.status === 'generating') {
            console.log('📊 [Deep Search Frontend] Status: Generating report...');
            setCurrentStep(3);
            setProgressMessage('Gerando material didático com IA...');
          } else if (session.status === 'completed') {
            console.log('✅ [Deep Search Frontend] Status: COMPLETED!');
            setCurrentStep(4);
            setProgressMessage('Concluído!');
            setTimeout(() => {
              setIsGenerating(false);
              setIsOpen(false);
              onUpdate();
              toast({
                title: 'Material didático gerado com sucesso!',
                description: 'Material educacional com pesquisa profunda foi criado.',
              });
            }, 2000);
          } else if (session.status === 'error') {
            console.error('❌ [Deep Search Frontend] Status: ERROR');
            console.error('❌ [Deep Search Frontend] Error message:', session.error);
            setError(session.error || 'Erro desconhecido');
            setIsGenerating(false);
            toast({
              variant: 'destructive',
              title: 'Erro na geração',
              description: session.error || 'Não foi possível gerar o material didático',
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('🔌 [Deep Search Frontend] Subscription status:', status);
      });

    return () => {
      console.log('🔌 [Deep Search Frontend] Unsubscribing from session');
      supabase.removeChannel(channel);
    };
  }, [sessionId, lectureId, toast, onUpdate]);

  const handleGenerate = async () => {
    setError(null);
    setProgressMessage('');
    
    try {
      console.log('🚀 [Deep Search Frontend] Starting generation process...');
      console.log('📋 [Deep Search Frontend] Lecture ID:', lectureId);
      console.log('📋 [Deep Search Frontend] Lecture Title:', lectureTitle);
      console.log('📋 [Deep Search Frontend] Tags:', tags);
      
      setIsGenerating(true);
      setCurrentStep(0);

      // Validate data before proceeding
      if (!lectureId || !lectureTitle) {
        throw new Error('Dados da aula incompletos');
      }

      console.log('👤 [Deep Search Frontend] Getting authenticated user...');
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('❌ [Deep Search Frontend] User error:', userError);
        throw new Error(`Erro de autenticação: ${userError.message}`);
      }
      
      if (!user) {
        throw new Error('Usuário não autenticado. Por favor, faça login novamente.');
      }
      
      console.log('✅ [Deep Search Frontend] User authenticated:', user.id);

      // Construct query from lecture data
      const query = `${lectureTitle}${tags.length > 0 ? ` - Tópicos: ${tags.join(', ')}` : ''}`;
      console.log('📝 [Deep Search Frontend] Query constructed:', query);

      // Create deep search session
      console.log('💾 [Deep Search Frontend] Creating session in database...');
      const { data: session, error: sessionError } = await supabase
        .from('lecture_deep_search_sessions')
        .insert({
          lecture_id: lectureId,
          user_id: user.id,
          query: query,
          status: 'pending',
        })
        .select()
        .single();

      if (sessionError) {
        console.error('❌ [Deep Search Frontend] Session creation error:', sessionError);
        throw new Error(`Erro ao criar sessão: ${sessionError.message}`);
      }

      console.log('✅ [Deep Search Frontend] Session created:', session.id);
      setSessionId(session.id);
      setProgressMessage('Sessão criada. Iniciando pesquisa...');

      // Start research phase
      setCurrentStep(1);
      console.log('🔍 [Deep Search Frontend] Calling research agent...');
      const { data: researchData, error: researchError } = await supabase.functions.invoke(
        'lecture-deep-research-agent',
        {
          body: {
            query,
            sessionId: session.id,
            lectureId,
          },
        }
      );

      if (researchError) {
        console.error('❌ [Deep Search Frontend] Research error:', researchError);
        throw new Error(`Erro ao iniciar pesquisa: ${researchError.message}`);
      }

      console.log('✅ [Deep Search Frontend] Research agent started:', researchData);
      setProgressMessage('Pesquisa profunda iniciada...');

      // The realtime subscription (useEffect) will handle the rest of the flow

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('❌ [Deep Search Frontend] Error:', errorMessage);
      console.error('❌ [Deep Search Frontend] Error stack:', error);
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
    setSessionId(null);
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