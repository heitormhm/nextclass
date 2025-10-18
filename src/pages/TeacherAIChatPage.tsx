import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Mic, Plus, MessageCircle, Trash2, Paperclip, FileQuestion, Layers, BookOpen, CheckSquare, Edit, Presentation, FileDown } from "lucide-react";
import { MultiStepLoader } from "@/components/ui/multi-step-loader";
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
  isSystemMessage?: boolean;
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
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isDeepSearchLoading, setIsDeepSearchLoading] = useState(false);
  const [deepSearchProgress, setDeepSearchProgress] = useState(0);

  const deepSearchSteps = [
    { text: "🔍 Iniciando pesquisa profunda..." },
    { text: "📚 Analisando bases de dados acadêmicas..." },
    { text: "🧠 Processando conteúdo com IA avançada..." },
    { text: "📊 Compilando informações relevantes..." },
    { text: "✨ Gerando relatório personalizado..." },
    { text: "✅ Finalizando análise..." }
  ];

  const deepSearchIndicators = [
    'MATERIAL 1: ESTUDO DE CASO',
    'MATERIAL 2: NOTA TÉCNICA',
    'MATERIAL 3: LISTA DE RECURSOS',
    'Referências Bibliográficas',
    'PROTOCOLO DE FACT-CHECKING',
    '## 📊 MATERIAL 1:',
    '## 📝 MATERIAL 2:',
    '## 🔗 MATERIAL 3:',
    '## 📚 Referências',
    'ANÁLISE PROFUNDA SOBRE',
    'ANÁLISE APROFUNDADA SOBRE'
  ];

  const getInitialActionButtons = () => [
    {
      label: "📚 Criar Material de Estudo",
      action: "study-material",
      description: "Gere materiais de apoio educacionais"
    },
    {
      label: "📝 Criar Quiz",
      action: "quiz",
      description: "Crie questionários avaliativos"
    },
    {
      label: "🎴 Criar Flashcard",
      action: "flashcard",
      description: "Desenvolva flashcards de revisão"
    },
    {
      label: "📊 Criar Apresentação de Slides",
      action: "slides",
      description: "Monte apresentações visuais"
    },
    {
      label: "📋 Criar Roteiro de Aula",
      action: "lesson-plan",
      description: "Planeje uma aula completa"
    },
    {
      label: "✅ Criar Atividade Avaliativa",
      action: "assessment",
      description: "Gere atividades de múltipla escolha ou dissertativas"
    }
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

    if (isDeepSearch) {
      setIsDeepSearchLoading(true);
      setDeepSearchProgress(0);
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const { data: functionData, error: functionError } = await supabase.functions.invoke('mia-student-chat', {
        body: {
          message: currentMessage,
          isDeepSearch,
          conversationId,
          autoDetectSearch: true,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

        if (functionError) throw functionError;

        // 🚫 NÃO adicionar mensagem de confirmação ao histórico em Deep Search
        if (!isDeepSearch) {
          const assistantMessage: Message = {
            id: `assistant-${Date.now()}`,
            content: functionData.response,
            isUser: false,
            timestamp: new Date(),
            isSystemMessage: functionData.response.includes('foi iniciada') || 
                             functionData.response.includes('Processando sua solicitação') ||
                             functionData.response.includes('acompanhe o progresso'),
          };
          
          setMessages(prev => [...prev, assistantMessage]);
        }

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
      setIsDeepSearchLoading(false);
      setDeepSearchProgress(0);
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

  const handleActionButtonClick = (action: string) => {
    let prompt = "";
    
    switch(action) {
      case "study-material":
        prompt = "Criar material de estudo sobre ";
        break;
      case "quiz":
        prompt = "Criar um quiz sobre ";
        break;
      case "flashcard":
        prompt = "Criar flashcards de revisão sobre ";
        break;
      case "slides":
        prompt = "Criar uma apresentação de slides sobre ";
        break;
      case "lesson-plan":
        prompt = "Criar um roteiro de aula sobre ";
        break;
      case "assessment":
        prompt = "Criar uma atividade avaliativa (múltipla escolha ou dissertativa) sobre ";
        break;
    }
    
    setInputMessage(prompt);
    document.querySelector('textarea')?.focus();
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

    // 📊 Logging detalhado para debug
    console.log(`🔍 Job update received:`, { 
      id: job.id, 
      type: job.type, 
      status: job.status,
      job_type_field: (job as any).job_type
    });

    // 🔥 DESLIGAR LOADER quando DEEP_SEARCH completa
    if (job.type === 'DEEP_SEARCH' && (job.status === 'COMPLETED' || job.status === 'FAILED')) {
      console.log(`🏁 Deep search ${job.status}, closing loader`);
      setIsDeepSearchLoading(false);
      setDeepSearchProgress(deepSearchSteps.length - 1);
      
      // 🎯 CRIAR NOVA MENSAGEM COM BOTÕES DE AÇÃO
      if (job.status === 'COMPLETED') {
        console.log('✅ Deep search completed, adding action buttons message');
        
        const actionButtonsMessage: Message = {
          id: `action-buttons-${Date.now()}`,
          content: 'DEEP_SEARCH_ACTION_BUTTONS',
          isUser: false,
          timestamp: new Date(),
          isSystemMessage: false,
        };
        
        setMessages(prev => [...prev, actionButtonsMessage]);
      }
    }

    // 📊 SINCRONIZAR PROGRESSO DO LOADER com STEPS reais do backend
    if (job.type === 'DEEP_SEARCH' && job.status !== 'COMPLETED' && job.status !== 'FAILED') {
      const currentStep = job.intermediate_data?.step;
      
      // Mapear steps do backend para índices do loader
      const stepMap: Record<string, number> = {
        '1': 1,  // Decomposing
        '2': 3,  // Searching
        '3': 4,  // Synthesizing
        '4': 5   // Completing
      };
      
      const loaderIndex = stepMap[currentStep] || 0;
      
      console.log(`📊 Deep search progress: step ${currentStep} → loader index ${loaderIndex}`);
      setDeepSearchProgress(loaderIndex);
    }
    
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

  useEffect(() => {
    if (!isDeepSearchLoading) {
      setDeepSearchProgress(0);
      return;
    }
    
    // ✅ Progresso agora é controlado por processJobUpdate, não por timer
    // Apenas garantir que resetamos quando loader inicia
    setDeepSearchProgress(0);
  }, [isDeepSearchLoading]);

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
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center shadow-xl shadow-purple-500/30">
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
              className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
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
                          ? "bg-white dark:bg-gray-800 shadow-md border border-purple-200 dark:border-purple-700 scale-[1.02]"
                          : "hover:bg-white/60 dark:hover:bg-gray-800/60 hover:shadow-sm hover:scale-[1.01]"
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
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-all flex items-center justify-center"
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
        <div className="flex-1 flex flex-col relative overflow-hidden bg-gradient-to-br from-blue-900 via-purple-600 to-pink-500 animate-gradient-xy bg-[length:200%_200%]">
          
          {/* Blobs animados para profundidade */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
            <div className="absolute top-1/4 -left-48 w-96 h-96 bg-gradient-to-br from-pink-400/40 to-purple-500/40 rounded-full blur-3xl animate-float" />
            <div className="absolute top-2/3 -right-32 w-80 h-80 bg-gradient-to-br from-blue-300/35 to-purple-400/35 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-gradient-to-br from-purple-400/30 to-pink-300/30 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
          </div>
          
          <div className="relative z-10 flex-1 flex flex-col min-h-full">
            
            <ScrollArea className="flex-1 px-4 py-6 pb-36">
              <div className="max-w-4xl mx-auto space-y-6">
                 
                 {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[45vh] text-center py-6 px-4">
            
            {/* Header com ícone inline */}
            <div className="flex items-center justify-center gap-4 mb-3">
              {/* Ícone Sparkles com frosted glass */}
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full backdrop-blur-xl bg-white/10 border-2 border-white/30 shadow-2xl" />
                <div className="absolute inset-2 rounded-full bg-white shadow-xl" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-pink-500 fill-pink-500 drop-shadow-lg relative z-10" />
                </div>
              </div>
              
              {/* Texto ao lado do ícone */}
              <h3 className="text-3xl font-bold bg-gradient-to-r from-white via-purple-100 to-pink-100 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(255,255,255,0.3)]">
                Bem-vindo, Professor!
              </h3>
            </div>
            
            {/* Subtítulo compacto */}
            <p className="text-white/90 text-base mb-5 max-w-md font-medium drop-shadow-[0_1px_4px_rgba(0,0,0,0.2)]">
              Como posso ajudá-lo hoje?
            </p>
                    
            {/* Grid 3x2 otimizado */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-5xl">
              {getInitialActionButtons().map((btn, idx) => (
                <button
                  key={idx}
                  onClick={() => handleActionButtonClick(btn.action)}
                  aria-label={`${btn.label} - ${btn.description}`}
                  className="group p-3 min-h-[90px] backdrop-blur-lg bg-white/20 border border-white/30 rounded-xl hover:bg-white/30 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-300 text-left shadow-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-purple-600"
                >
                  <div className="text-white text-sm font-semibold mb-1.5 leading-tight">
                    {btn.label}
                  </div>
                  <div className="text-white/75 text-xs leading-snug">
                    {btn.description}
                  </div>
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
                    "max-w-[80%] rounded-2xl px-6 py-4 shadow-xl backdrop-blur-xl transition-all hover:shadow-2xl break-words",
                    message.isUser
                      ? "bg-white/65 text-gray-900 border border-white/40 shadow-lg"
                      : "bg-white/65 text-gray-900 border border-white/40 shadow-lg"
                  )}
                >
                  {/* Caso especial: Renderizar botões de ação para Deep Search */}
                  {!message.isUser && message.content === 'DEEP_SEARCH_ACTION_BUTTONS' ? (
                    <div className="mt-4 p-5 rounded-xl bg-gradient-to-br from-purple-50/80 to-pink-50/80 border-2 border-purple-200">
                      <h3 className="text-sm font-bold text-purple-800 mb-3 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Continue explorando com Mia:
                      </h3>
                      
                      {/* Grid 3x2 de botões */}
                      <div className="grid grid-cols-3 gap-3">
                        {/* Linha 1 */}
                        <Button
                          size="sm"
                          onClick={() => handleAction('GENERATE_QUIZ', { context: messages[messages.length - 2]?.content || '', topic: 'este tópico' })}
                          className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white shadow-lg transition-all duration-300 px-4 py-2.5 rounded-xl"
                        >
                          <FileQuestion className="w-4 h-4 mr-2" />
                          <span className="font-bold text-sm">Criar Quiz</span>
                        </Button>
                        
                        <Button
                          size="sm"
                          onClick={() => handleAction('GENERATE_FLASHCARDS', { context: messages[messages.length - 2]?.content || '', topic: 'este tópico' })}
                          className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white shadow-lg transition-all duration-300 px-4 py-2.5 rounded-xl"
                        >
                          <Layers className="w-4 h-4 mr-2" />
                          <span className="font-bold text-sm">Criar Flashcards</span>
                        </Button>
                        
                        <Button
                          size="sm"
                          onClick={() => handleAction('GENERATE_LESSON_PLAN', { context: messages[messages.length - 2]?.content || '', topic: 'este tópico' })}
                          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg transition-all duration-300 px-4 py-2.5 rounded-xl"
                        >
                          <BookOpen className="w-4 h-4 mr-2" />
                          <span className="font-bold text-sm">Plano de Aula</span>
                        </Button>
                        
                        {/* Linha 2 */}
                        <Button
                          size="sm"
                          onClick={() => handleAction('GENERATE_SLIDES', { context: messages[messages.length - 2]?.content || '', topic: 'este tópico' })}
                          className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-lg transition-all duration-300 px-4 py-2.5 rounded-xl"
                        >
                          <Presentation className="w-4 h-4 mr-2" />
                          <span className="font-bold text-sm">Criar Slides</span>
                        </Button>
                        
                        <Button
                          size="sm"
                          onClick={() => handleAction('GENERATE_MULTIPLE_CHOICE_ACTIVITY', { context: messages[messages.length - 2]?.content || '', topic: 'este tópico' })}
                          className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg transition-all duration-300 px-4 py-2.5 rounded-xl"
                        >
                          <CheckSquare className="w-4 h-4 mr-2" />
                          <span className="font-bold text-sm">Múltipla Escolha</span>
                        </Button>
                        
                        <Button
                          size="sm"
                          onClick={() => handleAction('GENERATE_OPEN_ENDED_ACTIVITY', { context: messages[messages.length - 2]?.content || '', topic: 'este tópico' })}
                          className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg transition-all duration-300 px-4 py-2.5 rounded-xl"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          <span className="font-bold text-sm">Atividade Avaliativa</span>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="prose prose-sm max-w-none prose-gray break-words overflow-x-auto">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                          components={{
                            a: ({node, ...props}) => (
                              <a 
                                {...props} 
                                className="break-all text-blue-600 hover:text-blue-800 underline" 
                                target="_blank" 
                                rel="noopener noreferrer" 
                              />
                            ),
                            code: ({node, inline, ...props}: any) => (
                              inline 
                                ? <code {...props} className="bg-gray-100 px-1 py-0.5 rounded text-sm break-all" />
                                : <code {...props} className="block bg-gray-100 p-2 rounded my-2 overflow-x-auto text-sm" />
                            )
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>

                      {/* Botão Exportar PDF para mensagens de Deep Search */}
                      {!message.isUser && deepSearchIndicators.some(indicator => message.content.includes(indicator)) && (
                        <div className="mt-4 flex justify-end">
                          <Button
                            size="sm"
                            onClick={() => {
                              toast({
                                title: "Exportando PDF",
                                description: "Preparando documento para download...",
                              });
                            }}
                            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg transition-all duration-300 px-4 py-2 rounded-xl"
                          >
                            <FileDown className="w-4 h-4 mr-2" />
                            <span className="font-bold text-sm">Exportar PDF</span>
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                           
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
                          
                    {!message.isUser && 
                     !message.isSystemMessage && 
                     message.content !== 'DEEP_SEARCH_ACTION_BUTTONS' &&
                     !deepSearchIndicators.some(ind => message.content.includes(ind)) && (
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

            {/* Input Area - Fixed at bottom */}
            <div className="absolute bottom-0 left-0 right-0 z-20 px-4 sm:px-6 pb-4 sm:pb-6 bg-gradient-to-t from-purple-600/30 to-transparent">
              <div className="max-w-4xl mx-auto frost-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl border border-white/30">
                <div className="flex items-end gap-2 sm:gap-3">
                  
                  {/* Botão de Anexo */}
                  <div className="relative">
                    <input
                      type="file"
                      id="teacher-file-upload"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 20 * 1024 * 1024) {
                            toast({
                              title: "Arquivo muito grande",
                              description: "O arquivo deve ter no máximo 20MB",
                              variant: "destructive",
                            });
                            return;
                          }
                          setAttachedFile(file);
                          toast({
                            title: "Arquivo anexado",
                            description: file.name,
                          });
                        }
                      }}
                      accept="image/*,.pdf,.doc,.docx,.txt"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => document.getElementById('teacher-file-upload')?.click()}
                      className="shrink-0 h-10 w-10 hover:bg-primary/10"
                      title="Anexar arquivo"
                    >
                      <Paperclip className="w-5 h-5" />
                    </Button>
                  </div>

                  {/* Botão de Voz */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleVoiceInput}
                    className={cn(
                      "shrink-0 h-10 w-10 relative hover:bg-primary/10",
                      isListening && "text-primary"
                    )}
                    disabled={isLoading}
                  >
                    <Mic className={cn(
                      "w-5 h-5",
                      isListening && "animate-pulse"
                    )} />
                    {isListening && (
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                      </span>
                    )}
                  </Button>

                  {/* Input de Texto */}
                  <div className="flex-1 space-y-2">
                    <Textarea
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Pergunte à Mia sobre pedagogia, conteúdos, estratégias..."
                      className="min-h-[40px] max-h-32 resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-2"
                      disabled={isLoading}
                    />
                    
                    {/* Preview do arquivo anexado */}
                    {attachedFile && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-lg text-sm">
                        <Paperclip className="w-4 h-4 shrink-0" />
                        <span className="flex-1 truncate">{attachedFile.name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 hover:bg-destructive/10"
                          onClick={() => setAttachedFile(null)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Toggle de Busca */}
                  <div className="hidden sm:flex shrink-0">
                    <button
                      onClick={() => setIsDeepSearch(!isDeepSearch)}
                      className={cn(
                        "relative inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all duration-300 transform hover:scale-105",
                        isDeepSearch 
                          ? "bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg shadow-purple-500/25" 
                          : "bg-background-secondary/50 text-foreground-muted hover:bg-background-secondary/70 border border-border"
                      )}
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
                      
                      {isDeepSearch && (
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 blur-md -z-10" />
                      )}
                    </button>
                  </div>

                  {/* Botão de Enviar */}
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isLoading}
                    size="icon"
                    className="shrink-0 h-10 w-10 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white shadow-lg"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
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

        {/* Multi-Step Loader para Busca Profunda */}
        {isDeepSearchLoading && (
          <MultiStepLoader
            loadingStates={deepSearchSteps}
            loading={isDeepSearchLoading}
            currentState={deepSearchProgress}
          />
        )}
      </div>
    </MainLayout>
  );
};

export default TeacherAIChatPage;
