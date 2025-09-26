import { useState } from "react";
import { Send, Sparkles, Mic, Paperclip, Plus, MessageCircle } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatHistory {
  id: string;
  title: string;
  timestamp: Date;
  isActive: boolean;
}

interface ConversationData {
  [key: string]: Message[];
}

const mockChatHistory: ChatHistory[] = [
  {
    id: "1",
    title: "Critérios de Análise Estrutural",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    isActive: true,
  },
  {
    id: "2", 
    title: "Tratamento de Infarto Agudo do Miocárdio",
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    isActive: false,
  },
  {
    id: "3",
    title: "Diferenciais para Dor Torácica", 
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    isActive: false,
  },
  {
    id: "4",
    title: "Manejo de Crise Hipertensiva",
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    isActive: false,
  },
];

const mockConversations: ConversationData = {
  "1": [
    {
      id: "1-1",
      content: "Quais são os critérios atuais para análise de segurança estrutural em vigas de aço, de acordo com as normas brasileiras?",
      isUser: true,
      timestamp: new Date(Date.now() - 10 * 60 * 1000),
    },
    {
      id: "1-2",
      content: `Olá! De acordo com as diretrizes mais recentes da American Diabetes Association (ADA), os critérios para o diagnóstico de Diabetes Mellitus tipo 2 são:

1. **Glicemia de Jejum:** ≥ 126 mg/dL.
2. **Teste de Tolerância à Glicose:** Glicemia ≥ 200 mg/dL 2 horas após sobrecarga oral de 75g de glicose.
3. **Hemoglobina Glicada (A1c):** ≥ 6.5%.
4. **Glicemia Aleatória:** ≥ 200 mg/dL em um paciente com sintomas clássicos de hiperglicemia.

Lembre-se que, na ausência de hiperglicemia inequívoca, o diagnóstico requer dois resultados de testes anormais da mesma amostra ou em duas amostras de teste separadas.`,
      isUser: false,
      timestamp: new Date(Date.now() - 9 * 60 * 1000),
    },
    {
      id: "1-3",
      content: "Excelente. E sobre o dimensionamento inicial para uma estrutura de aço sem cargas excepcionais significativas?",
      isUser: true,
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
    },
    {
      id: "1-4",
      content: `Para o tratamento inicial de DM2, a metformina continua sendo a terapia de primeira linha, sempre associada a modificações no estilo de vida (dieta e exercícios). A dose inicial é geralmente de 500 mg uma ou duas vezes ao dia, com aumento gradual para minimizar efeitos gastrointestinais. É crucial monitorar a função renal antes e durante o tratamento.`,
      isUser: false,
      timestamp: new Date(Date.now() - 4 * 60 * 1000),
    },
  ],
  "2": [
    {
      id: "2-1",
      content: "Qual o protocolo de análise inicial para um projeto com suspeita de instabilidade lateral em vigas?",
      isUser: true,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      id: "2-2",
      content: `O protocolo clássico é o mnemônico MONA, mas a abordagem moderna é mais nuanced. O tratamento imediato inclui:

**Aspirina (AAS):** 162-325 mg mastigável.

**Oxigênio:** Apenas se a saturação de O2 for < 90%.

**Nitrato (Nitroglicerina):** Sublingual, se a pressão arterial permitir.

**Terapia de Reperfusão:** Angioplastia primária (ICP) é o padrão-ouro (porta-balão < 90 min).

É crucial obter um ECG de 12 derivações nos primeiros 10 minutos.`,
      isUser: false,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 + 2 * 60 * 1000),
    },
  ],
  "3": [
    {
      id: "3-1",
      content: "Recebi um projeto com falha estrutural aparente na análise. Quais são os tipos de falhas que representam risco estrutural imediato?",
      isUser: true,
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
    },
    {
      id: "3-2",
      content: `É fundamental descartar rapidamente as 6 causas potencialmente fatais de dor torácica:

1. **Síndrome Coronariana Aguda (SCA)**
2. **Dissecção Aguda de Aorta**
3. **Tromboembolismo Pulmonar (TEP)**
4. **Pneumotórax Hipertensivo**
5. **Tamponamento Cardíaco**
6. **Ruptura Esofágica**

A avaliação inicial deve focar em estabilidade estrutural e realizar análises direcionadas como verificação de tensões e, se necessário, modelagem computacional.`,
      isUser: false,
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000 + 3 * 60 * 1000),
    },
  ],
  "4": [
    {
      id: "4-1",
      content: "Qual a diferença entre urgência e emergência hipertensiva e como abordar uma emergência?",
      isUser: true,
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
    },
    {
      id: "4-2",
      content: `A distinção é a presença de lesão de órgão-alvo.

**Urgência Hipertensiva:** PA > 180/120 mmHg sem lesão de órgão-alvo. O tratamento é com anti-hipertensivos orais.

**Emergência Hipertensiva:** PA elevada com lesão de órgão-alvo (ex: encefalopatia, AVC, IAM). O manejo requer internação em UTI e uso de drogas IV (Nitroprussiato, Labetalol) para redução controlada da PA.`,
      isUser: false,
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000 + 2 * 60 * 1000),
    },
  ],
};

