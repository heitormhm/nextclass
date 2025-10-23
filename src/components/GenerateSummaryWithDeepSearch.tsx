import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GenerateSummaryWithDeepSearchProps {
  lectureId: string;
  currentSummary: string;
  fullTranscript: string;
  onUpdate: (newSummary: string) => void;
}

export const GenerateSummaryWithDeepSearch = ({
  lectureId,
  currentSummary,
  fullTranscript,
  onUpdate,
}: GenerateSummaryWithDeepSearchProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [additionalInstructions, setAdditionalInstructions] = useState("");

  const handleGenerate = async () => {
    if (!fullTranscript) {
      toast.error("Transcrição não disponível");
      return;
    }

    setIsGenerating(true);

    try {
      const messages = [
        {
          role: "user",
          content: `Com base na transcrição completa da aula abaixo, gere um resumo detalhado e estruturado.

${additionalInstructions ? `Instruções adicionais: ${additionalInstructions}\n\n` : ""}
Transcrição da aula:
${fullTranscript.substring(0, 8000)}

Por favor, crie um resumo estruturado que inclua:
- Introdução com contexto geral da aula
- Principais tópicos abordados com detalhamento
- Conceitos-chave explicados e suas aplicações
- Exemplos práticos mencionados na aula
- Conclusões e pontos de atenção importantes

Use formatação markdown para organizar o conteúdo de forma clara e hierárquica.`
        }
      ];

      const { data, error } = await supabase.functions.invoke('mia-teacher-chat', {
        body: { messages }
      });

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
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        <Sparkles className="h-4 w-4" />
        Gerar Novo Resumo
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl bg-white/75 backdrop-blur-xl border-white/40 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900">Gerar Novo Resumo da Aula</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="instructions" className="text-slate-900">
                Instruções Adicionais (opcional)
              </Label>
              <Textarea
                id="instructions"
                placeholder="Ex: Foque mais nos conceitos práticos, inclua fórmulas matemáticas..."
                value={additionalInstructions}
                onChange={(e) => setAdditionalInstructions(e.target.value)}
                className="mt-2"
                rows={4}
                disabled={isGenerating}
              />
            </div>

            {isGenerating && (
              <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Gerando resumo...</p>
                    <p className="text-xs text-slate-600 mt-1">
                      A IA está analisando a transcrição completa da aula
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
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
