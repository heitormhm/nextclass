import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Mic, Paperclip, Plus, MessageCircle, X, FileText, Music, FileDown, Trash2, Pin } from "lucide-react";
import 'katex/dist/katex.min.css';
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { TeacherLayoutWrapper } from "@/components/TeacherLayoutWrapper";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MultiStepLoader } from "@/components/ui/multi-step-loader";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { generateReportPDF } from "@/utils/pdfGenerator";
import { ActionButtons } from "@/components/ActionButtons";
import { JobStatus } from "@/components/JobStatus";
import { QuizModal } from "@/components/QuizModal";
import { FlashcardModal } from "@/components/FlashcardModal";
import { GeneratedContentCard } from "@/components/GeneratedContentCard";
import { SuggestionsButtons } from "@/components/SuggestionsButtons";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface AttachedFile {
  name: string;
  type: string;
  data: string;
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
  suggestionsJobId?: string;
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const phase2TriggerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeChannelRef = useRef<string | null>(null);
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
  const [realtimeDebounceTimer, setRealtimeDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const [activeJobs, setActiveJobs] = useState<Map<string, any>>(new Map());
  const processedJobsRef = useRef<Set<string>>(new Set());
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [isFlashcardModalOpen, setIsFlashcardModalOpen] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [selectedFlashcardSetId, setSelectedFlashcardSetId] = useState<string | null>(null);
  const [openQuizModal, setOpenQuizModal] = useState(false);
  const [conversationContent, setConversationContent] = useState<{
    quizzes: any[];
    flashcards: any[];
  }>({ quizzes: [], flashcards: [] });
  const [deepSearchTimeoutId, setDeepSearchTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [isCreatingDeepSearch, setIsCreatingDeepSearch] = useState(false);

  const deepSearchSteps = [
    { text: "A decompor a pergunta em tópicos..." },
    { text: "A executar buscas na web..." },
    { text: "Pesquisa concluída, a preparar relatório..." },
    { text: "A gerar relatório final..." },
    { text: "Concluído" },
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
      
      const { data, error } = await supabase.functions.invoke('mia-teacher-chat', {
        body: { 
          action: jobType, 
          context: payload,
          conversationId: activeConversationId 
        },
        headers: { Authorization: `Bearer ${session.access_token}` }
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
      
      toast({
        title: "Erro",
        description: "Não foi possível processar sua solicitação.",
        variant: "destructive"
      });
    }
  };

  const handleOpenQuiz = (quizId: string) => {
    const jobEntry = Array.from(activeJobs.entries()).find(
      ([_, job]) => job.type === 'GENERATE_QUIZ' && job.result?.includes(quizId)
    );
    
    if (jobEntry) {
      const [jobId] = jobEntry;
      
      setActiveJobs(prev => {
        const newJobs = new Map(prev);
        newJobs.delete(jobId);
        return newJobs;
      });
      
      setMessages(prev => prev.map(msg => ({
        ...msg,
        jobIds: msg.jobIds?.filter(id => id !== jobId),
        jobMetadata: (() => {
          const newMetadata = new Map(msg.jobMetadata || []);
          newMetadata.delete(jobId);
          return newMetadata;
        })()
      })));
    }
    
    navigate(`/quiz/${quizId}`, {
      state: {
        fromChat: true,
        conversationId: activeConversationId
      }
    });
  };

  const handleOpenFlashcards = (setId: string) => {
    const jobEntry = Array.from(activeJobs.entries()).find(
      ([_, job]) => job.type === 'GENERATE_FLASHCARDS' && job.result?.includes(setId)
    );
    
    if (jobEntry) {
      const [jobId] = jobEntry;
      
      setActiveJobs(prev => {
        const newJobs = new Map(prev);
        newJobs.delete(jobId);
        return newJobs;
      });
      
      setMessages(prev => prev.map(msg => ({
        ...msg,
        jobIds: msg.jobIds?.filter(id => id !== jobId),
        jobMetadata: (() => {
          const newMetadata = new Map(msg.jobMetadata || []);
          newMetadata.delete(jobId);
          return newMetadata;
        })()
      })));
    }
    
    setSelectedFlashcardSetId(setId);
    setIsFlashcardModalOpen(true);
  };

  const handleDeleteQuiz = async (quizId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('quizzes')
        .delete()
        .eq('id', quizId);
      
      if (error) throw error;
      
      setConversationContent(prev => ({
        ...prev,
        quizzes: prev.quizzes.filter(q => q.id !== quizId)
      }));
      
      toast({
        title: "Sucesso",
        description: "Quiz excluído com sucesso."
      });
    } catch (error) {
      console.error('Error deleting quiz:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o quiz.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteFlashcards = async (setId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('flashcard_sets')
        .delete()
        .eq('id', setId);
      
      if (error) throw error;
      
      setConversationContent(prev => ({
        ...prev,
        flashcards: prev.flashcards.filter(f => f.id !== setId)
      }));
      
      toast({
        title: "Sucesso",
        description: "Flashcards excluídos com sucesso."
      });
    } catch (error) {
      console.error('Error deleting flashcards:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir os flashcards.",
        variant: "destructive"
      });
    }
  };

  const loadConversationContent = async (conversationId: string) => {
    try {
      const [quizzesResult, flashcardsResult] = await Promise.all([
        (supabase as any)
          .from('quizzes')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: false }),
        (supabase as any)
          .from('flashcard_sets')
          .select('*, cards:flashcards(count)')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: false })
      ]);
      
      setConversationContent({
        quizzes: quizzesResult.data || [],
        flashcards: flashcardsResult.data || []
      });
    } catch (error) {
      console.error('Error loading conversation content:', error);
    }
  };

  const handleSendMessage = async () => {
    if ((!inputMessage.trim() && !attachedFile) || isLoading) return;

    let conversationId = activeConversationId;
    
    if (!conversationId) {
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

      const { data: functionData, error: functionError } = await supabase.functions.invoke('mia-teacher-chat', {
        body: {
          message: currentMessage,
          fileData: currentFile?.data,
          fileType: currentFile?.type,
          fileName: currentFile?.name,
          isDeepSearch,
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

      if (isDeepSearch && functionData.jobId) {
        if (isCreatingDeepSearch) {
          console.warn('⚠️ Deep search already in progress, ignoring duplicate request');
          return;
        }
        
        setIsCreatingDeepSearch(true);
        setDeepSearchJobId(functionData.jobId);
        setIsDeepSearchLoading(true);
        setDeepSearchProgress(0);
        
        const timeout = setTimeout(() => {
          setIsDeepSearchLoading(false);
          toast({
            title: "Tempo Limite Atingido",
            description: "A pesquisa profunda demorou mais do que esperado.",
            variant: "destructive",
            duration: 5000,
          });
          loadConversations();
        }, 180000);
        
        setDeepSearchTimeoutId(timeout);
        
        const assistantMessage: Message = {
          id: `${activeConversationId}-${Date.now()}`,
          content: functionData.response,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
        
        setTimeout(() => {
          setIsCreatingDeepSearch(false);
        }, 5000);
      } else {
        const assistantMessage: Message = {
          id: `${activeConversationId}-${Date.now()}`,
          content: functionData.response,
          isUser: false,
          timestamp: new Date(),
          suggestionsJobId: functionData.suggestionsJobId || undefined,
        };
        setMessages(prev => [...prev, assistantMessage]);

        if (functionData.conversationId && !activeConversationId) {
          setActiveConversationId(functionData.conversationId);
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
    } finally {
      setIsLoading(false);
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

  const loadConversationMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const loadedMessages: Message[] = (data || []).map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        isUser: msg.role === 'user',
        timestamp: new Date(msg.created_at),
      }));

      setMessages(loadedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as mensagens.",
        variant: "destructive",
      });
    }
  };

  const deleteConversation = async (conversationId: string) => {
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
        title: "Sucesso",
        description: "Conversa excluída com sucesso.",
      });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a conversa.",
        variant: "destructive",
      });
    }
  };

  const togglePinConversation = async (conversationId: string, currentPinStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ is_pinned: !currentPinStatus })
        .eq('id', conversationId);

      if (error) throw error;

      loadConversations();
    } catch (error) {
      console.error('Error toggling pin:', error);
      toast({
        title: "Erro",
        description: "Não foi possível fixar/desafixar a conversa.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (activeConversationId) {
      loadConversationMessages(activeConversationId);
      loadConversationContent(activeConversationId);
    }
  }, [activeConversationId]);

  useEffect(() => {
    const channel = (supabase as any)
      .channel('teacher_jobs_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs'
        },
        (payload: any) => {
          if (payload.eventType === 'UPDATE' && payload.new) {
            const job = payload.new;
            
            if (activeJobs.has(job.id)) {
              setActiveJobs(prev => {
                const newJobs = new Map(prev);
                newJobs.set(job.id, job);
                return newJobs;
              });
              
              if (job.status === 'COMPLETED' && job.result && activeConversationId) {
                if (job.type === 'GENERATE_QUIZ' || job.type === 'GENERATE_FLASHCARDS') {
                  loadConversationContent(activeConversationId);
                  
                  toast({
                    title: job.type === 'GENERATE_QUIZ' ? "Quiz Gerado!" : "Flashcards Gerados!",
                    description: "Seu conteúdo está pronto na barra lateral.",
                  });
                }
              }
            }
          }
        }
      )
      .subscribe();
    
    return () => {
      (supabase as any).removeChannel(channel);
    };
  }, [activeJobs, activeConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const teacherSuggestions = [
    "Como engajar alunos em Cálculo Diferencial?",
    "Crie um plano de aula sobre Resistência dos Materiais",
    "Sugira atividades práticas para Circuitos Elétricos",
    "Como avaliar aprendizagem em Mecânica dos Fluidos?"
  ];

  return (
    <MainLayout>
      <TeacherLayoutWrapper>
        <div className="h-screen flex flex-col">
          {/* Header - Mobile optimized */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-purple-300/40">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="p-2 sm:p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 shrink-0">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-900 truncate">
                  Chat com Mia - Professor
                </h1>
                <p className="text-xs sm:text-sm text-purple-600 hidden sm:block">
                  Sua assistente pedagógica especializada
                </p>
              </div>
            </div>
            
            {!showMobileHistory && (
              <Button 
                variant="outline" 
                size="sm"
                className="md:hidden shrink-0 ml-2 border-purple-300 text-purple-700 hover:bg-purple-50"
                onClick={() => setShowMobileHistory(true)}
              >
                <MessageCircle className="w-4 h-4" />
              </Button>
            )}
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Chat History Panel - Mobile overlay */}
            <div className={cn(
              "border-r border-purple-200/40 bg-white/80 backdrop-blur-md transition-transform duration-300 ease-in-out",
              showMobileHistory 
                ? "fixed inset-y-0 left-0 z-50 w-full bg-white transform translate-x-0 md:relative md:w-80 lg:w-96" 
                : "hidden md:block md:w-80 lg:w-96"
            )}>
              <div className="p-4 space-y-4 h-full flex flex-col">
                {showMobileHistory && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="md:hidden self-end text-purple-700 hover:bg-purple-50"
                    onClick={() => setShowMobileHistory(false)}
                  >
                    ✕
                  </Button>
                )}
                
                <Button 
                  onClick={() => {
                    setMessages([]);
                    setActiveConversationId(null);
                    setShowMobileHistory(false);
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white shadow-md"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Conversa
                </Button>

                {(conversationContent.quizzes.length > 0 || conversationContent.flashcards.length > 0) && (
                  <div className="pb-4 border-b border-purple-200">
                    <h3 className="text-sm font-semibold text-purple-700 px-2 mb-3">
                      📚 Conteúdo Gerado
                    </h3>
                    <div className="space-y-2">
                      {conversationContent.quizzes
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .map((quiz) => {
                          const topicMatch = quiz.title.match(/sobre (.+)/i) || quiz.title.match(/Quiz:?\s*(.+)/i);
                          const displayTitle = topicMatch ? topicMatch[1] : quiz.title;
                          
                          return (
                            <GeneratedContentCard
                              key={quiz.id}
                              type="quiz"
                              title={displayTitle}
                              itemCount={quiz.questions?.length || 0}
                              createdAt={quiz.created_at}
                              onOpen={() => handleOpenQuiz(quiz.id)}
                              onDelete={() => handleDeleteQuiz(quiz.id)}
                            />
                          );
                        })}
                      {conversationContent.flashcards
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .map((set) => {
                          const topicMatch = set.title.match(/sobre (.+)/i) || set.title.match(/Flashcards:?\s*(.+)/i);
                          const displayTitle = topicMatch ? topicMatch[1] : set.title;
                          
                          return (
                            <GeneratedContentCard
                              key={set.id}
                              type="flashcard"
                              title={displayTitle}
                              itemCount={set.cards?.length || 0}
                              createdAt={set.created_at}
                              onOpen={() => handleOpenFlashcards(set.id)}
                              onDelete={() => handleDeleteFlashcards(set.id)}
                            />
                          );
                        })}
                    </div>
                  </div>
                )}

                <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar">
                  <h3 className="text-sm font-medium text-purple-700 px-2">Conversas Recentes</h3>
                  
                  {conversations.length === 0 ? (
                    <div className="text-center py-8 text-purple-600">
                      <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Suas conversas com a Mia aparecerão aqui.</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {conversations.map((conversation) => (
                        <div
                          key={conversation.id}
                          className={cn(
                            "group relative w-full text-left p-3 rounded-lg transition-all duration-200 hover:bg-purple-50/50 cursor-pointer border",
                            activeConversationId === conversation.id
                              ? 'bg-purple-500/10 border-purple-500/20 text-purple-700'
                              : 'border-transparent text-purple-900 hover:border-purple-200'
                          )}
                          onClick={() => {
                            setActiveConversationId(conversation.id);
                            setShowMobileHistory(false);
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate flex items-center gap-1">
                                {conversation.is_pinned && (
                                  <Pin className="w-3 h-3 shrink-0 text-purple-600 fill-purple-600" />
                                )}
                                {conversation.title}
                              </div>
                              <div className="text-xs text-purple-500 mt-1">
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  togglePinConversation(conversation.id, conversation.is_pinned);
                                }}
                                className="p-1 hover:bg-purple-100 rounded transition-colors"
                                title={conversation.is_pinned ? "Desafixar" : "Fixar"}
                              >
                                <Pin className={cn(
                                  "w-3.5 h-3.5",
                                  conversation.is_pinned ? "text-purple-600 fill-purple-600" : "text-purple-500"
                                )} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteConversation(conversation.id);
                                }}
                                className="p-1 hover:bg-red-100 rounded transition-colors"
                                title="Apagar"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-600" />
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

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-transparent relative pointer-events-none">
          <div className="p-4 border-b border-purple-300 flex justify-between items-center bg-white/95 backdrop-blur-md pointer-events-auto shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-purple-600"
              onClick={() => setShowMobileHistory(true)}
            >
              <MessageCircle className="h-5 w-5" />
            </Button>
            <div className="flex-1 text-center">
              <h1 className="text-xl font-bold text-purple-900">Chat com Mia - Professor</h1>
              <p className="text-sm text-purple-600">Sua assistente pedagógica para engenharia</p>
            </div>
            <div className="w-10"></div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1 p-4 pointer-events-auto">
              <div className="max-w-4xl mx-auto space-y-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                      <Sparkles className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold mb-3 text-purple-900">Olá, Professor!</h2>
                    <p className="text-purple-600 text-center mb-8 max-w-md">
                      Sou a Mia, sua assistente pedagógica. Como posso ajudar com suas turmas e planejamento de aulas hoje?
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                      {teacherSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => setInputMessage(suggestion)}
                          className="p-4 rounded-xl bg-white/90 border border-purple-200/60 hover:border-purple-300 hover:bg-white hover:shadow-md transition-all duration-200 text-left group pointer-events-auto"
                        >
                          <p className="text-sm text-purple-700 group-hover:text-purple-900">{suggestion}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((message, index) => (
                      <div
                        key={message.id}
                        className={cn(
                          "flex",
                          message.isUser ? "justify-end" : "justify-start"
                        )}
                      >
                        <div className={cn(
                          "max-w-[85%] rounded-2xl p-4 pointer-events-auto",
                          message.isUser
                            ? "bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg"
                            : "bg-white border border-purple-300 text-gray-900 shadow-md"
                        )}>
                          <div className={cn(
                            "prose prose-sm max-w-none",
                            message.isUser ? "text-white [&>*]:text-white" : "text-purple-900"
                          )}>
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm, remarkMath]}
                              rehypePlugins={[rehypeKatex]}
                            >
                              {message.content}
                            </ReactMarkdown>
                          </div>
                          <div className={cn(
                            "text-xs mt-2 opacity-70",
                            message.isUser ? "text-white" : "text-purple-600"
                          )}>
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
                        <div className="max-w-[80%] p-4 rounded-2xl bg-white border border-purple-200">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }} />
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
              <div ref={messagesEndRef} />
            </ScrollArea>

            {/* Input Panel */}
            <div className="p-4 bg-white/70 backdrop-blur-xl border-t border-purple-200 pointer-events-auto">
              <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-2xl p-3 shadow-lg border-2 border-purple-300 backdrop-blur-md focus-within:ring-2 focus-within:ring-purple-500 transition-all">
                  {attachedFile && (
                    <div className="mb-3 p-2 bg-purple-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        {attachedFile.preview ? (
                          <img src={attachedFile.preview} alt={attachedFile.name} className="w-16 h-16 object-cover rounded" />
                        ) : (
                          <div className="w-16 h-16 flex items-center justify-center bg-purple-100 rounded">
                            <FileText className="w-8 h-8 text-purple-600" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate text-purple-900">{attachedFile.name}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setAttachedFile(null)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-end gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*,application/pdf,audio/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (e) => {
                            setAttachedFile({
                              name: file.name,
                              type: file.type,
                              data: e.target?.result as string,
                              preview: file.type.startsWith('image/') ? e.target?.result as string : undefined,
                            });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                      className="shrink-0 h-10 w-10 text-purple-600 hover:bg-purple-100"
                    >
                      <Paperclip className="w-5 h-5" />
                    </Button>

                    <div className="flex-1">
                      <Textarea
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        placeholder="Pergunte à Mia sobre pedagogia, planejamento de aulas..."
                        className="min-h-[40px] max-h-32 resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-2"
                        disabled={isLoading}
                      />
                    </div>

                    <div className="hidden sm:flex shrink-0">
                      <button
                        onClick={() => setIsDeepSearch(!isDeepSearch)}
                        className={cn(
                          "relative inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all duration-300 active:scale-95",
                          isDeepSearch 
                            ? 'bg-purple-500 text-white shadow-md hover:bg-purple-600' 
                            : 'bg-white border border-purple-300 text-purple-700 hover:bg-purple-50'
                        )}
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>{isDeepSearch ? "Busca Aprofundada" : "Busca Padrão"}</span>
                      </button>
                    </div>

                    <Button
                      onClick={handleSendMessage}
                      disabled={!inputMessage.trim() || isLoading}
                      size="icon"
                      className="shrink-0 h-10 w-10 bg-purple-600 hover:bg-purple-700 shadow-md hover:shadow-lg transition-all active:scale-95"
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
      </TeacherLayoutWrapper>

      {isDeepSearchLoading && (
        <MultiStepLoader
          loadingStates={deepSearchSteps}
          loading={isDeepSearchLoading}
          currentState={deepSearchProgress}
        />
      )}

      <QuizModal
        isOpen={isQuizModalOpen}
        onClose={() => {
          setIsQuizModalOpen(false);
          setSelectedQuizId(null);
        }}
        quizId={selectedQuizId}
      />

      <FlashcardModal
        isOpen={isFlashcardModalOpen}
        onClose={() => {
          setIsFlashcardModalOpen(false);
          setSelectedFlashcardSetId(null);
        }}
        flashcardSetId={selectedFlashcardSetId}
      />
    </MainLayout>
  );
};

export default TeacherAIChatPage;
