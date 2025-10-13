import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Mic, Paperclip, Plus, MessageCircle, X, FileText, Image as ImageIcon, Music, FileDown, Trash2, Pin } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { MultiStepLoader } from "@/components/ui/multi-step-loader";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { generateReportPDF } from "@/utils/pdfGenerator";
import { ActionButtons } from "@/components/ActionButtons";
import { JobStatus } from "@/components/JobStatus";
import { QuizModal } from "@/components/QuizModal";
import { FlashcardModal } from "@/components/FlashcardModal";
import { SuggestionsButtons } from "@/components/SuggestionsButtons";

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
  isReport?: boolean;
  reportTitle?: string;
  suggestionsJobId?: string; // ✅ NOVO CAMPO
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  is_pinned: boolean;
}


const AIChatPage = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const phase2TriggerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isDeepSearch, setIsDeepSearch] = useState(false);
  const [deepSearchJobId, setDeepSearchJobId] = useState<string | null>(null);
  const [deepSearchProgress, setDeepSearchProgress] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [showMobileHistory, setShowMobileHistory] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [isDeepSearchLoading, setIsDeepSearchLoading] = useState(false);
  const [activeJobs, setActiveJobs] = useState<Map<string, any>>(new Map());
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [isFlashcardModalOpen, setIsFlashcardModalOpen] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [selectedFlashcardSetId, setSelectedFlashcardSetId] = useState<string | null>(null);

  const deepSearchSteps = [
    { text: "A decompor a pergunta em tópicos..." },
    { text: "A executar buscas na web..." },
    { text: "Pesquisa concluída, a preparar relatório..." },
    { text: "A gerar relatório final..." },
    { text: "Concluído" },
  ];

  // Handler for interactive actions
  const handleAction = async (jobType: string, payload: any) => {
    const tempId = `job-${Date.now()}`;
    setActiveJobs(prev => new Map(prev).set(tempId, { status: 'PENDING', type: jobType }));
    
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
      
      // Replace temp ID with real job ID
      setActiveJobs(prev => {
        const newJobs = new Map(prev);
        newJobs.delete(tempId);
        if (data.jobId) {
          newJobs.set(data.jobId, { status: 'PENDING', type: jobType });
        }
        return newJobs;
      });
      
      toast({
        title: "Processando",
        description: "Sua solicitação foi iniciada!"
      });
    } catch (error) {
      console.error(`Erro ao iniciar ${jobType}:`, error);
      toast({
        title: "Erro",
        description: "Não foi possível processar sua solicitação.",
        variant: "destructive"
      });
      setActiveJobs(prev => {
        const newJobs = new Map(prev);
        newJobs.delete(tempId);
        return newJobs;
      });
    }
  };

  const handleOpenQuiz = (quizId: string) => {
    setSelectedQuizId(quizId);
    setIsQuizModalOpen(true);
  };

  const handleOpenFlashcards = (setId: string) => {
    setSelectedFlashcardSetId(setId);
    setIsFlashcardModalOpen(true);
  };

  // Handler para clicar em uma sugestão
  const handleSuggestionClick = async (suggestion: string) => {
    console.log(`🔍 Suggestion clicked: "${suggestion}"`);
    
    // Adicionar mensagem do usuário no chat
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        content: suggestion,
        isUser: true,
        timestamp: new Date(),
      },
    ]);
    
    // Iniciar Deep Search automaticamente
    setIsDeepSearchLoading(true);
    setIsDeepSearch(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Não autenticado');
      }
      
      const { data, error } = await supabase.functions.invoke('mia-student-chat', {
        body: {
          message: suggestion,
          isDeepSearch: true,
          conversationId: activeConversationId,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      if (error) throw error;
      
      if (data.jobId) {
        setDeepSearchJobId(data.jobId);
        setDeepSearchProgress(0);
        
        // Adicionar ao activeJobs para tracking
        setActiveJobs(prev => new Map(prev).set(data.jobId, {
          status: 'PENDING',
          type: 'DEEP_SEARCH'
        }));
        
        toast({
          title: "Pesquisa Profunda Iniciada",
          description: "Acompanhe o progresso na interface.",
        });
      }
    } catch (error) {
      console.error('Error starting deep search from suggestion:', error);
      toast({
        title: "Erro",
        description: "Não foi possível iniciar a pesquisa profunda.",
        variant: "destructive",
      });
    } finally {
      setIsDeepSearchLoading(false);
      setIsDeepSearch(false);
    }
  };

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

    let sessionId: string | null = null;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Não autenticado');
      }

      // Call mia-student-chat for both normal and deep search
      const { data: functionData, error: functionError } = await supabase.functions.invoke('mia-student-chat', {
        body: {
          message: currentMessage,
          fileData: currentFile?.data,
          fileType: currentFile?.type,
          fileName: currentFile?.name,
          isDeepSearch,
          conversationId: activeConversationId,
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

      // Handle deep search response
      if (isDeepSearch && functionData.jobId) {
        setDeepSearchJobId(functionData.jobId);
        setIsDeepSearchLoading(true);
        setDeepSearchProgress(0);
        
        const assistantMessage: Message = {
          id: `${activeConversationId}-${Date.now()}`,
          content: functionData.response,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        // Normal chat response
        const assistantMessage: Message = {
          id: `${activeConversationId}-${Date.now()}`,
          content: functionData.response,
          isUser: false,
          timestamp: new Date(),
          suggestionsJobId: functionData.suggestionsJobId || undefined,
        };
        setMessages(prev => [...prev, assistantMessage]);
        
        // Adicionar job de sugestões ao activeJobs se existir
        if (functionData.suggestionsJobId) {
          setActiveJobs(prev => new Map(prev).set(functionData.suggestionsJobId, {
            status: 'PENDING',
            type: 'GENERATE_SUGGESTIONS'
          }));
        }

        // Update conversation ID if this was the first message
        if (functionData.conversationId && !activeConversationId) {
          setActiveConversationId(functionData.conversationId);
          loadConversations();
        }

        if (functionData.conversationTitle) {
          console.log('Received conversation title:', functionData.conversationTitle);
          loadConversations();
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao enviar mensagem",
        variant: "destructive",
      });
      setDeepSearchJobId(null);
      setDeepSearchProgress(0);
      setIsDeepSearchLoading(false);
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

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: "Não suportado",
        description: "O seu navegador não suporta reconhecimento de voz.",
        variant: "destructive",
      });
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'pt-PT';

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        toast({
          title: "A ouvir...",
          description: "Fale naturalmente. A transcrição aparecerá em tempo real.",
        });
      };

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        // Update input with interim results
        if (interimTranscript) {
          setInputMessage(interimTranscript);
        }

        // If we have final results, clear the silence timer and set a new one
        if (finalTranscript) {
          setInputMessage(finalTranscript.trim());
          
          // Clear existing timer
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }

          // Set new timer for auto-submit after 2 seconds of silence
          silenceTimerRef.current = setTimeout(() => {
            if (finalTranscript.trim()) {
              handleSendMessage();
            }
          }, 2000);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        
        if (event.error === 'not-allowed') {
          toast({
            title: "Permissão negada",
            description: "Por favor, permita o acesso ao microfone nas definições do navegador.",
            variant: "destructive",
          });
        } else if (event.error !== 'no-speech') {
          toast({
            title: "Erro",
            description: "Ocorreu um erro no reconhecimento de voz. Tente novamente.",
            variant: "destructive",
          });
        }
        
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        // Restart if we're still supposed to be listening
        if (isListening) {
          try {
            recognitionRef.current.start();
          } catch (error) {
            console.error('Error restarting recognition:', error);
            setIsListening(false);
          }
        }
      };

      recognitionRef.current.start();
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      toast({
        title: "Erro",
        description: "Não foi possível iniciar o reconhecimento de voz.",
        variant: "destructive",
      });
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    }
  };

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
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
    setMessages([]);
    setActiveConversationId(null);
    setShowMobileHistory(false);
  };

  const handleSelectChat = async (conversationId: string) => {
    try {
      // Load messages for this conversation
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const loadedMessages: Message[] = messagesData.map((msg) => ({
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

      // If deleted conversation was active, create a new one
      if (activeConversationId === conversationId) {
        setMessages([]);
        setActiveConversationId(null);
      }

      // Refresh conversations list
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

  const handleTogglePin = async (conversationId: string, currentPinState: boolean, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      const { error } = await supabase
        .from('conversations')
        .update({ is_pinned: !currentPinState })
        .eq('id', conversationId);

      if (error) throw error;

      // Refresh conversations list
      loadConversations();
    } catch (error) {
      console.error('Error toggling pin:', error);
      toast({
        title: "Erro",
        description: "Falha ao fixar conversa",
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Subscribe to all jobs updates (deep search and interactive actions)
  useEffect(() => {
    const allJobIds = [deepSearchJobId, ...Array.from(activeJobs.keys())].filter(Boolean);
    if (allJobIds.length === 0) return;

    console.log('📡 Subscribing to job updates');
    
    const jobChannel = supabase
      .channel('all-jobs-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs'
        },
        (payload) => {
          console.log('📬 Job update received:', payload);
          
          const job = payload.new as any;
          
          // Update active jobs state
          if (activeJobs.has(job.id)) {
            setActiveJobs(prev => new Map(prev).set(job.id, {
              status: job.status,
              type: job.job_type,
              result: job.result
            }));
            
            // Reload messages when job completes
            if (job.status === 'COMPLETED') {
              loadConversations();
              if (activeConversationId) {
                handleSelectChat(activeConversationId);
              }
              
              // Forçar re-render quando sugestões completarem
              if (job.job_type === 'GENERATE_SUGGESTIONS') {
                setMessages(prev => [...prev]);
              }
            }
          }
          
          // Handle deep search updates (existing logic)
          if (job.id === deepSearchJobId) {
          
          // Update progress based on status
          switch (job.status) {
            case 'PENDING':
              setDeepSearchProgress(0);
              break;
            case 'DECOMPOSING':
              setDeepSearchProgress(1);
              break;
            case 'RESEARCHING':
              setDeepSearchProgress(2);
              break;
            case 'SYNTHESIZING':
              setDeepSearchProgress(3);
              break;
            case 'COMPLETED':
              setDeepSearchProgress(4);
              
              // Save conversation and messages to database
              (async () => {
                try {
                  const { data: { session } } = await supabase.auth.getSession();
                  if (!session) return;
                  
                  // Create or use existing conversation
                  let conversationId = activeConversationId;
                  if (!conversationId) {
                    const { data: newConv, error: convError } = await supabase
                      .from('conversations')
                      .insert({
                        user_id: session.user.id,
                        title: job.input_payload.query.substring(0, 100)
                      })
                      .select()
                      .single();
                    
                    if (!convError && newConv) {
                      conversationId = newConv.id;
                      setActiveConversationId(conversationId);
                    }
                  }
                  
                  // Save messages to database
                  if (conversationId) {
                    // 1. Save user message
                    await supabase.from('messages').insert({
                      conversation_id: conversationId,
                      role: 'user',
                      content: job.input_payload.query
                    });
                    
                    // 2. Save report
                    await supabase.from('messages').insert({
                      conversation_id: conversationId,
                      role: 'assistant',
                      content: job.result
                    });
                    
                    // Reload conversations list
                    loadConversations();
                  }
                } catch (error) {
                  console.error('Error saving conversation:', error);
                }
              })();
              
              // Add report to local messages
              const reportMessage: Message = {
                id: `${activeConversationId}-${Date.now()}`,
                content: job.result,
                isUser: false,
                timestamp: new Date(),
                isReport: true,
                reportTitle: job.input_payload.query
              };
              
              setMessages(prev => [...prev, reportMessage]);
              
              toast({
                title: "Pesquisa Concluída",
                description: "O relatório foi gerado com sucesso!",
              });
              
              // Close loader
              setTimeout(() => {
                setDeepSearchJobId(null);
                setDeepSearchProgress(0);
                setIsDeepSearchLoading(false);
              }, 1500);
              break;
            case 'FAILED':
              toast({
                title: "Erro na Pesquisa",
                description: job.error_log || 'Erro desconhecido',
                variant: "destructive",
              });
              
              setDeepSearchJobId(null);
              setDeepSearchProgress(0);
              setIsDeepSearchLoading(false);
              break;
          }
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Job subscription status:', status);
      });
    
    return () => {
      console.log('🔌 Unsubscribing from job updates');
      supabase.removeChannel(jobChannel);
    };
  }, [deepSearchJobId, activeConversationId, activeJobs, toast]);


  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
              <div className="flex-1 space-y-2 overflow-y-auto">
                <h3 className="text-sm font-medium text-foreground-muted px-2">Conversas Recentes</h3>
                
                {conversations.length === 0 ? (
                  <div className="text-center py-8 text-foreground-muted">
                    <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Suas conversas com a Mia aparecerão aqui.</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {conversations.map((conversation) => (
                      <div
                        key={conversation.id}
                        className={cn(
                          "group relative w-full text-left p-3 rounded-lg transition-all duration-200 hover:bg-white/50 cursor-pointer",
                          activeConversationId === conversation.id
                            ? 'bg-primary/10 border border-primary/20 text-primary'
                            : 'text-foreground hover:text-foreground'
                        )}
                        onClick={() => handleSelectChat(conversation.id)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate flex items-center gap-1">
                              {conversation.is_pinned && (
                                <Pin className="w-3 h-3 shrink-0 text-primary fill-primary" />
                              )}
                              {conversation.title}
                            </div>
                            <div className="text-xs text-foreground-muted mt-1">
                              {new Date(conversation.created_at).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              onClick={(e) => handleTogglePin(conversation.id, conversation.is_pinned, e)}
                              className="p-1 hover:bg-background/50 rounded transition-colors"
                              title={conversation.is_pinned ? "Desafixar" : "Fixar"}
                            >
                              <Pin className={cn(
                                "w-3.5 h-3.5",
                                conversation.is_pinned ? "text-primary fill-primary" : "text-foreground-muted"
                              )} />
                            </button>
                            <button
                              onClick={(e) => handleDeleteConversation(conversation.id, e)}
                              className="p-1 hover:bg-destructive/10 rounded transition-colors"
                              title="Apagar"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
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
                          
                          {message.isReport && (
                            <div className="mb-3 p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/20">
                              <div className="flex items-center gap-2 mb-2">
                                <FileText className="w-5 h-5 text-purple-600" />
                                <span className="font-bold text-sm">Relatório de Pesquisa Aprofundada</span>
                              </div>
                              <p className="text-xs text-foreground-muted">
                                Pré-visualização do relatório gerado. Clique no botão abaixo para gerar o PDF formatado.
                              </p>
                            </div>
                          )}

                          <div className="whitespace-pre-wrap text-sm leading-relaxed max-h-96 overflow-y-auto">
                            {message.content}
                          </div>

                          {/* Add action buttons for Mia's responses */}
                          {!message.isUser && message.content.length > 100 && (
                            <ActionButtons
                              messageContent={message.content}
                              topic={message.content.split('\n')[0].substring(0, 50)}
                              onAction={handleAction}
                              disabled={isLoading}
                            />
                          )}

                          {/* Suggestions Buttons */}
                          {!message.isUser && message.suggestionsJobId && (
                            <SuggestionsButtons
                              suggestionsJobId={message.suggestionsJobId}
                              activeJobs={activeJobs}
                              onSuggestionClick={handleSuggestionClick}
                              disabled={isLoading || isDeepSearchLoading}
                            />
                          )}

                          {message.isReport && (
                            <Button
                  onClick={async () => {
                    console.log('🎯 Iniciando geração de PDF...');
                    console.log('📄 Conteúdo:', message.content.substring(0, 200) + '...');
                    console.log('📏 Tamanho do conteúdo:', message.content.length, 'caracteres');
                    
                    const result = await generateReportPDF({
                      content: message.content,
                      title: message.reportTitle || 'Relatório de Pesquisa',
                      logoSvg: '',
                    });
                    
                    if (result.success) {
                      let description = "O relatório foi gerado e o download iniciou.";
                      
                      if (result.fixesApplied && result.fixesApplied.length > 0) {
                        description = "✅ PDF gerado com sucesso após correções automáticas!\n\n";
                        description += `🔧 Correções aplicadas:\n${result.fixesApplied.map(f => `• ${f}`).join('\n')}`;
                      }
                      
                      if (result.stats) {
                        description += `\n\n📊 Estatísticas:\n`;
                        description += `• Conteúdo: ${result.stats.content.h1Count + result.stats.content.h2Count + result.stats.content.h3Count} títulos, ${result.stats.content.paragraphCount} parágrafos\n`;
                        if (result.stats.render) {
                          description += `• Renderizado: ${result.stats.render.h1 + result.stats.render.h2 + result.stats.render.h3} títulos, ${result.stats.render.paragraphs} parágrafos\n`;
                        }
                        description += `• PDF: ${result.stats.pdf.pageCount} páginas geradas`;
                      }
                      
                      if (result.warnings && result.warnings.length > 0) {
                        description += `\n\n⚠️ Avisos:\n${result.warnings.map(w => `• ${w}`).join('\n')}`;
                      }
                      
                      toast({
                        title: result.fixesApplied ? "✅ PDF Gerado (Auto-Corrigido)" : "✅ PDF Gerado com Sucesso",
                        description,
                        duration: result.fixesApplied ? 8000 : 5000,
                      });
                    } else {
                      let errorDescription = result.error || "Erro desconhecido";
                      
                      if (result.diagnostics && result.diagnostics.length > 0) {
                        errorDescription += `\n\n🔍 Problemas detectados:\n`;
                        errorDescription += result.diagnostics.map(d => `• ${d.issue}\n  Sugestão: ${d.suggestedFix}`).join('\n');
                      }
                      
                      if (result.stats?.render) {
                        errorDescription += `\n\n📊 Debug Info:\n`;
                        errorDescription += `• Renderizado: ${result.stats.render.h1 + result.stats.render.h2 + result.stats.render.h3} títulos, ${result.stats.render.paragraphs} parágrafos\n`;
                        errorDescription += `• Páginas adicionadas: ${result.stats.render.pagesAdded}`;
                      }
                      
                      toast({
                        title: "❌ Erro ao Gerar PDF",
                        description: errorDescription,
                        variant: "destructive",
                        duration: 10000,
                      });
                      
                      // Log detalhado para debug
                      console.error('❌ Falha na geração do PDF');
                      console.error('Erro:', result.error);
                      if (result.diagnostics) {
                        console.error('Diagnósticos:', result.diagnostics);
                      }
                      if (result.stats) {
                        console.error('Stats:', result.stats);
                      }
                    }
                  }}
                              className="mt-4 w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                            >
                              <FileDown className="w-4 h-4 mr-2" />
                              Gerar PDF do Relatório
                            </Button>
                          )}

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
                      className={cn(
                        "shrink-0 h-10 w-10 relative hover:bg-primary/10",
                        isListening && "text-primary"
                      )}
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

      {/* Multi-Step Loader for Deep Search */}
      {isDeepSearchLoading && (
        <MultiStepLoader
          loadingStates={deepSearchSteps}
          loading={isDeepSearchLoading}
          currentState={deepSearchProgress}
        />
      )}

      <QuizModal
        open={isQuizModalOpen}
        onOpenChange={setIsQuizModalOpen}
        quizId={selectedQuizId || ''}
      />

      <FlashcardModal
        open={isFlashcardModalOpen}
        onOpenChange={setIsFlashcardModalOpen}
        flashcardSetId={selectedFlashcardSetId || undefined}
      />
    </MainLayout>
  );
};

export default AIChatPage;