import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Sparkles } from "lucide-react";

interface LessonPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LessonPlanModal = ({ isOpen, onClose }: LessonPlanModalProps) => {
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
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
      // Mock AI generation - in real implementation, this would call an AI service
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Plano de aula gerado",
        description: "Mia criou um plano de aula personalizado para você.",
      });
      
      setTopic("");
      setDuration("");
      onClose();
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-400" />
            Criar Plano de Aula com Mia
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="topic">Tópico da Aula</Label>
            <Input
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ex: Leis de Kirchhoff"
              className="bg-gray-800 border-gray-700"
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
            />
          </div>
          <div>
            <Label htmlFor="notes">Notas Adicionais (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Descreva objetivos, público-alvo ou requisitos especiais..."
              className="bg-gray-800 border-gray-700 min-h-[100px]"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose} className="border-gray-700">
              Cancelar
            </Button>
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? "Gerando..." : "Gerar Plano"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};