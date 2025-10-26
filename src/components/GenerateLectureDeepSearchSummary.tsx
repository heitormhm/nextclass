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
  const autoStarted = useRef(false);
  const { toast } = useToast();

  // Auto-start generation when dialog opens
  useEffect(() => {
    if (isOpen && !isGenerating && !autoStarted.current) {
      autoStarted.current = true;
      setTimeout(() => handleGenerate(), 100);
    }
  }, [isOpen]);

  // Reset auto-start flag when dialog closes
  useEffect(() => {
    if (!isOpen) {
      autoStarted.current = false;
    }
  }, [isOpen]);

  // Subscribe to session updates
  useEffect(() => {
    if (!sessionId) return;

    console.log('🔔 [Deep Search] Subscribing to session:', sessionId);

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
        (payload) => {
          console.log('📬 [Deep Search] Session update:', payload);
          const session = payload.new as any;

          if (session.status === 'analyzing') {
            setCurrentStep(1);
          } else if (session.status === 'researched') {
            setCurrentStep(2);
          } else if (session.status === 'generating') {
            setCurrentStep(3);
          } else if (session.status === 'completed') {
            setCurrentStep(4);
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
            setIsGenerating(false);
            toast({
              variant: 'destructive',
              title: 'Erro na geração',
              description: session.error || 'Não foi possível gerar o material didático',
            });
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 [Deep Search] Unsubscribing from session');
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setCurrentStep(0);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Construct query from lecture data
      const query = `${lectureTitle}${tags.length > 0 ? ` - Tópicos: ${tags.join(', ')}` : ''}`;

      console.log('🚀 [Deep Search] Creating session with query:', query);

      // Create deep search session
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

      if (sessionError) throw sessionError;

      setSessionId(session.id);
      console.log('✅ [Deep Search] Session created:', session.id);

      // Start research phase
      setCurrentStep(1);
      const { error: researchError } = await supabase.functions.invoke(
        'lecture-deep-research-agent',
        {
          body: {
            query,
            sessionId: session.id,
            lectureId,
          },
        }
      );

      if (researchError) throw researchError;

      console.log('✅ [Deep Search] Research phase initiated');

      // Wait for research to complete (status will change to 'researched')
      const checkResearchStatus = setInterval(async () => {
        const { data: statusData } = await supabase
          .from('lecture_deep_search_sessions')
          .select('status')
          .eq('id', session.id)
          .single();

        if (statusData?.status === 'researched') {
          clearInterval(checkResearchStatus);
          console.log('✅ [Deep Search] Research completed, starting report generation');

          // Start report generation phase
          setCurrentStep(3);
          const { error: reportError } = await supabase.functions.invoke(
            'generate-lecture-deep-report',
            {
              body: {
                sessionId: session.id,
                lectureId,
              },
            }
          );

          if (reportError) {
            console.error('Report generation error:', reportError);
            throw reportError;
          }
        } else if (statusData?.status === 'error') {
          clearInterval(checkResearchStatus);
          throw new Error('Research phase failed');
        }
      }, 3000);

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(checkResearchStatus);
      }, 300000);

    } catch (error) {
      console.error('Error generating deep search summary:', error);
      setIsGenerating(false);
      toast({
        variant: 'destructive',
        title: 'Erro ao gerar material didático',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
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
          {!isGenerating ? (
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
                <Button onClick={handleGenerate} className="gap-2">
                  <Brain className="h-4 w-4" />
                  Gerar Material Didático
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-6 py-4">
              <div className="text-center space-y-2">
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                <h3 className="text-lg font-semibold">
                  Gerando material didático com pesquisa profunda...
                </h3>
                <p className="text-sm text-muted-foreground">
                  Este processo pode levar até 3 minutos
                </p>
              </div>

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
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};