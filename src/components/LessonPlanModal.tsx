import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Copy, Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface LessonPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LessonPlanModal = ({ isOpen, onClose }: LessonPlanModalProps) => {
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [lessonPlan, setLessonPlan] = useState<string | null>(null);
  const [adjustmentInstruction, setAdjustmentInstruction] = useState("");
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!topic) {
      toast({
        variant: "destructive",
        title: "Campo obrigatório",
        description: "Por favor, insira o tópico da aula.",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('plan-lesson-with-mia', {
        body: { topic, duration, notes }
      });

      if (error) throw error;
      
      setLessonPlan(data.lessonPlan);
      
      toast({
        title: "Plano de aula gerado",
        description: "Mia criou um plano de aula personalizado para você.",
      });
    } catch (error) {
      console.error('Generation error:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível gerar o plano de aula.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAdjust = async () => {
    if (!adjustmentInstruction.trim()) {
      toast({
        variant: "destructive",
        title: "Campo obrigatório",
        description: "Por favor, insira uma instrução de ajuste.",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('plan-lesson-with-mia', {
        body: { 
          existingPlan: lessonPlan, 
          adjustmentInstruction 
        }
      });

      if (error) throw error;
      
      setLessonPlan(data.lessonPlan);
      setAdjustmentInstruction("");
      
      toast({
        title: "Plano ajustado",
        description: "Mia atualizou o plano de aula conforme solicitado.",
      });
    } catch (error) {
      console.error('Adjustment error:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível ajustar o plano de aula.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (lessonPlan) {
      navigator.clipboard.writeText(lessonPlan);
      toast({
        title: "Copiado!",
        description: "O plano de aula foi copiado para a área de transferência.",
      });
    }
  };

  const handleDownloadPDF = async () => {
    if (!lessonPlan) return;

    try {
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.width = '800px';
      tempDiv.style.padding = '40px';
      tempDiv.style.backgroundColor = 'white';
      tempDiv.style.color = 'black';
      tempDiv.style.fontFamily = 'Arial, sans-serif';
      tempDiv.innerHTML = lessonPlan.replace(/\n/g, '<br>');
      document.body.appendChild(tempDiv);

      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        logging: false,
        backgroundColor: '#ffffff'
      });

      document.body.removeChild(tempDiv);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 10;

      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`plano-de-aula-${topic.toLowerCase().replace(/\s+/g, '-')}.pdf`);
      
      toast({
        title: "PDF gerado!",
        description: "O plano de aula foi descarregado com sucesso.",
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível gerar o PDF.",
      });
    }
  };

  const handleClose = () => {
    setTopic("");
    setDuration("");
    setNotes("");
    setLessonPlan(null);
    setAdjustmentInstruction("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-400" />
            Criar Plano de Aula com Mia
          </DialogTitle>
        </DialogHeader>
        
        {!lessonPlan ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="topic">Tópico da Aula</Label>
              <Input
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Ex: Leis de Kirchhoff"
                className="bg-gray-800 border-gray-700"
                disabled={isGenerating}
              />
            </div>
            <div>
              <Label htmlFor="duration">Duração (minutos)</Label>
              <Input
                id="duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="Ex: 60"
                className="bg-gray-800 border-gray-700"
                disabled={isGenerating}
              />
            </div>
            <div>
              <Label htmlFor="notes">Notas Adicionais (opcional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Descreva objetivos, público-alvo ou requisitos especiais..."
                className="bg-gray-800 border-gray-700 min-h-[100px]"
                disabled={isGenerating}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleClose} className="border-gray-700 text-white hover:bg-gray-800" disabled={isGenerating}>
                Cancelar
              </Button>
              <Button onClick={handleGenerate} disabled={isGenerating} className="bg-purple-600 hover:bg-purple-700">
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  "Gerar Plano"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Plano de Aula Gerado */}
            <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
              <div 
                className="prose prose-invert max-w-none whitespace-pre-wrap text-sm"
                style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
              >
                {lessonPlan}
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleCopy} className="border-gray-700 text-white hover:bg-gray-800">
                <Copy className="h-4 w-4 mr-2" />
                Copiar Plano
              </Button>
              <Button variant="outline" onClick={handleDownloadPDF} className="border-gray-700 text-white hover:bg-gray-800">
                <Download className="h-4 w-4 mr-2" />
                Baixar PDF
              </Button>
              <Button variant="outline" onClick={handleClose} className="border-gray-700 text-white hover:bg-gray-800">
                Fechar
              </Button>
            </div>

            {/* Copiloto de IA */}
            <div className="border-t border-gray-700 pt-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-400" />
                Ajustar com o Copiloto de IA
              </h3>
              <div className="space-y-3">
                <Textarea
                  value={adjustmentInstruction}
                  onChange={(e) => setAdjustmentInstruction(e.target.value)}
                  placeholder="Ex: Torne o esboço mais detalhado ou Adicione uma atividade prática"
                  className="bg-gray-800 border-gray-700 min-h-[80px]"
                  disabled={isGenerating}
                />
                <Button 
                  onClick={handleAdjust} 
                  disabled={isGenerating}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Ajustando...
                    </>
                  ) : (
                    "Ajustar Plano"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};