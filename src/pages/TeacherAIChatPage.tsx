import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Mic, Plus, MessageCircle, Trash2 } from "lucide-react";
import 'katex/dist/katex.min.css';
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { ActionButtons } from "@/components/ActionButtons";
import { JobStatus } from "@/components/JobStatus";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  jobIds?: string[];
  jobMetadata?: Map<string, { type: string; context: string }>;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
}

const TeacherAIChatPage = () => {
  const { toast } = useToast();
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isDeepSearch, setIsDeepSearch] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showMobileHistory, setShowMobileHistory] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeJobs, setActiveJobs] = useState<Map<string, any>>(new Map());
  const processedJobsRef = useRef<Set<string>>(new Set());

  const getInitialSuggestions = () => [
    "Crie um plano de aula sobre análise de circuitos elétricos",
    "Gere uma atividade de múltipla escolha sobre resistência dos materiais",
    "Elabore uma atividade dissertativa sobre termodinâmica",
    "Sugira estratégias para ensinar mecânica dos fluidos",
    "Crie flashcards de revisão sobre estruturas metálicas"
  ];

  const hasExistingJob = (jobType: string, context: string): boolean => {
    for (const [jobId, job] of activeJobs.entries()) {
      if (job.type === jobType && 
          job.payload?.context === context &&
          (job.status === 'PENDING' || job.status === 'SYNTHESIZING')) {
        return true;
      }
    }
    return false;
  };

  const loadConversations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const handleNewConversation = () => {
    setActiveConversationId(null);
    setMessages([]);
    setInputMessage("");
    setActiveJobs(new Map());
    processedJobsRef.current.clear();
  };

  const handleSelectChat = async (conversationId: string) => {
    setActiveConversationId(conversationId);
    setActiveJobs(new Map());
    processedJobsRef.current.clear();
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const loadedMessages: Message[] = data?.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        isUser: msg.role === 'user',
        timestamp: new Date(msg.created_at),
      })) || [];

      setMessages(loadedMessages);
      setShowMobileHistory(false);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;

      if (activeConversationId === conversationId) {
        handleNewConversation();
      }
      
      loadConversations();
      
      toast({
        title: "Conversa excluída",
        description: "A conversa foi removida com sucesso.",
      });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível excluir a conversa.",
      });
    }
  };

  const handleAction = async (jobType: string, payload: any) => {
    const contextKey = payload.context || payload.topic;
    
    if (hasExistingJob(jobType, contextKey)) {
      toast({
        title: "Job em andamento",
        description: "Este conteúdo já está sendo processado.",
      });
      return;
    }
    
    const tempId = `temp-${jobType}-${Date.now()}`;
    
    setActiveJobs(prev => {
      const newJobs = new Map(prev);
      newJobs.set(tempId, { 
        status: 'PENDING', 
        type: jobType,
        payload: payload
      });
      return newJobs;
    });
    
    setMessages(prev => {
      const updated = [...prev];
      for (let i = updated.length - 1; i >= 0; i--) {
        if (!updated[i].isUser) {
          updated[i] = {
            ...updated[i],
            jobIds: [...(updated[i].jobIds || []), tempId],
            jobMetadata: new Map(updated[i].jobMetadata || []).set(tempId, {
              type: jobType,
              context: contextKey
            })
          };
          break;
        }
      }
      return updated;
    });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const conversationId = activeConversationId || crypto.randomUUID();
      
      const { data, error } = await supabase.functions.invoke('mia-student-chat', {
        body: {
          action: jobType,
          context: payload,
          conversationId,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      const realJobId = data.jobId;
      
      setActiveJobs(prev => {
        const newJobs = new Map(prev);
        newJobs.delete(tempId);
        
        if (realJobId && !newJobs.has(realJobId)) {
          newJobs.set(realJobId, { 
            status: 'PENDING', 
            type: jobType,
            payload: payload
          });
        }
        return newJobs;
      });
      
      setMessages(prev => {
        const updated = [...prev];
        for (let i = updated.length - 1; i >= 0; i--) {
          if (!updated[i].isUser && updated[i].jobIds?.includes(tempId)) {
            const newJobIds = updated[i].jobIds!.map(id => id === tempId ? realJobId : id);
            const newMetadata = new Map(updated[i].jobMetadata || []);
            
            const metadata = newMetadata.get(tempId);
            if (metadata) {
              newMetadata.delete(tempId);
              newMetadata.set(realJobId, metadata);
            }
            
            updated[i] = {
              ...updated[i],
              jobIds: newJobIds,
              jobMetadata: newMetadata
            };
            break;
          }
        }
        return updated;
      });
      
      processedJobsRef.current.add(realJobId);

      if (!activeConversationId) {
        setActiveConversationId(conversationId);
        loadConversations();
      }

      toast({
        title: "Processando",
        description: "Sua solicitação foi iniciada!",
      });
    } catch (error: any) {
      setActiveJobs(prev => {
        const newJobs = new Map(prev);
        newJobs.delete(tempId);
        return newJobs;
      });
      
      setMessages(prev => {
        const updated = [...prev];
        for (let i = updated.length - 1; i >= 0; i--) {
          if (!updated[i].isUser && updated[i].jobIds?.includes(tempId)) {
            updated[i] = {
              ...updated[i],
              jobIds: updated[i].jobIds!.filter(id => id !== tempId),
              jobMetadata: (() => {
                const newMetadata = new Map(updated[i].jobMetadata || []);
                newMetadata.delete(tempId);
                return newMetadata;
              })()
            };
            break;
          }
        }
        return updated;
      });
      
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Erro ao processar ação",
      });
    }
  };

  const handleSendMessage = async () => {
    const currentMessage = inputMessage.trim();
    if (!currentMessage) return;

    setInputMessage("");
    
    let conversationId = activeConversationId;
    
    if (!conversationId) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Não autenticado');

        const title = currentMessage.slice(0, 50) || "Nova Conversa";
        
        const { data: newConversation, error: conversationError } = await supabase
          .from('conversations')
          .insert({
            user_id: session.user.id,
            title: title,
          })
          .select()
          .single();

        if (conversationError) throw conversationError;
        
        conversationId = newConversation.id;
        setActiveConversationId(conversationId);
        loadConversations();
      } catch (error) {
        console.error('Error creating conversation:', error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível criar a conversa.",
        });
        return;
      }
    }
    
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: currentMessage,
      isUser: true,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const { data: functionData, error: functionError } = await supabase.functions.invoke('mia-student-chat', {
        body: {
          message: currentMessage,
          isDeepSearch,
          conversationId,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (functionError) throw functionError;

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        content: functionData.response,
        isUser: false,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, assistantMessage]);

      if (functionData.conversationId && !activeConversationId) {
        setActiveConversationId(functionData.conversationId);
        loadConversations();
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Erro ao enviar mensagem",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window)) {
      toast({
        title: "Recurso não suportado",
        description: "Seu navegador não suporta reconhecimento de voz.",
        variant: "destructive"
      });
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputMessage(prev => prev + transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputMessage(suggestion);
  };

  // Process job updates from realtime
  const processJobUpdate = async (job: any, currentConversationId: string | null) => {
    if (job.conversation_id !== currentConversationId) return;
    
    setActiveJobs(prev => {
      const currentJob = prev.get(job.id);
      
      if (!currentJob) {
        return new Map(prev).set(job.id, {
          status: job.status,
          type: job.job_type,
          result: job.result,
          payload: job.input_payload
        });
      }
      
      if (currentJob.status === job.status && currentJob.result === job.result) {
        return prev;
      }
      
      const newJobs = new Map(prev);
      newJobs.set(job.id, {
        ...currentJob,
        status: job.status,
        result: job.result
      });
      return newJobs;
    });
    
    if (job.status === 'COMPLETED' || job.status === 'FAILED') {
      if (!processedJobsRef.current.has(job.id)) {
        processedJobsRef.current.add(job.id);
      }
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    const savedDeepSearch = localStorage.getItem('teacher-deep-search-mode');
    if (savedDeepSearch) setIsDeepSearch(savedDeepSearch === 'true');
  }, []);

  useEffect(() => {
    localStorage.setItem('teacher-deep-search-mode', String(isDeepSearch));
  }, [isDeepSearch]);

  // Realtime subscription
  useEffect(() => {
    if (!activeConversationId) return;

    const channel = supabase
      .channel(`jobs-teacher-${activeConversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs',
          filter: `conversation_id=eq.${activeConversationId}`
        },
        (payload) => {
          processJobUpdate(payload.new, activeConversationId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversationId]);

  return (
    <MainLayout>
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden w-full">
        
        {/* ========== SIDEBAR ESQUERDA ========== */}
        <div className="hidden lg:flex lg:w-80 xl:w-96 flex-col border-r border-border/40 bg-gradient-to-br from-pink-50 to-purple-50 dark:from-purple-950/30 dark:to-indigo-950/30">
          
          <div className="p-6 pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Mia - Assistente Pedagógica</h2>
                <p className="text-sm text-muted-foreground">Criando conteúdos educacionais</p>
              </div>
            </div>
          </div>

          <div className="px-6 pb-4">
            <Button
              onClick={handleNewConversation}
              className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white shadow-md hover:shadow-lg transition-all"
              size="lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nova Conversa
            </Button>
          </div>

          <div className="flex-1 overflow-hidden px-4">
            <div className="mb-3 px-2">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Conversas Recentes</h3>
            </div>
            <ScrollArea className="h-full pr-2">
              {conversations.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">
                  Nenhuma conversa ainda
                </p>
              ) : (
                <div className="space-y-1">
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => handleSelectChat(conv.id)}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all group",
                        activeConversationId === conv.id
                          ? "bg-white dark:bg-gray-800 shadow-sm border border-purple-200 dark:border-purple-700"
                          : "hover:bg-white/50 dark:hover:bg-gray-800/50"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                          {conv.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(conv.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDeleteConversation(conv.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-all"
                      >
                        <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        {/* ========== ÁREA DE CHAT ========== */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          
          {/* Fundo roxo escuro com 75% opacity + frosted glass */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 opacity-75 dark:opacity-90" />
          <div className="absolute inset-0 backdrop-blur-sm bg-white/5" />
          
          <div className="relative z-10 flex-1 flex flex-col">
            
            <ScrollArea className="flex-1 px-4 py-6">
              <div className="max-w-4xl mx-auto space-y-6">
                
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mb-6 shadow-xl">
                      <MessageCircle className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">
                      Bem-vindo, Professor!
                    </h3>
                    <p className="text-purple-200 text-lg mb-8 max-w-md">
                      Como posso ajudá-lo hoje?
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                      {getInitialSuggestions().slice(0, 4).map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="p-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl hover:bg-white/20 transition-all text-left text-white text-sm"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "flex",
                          message.isUser ? "justify-end" : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[80%] rounded-2xl px-6 py-4 shadow-lg",
                            message.isUser
                              ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                              : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          )}
                        >
                          <div className={cn(
                            "prose prose-sm max-w-none",
                            message.isUser ? "prose-invert" : ""
                          )}>
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm, remarkMath]}
                              rehypePlugins={[rehypeKatex]}
                            >
                              {message.content}
                            </ReactMarkdown>
                          </div>
                          
                          {!message.isUser && message.jobIds?.map((jobId) => {
                            const job = activeJobs.get(jobId);
                            return job ? (
                              <JobStatus
                                key={jobId}
                                job={{
                                  status: job.status,
                                  type: job.type || message.jobMetadata?.get(jobId)?.type || '',
                                  result: job.result,
                                  payload: job.payload,
                                }}
                              />
                            ) : null;
                          })}
                          
                          {!message.isUser && (
                            <div className="mt-4">
                              <ActionButtons
                                messageContent={message.content}
                                topic="este tópico"
                                onAction={handleAction}
                                disabled={isLoading}
                                activeJobs={activeJobs}
                                messageJobIds={message.jobIds || []}
                                isTeacher={true}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl px-6 py-4 shadow-lg">
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                            <span className="text-sm text-muted-foreground ml-2">Mia está pensando...</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="border-t border-white/10 bg-white/5 backdrop-blur-md p-4">
              <div className="max-w-4xl mx-auto">
                <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl">
                  
                  <Textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Digite sua mensagem para a Mia..."
                    className="min-h-[60px] pr-40 border-0 focus-visible:ring-0 resize-none bg-transparent"
                    disabled={isLoading}
                  />

                  <div className="absolute bottom-3 right-3 flex items-center gap-2">
                    
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg mr-2">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      <span className="text-xs font-medium">
                        {isDeepSearch ? "Profunda" : "Padrão"}
                      </span>
                      <Switch
                        checked={isDeepSearch}
                        onCheckedChange={setIsDeepSearch}
                      />
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleVoiceInput}
                      className={cn(
                        "rounded-full",
                        isListening && "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                      )}
                      disabled={isLoading}
                    >
                      <Mic className="w-5 h-5" />
                    </Button>

                    <Button
                      onClick={handleSendMessage}
                      disabled={!inputMessage.trim() || isLoading}
                      className="rounded-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow-lg"
                      size="icon"
                    >
                      <Send className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowMobileHistory(true)}
          className="lg:hidden fixed bottom-20 left-4 w-12 h-12 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-xl flex items-center justify-center z-50"
        >
          <MessageCircle className="w-6 h-6" />
        </button>

        <Sheet open={showMobileHistory} onOpenChange={setShowMobileHistory}>
          <SheetContent side="left" className="w-full sm:w-80 p-0 bg-gradient-to-br from-pink-50 to-purple-50 dark:from-purple-950/30 dark:to-indigo-950/30">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Mia - Assistente</h2>
                  <p className="text-xs text-muted-foreground">Pedagógica</p>
                </div>
              </div>
              
              <Button
                onClick={() => {
                  handleNewConversation();
                  setShowMobileHistory(false);
                }}
                className="w-full mb-4 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nova Conversa
              </Button>

              <ScrollArea className="h-[calc(100vh-200px)]">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => {
                      handleSelectChat(conv.id);
                      setShowMobileHistory(false);
                    }}
                    className={cn(
                      "p-3 rounded-lg cursor-pointer mb-2",
                      activeConversationId === conv.id
                        ? "bg-white dark:bg-gray-800 shadow-sm"
                        : "hover:bg-white/50 dark:hover:bg-gray-800/50"
                    )}
                  >
                    <p className="font-medium text-sm truncate">{conv.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(conv.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                ))}
              </ScrollArea>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </MainLayout>
  );
};

export default TeacherAIChatPage;
