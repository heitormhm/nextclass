import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Mic, Paperclip, Plus, MessageCircle, X, FileText, Music, Trash2, Pin } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
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
  const [conversationContent, setConversationContent] = useState<{
    quizzes: any[];
    flashcards: any[];
    lessonPlans: any[];
  }>({ quizzes: [], flashcards: [], lessonPlans: [] });

  const deepSearchSteps = [
    { text: "A decompor a pergunta em tópicos pedagógicos..." },
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
        console.log('⚠️ Job already exists:', jobId, jobType);
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
    console.log('🆕 Creating new job:', tempId, jobType);
    
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
      console.log('✅ Job created successfully:', realJobId);
      
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

  const handleOpenQuiz = (quizId: string) => {
    console.log('🎯 Opening quiz:', quizId);
    
    const jobEntry = Array.from(activeJobs.entries()).find(
      ([_, job]) => job.type === 'GENERATE_QUIZ' && job.result?.includes(quizId)
    );
    
    if (jobEntry) {
      const [jobId] = jobEntry;
      console.log('🗑️ Removing quiz job:', jobId);
      
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
      
      processedJobsRef.current.delete(jobId);
    }
    
    navigate(`/quiz/${quizId}`);
  };

  const handleOpenFlashcards = (setId: string) => {
    console.log('📚 Opening flashcard set:', setId);
    
    const jobEntry = Array.from(activeJobs.entries()).find(
      ([_, job]) => job.type === 'GENERATE_FLASHCARDS' && job.result?.includes(setId)
    );
    
    if (jobEntry) {
      const [jobId] = jobEntry;
      console.log('🗑️ Removing flashcard job:', jobId);
      
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
      
      processedJobsRef.current.delete(jobId);
    }
    
    setSelectedFlashcardSetId(setId);
    setIsFlashcardModalOpen(true);
  };

  const handleSuggestionClick = async (suggestion: string) => {
    console.log(`🔍 Suggestion clicked: "${suggestion}"`);
    
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        content: suggestion,
        isUser: true,
        timestamp: new Date(),
      },
    ]);
    
    setIsLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Não autenticado');
      }
      
      const { data, error } = await supabase.functions.invoke('mia-teacher-chat', {
        body: {
          message: suggestion,
          isDeepSearch,
          conversationId: activeConversationId,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      if (error) throw error;
      
      if (isDeepSearch && data.jobId) {
        console.log("🔍 Deep Search job created:", data.jobId);
        setDeepSearchJobId(data.jobId);
        setDeepSearchProgress(0);
        setIsDeepSearchLoading(true);
        
        setActiveJobs(prev => new Map(prev).set(data.jobId, {
          status: 'PENDING',
          type: 'DEEP_SEARCH'
        }));
        
        toast({
          title: "Pesquisa Profunda Iniciada",
          description: "Acompanhe o progresso na interface.",
        });
      } else if (!isDeepSearch && data.response) {
        console.log("💬 Normal response received");
        const assistantMessage: Message = {
          id: `${activeConversationId}-${Date.now()}`,
          content: data.response,
          isUser: false,
          timestamp: new Date(),
          suggestionsJobId: data.suggestionsJobId || undefined,
        };
        setMessages(prev => [...prev, assistantMessage]);

        if (data.conversationId && !activeConversationId) {
          setActiveConversationId(data.conversationId);
          if (data.title) {
            setConversations(prev =>
              prev.map(conv =>
                conv.id === data.conversationId ? { ...conv, title: data.title } : conv
              )
            );
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erro",
        description: "Não foi possível processar a sugestão.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if ((!inputMessage.trim() && !attachedFile) || isLoading) return;

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
      if (!session) throw new Error('Não autenticado');

      let fileData = null;
      if (currentFile) {
        fileData = {
          name: currentFile.name,
          type: currentFile.type,
          data: currentFile.data,
        };
      }

      const { data, error } = await supabase.functions.invoke('mia-teacher-chat', {
        body: {
          message: currentMessage,
          fileData,
          isDeepSearch,
          conversationId,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (isDeepSearch && data.jobId) {
        console.log("🔍 Deep Search job created:", data.jobId);
        setDeepSearchJobId(data.jobId);
        setDeepSearchProgress(0);
        setIsDeepSearchLoading(true);

        setActiveJobs(prev => new Map(prev).set(data.jobId, {
          status: 'PENDING',
          type: 'DEEP_SEARCH'
        }));

        toast({
          title: "Pesquisa Profunda Iniciada",
          description: "Acompanhe o progresso na interface.",
        });
      } else if (!isDeepSearch && data.response) {
        const assistantMessage: Message = {
          id: `${conversationId}-${Date.now()}`,
          content: data.response,
          isUser: false,
          timestamp: new Date(),
          suggestionsJobId: data.suggestionsJobId || undefined,
        };
        setMessages(prev => [...prev, assistantMessage]);

        if (data.conversationId && !activeConversationId) {
          setActiveConversationId(data.conversationId);
          if (data.title) {
            setConversations(prev =>
              prev.map(conv =>
                conv.id === data.conversationId ? { ...conv, title: data.title } : conv
              )
            );
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a mensagem.",
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

  const handleVoiceToggle = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: "Recurso não disponível",
        description: "Seu navegador não suporta reconhecimento de voz.",
        variant: "destructive",
      });
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    } else {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        console.log('🎤 Reconhecimento de voz iniciado');
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result) => result.transcript)
          .join('');

        setInputMessage(transcript);

        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }

        silenceTimerRef.current = setTimeout(() => {
          recognition.stop();
        }, 2000);
      };

      recognition.onerror = (event: any) => {
        console.error('Erro no reconhecimento de voz:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        console.log('🎤 Reconhecimento de voz finalizado');
        setIsListening(false);
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    }
  };

  const handleFileAttachment = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O tamanho máximo é 20MB.",
        variant: "destructive",
      });
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Data = event.target?.result as string;
        const base64Content = base64Data.split(',')[1];

        let preview: string | undefined;
        if (file.type.startsWith('image/')) {
          preview = base64Data;
        }

        setAttachedFile({
          name: file.name,
          type: file.type,
          data: base64Content,
          preview,
        });

        toast({
          title: "Arquivo anexado",
          description: `${file.name} foi anexado com sucesso.`,
        });
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error reading file:', error);
      toast({
        title: "Erro",
        description: "Não foi possível anexar o arquivo.",
        variant: "destructive",
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachedFile = () => {
    setAttachedFile(null);
    toast({
      title: "Arquivo removido",
      description: "O arquivo foi removido.",
    });
  };

  const handleNewConversation = () => {
    setActiveConversationId(null);
    setMessages([]);
    setShowMobileHistory(false);
    setAttachedFile(null);
    setInputMessage("");
    setConversationContent({ quizzes: [], flashcards: [], lessonPlans: [] });
  };

  const handleSelectChat = async (conversationId: string) => {
    console.log('📂 Loading conversation:', conversationId);
    setActiveConversationId(conversationId);
    setShowMobileHistory(false);
    
    try {
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      const loadedMessages: Message[] = messagesData.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        isUser: msg.role === 'user',
        timestamp: new Date(msg.created_at),
        suggestionsJobId: msg.suggestions_job_id || undefined,
      }));

      setMessages(loadedMessages);
      
      const { data: quizzes } = await supabase
        .from('generated_quizzes')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false });

      const { data: flashcards } = await supabase
        .from('generated_flashcard_sets')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false });

      const { data: lessonPlans } = await supabase
        .from('lesson_plans')
        .select('*')
        .eq('teacher_id', (await supabase.auth.getUser()).data.user?.id)
        .order('created_at', { ascending: false });

      setConversationContent({
        quizzes: quizzes || [],
        flashcards: flashcards || [],
        lessonPlans: lessonPlans || []
      });

    } catch (error) {
      console.error('Error loading conversation:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a conversa.",
        variant: "destructive",
      });
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

      setConversations(prev => prev.filter(conv => conv.id !== conversationId));

      if (activeConversationId === conversationId) {
        handleNewConversation();
      }

      toast({
        title: "Conversa apagada",
        description: "A conversa foi removida com sucesso.",
      });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: "Erro",
        description: "Não foi possível apagar a conversa.",
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

      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, is_pinned: !currentPinState }
            : conv
        ).sort((a, b) => {
          if (a.is_pinned && !b.is_pinned) return -1;
          if (!a.is_pinned && b.is_pinned) return 1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        })
      );

      toast({
        title: currentPinState ? "Conversa desafixada" : "Conversa fixada",
        description: currentPinState 
          ? "A conversa foi desafixada." 
          : "A conversa foi fixada no topo.",
      });
    } catch (error) {
      console.error('Error toggling pin:', error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status da conversa.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    try {
      const { error } = await supabase
        .from('generated_quizzes')
        .delete()
        .eq('id', quizId);

      if (error) throw error;

      setConversationContent(prev => ({
        ...prev,
        quizzes: prev.quizzes.filter(q => q.id !== quizId)
      }));

      toast({
        title: "Quiz removido",
        description: "O quiz foi excluído com sucesso.",
      });
    } catch (error) {
      console.error('Error deleting quiz:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o quiz.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteFlashcards = async (setId: string) => {
    try {
      const { error } = await supabase
        .from('generated_flashcard_sets')
        .delete()
        .eq('id', setId);

      if (error) throw error;

      setConversationContent(prev => ({
        ...prev,
        flashcards: prev.flashcards.filter(f => f.id !== setId)
      }));

      toast({
        title: "Flashcards removidos",
        description: "O conjunto foi excluído com sucesso.",
      });
    } catch (error) {
      console.error('Error deleting flashcards:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir os flashcards.",
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

  const processJobUpdate = (job: any, conversationId: string) => {
    console.log('🔄 Processing job update:', job);
    
    if (processedJobsRef.current.has(job.id) && job.status !== 'COMPLETED') {
      console.log('⏭️ Skipping already processed job:', job.id);
      return;
    }

    processedJobsRef.current.add(job.id);

    setActiveJobs(prev => {
      const newJobs = new Map(prev);
      newJobs.set(job.id, {
        ...job,
        status: job.status,
        type: job.job_type,
        result: job.result,
        payload: job.input_payload
      });
      return newJobs;
    });

    if (job.job_type === 'DEEP_SEARCH') {
      const intermediateData = job.intermediate_data as any;
      const stepNumber = parseInt(intermediateData?.step || '0', 10);
      
      if (stepNumber > deepSearchProgress) {
        console.log(`📊 Progress update: ${deepSearchProgress} → ${stepNumber}`);
        setDeepSearchProgress(stepNumber);
      }

      if (job.status === 'COMPLETED' || intermediateData?.step === '4') {
        console.log('✅ Deep Search completed');
        setIsDeepSearchLoading(false);
        setDeepSearchJobId(null);
        setDeepSearchProgress(0);

        const reportMessage: Message = {
          id: `report-${Date.now()}`,
          content: job.result || 'Relatório concluído.',
          isUser: false,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, reportMessage]);

        setActiveJobs(prev => {
          const newJobs = new Map(prev);
          newJobs.delete(job.id);
          return newJobs;
        });
      }
    }
  };

  const handleDeepSearchCompletion = (job: any) => {
    console.log('✅ Deep Search completed via polling');
    setIsDeepSearchLoading(false);
    setDeepSearchJobId(null);
    setDeepSearchProgress(0);

    const reportMessage: Message = {
      id: `report-${Date.now()}`,
      content: job.result || 'Relatório concluído.',
      isUser: false,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, reportMessage]);

    setActiveJobs(prev => {
      const newJobs = new Map(prev);
      newJobs.delete(job.id);
      return newJobs;
    });
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (!activeConversationId) {
      console.log('❌ No active conversation, skipping job listener setup');
      return;
    }

    if (activeChannelRef.current) {
      console.log('⚠️ Channel already exists for conversation:', activeConversationId);
      return;
    }

    console.log('📡 Setting up job listener for conversation:', activeConversationId);
    activeChannelRef.current = activeConversationId;

    const channel = supabase
      .channel(`jobs-conversation-${activeConversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs',
          filter: `conversation_id=eq.${activeConversationId}`
        },
        (payload) => {
          console.log(`\n📬 REALTIME EVENT:`, JSON.stringify({
            timestamp: new Date().toISOString(),
            eventType: payload.eventType,
            new: payload.new,
          }, null, 2));
          
          const job = payload.new as any;
          
          if (job.job_type === 'DEEP_SEARCH') {
            console.log('⚡ Deep Search event - Processing immediately');
            processJobUpdate(job, activeConversationId);
            return;
          }
          
          if (realtimeDebounceTimer) {
            clearTimeout(realtimeDebounceTimer);
          }
          
          const timer = setTimeout(() => {
            processJobUpdate(job, activeConversationId);
          }, 500);
          
          setRealtimeDebounceTimer(timer);
        }
      )
      .subscribe((status) => {
        console.log('📡 Channel subscription status:', status);
      });
    
    return () => {
      console.log('🔌 Cleaning up job listener for conversation:', activeConversationId);
      supabase.removeChannel(channel);
      activeChannelRef.current = null;
    };
  }, [activeConversationId]);

  useEffect(() => {
    if (!deepSearchJobId || !isDeepSearchLoading) {
      return;
    }
    
    console.log('🔄 Starting polling fallback for Deep Search job:', deepSearchJobId);
    
    const pollInterval = setInterval(async () => {
      console.log('🔍 Polling job status...');
      
      const { data: job, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', deepSearchJobId)
        .single();
      
      if (error || !job) {
        console.error('❌ Error polling job:', error);
        return;
      }
      
      const intermediateData = job.intermediate_data as any;
      
      console.log('📊 Polling result:', {
        status: job.status,
        step: intermediateData?.step,
      });
      
      const stepNumber = parseInt(intermediateData?.step || '0', 10);
      if (stepNumber > deepSearchProgress) {
        console.log(`📊 POLLING: Progress update: ${deepSearchProgress} → ${stepNumber}`);
        setDeepSearchProgress(stepNumber);
      }
      
      if (job.status === 'COMPLETED' || intermediateData?.step === '4') {
        console.log('✅ POLLING: Job completed');
        handleDeepSearchCompletion(job);
        clearInterval(pollInterval);
      }
    }, 2000);
    
    return () => {
      console.log('🛑 Stopping polling fallback');
      clearInterval(pollInterval);
    };
  }, [deepSearchJobId, isDeepSearchLoading, deepSearchProgress]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <MainLayout>
      <TeacherLayoutWrapper className="h-full flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 sm:p-6 border-b border-purple-200/40 bg-white/90 backdrop-blur-xl">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shrink-0">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-800 truncate">
                  Chat com Mia - Assistente Pedagógica
                </h1>
                <p className="text-xs sm:text-sm text-purple-600 hidden sm:block">
                  Geração de planos de aula, slides e atividades avaliativas
                </p>
              </div>
            </div>
            
            {!showMobileHistory && (
              <Button 
                variant="outline" 
                size="sm"
                className="md:hidden shrink-0 ml-2 border-purple-300 text-purple-600"
                onClick={() => setShowMobileHistory(true)}
              >
                <MessageCircle className="w-4 h-4" />
              </Button>
            )}
        </div>

        {/* Container Principal com Sidebar + Chat */}
        <div className="flex-1 flex overflow-hidden relative">
            {/* Sidebar */}
            <div className={cn(
              "border-r border-purple-200/40 bg-white/90 backdrop-blur-xl transition-transform duration-300 ease-in-out",
              showMobileHistory 
                ? "fixed inset-y-0 left-0 z-50 w-full bg-white transform translate-x-0 md:relative md:w-80 lg:w-96" 
                : "hidden md:block md:w-80 lg:w-96"
            )}>
              <div className="p-4 space-y-4 h-full flex flex-col">
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
                
                <Button 
                  onClick={handleNewConversation}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Conversa
                </Button>

                {(conversationContent.quizzes.length > 0 || conversationContent.flashcards.length > 0 || conversationContent.lessonPlans.length > 0) && (
                  <div className="pb-4 border-b border-purple-200/40">
                    <h3 className="text-sm font-semibold text-purple-600 px-2 mb-3">
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

                <div className="flex-1 space-y-2 overflow-y-auto">
                  <h3 className="text-sm font-medium text-purple-600 px-2">Conversas Recentes</h3>
                  
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
                            "group relative w-full text-left p-3 rounded-lg transition-all duration-200 hover:bg-purple-50 cursor-pointer",
                            activeConversationId === conversation.id
                              ? 'bg-purple-100 border border-purple-300 text-purple-800'
                              : 'text-gray-700 hover:text-purple-800'
                          )}
                          onClick={() => handleSelectChat(conversation.id)}
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
                                onClick={(e) => handleTogglePin(conversation.id, conversation.is_pinned, e)}
                                className="p-1 hover:bg-purple-100 rounded transition-colors"
                                title={conversation.is_pinned ? "Desafixar" : "Fixar"}
                              >
                                <Pin className={cn(
                                  "w-3.5 h-3.5",
                                  conversation.is_pinned ? "text-purple-600 fill-purple-600" : "text-gray-400"
                                )} />
                              </button>
                              <button
                                onClick={(e) => handleDeleteConversation(conversation.id, e)}
                                className="p-1 hover:bg-red-50 rounded transition-colors"
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

            {/* Chat Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <ScrollArea className="flex-1">
                <div className="h-full overflow-y-auto">
                <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[60vh]">
                      <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                        <Sparkles className="w-10 h-10 text-white" />
                      </div>
                      <h2 className="text-2xl font-bold text-purple-800 mb-2">
                        Olá! Sou a Mia, sua assistente pedagógica
                      </h2>
                      <p className="text-purple-600 text-center max-w-md">
                        Como posso ajudá-lo com planos de aula, slides ou atividades avaliativas hoje?
                      </p>
                    </div>
                  ) : (
                    <>
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={cn(
                              "max-w-[85%] p-5 rounded-xl",
                              message.isUser
                                ? "bg-purple-600 text-white"
                                : "bg-white/90 text-gray-800 border border-purple-200"
                            )}
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
                                  <div className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg mb-2">
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
                            
                            {message.isUser ? (
                              <div className="whitespace-pre-wrap text-sm leading-relaxed text-white">
                                {message.content}
                              </div>
                            ) : (
                              <div className="text-sm leading-relaxed">
                                <ReactMarkdown 
                                  remarkPlugins={[remarkGfm, remarkMath]}
                                  rehypePlugins={[rehypeKatex]}
                                  components={{
                                    h2: ({node, ...props}) => <h2 className="text-lg font-bold mt-4 mb-2 text-gray-800" {...props} />,
                                    h3: ({node, ...props}) => <h3 className="text-base font-semibold mt-3 mb-2 text-gray-800" {...props} />,
                                    p: ({node, ...props}) => <p className="mb-2 text-gray-700" {...props} />,
                                    strong: ({node, ...props}) => <strong className="font-bold text-gray-800" {...props} />,
                                    ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-2 space-y-1" {...props} />,
                                    ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-2 space-y-1" {...props} />,
                                    li: ({node, ...props}) => <li className="text-gray-700" {...props} />,
                                  }}
                                >
                                  {message.content}
                                </ReactMarkdown>
                              </div>
                            )}

                            {!message.isUser && message.content.length > 100 && (
                              <ActionButtons 
                                messageContent={message.content}
                                topic={conversations.find(c => c.id === activeConversationId)?.title || ""}
                                onAction={handleAction}
                                activeJobs={activeJobs}
                                disabled={message.jobIds && message.jobIds.length > 0}
                                messageJobIds={message.jobIds}
                              />
                            )}

                            {!message.isUser && message.jobIds?.map(jobId => {
                              const job = activeJobs.get(jobId);
                              return job ? (
                                <JobStatus
                                  key={jobId}
                                  job={job}
                                  conversationTitle={conversations.find(c => c.id === activeConversationId)?.title}
                                  onOpenQuiz={handleOpenQuiz}
                                  onOpenFlashcards={handleOpenFlashcards}
                                />
                              ) : null;
                            })}

                            {!message.isUser && message.suggestionsJobId && (
                              <SuggestionsButtons
                                suggestionsJobId={message.suggestionsJobId}
                                activeJobs={activeJobs}
                                onSuggestionClick={handleSuggestionClick}
                              />
                            )}

                            <div className={cn(
                              "text-xs mt-2 opacity-70",
                              message.isUser ? "text-white" : "text-gray-500"
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
                          <div className="max-w-[85%] p-5 rounded-xl bg-white/90 border border-purple-200">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{animationDelay: "0.2s"}} />
                              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{animationDelay: "0.4s"}} />
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  <div ref={messagesEndRef} />
                </div>
                </div>
              </ScrollArea>

              {/* Input Panel */}
              <div className="flex-shrink-0 border-t border-purple-200/40 bg-white/95 backdrop-blur-xl shadow-lg">
                <div className="max-w-4xl mx-auto px-4 py-3">
                  <div className="bg-white rounded-2xl p-3 shadow-lg border-2 border-purple-300">
                    {attachedFile && (
                      <div className="mb-3 p-2 bg-purple-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          {attachedFile.preview ? (
                            <img src={attachedFile.preview} className="w-16 h-16 rounded object-cover" alt="Preview" />
                          ) : (
                            <div className="w-16 h-16 flex items-center justify-center bg-purple-100 rounded">
                              <FileText className="w-8 h-8 text-purple-600" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{attachedFile.name}</p>
                            <p className="text-xs text-gray-500">{(attachedFile.data.length / 1024).toFixed(1)} KB</p>
                          </div>
                          <Button onClick={removeAttachedFile} variant="ghost" size="icon" className="shrink-0">
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-end gap-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleVoiceToggle}
                        className={cn(
                          "shrink-0",
                          isListening && "text-purple-600"
                        )}
                      >
                        <Mic className={cn(isListening && "animate-pulse")} />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleFileAttachment}
                        className="shrink-0"
                      >
                        <Paperclip />
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleFileChange}
                        accept="image/*,application/pdf,audio/*"
                      />
                      
                      <div className="flex-1">
                        <Textarea
                          value={inputMessage}
                          onChange={(e) => setInputMessage(e.target.value)}
                          onKeyDown={handleKeyPress}
                          placeholder="Pergunte à Mia sobre pedagogia, planejamento de aulas..."
                          className="min-h-[40px] max-h-[120px] border-0 bg-transparent focus-visible:ring-0 resize-none"
                          disabled={isLoading}
                        />
                      </div>
                      
                      <Button
                        onClick={() => setIsDeepSearch(!isDeepSearch)}
                        className={cn(
                          "hidden sm:flex shrink-0 px-4 py-2 rounded-xl transition-all",
                          isDeepSearch
                            ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        )}
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        {isDeepSearch ? "Busca Aprofundada" : "Busca Padrão"}
                      </Button>
                      
                      <Button
                        onClick={handleSendMessage}
                        disabled={(!inputMessage.trim() && !attachedFile) || isLoading}
                        size="icon"
                        className="shrink-0 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300"
                      >
                        <Send />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        <MultiStepLoader
          loadingStates={deepSearchSteps}
          loading={isDeepSearchLoading}
          currentState={deepSearchProgress}
        />

        <QuizModal
          open={isQuizModalOpen}
          onOpenChange={(open) => setIsQuizModalOpen(open)}
          quizId={selectedQuizId}
        />

        <FlashcardModal
          open={isFlashcardModalOpen}
          onOpenChange={(open) => setIsFlashcardModalOpen(open)}
          flashcardSetId={selectedFlashcardSetId}
        />
      </TeacherLayoutWrapper>
    </MainLayout>
  );
};

export default TeacherAIChatPage;