const AIChatPage = () => {
  const [messages, setMessages] = useState<Message[]>(mockConversations["1"]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>(mockChatHistory);
  const [isDeepSearch, setIsDeepSearch] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showMobileHistory, setShowMobileHistory] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState("1");

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: `${activeConversationId}-${Date.now()}`,
      content: inputMessage,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: `${activeConversationId}-${Date.now() + 1}`,
        content: "Desculpe, esta é uma demonstração. A funcionalidade completa da Mia estará disponível em breve!",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleVoiceToggle = () => {
    setIsRecording(!isRecording);
    // Voice recording logic would go here
  };

  const handleFileAttachment = () => {
    // File attachment logic would go here
    console.log("File attachment clicked");
  };

  const handleNewConversation = () => {
    const newChat: ChatHistory = {
      id: Date.now().toString(),
      title: "Nova Conversa",
      timestamp: new Date(),
      isActive: true,
    };
    
    setChatHistory(prev => [
      newChat,
      ...prev.map(chat => ({ ...chat, isActive: false }))
    ]);
    setMessages([]);
    setActiveConversationId(newChat.id);
  };

  const handleSelectChat = (chatId: string) => {
    setChatHistory(prev => 
      prev.map(chat => ({ ...chat, isActive: chat.id === chatId }))
    );
    
    // Load the corresponding conversation messages
    const conversationMessages = mockConversations[chatId] || [];
    setMessages(conversationMessages);
    setActiveConversationId(chatId);
    setShowMobileHistory(false);
  };

  return (
    <MainLayout>
      <div className="h-screen flex flex-col">
        {/* Header - Mobile optimized */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="p-2 sm:p-3 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground truncate">
                AI Chat de Engenharia com Mia
              </h1>
              <p className="text-xs sm:text-sm text-foreground-muted hidden sm:block">
                Sua assistente médica especializada
              </p>
            </div>
          </div>
          
          {/* Mobile history toggle - only show when history is closed */}
          {!showMobileHistory && (
            <Button 
              variant="outline" 
              size="sm"
              className="md:hidden shrink-0 ml-2"
              onClick={() => setShowMobileHistory(true)}
            >
              <MessageCircle className="w-4 h-4" />
            </Button>
          )}
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Chat History Panel - Mobile overlay */}
          <div className={cn(
            "border-r border-border bg-background-secondary/30 transition-transform duration-300 ease-in-out",
            showMobileHistory 
              ? "fixed inset-y-0 left-0 z-50 w-full bg-background transform translate-x-0 md:relative md:w-80 lg:w-96" 
              : "hidden md:block md:w-80 lg:w-96"
          )}>
            <div className="p-4 space-y-4 h-full flex flex-col">
              {/* Mobile close button */}
              {showMobileHistory && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="md:hidden self-end"
                  onClick={() => setShowMobileHistory(false)}
                >
                  ✕
                </Button>
              )}
              
              {/* New Conversation Button */}
              <Button 
                onClick={handleNewConversation}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nova Conversa
              </Button>

              {/* Chat History List */}
              <div className="flex-1 space-y-2">
                <h3 className="text-sm font-medium text-foreground-muted px-2">Conversas Recentes</h3>
                
                {chatHistory.length === 0 ? (
                  <div className="text-center py-8 text-foreground-muted">
                    <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Suas conversas com a Mia aparecerão aqui.</p>
                  </div>
                ) : (
                  <ScrollArea className="flex-1">
                    <div className="space-y-1">
                      {chatHistory.map((chat) => (
                        <button
                          key={chat.id}
                          onClick={() => handleSelectChat(chat.id)}
                          className={`
                            w-full text-left p-3 rounded-lg transition-all duration-200 hover:bg-white/50
                            ${chat.isActive 
                              ? 'bg-primary/10 border border-primary/20 text-primary' 
                              : 'text-foreground hover:text-foreground'
                            }
                          `}
                        >
                          <div className="font-medium text-sm truncate">{chat.title}</div>
                          <div className="text-xs text-foreground-muted mt-1">
                            {chat.timestamp.toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>
          </div>

          {/* Active Chat Window */}
          <div className="flex-1 flex flex-col relative">
            {/* Messages Area */}
            <ScrollArea className="flex-1 p-6">
              <div className="max-w-4xl mx-auto space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-16 text-foreground-muted">
                    <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">Olá! Sou a Mia</h3>
                    <p>Como posso ajudá-lo com questões médicas hoje?</p>
                  </div>
                ) : (
                  <>
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] p-4 rounded-xl ${
                            message.isUser
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-foreground"
                          }`}
                        >
                          <div className="whitespace-pre-wrap text-sm leading-relaxed">
                            {message.content}
                          </div>
                          <div
                            className={`text-xs mt-2 opacity-70 ${
                              message.isUser ? "text-primary-foreground" : "text-foreground-muted"
                            }`}
                          >
                            {message.timestamp.toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="max-w-[80%] p-4 rounded-xl bg-muted text-foreground">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-foreground-muted rounded-full animate-pulse" />
                            <div className="w-2 h-2 bg-foreground-muted rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
                            <div className="w-2 h-2 bg-foreground-muted rounded-full animate-pulse" style={{ animationDelay: "0.4s" }} />
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </ScrollArea>

            {/* Floating Input Panel - Mobile optimized */}
            <div className="p-3 sm:p-4 lg:p-6 pt-0">
              <div className="max-w-4xl mx-auto">
                <div className="frost-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-lg">
                  <div className="flex items-end gap-2 sm:gap-3">
                    {/* Voice Recording Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleVoiceToggle}
                      className={`shrink-0 h-10 w-10 ${
                        isRecording ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'text-foreground-muted hover:text-foreground'
                      }`}
                    >
                      <Mic className="w-5 h-5" />
                    </Button>

                    {/* File Attachment Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleFileAttachment}
                      className="shrink-0 h-10 w-10 text-foreground-muted hover:text-foreground"
                    >
                      <Paperclip className="w-5 h-5" />
                    </Button>

                    {/* Text Input */}
                    <div className="flex-1">
                      <Textarea
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Pergunte à Mia sobre critérios, tratamentos, artigos..."
                        className="min-h-[40px] max-h-32 resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-2"
                        disabled={isLoading}
                      />
                    </div>

                    {/* Deep Search Toggle - Hidden on small screens */}
                    <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-background-secondary/50 shrink-0">
                      <Switch
                        checked={isDeepSearch}
                        onCheckedChange={setIsDeepSearch}
                      />
                      <span className="text-xs text-foreground-muted whitespace-nowrap">Busca Aprofundada</span>
                    </div>

                    {/* Send Button */}
                    <Button
                      onClick={handleSendMessage}
                      disabled={!inputMessage.trim() || isLoading}
                      size="icon"
                      className="shrink-0 h-10 w-10"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default AIChatPage;