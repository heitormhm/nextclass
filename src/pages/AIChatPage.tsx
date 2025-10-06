import { useState, useRef } from "react";
import { Send, Sparkles, Mic, Paperclip, Plus, MessageCircle, X, FileText, Image as ImageIcon, Music } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface AttachedFile {
  name: string;
  type: string;
  data: string; // base64
  preview?: string;
}

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  file?: AttachedFile;
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
    title: "Protocolo de Análise de Falhas",
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    isActive: false,
  },
  {
    id: "3",
    title: "Diferenciais de Vibração Mecânica", 
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    isActive: false,
  },
  {
    id: "4",
    title: "Manejo de Sobrecarga em Circuitos",
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
      content: `Olá! De acordo com as diretrizes da ABNT NBR 8800, os principais critérios para a análise de segurança em vigas de aço envolvem a verificação dos Estados Limites Últimos (ELU) e dos Estados Limites de Serviço (ELS). Para ELU, deve-se verificar a resistência à flexão, ao cisalhamento e à flambagem lateral. Para ELS, a verificação principal é a de deslocamentos excessivos (flechas).`,
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
      content: `Para dimensionamento inicial de estruturas de aço sem cargas excepcionais, é recomendado partir de pré-dimensionamento baseado em índices de esbeltez. Para vigas, uma altura inicial pode ser estimada como L/20 a L/15 do vão. É importante considerar as combinações de cargas conforme ABNT NBR 8681 e verificar se não há cargas dinâmicas significativas.`,
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
      content: `É fundamental avaliar rapidamente os 4 modos de falha principais que representam risco imediato:

1. **Flambagem:** Instabilidade por compressão.
2. **Fadiga:** Falha por carregamento cíclico.
3. **Fratura Frágil:** Ocorre subitamente sem deformação plástica.
4. **Escoamento:** Deformação plástica excessiva.

A avaliação inicial deve focar em estabilidade estrutural e realizar análises direcionadas como verificação de tensões e, se necessário, modelagem computacional.`,
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
      content: `O protocolo inicial para instabilidade por vibração inclui:

1. **Análise de Frequência Natural:** Para evitar ressonância.
2. **Verificação de Amortecimento:** Avaliar a capacidade da estrutura de dissipar energia.
3. **Análise de Cargas Dinâmicas:** Identificar fontes de excitação, como vento ou tráfego.

A avaliação inicial deve focar em estabilidade hemodinâmica e realizar ECG, troponina e, se necessário, ecocardiograma.`,
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
      content: `A distinção é a magnitude e duração:

**Sobrecorrente:** Corrente acima do valor nominal, geralmente por sobrecarga. Proteção por disjuntores térmicos.

**Curto-circuito:** Contato de baixíssima impedância, resultando em correntes altíssimas e instantâneas. Exige interrupção imediata por disjuntores magnéticos ou fusíveis ultrarrápidos.`,
      isUser: false,
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000 + 2 * 60 * 1000),
    },
  ],
};

