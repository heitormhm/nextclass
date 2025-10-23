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
    setProgressMessage("Analisando conteúdo da aula...");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Construct enriched prompt
      const enrichedPrompt = `
# TAREFA: GERAR RESUMO DETALHADO DA AULA

## Contexto:
**Título da Aula:** ${lectureTitle}
**Tags:** ${tags.join(', ')}
${additionalInstructions ? `\n**Instruções Especiais:** ${additionalInstructions}\n` : ''}

## Transcrição Completa:
${fullTranscript.substring(0, 15000)}

## Objetivo:
Gere um resumo estruturado e detalhado da aula em PORTUGUÊS BRASILEIRO, incluindo:

1. **Introdução e Contexto**
   - Apresentação do tema
   - Relevância e aplicações

2. **Principais Tópicos**
   - Conceitos fundamentais explicados
   - Definições técnicas precisas

3. **Fórmulas e Equações** (se aplicável)
   - Com explicação de variáveis e unidades

4. **Exemplos Práticos**
   - Aplicações reais do conteúdo

5. **Conclusões e Pontos-Chave**
   - Resumo dos conceitos essenciais
   - Alertas e considerações importantes

**FORMATO:** Use Markdown com cabeçalhos (##), listas, **negrito** para conceitos-chave.
**IDIOMA:** Português brasileiro APENAS.
**EXTENSÃO:** Detalhado e completo (1500-2500 palavras).
`;

      setProgressMessage("Gerando resumo com IA avançada...");

      // Call mia-teacher-chat with advanced model
      const { data, error } = await supabase.functions.invoke('mia-teacher-chat', {
        body: {
          message: enrichedPrompt,
          useAdvancedModel: true, // Use Gemini 2.5 Pro
          context: {
            lectureTitle,
            tags,
            additionalInstructions
          }
        }
      });

      if (error) {
        console.error('Teacher chat error:', error);
        throw new Error('Falha ao gerar resumo');
      }

      const generatedSummary = data?.response;
      if (!generatedSummary) {
        throw new Error('Nenhum resumo retornado pela IA');
      }

      setProgressMessage("Finalizando resumo...");

      // Update the content
      onUpdate(generatedSummary);
      toast.success("Resumo gerado com sucesso!");
      setIsOpen(false);
      setAdditionalInstructions("");

    } catch (error) {
      console.error("Error generating summary:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao gerar resumo. Tente novamente.");
    } finally {
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
