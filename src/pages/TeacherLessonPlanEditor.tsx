import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Send, Loader2, Copy, Download, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const TeacherLessonPlanEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [lessonPlanId, setLessonPlanId] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [isInitialSetup, setIsInitialSetup] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id && id !== 'new') {
      loadLessonPlan(id);
    } else {
      // New lesson plan - show initial greeting
      const greeting: Message = {
        role: 'assistant',
        content: '<p><strong>Olá! Sou a Mia, sua assistente para criação de planos de aula.</strong></p><p>Para começarmos, qual é o tópico da aula que você gostaria de planejar?</p>'
      };
      setMessages([greeting]);
    }
  }, [id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadLessonPlan = async (planId: string) => {
    try {
      const { data, error } = await supabase
        .from('lesson_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (error) throw error;

      setLessonPlanId(planId);
      setTopic(data.topic);
      setIsInitialSetup(false);

      const greeting: Message = {
        role: 'assistant',
        content: '<p><strong>Olá! Vamos trabalhar no seu plano de aula.</strong></p>'
      };

      const messages: Message[] = [greeting];

      if (data.content) {
        messages.push({
          role: 'assistant',
          content: data.content
        });
      } else if (data.status === 'generating') {
        messages.push({
          role: 'assistant',
          content: '<p>Estou gerando o plano de aula sobre <strong>' + data.topic + '</strong>. Por favor, aguarde...</p>'
        });
      }

      setMessages(messages);

      // Subscribe to realtime updates for this specific plan
      const channel = supabase
        .channel(`lesson-plan-${planId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'lesson_plans',
            filter: `id=eq.${planId}`
          },
          (payload) => {
            if (payload.new.status === 'completed' && payload.new.content) {
              setMessages(prev => [
                ...prev.filter(m => m.role === 'assistant' && !m.content.includes('Estou gerando')),
                {
                  role: 'assistant',
                  content: payload.new.content
                }
              ]);
              setIsGenerating(false);
              toast({
                title: "Plano de aula concluído!",
                description: "O seu plano está pronto para visualização.",
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (error) {
      console.error('Error loading lesson plan:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar o plano de aula.",
      });
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
      if (isInitialSetup) {
        // This is the initial topic setup
        await createNewLessonPlan(currentMessage);
      } else {
        // This is a refinement request
        await refineLessonPlan(currentMessage);
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível processar a sua solicitação.",
      });
      setIsGenerating(false);
    }
  };

  const createNewLessonPlan = async (topicInput: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create lesson plan record
      const { data: newPlan, error: createError } = await supabase
        .from('lesson_plans')
        .insert({
          teacher_id: user.id,
          topic: topicInput,
          duration: '60',
          status: 'generating'
        })
        .select()
        .single();

      if (createError) throw createError;

      setLessonPlanId(newPlan.id);
      setTopic(topicInput);
      setIsInitialSetup(false);

      // Add generating message
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '<p>Ótimo! Vou criar um plano de aula sobre <strong>' + topicInput + '</strong>. Isso pode levar alguns momentos...</p>'
      }]);

      // Call edge function to generate
      const { error: functionError } = await supabase.functions.invoke('plan-lesson-with-mia', {
        body: {
          lessonPlanId: newPlan.id,
          topic: topicInput,
          duration: '60'
        }
      });

      if (functionError) throw functionError;

      // Navigate to the new plan's URL
      navigate(`/teacher/lesson-plans/${newPlan.id}`, { replace: true });

    } catch (error) {
      console.error('Error creating lesson plan:', error);
      throw error;
    }
  };

  const refineLessonPlan = async (instruction: string) => {
    try {
      const lastAssistantMessage = messages.filter(m => m.role === 'assistant').pop();

      const { data, error } = await supabase.functions.invoke('plan-lesson-with-mia', {
        body: {
          lessonPlanId,
          existingPlan: lastAssistantMessage?.content,
          adjustmentInstruction: instruction
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
        description: "Mia atualizou o plano conforme solicitado.",
      });
    } catch (error) {
      console.error('Error refining lesson plan:', error);
      throw error;
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

  return (
    <MainLayout>
      <div className="h-screen flex flex-col bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900">
        {/* Header */}
        <div className="border-b border-gray-700 bg-gray-900/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/teacher/lesson-plans')}
                className="text-gray-400 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-600/20 border border-purple-500/30">
                  <Sparkles className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">
                    {topic || 'Novo Plano de Aula'}
                  </h1>
                  <p className="text-sm text-gray-400">Criando com Mia</p>
                </div>
              </div>
            </div>

            {messages.some(m => m.role === 'assistant' && !m.content.includes('Olá')) && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="border-gray-700 text-white hover:bg-gray-800"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadPDF}
                  className="border-gray-700 text-white hover:bg-gray-800"
                >
                  <Download className="h-4 w-4 mr-2" />
                  PDF
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full">
          <ScrollArea className="flex-1 p-6" ref={scrollRef}>
            <div className="space-y-4 max-w-4xl mx-auto">
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

          {/* Input Area */}
          <div className="border-t border-gray-700 bg-gray-900/50 backdrop-blur-sm p-6">
            <div className="max-w-4xl mx-auto flex gap-2">
              <Textarea
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={
                  isInitialSetup
                    ? "Digite o tópico da aula..."
                    : "Digite sua mensagem para ajustar o plano..."
                }
                className="bg-gray-800 border-gray-700 min-h-[60px] resize-none text-white"
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
        </div>
      </div>
    </MainLayout>
  );
};

export default TeacherLessonPlanEditor;
