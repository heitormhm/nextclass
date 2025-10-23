import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, Mic, MicOff, Search, BarChart3, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";

interface GenerateSummaryWithDeepSearchProps {
  lectureId: string;
  lectureTitle: string;
  tags: string[];
  currentSummary: string;
  fullTranscript: string;
  onUpdate: (newSummary: string) => void;
}

export const GenerateSummaryWithDeepSearch = ({
  lectureId,
  lectureTitle,
  tags,
  currentSummary,
  fullTranscript,
  onUpdate,
}: GenerateSummaryWithDeepSearchProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [progressMessage, setProgressMessage] = useState("");

  const {
    isRecording,
    startRecording,
    stopRecording,
    onTranscriptionReceived,
    error: recordingError,
  } = useAudioRecorder();

  // Setup transcription callback
  useEffect(() => {
    onTranscriptionReceived((transcribedText: string) => {
      setAdditionalInstructions(prev => prev ? `${prev} ${transcribedText}` : transcribedText);
    });
  }, [onTranscriptionReceived]);

  useEffect(() => {
    if (recordingError) {
      toast.error("Erro ao gravar áudio: " + recordingError);
    }
  }, [recordingError]);

  const handleGenerate = async () => {
    if (!fullTranscript) {
      toast.error("Nenhuma transcrição disponível");
      return;
    }

    setIsGenerating(true);
    setProgressMessage("Criando sessão de pesquisa profunda...");

    try {
      // Get authenticated user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Usuário não autenticado');
      }

      // Create deep search session
      const { data: session, error: sessionError } = await supabase
        .from('deep_search_sessions')
        .insert({
          user_id: user.id,
          query: `Resumo detalhado: ${lectureTitle}`,
          status: 'pending',
          search_type: 'lecture_summary'
        })
        .select()
        .single();

      if (sessionError) {
        console.error('Session creation error:', sessionError);
        throw new Error('Falha ao criar sessão de pesquisa');
      }

      console.log('Deep search session created:', session.id);

      // Build enriched query for deep search
      const enrichedQuery = `# RESUMO DE AULA - PESQUISA PROFUNDA

## Contexto:
**Título:** ${lectureTitle || "Sem título"}
**Tags:** ${tags.join(", ") || "Nenhuma"}
${additionalInstructions ? `**Foco Especial:** ${additionalInstructions}` : ''}

## Transcrição (resumida):
${fullTranscript.substring(0, 15000)}

## Tarefa:
Pesquise na web informações atualizadas sobre os tópicos desta aula e gere um resumo estruturado incluindo:

### 1. INTRODUÇÃO E CONTEXTO
- Visão geral do tema com informações atualizadas da web
- Relevância no cenário atual da engenharia

### 2. CONCEITOS FUNDAMENTAIS
- Definições técnicas verificadas em fontes confiáveis
- Princípios básicos com referências

### 3. DESENVOLVIMENTO TEÓRICO APROFUNDADO
- Explicação detalhada enriquecida com pesquisas web
- Exemplos de aplicações reais encontrados online

### 4. FÓRMULAS E EQUAÇÕES (se aplicável)
- Fórmulas principais com explicação completa
- Unidades e condições de aplicação

### 5. APLICAÇÕES PRÁTICAS
- Casos de uso reais da indústria
- Exemplos contemporâneos

### 6. PONTOS-CHAVE PARA REVISÃO
- Conceitos essenciais resumidos
- Dicas de fixação

### 7. REFERÊNCIAS E FONTES
- Cite as fontes web consultadas
- Sugestões de leitura complementar

Use Markdown e LaTeX para fórmulas. Priorize clareza e rigor técnico.`;

      // Start deep research agent (non-blocking)
      setProgressMessage("Pesquisando fontes relevantes na web...");
      
      const { error: agentError } = await supabase.functions.invoke('mia-deep-research-agent', {
        body: {
          query: enrichedQuery,
          deepSearchSessionId: session.id
        }
      });

      if (agentError) {
        console.error('Agent invocation error:', agentError);
        throw new Error('Falha ao iniciar pesquisa profunda');
      }

      // Poll for progress
      let attempts = 0;
      const maxAttempts = 60; // 3 minutes timeout (3s * 60)
      
      const pollInterval = setInterval(async () => {
        attempts++;
        
        if (attempts > maxAttempts) {
          clearInterval(pollInterval);
          setIsGenerating(false);
          toast.error('Timeout: Pesquisa demorou muito. Tente novamente.');
          return;
        }

        const { data: sessionData, error: pollError } = await supabase
          .from('deep_search_sessions')
          .select('status, progress_step, result, error')
          .eq('id', session.id)
          .single();

        if (pollError) {
          console.error('Polling error:', pollError);
          clearInterval(pollInterval);
          setIsGenerating(false);
          toast.error('Erro ao verificar progresso da pesquisa');
          return;
        }

        // Update progress message based on step
        switch (sessionData.progress_step) {
          case 'analyzing_query':
            setProgressMessage("Analisando conteúdo da aula...");
            break;
          case 'executing_searches':
            setProgressMessage("Pesquisando fontes relevantes na web...");
            break;
          case 'processing_results':
            setProgressMessage("Processando e analisando resultados...");
            break;
          case 'synthesizing':
            setProgressMessage("Sintetizando resumo detalhado...");
            break;
        }

        // Check completion
        if (sessionData.status === 'completed') {
          clearInterval(pollInterval);
          setIsGenerating(false);
          
          if (sessionData.result) {
            onUpdate(sessionData.result);
            toast.success("Resumo gerado com pesquisa profunda na web!");
            setIsOpen(false);
            setAdditionalInstructions("");
          } else {
            toast.error('Nenhum resultado retornado pela pesquisa');
          }
        } else if (sessionData.status === 'failed') {
          clearInterval(pollInterval);
          setIsGenerating(false);
          console.error('Deep search failed:', sessionData.error);
          toast.error(`Erro na pesquisa: ${sessionData.error || 'Erro desconhecido'}`);
        }
      }, 3000); // Poll every 3 seconds

    } catch (error) {
      console.error("Error generating summary:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao gerar resumo. Tente novamente.");
      setIsGenerating(false);
      setProgressMessage("");
    }
  };

  const handleClose = () => {
    if (isGenerating) {
      toast.error("Aguarde a conclusão da geração do resumo");
      return;
    }
    setIsOpen(false);
    setAdditionalInstructions("");
  };

  const handleMicrophoneToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="sm"
        className="gap-2"
        disabled={!fullTranscript}
      >
        <Sparkles className="h-4 w-4" />
        Gerar Novo Resumo
      </Button>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl bg-background/95 backdrop-blur-xl border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Gerar Novo Resumo da Aula
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Context Info */}
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
              <p className="text-sm font-medium text-foreground mb-2">
                📝 A IA irá gerar um resumo com base em:
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                <li>• Transcrição completa da aula</li>
                <li>• Título: <span className="font-medium text-foreground">{lectureTitle}</span></li>
                <li>• Tags: <span className="font-medium text-foreground">{tags.length > 0 ? tags.join(', ') : 'Nenhuma'}</span></li>
              </ul>
            </div>

            {/* Additional Instructions with Voice Input */}
            <div>
              <Label htmlFor="instructions" className="text-foreground">
                Instruções Adicionais (opcional)
              </Label>
              <div className="relative mt-2">
                <Textarea
                  id="instructions"
                  placeholder="Ex: Foque mais nos conceitos práticos, inclua fórmulas matemáticas..."
                  value={additionalInstructions}
                  onChange={(e) => setAdditionalInstructions(e.target.value)}
                  className="pr-12 min-h-[100px]"
                  rows={4}
                  disabled={isGenerating}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="absolute bottom-2 right-2 h-8 w-8 p-0"
                  onClick={handleMicrophoneToggle}
                  disabled={isGenerating}
                  title={isRecording ? "Parar gravação" : "Gravar com voz"}
                >
                  {isRecording ? (
                    <MicOff className="h-4 w-4 text-red-500 animate-pulse" />
                  ) : (
                    <Mic className="h-4 w-4 text-muted-foreground hover:text-primary" />
                  )}
                </Button>
              </div>
              {isRecording && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <span className="animate-pulse">●</span> Gravando...
                </p>
              )}
            </div>

            {/* Deep Search Badge */}
            <div className="p-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-blue-600" />
                <p className="text-sm font-medium text-foreground">
                  Deep Search Ativado
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Análise profunda e estruturação avançada do conteúdo da aula
              </p>
            </div>

            {/* Progress Indicator */}
            {isGenerating && (
              <div className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                    <Search className="h-3 w-3 text-purple-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {progressMessage || 'Processando...'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Deep Search em andamento • Pode levar até 2 minutos
                    </p>
                    <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                      <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-1000 animate-pulse w-2/3" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isGenerating}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !fullTranscript}
                className="gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Gerar Resumo
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
