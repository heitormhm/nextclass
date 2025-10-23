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
      toast.error("Transcrição não disponível");
      return;
    }

    setIsGenerating(true);
    setProgressMessage("Iniciando pesquisa profunda...");

    try {
      // Simulate progress steps for better UX
      const progressSteps = [
        { delay: 1000, message: "Analisando conteúdo da aula..." },
        { delay: 3000, message: "Pesquisando fontes relevantes na web..." },
        { delay: 5000, message: "Processando e analisando resultados..." },
        { delay: 7000, message: "Sintetizando resumo detalhado..." },
      ];

      let currentStep = 0;
      const progressInterval = setInterval(() => {
        if (currentStep < progressSteps.length) {
          setProgressMessage(progressSteps[currentStep].message);
          currentStep++;
        }
      }, 2000);

      // Create enriched prompt with deep search instructions
      const enrichedPrompt = `
# DEEP SEARCH MODE ATIVADO

Você deve realizar uma pesquisa profunda e gerar um resumo detalhado e estruturado da aula abaixo.

## Contexto da Aula:
**Título:** ${lectureTitle}
**Tags:** ${tags.join(', ')}
${additionalInstructions ? `\n**Instruções Adicionais:** ${additionalInstructions}\n` : ''}

## Transcrição Completa:
${fullTranscript.substring(0, 12000)}

---

## INSTRUÇÕES PARA DEEP SEARCH:

1. **Análise Profunda**: Identifique os conceitos-chave e tópicos principais da transcrição
2. **Pesquisa Contextual**: Considere conhecimento atualizado sobre os temas abordados
3. **Síntese Estruturada**: Organize as informações de forma hierárquica e clara

## ESTRUTURA DO RESUMO REQUERIDA:

### 1. Introdução
- Contexto geral da aula
- Objetivos de aprendizagem
- Relevância dos tópicos abordados

### 2. Principais Tópicos Abordados
- Liste e explique detalhadamente cada tópico principal
- Inclua sub-tópicos quando aplicável
- Use marcadores para clareza

### 3. Conceitos-Chave e Definições
- Defina termos técnicos importantes
- Explique suas aplicações práticas
- Relacione com contexto da engenharia

### 4. Fórmulas e Equações (se aplicável)
- Liste fórmulas mencionadas
- Explique variáveis e unidades
- Demonstre aplicações

### 5. Exemplos Práticos e Aplicações
- Casos reais mencionados
- Problemas resolvidos
- Aplicações em engenharia

### 6. Conclusões e Pontos de Atenção
- Resumo dos aspectos mais importantes
- Conexões entre conceitos
- Dicas para estudo e revisão

## REQUISITOS DE FORMATAÇÃO:
- Use Markdown para organização hierárquica
- Utilize **negrito** para termos-chave
- Use listas numeradas e com marcadores
- Inclua \`código inline\` para fórmulas simples
- Use blocos de código para fórmulas complexas
- Mantenha clareza e precisão técnica

Gere um resumo completo, detalhado e bem estruturado seguindo todas as instruções acima.
`;

      const messages = [
        {
          role: "user",
          content: enrichedPrompt
        }
      ];

      const { data, error } = await supabase.functions.invoke('mia-teacher-chat', {
        body: { 
          messages,
          useAdvancedModel: true, // Use advanced model for better results
        }
      });

      clearInterval(progressInterval);

      if (error) throw error;

      if (data?.response) {
        onUpdate(data.response);
        toast.success("Resumo gerado com sucesso!");
        setIsOpen(false);
        setAdditionalInstructions("");
      } else {
        throw new Error('Resposta inválida da IA');
      }
    } catch (error) {
      console.error("Error generating summary:", error);
      toast.error("Erro ao gerar resumo. Tente novamente.");
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
              <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {progressMessage || 'Processando...'}
                    </p>
                    <div className="w-full bg-primary/20 rounded-full h-1.5 mt-2">
                      <div className="bg-primary h-1.5 rounded-full transition-all duration-1000 animate-pulse w-3/4" />
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
