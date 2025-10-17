import { useState, useRef, useEffect } from "react";
import { Send, Mic, Plus, MessageCircle, X } from "lucide-react";
import 'katex/dist/katex.min.css';
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { ActionButtons } from "@/components/ActionButtons";
import { JobStatus } from "@/components/JobStatus";
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
  is_pinned: boolean;
}

const TeacherAIChatPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [showMobileHistory, setShowMobileHistory] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeJobs, setActiveJobs] = useState<Map<string, any>>(new Map());
  const processedJobsRef = useRef<Set<string>>(new Set());

  // Initial suggestions for teachers
  const getInitialSuggestions = () => [
    "Crie um plano de aula sobre análise de circuitos elétricos",
    "Gere uma atividade de múltipla escolha sobre resistência dos materiais",
    "Elabore uma atividade dissertativa sobre termodinâmica aplicada",
    "Sugira estratégias para ensinar mecânica dos fluidos",
    "Crie flashcards de revisão sobre estruturas metálicas"
  ];

  // Check if there are existing jobs for same context
  const hasExistingJob = (jobType: string, context: string): boolean => {
    for (const [jobId, job] of activeJobs.entries()) {
      if (job.type === jobType && 
          job.payload?.context === context &&
          (job.status === 'PENDING' || job.status === 'SYNTHESIZING')) {
        console.log('⚠️ Job already exists:', jobId, jobType);
        return true;
      }
    }
    return false;
  };

  // Handler for interactive actions
  const handleAction = async (jobType: string, payload: any) => {
    const contextKey = payload.context || payload.topic;
    
    if (hasExistingJob(jobType, contextKey)) {
      toast({
        title: "Job em andamento",
        description: "Este conteúdo já está sendo processado. Aguarde a conclusão.",
        variant: "default"
      });
      return;
    }
    
    const tempId = `temp-${jobType}-${Date.now()}`;
    console.log('🆕 Creating new teacher job:', tempId, jobType);
    
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
      
      const { data, error } = await supabase.functions.invoke('mia-student-chat', {
        body: { 
          action: jobType, 
          context: payload,
          conversationId: activeConversationId 
        },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      
      if (error) throw error;
      
      const realJobId = data.jobId;
      console.log('✅ Teacher job created successfully:', realJobId);
      
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
      
      toast({
        title: "Processando",
        description: "Sua solicitação foi iniciada!"
      });
    } catch (error) {
      console.error(`Erro ao iniciar ${jobType}:`, error);
      
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
        title: "Erro",
        description: "Não foi possível processar sua solicitação.",
        variant: "destructive"
      });
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    let conversationId = activeConversationId;
    
    if (!conversationId) {
      console.log('📝 No active conversation, creating new one...');
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          toast({
            title: "Erro",
            description: "Você precisa estar autenticado para enviar mensagens.",
            variant: "destructive",
          });
          return;
        }

        const title = inputMessage.trim().slice(0, 50) || "Nova Conversa";
        
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
        
        console.log('✅ New conversation created:', conversationId);
        
        loadConversations();
        
      } catch (error) {
        console.error('❌ Error creating conversation:', error);
        toast({
          title: "Erro",
          description: "Não foi possível criar a conversa.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
    }

    const userMessage: Message = {
      id: `${conversationId}-${Date.now()}`,
      content: inputMessage,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentMessage = inputMessage;
    setInputMessage("");
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Não autenticado');
      }

      const { data: functionData, error: functionError } = await supabase.functions.invoke('mia-student-chat', {
        body: {
          message: currentMessage,
          conversationId: conversationId,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (functionError) {
        console.error('Function invocation error:', functionError);
        throw new Error(functionError.message || 'Erro ao processar mensagem');
      }

      console.log('Function response:', functionData);
      
      const assistantMessage: Message = {
        id: `${activeConversationId}-${Date.now()}`,
        content: functionData.response,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);

      if (functionData.conversationId && !activeConversationId) {
        setActiveConversationId(functionData.conversationId);
        loadConversations();
      }

      if (functionData.conversationTitle) {
        console.log('Received conversation title:', functionData.conversationTitle);
        loadConversations();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao enviar mensagem",
        variant: "destructive",
      });
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

  const handleNewConversation = () => {
    setMessages([]);
    setActiveConversationId(null);
    setShowMobileHistory(false);
  };

  const handleSelectChat = async (conversationId: string) => {
    console.log('🔄 Switching conversation, cleaning up previous state');
    
    setActiveJobs(new Map());
    processedJobsRef.current.clear();
    
    console.log('✅ State cleaned, loading new conversation:', conversationId);
    
    try {
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const loadedMessages: Message[] = messagesData.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        isUser: msg.role === 'user',
        timestamp: new Date(msg.created_at),
      }));

      setMessages(loadedMessages);
      setActiveConversationId(conversationId);
      setShowMobileHistory(false);
    } catch (error) {
      console.error('Error loading conversation:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar conversa",
        variant: "destructive",
      });
    }
  };

  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Tem certeza que deseja apagar esta conversa?')) return;

    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;

      if (activeConversationId === conversationId) {
        setMessages([]);
        setActiveConversationId(null);
      }

      loadConversations();

      toast({
        title: "Conversa apagada",
        description: "A conversa foi removida com sucesso.",
      });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: "Erro",
        description: "Falha ao apagar conversa",
        variant: "destructive",
      });
    }
  };

  const loadConversations = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', session.user.id)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      setConversations(data || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  // Process job updates from realtime
  const processJobUpdate = async (job: any, currentConversationId: string | null) => {
    console.log('📬 Processing teacher job update:', {
      id: job.id,
      status: job.status,
      type: job.job_type,
      conversationId: job.conversation_id
    });
    
    if (job.conversation_id !== currentConversationId) {
      console.log('⏭️ Job from different conversation, skipping');
      return;
    }
    
    setActiveJobs(prev => {
      const currentJob = prev.get(job.id);
      
      if (!currentJob) {
        console.log('🆕 New job detected:', job.id, job.status);
        return new Map(prev).set(job.id, {
          status: job.status,
          type: job.job_type,
          result: job.result,
          payload: job.input_payload
        });
      }
      
      if (currentJob.status === job.status && currentJob.result === job.result) {
        console.log('⏭️ No real changes, skipping update');
        return prev;
      }
      
      console.log('✏️ Updating job state:', job.id, job.status);
      
      const newJobs = new Map(prev);
      newJobs.set(job.id, {
        ...currentJob,
        status: job.status,
        result: job.result
      });
      return newJobs;
    });
    
    if (job.status === 'COMPLETED' || job.status === 'FAILED') {
      if (processedJobsRef.current.has(job.id)) {
        console.log('⏭️ Job already processed, skipping:', job.id);
        return;
      }
      processedJobsRef.current.add(job.id);
      console.log(`✅ Job marked as processed:`, job.id);
    }
  };

  // Setup realtime subscription for jobs
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        loadConversations();
      }
    });

    loadConversations();

    return () => subscription.unsubscribe();
  }, []);

  // Realtime updates for jobs
  useEffect(() => {
    if (!activeConversationId) return;

    const channel = supabase
      .channel(`teacher-jobs:${activeConversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs',
          filter: `conversation_id=eq.${activeConversationId}`
        },
        (payload) => {
          console.log('🔔 Teacher job realtime update:', payload);
          if (payload.new) {
            processJobUpdate(payload.new, activeConversationId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversationId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <MainLayout>
      <div className="flex h-[calc(100vh-64px)] bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        {/* Sidebar - Desktop */}
        <div className="hidden md:flex w-80 bg-white/90 backdrop-blur-xl border-r border-gray-200 flex-col shadow-lg">
          <div className="p-6 border-b border-gray-200">
            <Button onClick={handleNewConversation} className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg">
              <Plus className="w-5 h-5 mr-2" />
              Nova Conversa
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => handleSelectChat(conv.id)}
                  className={cn(
                    "p-3 rounded-lg cursor-pointer transition-all duration-200 group relative",
                    activeConversationId === conv.id
                      ? "bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-l-4 border-blue-500 shadow-md"
                      : "hover:bg-gray-100"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate flex-1">
                      {conv.title || 'Nova conversa'}
                    </span>
                    <button
                      onClick={(e) => handleDeleteConversation(conv.id, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded"
                    >
                      <X className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(conv.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-white/90 backdrop-blur-xl border-b border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between max-w-5xl mx-auto">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Mia - Assistente Pedagógica</h1>
                  <p className="text-sm text-gray-500">Criando conteúdos educacionais de qualidade</p>
                </div>
              </div>

              <button
                onClick={() => navigate('/teacherdashboard')}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Voltar ao Dashboard
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4">
            <div className="max-w-5xl mx-auto space-y-6">
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                    <MessageCircle className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Bem-vindo, Professor!</h2>
                  <p className="text-gray-600 mb-6">Como posso ajudá-lo hoje?</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                    {getInitialSuggestions().map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setInputMessage(suggestion);
                          setTimeout(() => handleSendMessage(), 100);
                        }}
                        className="p-4 text-left bg-white/80 backdrop-blur-sm hover:bg-white border border-gray-200 rounded-xl transition-all duration-200 hover:shadow-md hover:scale-105"
                      >
                        <p className="text-sm text-gray-700">{suggestion}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-4",
                    message.isUser ? "justify-end" : "justify-start"
                  )}
                >
                  {!message.isUser && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                      <MessageCircle className="w-5 h-5 text-white" />
                    </div>
                  )}
                  
                  <div className={cn(
                    "max-w-[80%] rounded-2xl px-6 py-4 shadow-md",
                    message.isUser
                      ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                      : "bg-white/90 backdrop-blur-xl border border-gray-200"
                  )}>
                    {message.isUser ? (
                      <p className="text-sm leading-relaxed">{message.content}</p>
                    ) : (
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {!message.isUser && 
                     message.content.length > 100 && 
                     !(message.jobIds && message.jobIds.length > 0 && message.content.length < 500) && (
                      <ActionButtons
                        messageContent={message.content}
                        topic={message.content.split('\n')[0].substring(0, 50)}
                        onAction={handleAction}
                        disabled={isLoading}
                        activeJobs={activeJobs}
                        messageJobIds={message.jobIds}
                        isTeacher={true}
                      />
                    )}

                    {/* Job Status */}
                    {!message.isUser && message.jobIds?.map(jobId => {
                      const job = activeJobs.get(jobId);
                      
                      if (!job) {
                        return null;
                      }
                      
                      return (
                        <JobStatus
                          key={jobId}
                          job={job}
                          conversationTitle={conversations.find(c => c.id === activeConversationId)?.title}
                        />
                      );
                    })}
                  </div>
                  
                  {message.isUser && (
                    <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-gray-700">P</span>
                    </div>
                  )}
                </div>
              ))}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="bg-white/90 backdrop-blur-xl border-t border-gray-200 p-4 shadow-lg">
            <div className="max-w-5xl mx-auto">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Digite sua mensagem para a Mia..."
                    className="resize-none pr-12 min-h-[60px] max-h-[200px] bg-white border-gray-300 focus:border-blue-500"
                    disabled={isLoading}
                  />
                  <button
                    onClick={() => {/* Voice input placeholder */}}
                    className={cn(
                      "absolute right-3 bottom-3 p-2 rounded-full transition-all duration-200",
                      isListening
                        ? "bg-red-500 text-white animate-pulse"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                    )}
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                </div>
                
                <Button
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputMessage.trim()}
                  className="h-[60px] px-8 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default TeacherAIChatPage;