const AIChatPage = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [isDeepSearch, setIsDeepSearch] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showMobileHistory, setShowMobileHistory] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState("1");
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);

  const handleSendMessage = async () => {
    if ((!inputMessage.trim() && !attachedFile) || isLoading) return;

    const userMessage: Message = {
      id: `${activeConversationId}-${Date.now()}`,
      content: inputMessage || "Arquivo anexado",
      isUser: true,
      timestamp: new Date(),
      file: attachedFile || undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    const currentMessage = inputMessage;
    const currentFile = attachedFile;
    setInputMessage("");
    setAttachedFile(null);
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Não autenticado');
      }

      const response = await supabase.functions.invoke('mia-student-chat', {
        body: {
          message: currentMessage,
          fileData: currentFile?.data,
          fileType: currentFile?.type,
          fileName: currentFile?.name,
          includePerformance: isDeepSearch,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (response.error) {
        throw response.error;
      }

      const aiResponse: Message = {
        id: `${activeConversationId}-${Date.now() + 1}`,
        content: response.data.response || "Desculpe, não consegui processar sua solicitação.",
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao enviar mensagem",
        variant: "destructive",
      });
      
      // Remove user message on error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
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
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'audio/mpeg', 'audio/wav', 'audio/webm'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Tipo de arquivo inválido",
        description: "Apenas imagens, PDFs e áudios são suportados.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 10MB.",
        variant: "destructive",
      });
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result as string;
        setAttachedFile({
          name: file.name,
          type: file.type,
          data: data,
          preview: file.type.startsWith('image/') ? data : undefined,
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error reading file:', error);
      toast({
        title: "Erro",
        description: "Falha ao processar o arquivo",
        variant: "destructive",
      });
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachedFile = () => {
    setAttachedFile(null);
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
                Sua assistente de engenharia especializada
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
                    <p>Como posso ajudá-lo com questões de engenharia hoje?</p>
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
                          {message.file && (
                            <div className="mb-3">
                              {message.file.preview ? (
                                <img 
                                  src={message.file.preview} 
                                  alt={message.file.name}
                                  className="max-w-full h-auto rounded-lg mb-2"
                                />
                              ) : (
                                <div className="flex items-center gap-2 p-2 bg-background/20 rounded-lg mb-2">
                                  {message.file.type === 'application/pdf' ? (
                                    <FileText className="w-5 h-5" />
                                  ) : message.file.type.startsWith('audio/') ? (
                                    <Music className="w-5 h-5" />
                                  ) : (
                                    <Paperclip className="w-5 h-5" />
                                  )}
                                  <span className="text-xs truncate">{message.file.name}</span>
                                </div>
                              )}
                            </div>
                          )}
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
                  {/* File Preview */}
                  {attachedFile && (
                    <div className="mb-3 p-2 bg-background/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        {attachedFile.preview ? (
                          <img 
                            src={attachedFile.preview} 
                            alt={attachedFile.name}
                            className="w-16 h-16 object-cover rounded"
                          />
                        ) : (
                          <div className="w-16 h-16 flex items-center justify-center bg-muted rounded">
                            {attachedFile.type === 'application/pdf' ? (
                              <FileText className="w-8 h-8 text-foreground-muted" />
                            ) : attachedFile.type.startsWith('audio/') ? (
                              <Music className="w-8 h-8 text-foreground-muted" />
                            ) : (
                              <Paperclip className="w-8 h-8 text-foreground-muted" />
                            )}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{attachedFile.name}</p>
                          <p className="text-xs text-foreground-muted">
                            {attachedFile.type.split('/')[1].toUpperCase()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={removeAttachedFile}
                          className="shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-end gap-2 sm:gap-3">
                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*,application/pdf,audio/*"
                      onChange={handleFileChange}
                    />

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
                        placeholder="Pergunte à Mia sobre normas, cálculos, análises..."
                        className="min-h-[40px] max-h-32 resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-2"
                        disabled={isLoading}
                      />
                    </div>

                    {/* AI Mode Selector - Modern Toggle Button */}
                    <div className="hidden sm:flex shrink-0">
                      <button
                        onClick={() => setIsDeepSearch(!isDeepSearch)}
                        className={`
                          relative inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all duration-300 transform hover:scale-105
                          ${isDeepSearch 
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25' 
                            : 'bg-background-secondary/50 text-foreground-muted hover:bg-background-secondary/70 border border-border'
                          }
                        `}
                      >
                        <div className="flex items-center gap-2">
                          {isDeepSearch ? (
                            <>
                              <div className="w-4 h-4 relative">
                                <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse" />
                                <div className="absolute inset-1 bg-white rounded-full" />
                              </div>
                              <span>Busca Aprofundada</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4" />
                              <span>Busca Padrão</span>
                            </>
                          )}
                        </div>
                        
                        {/* Subtle glow effect when active */}
                        {isDeepSearch && (
                          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 blur-md -z-10" />
                        )}
                      </button>
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