import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { TeacherLayoutWrapper } from "@/components/TeacherLayoutWrapper";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { Sparkles, Send, Loader2, Copy, Download, ArrowLeft, Mic, MicOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MultiStepLoader } from "@/components/ui/multi-step-loader";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const loadingStates = [
  { text: "A iniciar a pesquisa sobre o tópico..." },
  { text: "A consultar fontes académicas de engenharia..." },
  { text: "A analisar os conceitos-chave e as suas aplicações práticas..." },
  { text: "A estruturar o roteiro didático com o método socrático..." },
  { text: "A verificar as referências bibliográficas..." },
  { text: "A finalizar a formatação do seu plano de aula..." },
];

const TeacherLessonPlanEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentLoadingStep, setCurrentLoadingStep] = useState(0);
  const [lessonPlanId, setLessonPlanId] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [isInitialSetup, setIsInitialSetup] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Speech Recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'pt-BR';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');
        
        setCurrentMessage(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        toast({
          variant: "destructive",
          title: "Erro no reconhecimento de voz",
          description: "Não foi possível capturar a sua voz.",
        });
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (id && id !== 'new') {
      loadLessonPlan(id);
    } else {
      const greeting: Message = {
        role: 'assistant',
        content: '<p><strong>Olá! Sou a Mia, sua assistente para criação de planos de aula.</strong></p><p>Para começarmos, qual é o tópico da aula que você gostaria de planejar?</p>'
      };
      setMessages([greeting]);
    }
  }, [id]);

  // Real-time subscription for progress updates
  useEffect(() => {
    if (!lessonPlanId || !isGenerating) return;

    const channel = supabase
      .channel(`lesson-plan-progress-${lessonPlanId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'lesson_plans',
          filter: `id=eq.${lessonPlanId}`,
        },
        (payload) => {
          const progressStep = payload.new.progress_step as string | null;
          
          if (progressStep) {
            // Check if it's an error message
            if (progressStep.startsWith('Erro:')) {
              setIsGenerating(false);
              setCurrentLoadingStep(0);
              toast({
                title: "Erro na geração",
                description: progressStep,
                variant: "destructive",
              });
              return;
            }

            // Find the matching step in loadingStates
            const stepIndex = loadingStates.findIndex(
              state => state.text === progressStep
            );
            
            if (stepIndex !== -1) {
              setCurrentLoadingStep(stepIndex);
            }
          }

          // Check if generation is complete
          if (payload.new.status === 'completed') {
            setIsGenerating(false);
            setCurrentLoadingStep(0);
          } else if (payload.new.status === 'failed') {
            setIsGenerating(false);
            setCurrentLoadingStep(0);
            toast({
              title: "Erro",
              description: "Falha ao gerar o plano de aula. Tente novamente.",
              variant: "destructive",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lessonPlanId, isGenerating]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      toast({
        variant: "destructive",
        title: "Não suportado",
        description: "Seu navegador não suporta reconhecimento de voz.",
      });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        toast({
          title: "Ouvindo...",
          description: "Fale agora para ditar sua mensagem.",
        });
      } catch (error) {
        console.error('Error starting recognition:', error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível iniciar o reconhecimento de voz.",
        });
      }
    }
  };

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

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    const userMessage: Message = {
      role: 'user',
      content: currentMessage
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage("");
    setIsGenerating(true);

    try {
      if (isInitialSetup) {
        await createNewLessonPlan(currentMessage);
      } else {
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
      if (!user) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Precisa de estar autenticado.",
        });
        setIsGenerating(false);
        return;
      }

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

      if (createError) {
        console.error('Create error:', createError);
        setIsGenerating(false);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível criar o plano de aula.",
        });
        return;
      }

      setLessonPlanId(newPlan.id);
      setTopic(topicInput);
      setIsInitialSetup(false);

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '<p>Ótimo! Vou criar um plano de aula sobre <strong>' + topicInput + '</strong>. Isso pode levar alguns momentos...</p>'
      }]);

      const { data: functionData, error: functionError } = await supabase.functions.invoke('plan-lesson-with-mia', {
        body: {
          lessonPlanId: newPlan.id,
          topic: topicInput,
          duration: '60'
        }
      });

      if (functionError) {
        console.error('Function error:', functionError);
        setIsGenerating(false);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao contactar a IA. Tente novamente.",
        });
        return;
      }

      if (functionData?.error) {
        console.error('AI error:', functionData.error);
        setIsGenerating(false);
        toast({
          variant: "destructive",
          title: "Erro",
          description: functionData.error,
        });
        return;
      }

      navigate(`/teacher/lesson-plans/${newPlan.id}`, { replace: true });

    } catch (error) {
      console.error('Error creating lesson plan:', error);
      setIsGenerating(false);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao criar o plano de aula.",
      });
    }
  };

  const refineLessonPlan = async (instruction: string) => {
    if (!lessonPlanId) {
      setIsGenerating(false);
      return;
    }

    try {
      const lastAssistantMessage = messages.filter(m => m.role === 'assistant').pop();

      if (!lastAssistantMessage) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não há plano de aula para refinar.",
        });
        setIsGenerating(false);
        return;
      }

      await supabase
        .from('lesson_plans')
        .update({ status: 'generating' })
        .eq('id', lessonPlanId);

      const { data: functionData, error: functionError } = await supabase.functions.invoke('plan-lesson-with-mia', {
        body: {
          lessonPlanId,
          existingPlan: lastAssistantMessage.content,
          adjustmentInstruction: instruction
        }
      });

      if (functionError) {
        console.error('Function error:', functionError);
        setIsGenerating(false);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao contactar a IA. Tente novamente.",
        });
        return;
      }

      if (functionData?.error) {
        console.error('AI error:', functionData.error);
        setIsGenerating(false);
        toast({
          variant: "destructive",
          title: "Erro",
          description: functionData.error,
        });
        return;
      }

      toast({
        title: "Refinamento em andamento",
        description: "A Mia está a refinar o plano de aula.",
      });
    } catch (error) {
      console.error('Error refining lesson plan:', error);
      setIsGenerating(false);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao refinar o plano de aula.",
      });
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
      <TeacherLayoutWrapper>
        <MultiStepLoader
          loadingStates={loadingStates}
          loading={isGenerating}
          currentState={currentLoadingStep}
          onClose={() => {
            setIsGenerating(false);
            setCurrentLoadingStep(0);
            toast({
              title: "Cancelado",
              description: "Geração cancelada. Pode tentar novamente.",
            });
          }}
        />

        <div className="h-screen flex flex-col">
          {/* Header */}
          <div className="border-b border-purple-300 bg-white/90 backdrop-blur-xl relative z-20 pointer-events-auto">
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/teacher/lesson-plans')}
                  className="text-gray-600 hover:text-gray-800 hover:bg-purple-100"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-100 border border-purple-300">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-800">
                      {topic || 'Novo Plano de Aula'}
                    </h1>
                    <p className="text-sm text-gray-600">Criando com Mia</p>
                  </div>
                </div>
              </div>

              {messages.some(m => m.role === 'assistant' && !m.content.includes('Olá')) && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="border-purple-300 text-gray-800 hover:bg-purple-50 bg-white/90 backdrop-blur-sm"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadPDF}
                    className="border-purple-300 text-gray-800 hover:bg-purple-50 bg-white/90 backdrop-blur-sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col overflow-hidden pointer-events-auto">
            <div className="flex-1 overflow-y-auto p-6" ref={scrollRef}>
              <div className="space-y-4 max-w-4xl mx-auto">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl p-4 ${
                        message.role === 'user'
                          ? 'bg-purple-100 backdrop-blur-lg text-gray-800 border border-purple-300'
                          : 'bg-white/90 backdrop-blur-lg text-gray-800 border border-purple-200'
                      }`}
                    >
                      {message.role === 'assistant' ? (
                        <div
                          className="prose prose-gray prose-sm max-w-none"
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
                    <div className="bg-white/90 backdrop-blur-lg text-gray-800 border border-purple-200 rounded-2xl p-4">
                      <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Input Area */}
            <div className="border-t border-purple-300 bg-white/90 backdrop-blur-xl p-6 pointer-events-auto">
              <div className="w-full">
                <div className="bg-white/70 backdrop-blur-lg rounded-2xl p-4 border border-purple-200 shadow-xl">
                  <div className="flex gap-3 items-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleVoiceInput}
                      disabled={isGenerating}
                      className={`shrink-0 rounded-full ${
                        isListening 
                          ? 'bg-red-100 text-red-500 hover:bg-red-200 animate-pulse border-2 border-red-300' 
                          : 'text-gray-600 hover:text-purple-600 hover:bg-purple-100 border-2 border-purple-200'
                      }`}
                    >
                      {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                    </Button>
                    
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
                          ? "Digite o tópico da aula ou use o microfone..."
                          : "Digite sua mensagem ou use o microfone..."
                      }
                      className="flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-gray-800 placeholder:text-gray-500 min-h-[60px] resize-none"
                      disabled={isGenerating || isListening}
                    />
                    
                    <Button
                      onClick={handleSendMessage}
                      disabled={isGenerating || !currentMessage.trim() || isListening}
                      className="bg-purple-600 hover:bg-purple-700 text-white shrink-0"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </TeacherLayoutWrapper>
    </MainLayout>
  );
};

export default TeacherLessonPlanEditor;
