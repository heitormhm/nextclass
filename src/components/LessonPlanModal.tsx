import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Copy, Download, Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface LessonPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LessonPlanModal = ({ isOpen, onClose }: LessonPlanModalProps) => {
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [showInitialForm, setShowInitialForm] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleGenerate = async () => {
    if (!topic) {
      toast({
        variant: "destructive",
        title: "Campo obrigatório",
        description: "Por favor, insira o tópico da aula.",
      });
      return;
    }

    const userMessage: Message = {
      role: 'user',
      content: `Tópico: ${topic}\nDuração: ${duration || 'Não especificada'}\nNotas: ${notes || 'Nenhuma'}`
    };

    setMessages([userMessage]);
    setShowInitialForm(false);
    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('plan-lesson-with-mia', {
        body: { topic, duration, notes }
      });

      if (error) throw error;
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.lessonPlan
      };

      setMessages(prev => [...prev, assistantMessage]);
      
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

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isGenerating) return;

    const userMessage: Message = {
      role: 'user',
      content: currentMessage
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage("");
    setIsGenerating(true);

    try {
      const lastAssistantMessage = messages.filter(m => m.role === 'assistant').pop();
      
      const { data, error } = await supabase.functions.invoke('plan-lesson-with-mia', {
        body: { 
          existingPlan: lastAssistantMessage?.content, 
          adjustmentInstruction: currentMessage 
        }
      });

      if (error) throw error;
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.lessonPlan
      };

      setMessages(prev => [...prev, assistantMessage]);
      
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
    const lastAssistantMessage = messages.filter(m => m.role === 'assistant').pop();
    if (lastAssistantMessage) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = lastAssistantMessage.content;
      navigator.clipboard.writeText(tempDiv.innerText);
      toast({
        title: "Copiado!",
        description: "O plano de aula foi copiado para a área de transferência.",
      });
    }
  };

  const handleDownloadPDF = async () => {
    const lastAssistantMessage = messages.filter(m => m.role === 'assistant').pop();
    if (!lastAssistantMessage) return;

    try {
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.width = '800px';
      tempDiv.style.padding = '40px';
      tempDiv.style.backgroundColor = 'white';
      tempDiv.style.color = 'black';
      tempDiv.style.fontFamily = 'Arial, sans-serif';
      tempDiv.innerHTML = lastAssistantMessage.content;
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
    setMessages([]);
    setCurrentMessage("");
    setShowInitialForm(true);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-6xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-400" />
            Criar Plano de Aula com Mia
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Crie planos de aula personalizados com a assistência da Mia
          </DialogDescription>
        </DialogHeader>
        
        {showInitialForm ? (
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
          <div className="flex flex-col flex-1 min-h-0 space-y-4">
            {/* Chat Messages Area */}
            <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-4 ${
                        message.role === 'user'
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-800 text-white border border-gray-700'
                      }`}
                    >
                      {message.role === 'assistant' ? (
                        <div 
                          className="prose prose-invert prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: message.content }}
                        />
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                {isGenerating && (
                  <div className="flex justify-start">
                    <div className="bg-gray-800 text-white border border-gray-700 rounded-lg p-4">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Action Buttons */}
            {messages.some(m => m.role === 'assistant') && (
              <div className="flex gap-2 justify-end border-t border-gray-700 pt-4">
                <Button variant="outline" onClick={handleCopy} className="border-gray-700 text-white hover:bg-gray-800">
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar Plano
                </Button>
                <Button variant="outline" onClick={handleDownloadPDF} className="border-gray-700 text-white hover:bg-gray-800">
                  <Download className="h-4 w-4 mr-2" />
                  Baixar PDF
                </Button>
              </div>
            )}

            {/* Chat Input */}
            <div className="flex gap-2">
              <Textarea
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Digite sua mensagem para ajustar o plano de aula..."
                className="bg-gray-800 border-gray-700 min-h-[60px] resize-none"
                disabled={isGenerating}
              />
              <Button
                onClick={handleSendMessage}
                disabled={isGenerating || !currentMessage.trim()}
                className="bg-purple-600 hover:bg-purple-700 self-end"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};