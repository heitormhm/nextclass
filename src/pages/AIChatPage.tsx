import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Mic, Paperclip, Plus, MessageCircle, X, FileText, Image as ImageIcon, Music, FileDown, Trash2, Pin } from "lucide-react";
import 'katex/dist/katex.min.css';
import { useNavigate } from "react-router-dom";
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
import { GeneratedContentCard } from "@/components/GeneratedContentCard";
import { SuggestionsButtons } from "@/components/SuggestionsButtons";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

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


const AIChatPage = () => {
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
  const [isCreatingDeepSearch, setIsCreatingDeepSearch] = useState(false);  // ✅ NOVO: Prevenir múltiplas invocações

  const deepSearchSteps = [
    { text: "A decompor a pergunta em tópicos..." },
    { text: "A executar buscas na web..." },
    { text: "Pesquisa concluída, a preparar relatório..." },
    { text: "A gerar relatório final..." },
    { text: "Concluído" },
  ];

  // ✅ Verificar se já existe job do mesmo tipo para o mesmo contexto
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
    // ✅ PASSO 1: Verificar duplicação
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
    
    // ✅ PASSO 2: Adicionar job temporário ao state
    setActiveJobs(prev => {
      const newJobs = new Map(prev);
      newJobs.set(tempId, { 
        status: 'PENDING', 
        type: jobType,
        payload: payload
      });
      return newJobs;
    });
    
    // ✅ PASSO 3: Vincular tempId à última mensagem do assistente
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
    
    // ✅ PASSO 4: Invocar edge function
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
      console.log('✅ Job created successfully:', realJobId);
      
      // ✅ PASSO 5: Substituir tempId pelo jobId real
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
      
      // ✅ PASSO 6: Atualizar jobIds na mensagem
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
      
      // ✅ ADICIONAR ao processedJobsRef imediatamente
      processedJobsRef.current.add(realJobId);
      
      toast({
        title: "Processando",
        description: "Sua solicitação foi iniciada!"
      });
    } catch (error) {
      console.error(`Erro ao iniciar ${jobType}:`, error);
      
      // ✅ PASSO 7: Cleanup em caso de erro
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
    
    navigate(`/quiz/${quizId}`, {
      state: {
        fromChat: true,
        conversationId: activeConversationId
      }
    });
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

  // Handler para clicar em uma sugestão
  const handleSuggestionClick = async (suggestion: string) => {
    console.log(`🔍 Suggestion clicked: "${suggestion}" | Mode: ${isDeepSearch ? 'Deep Search' : 'Normal Search'}`);
    
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
    
    setIsLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Não autenticado');
      }
      
      const { data, error } = await supabase.functions.invoke('mia-student-chat', {
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
        // Deep Search mode: track job
        console.log("🔍 Deep Search job created:", data.jobId);
        setDeepSearchJobId(data.jobId);
        setDeepSearchProgress(0);
        setIsDeepSearchLoading(true);
        
        // Adicionar ao activeJobs para tracking
        setActiveJobs(prev => new Map(prev).set(data.jobId, {
          status: 'PENDING',
          type: 'DEEP_SEARCH'
        }));
        
        toast({
          title: "Pesquisa Profunda Iniciada",
          description: "Acompanhe o progresso na interface.",
        });
      } else if (!isDeepSearch && data.response) {
        // Normal Search mode: add response directly to chat
        console.log("💬 Normal response received");
        const assistantMessage: Message = {
          id: `${activeConversationId}-${Date.now()}`,
          content: data.response,
          isUser: false,
          timestamp: new Date(),
          suggestionsJobId: data.suggestionsJobId || undefined,
        };
        setMessages(prev => [...prev, assistantMessage]);

        // Validação de formatação (logging apenas)
        if (data.response.length > 500) {
          const hasMarkdownHeaders = /^#{2,3}\s/m.test(data.response);
          const hasReferences = /## Referências/i.test(data.response);
          console.log('📊 Análise de formatação:', {
            comprimento: data.response.length,
            temCabeçalhos: hasMarkdownHeaders,
            temReferências: hasReferences,
          });
        }

        // Update conversation ID if this was the first message
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
      console.error('Error starting deep search from suggestion:', error);
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

    // 🔒 Criar conversa automaticamente se não existir
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

        // Criar nova conversa com título baseado na mensagem
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
        
        // Recarregar lista de conversas
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
      
      // Handle deep search response
      if (isDeepSearch && functionData.jobId) {
        console.log(`\n🟢 JOB-CREATION [Deep Search]:`, JSON.stringify({
          timestamp: new Date().toISOString(),
          jobId: functionData.jobId,
          conversationId: conversationId,
          query: currentMessage,
          isDeepSearch: true
        }, null, 2));
        // ✅ PREVENIR MÚLTIPLAS CRIAÇÕES
        if (isCreatingDeepSearch) {
          console.warn('⚠️ Deep search already in progress, ignoring duplicate request');
          return;
        }
        
        setIsCreatingDeepSearch(true);
        
        setDeepSearchJobId(functionData.jobId);
        setIsDeepSearchLoading(true);
        setDeepSearchProgress(0);
        
        // ✅ TIMEOUT DE SEGURANÇA: Fechar modal após 3 minutos
        const timeout = setTimeout(() => {
          console.warn('⏰ Deep search timeout reached (3 min), forcing modal close');
          setIsDeepSearchLoading(false);
          
          toast({
            title: "Tempo Limite Atingido",
            description: "A pesquisa profunda demorou mais do que esperado. Recarregue a página para ver os resultados.",
            variant: "destructive",
            duration: 5000,
          });
          
          // Forçar reload de mensagens
          loadConversations();
        }, 180000); // 3 minutos
        
        setDeepSearchTimeoutId(timeout);
        console.log('⏱️ Deep search timeout started (3 min)');
        
        const assistantMessage: Message = {
          id: `${activeConversationId}-${Date.now()}`,
          content: functionData.response,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
        
        // ✅ Limpar flag após 5 segundos
        setTimeout(() => {
          setIsCreatingDeepSearch(false);
        }, 5000);
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

  const loadConversationContent = async (conversationId: string) => {
    try {
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
      
      setConversationContent({
        quizzes: quizzes || [],
        flashcards: flashcards || []
      });
    } catch (error) {
      console.error('Error loading conversation content:', error);
    }
  };

  const handleSelectChat = async (conversationId: string) => {
    console.log('🔄 Switching conversation, cleaning up previous state');
    
    // 🔒 LIMPEZA TOTAL: Remover todos os jobs da conversa anterior
    setActiveJobs(new Map());
    processedJobsRef.current.clear();
    
    console.log('✅ State cleaned, loading new conversation:', conversationId);
    
    try {
      // Load messages for this conversation
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*, suggestions_job_id')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // ✅ Usar metadata.isReport para identificar relatórios
      const loadedMessages: Message[] = messagesData.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        isUser: msg.role === 'user',
        timestamp: new Date(msg.created_at),
        isReport: msg.metadata?.isReport || false,
        reportTitle: msg.metadata?.reportTitle || undefined,
        suggestionsJobId: msg.suggestions_job_id || undefined,
      }));

      // Carregar TODOS os jobs de sugestões desta conversa
      const { data: suggestionJobsData } = await supabase
        .from('jobs')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('job_type', 'GENERATE_SUGGESTIONS')
        .eq('status', 'COMPLETED');

      // Atualizar activeJobs com todos os jobs encontrados
      if (suggestionJobsData && suggestionJobsData.length > 0) {
        setActiveJobs(prevJobs => {
          const newJobs = new Map(prevJobs);
          suggestionJobsData.forEach(job => {
            newJobs.set(job.id, {
              status: 'COMPLETED',
              type: 'GENERATE_SUGGESTIONS',
              result: job.result,
              payload: job.input_payload
            });
          });
          return newJobs;
        });
        console.log('✅ Loaded', suggestionJobsData.length, 'suggestion jobs');
      }

      // As mensagens já têm suggestionsJobId carregado do banco de dados
      setMessages(loadedMessages);
      setActiveConversationId(conversationId);
      setShowMobileHistory(false);
      loadConversationContent(conversationId);
    } catch (error) {
      console.error('Error loading conversation:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar conversa",
        variant: "destructive",
      });
    }
  };

  // 🆕 Função para deletar quiz
  const handleDeleteQuiz = async (quizId: string) => {
    try {
      console.log('🗑️ Deleting quiz:', quizId);
      
      const { error } = await supabase
        .from('generated_quizzes')
        .delete()
        .eq('id', quizId);
      
      if (error) throw error;
      
      // Atualizar estado local
      setConversationContent(prev => ({
        ...prev,
        quizzes: prev.quizzes.filter(q => q.id !== quizId)
      }));
      
      toast({
        title: "Quiz excluído",
        description: "O quiz foi removido com sucesso.",
      });
    } catch (error) {
      console.error('Error deleting quiz:', error);
      toast({
        title: "Erro",
        description: "Falha ao excluir quiz",
        variant: "destructive",
      });
    }
  };

  // 🆕 Função para deletar flashcards
  const handleDeleteFlashcards = async (setId: string) => {
    try {
      console.log('🗑️ Deleting flashcard set:', setId);
      
      const { error } = await supabase
        .from('generated_flashcard_sets')
        .delete()
        .eq('id', setId);
      
      if (error) throw error;
      
      // Atualizar estado local
      setConversationContent(prev => ({
        ...prev,
        flashcards: prev.flashcards.filter(f => f.id !== setId)
      }));
      
      toast({
        title: "Flashcards excluídos",
        description: "O conjunto de flashcards foi removido com sucesso.",
      });
    } catch (error) {
      console.error('Error deleting flashcards:', error);
      toast({
        title: "Erro",
        description: "Falha ao excluir flashcards",
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

  // ============= HELPER FUNCTIONS FOR JOB PROCESSING =============
  
  const processJobUpdate = async (job: any, currentConversationId: string | null) => {
    console.log('📬 Processing job update:', {
      id: job.id,
      status: job.status,
      type: job.job_type,
      conversationId: job.conversation_id
    });
    
    // ✅ VERIFICAÇÃO 1: Job pertence a esta conversa?
    if (job.conversation_id !== currentConversationId) {
      console.log('⏭️ Job from different conversation, skipping');
      return;
    }
    
    // ✅ VERIFICAÇÃO 2: Mudança real no estado?
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
      
      // Se status E result são IDÊNTICOS, ignorar
      if (currentJob.status === job.status && currentJob.result === job.result) {
        console.log('⏭️ No real changes, skipping update');
        return prev;
      }
      
      console.log('✏️ Updating job state:', job.id, job.status);
      
      // ✅ DEEP SEARCH: Atualizar progresso visual
      if (job.job_type === 'DEEP_SEARCH') {
        handleDeepSearchProgress(job);
      }
      
      const newJobs = new Map(prev);
      newJobs.set(job.id, {
        ...currentJob,
        status: job.status,
        result: job.result
      });
      return newJobs;
    });
    
    // ✅ Marcar como processado se COMPLETED ou FAILED
    if (job.status === 'COMPLETED' || job.status === 'FAILED') {
      if (processedJobsRef.current.has(job.id)) {
        console.log('⏭️ Job already processed, skipping:', job.id);
        return;
      }
      processedJobsRef.current.add(job.id);
      console.log(`✅ Job marked as processed:`, job.id);
    }
    
    // ✅ DEEP SEARCH: Fechar modal e recarregar dados
    if (job.job_type === 'DEEP_SEARCH' && 
        (job.status === 'COMPLETED' || job.intermediate_data?.step === '4')) {
      handleDeepSearchCompletion(job);
    }
    
    // ✅ Processar outros tipos de jobs
    if (job.status === 'COMPLETED') {
      if (job.job_type === 'GENERATE_SUGGESTIONS') {
        console.log('💡 Suggestions completed, reloading messages');
        
        // Aguardar um pouco para garantir que a mensagem foi inserida
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Recarregar mensagens para mostrar nova mensagem de sugestões
        if (activeConversationId) {
          const { data: messagesData } = await supabase
            .from('messages')
            .select('*, suggestions_job_id')
            .eq('conversation_id', activeConversationId)
            .order('created_at', { ascending: true });
          
          if (messagesData) {
            const loadedMessages: Message[] = messagesData.map((msg: any) => ({
              id: msg.id,
              content: msg.content,
              isUser: msg.role === 'user',
              timestamp: new Date(msg.created_at),
              isReport: msg.metadata?.isReport || false,
              reportTitle: msg.metadata?.reportTitle || undefined,
              suggestionsJobId: msg.suggestions_job_id || undefined,
            }));
            
            setMessages(loadedMessages);
            console.log('✅ Messages reloaded after suggestions:', loadedMessages.length);
            
            // Scroll para o final para mostrar a nova mensagem
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }
        }
      }
      
      // ✅ Auto-navegação para quiz
      if (job.job_type === 'GENERATE_QUIZ') {
        try {
          const result = JSON.parse(job.result);
          if (result.quizId) {
            toast({
              title: "Quiz Pronto!",
              description: `${result.title} criado com ${result.questionCount} perguntas. Redirecionando...`,
              duration: 2000,
            });
            
            setTimeout(() => {
              console.log('🎯 Auto-navigating to quiz:', result.quizId);
              navigate(`/quiz/${result.quizId}`, {
                state: {
                  fromChat: true,
                  conversationId: currentConversationId
                }
              });
            }, 1500);
          }
        } catch (e) {
          console.error('Error parsing quiz result:', e);
        }
      }
      
      // ✅ Auto-navegação para flashcards
      if (job.job_type === 'GENERATE_FLASHCARDS') {
        try {
          const result = JSON.parse(job.result);
          if (result.setId) {
            toast({
              title: "Flashcards Prontos!",
              description: `${result.title} criado com ${result.cardCount} cards. Redirecionando...`,
              duration: 2000,
            });
            
            setTimeout(() => {
              console.log('📚 Auto-navigating to flashcards:', result.setId);
              navigate(`/flashcards/${result.setId}`, {
                state: {
                  fromChat: true,
                  conversationId: currentConversationId
                }
              });
            }, 1500);
          }
        } catch (e) {
          console.error('Error parsing flashcard result:', e);
        }
      }
    }
    
    // ✅ Extrair e trackear suggestionsJobId para Deep Search
    if (job.job_type === 'DEEP_SEARCH') {
      const suggestionsJobId = job.intermediate_data?.suggestionsJobId;
      
      if (suggestionsJobId) {
        supabase
          .from('jobs')
          .select('*')
          .eq('id', suggestionsJobId)
          .maybeSingle()
          .then(({ data: suggestionJob }) => {
            if (suggestionJob) {
              setActiveJobs(prev => {
                const newJobs = new Map(prev);
                newJobs.set(suggestionsJobId, {
                  status: suggestionJob.status,
                  type: suggestionJob.job_type,
                  result: suggestionJob.result,
                  payload: suggestionJob.input_payload
                });
                return newJobs;
              });
            }
          });
      }
    }
    
    // ✅ CLEANUP: Remove jobs completados após delay (EXCETO sugestões)
    if (job.status === 'COMPLETED' && job.job_type !== 'GENERATE_SUGGESTIONS') {
      setTimeout(() => {
        console.log('🗑️ Cleaning up completed job:', job.id);
        setActiveJobs(prev => {
          const newJobs = new Map(prev);
          newJobs.delete(job.id);
          return newJobs;
        });
      }, 10000);
    }
    
    // 🔒 Jobs de sugestões NUNCA são removidos automaticamente
    if (job.job_type === 'GENERATE_SUGGESTIONS') {
      console.log('📌 Suggestions job will persist indefinitely:', job.id);
    }
  };
  
  const handleDeepSearchProgress = (job: any) => {
    console.log('🔍 [Deep Search] Realtime update received:', {
      jobId: job.id,
      status: job.status,
      step: job.intermediate_data?.step,
      researchingCompleted: job.intermediate_data?.researchingCompleted
    });
    
    const stepNumber = parseInt(job.intermediate_data?.step || '0', 10);
    
    if (stepNumber > 0) {
      console.log(`📊 PROGRESS-UPDATE: Setting progress to ${stepNumber}`);
      setDeepSearchProgress(stepNumber);
    } else {
      // Fallback: mapear status diretamente
      const statusToProgress: Record<string, number> = {
        'PENDING': 0,
        'DECOMPOSING': 1,
        'RESEARCHING': 2,
        'COMPLETED': 4
      };
      const progress = statusToProgress[job.status] || 0;
      console.log(`📊 PROGRESS-UPDATE-FALLBACK: Setting progress to ${progress} (from status)`);
      setDeepSearchProgress(progress);
    }
  };
  
  const handleDeepSearchCompletion = (job: any) => {
    console.log(`\n🎯 MODAL-CLOSING [Deep Search]:`, JSON.stringify({
      timestamp: new Date().toISOString(),
      jobId: job.id,
      trigger: job.status === 'COMPLETED' ? 'status:COMPLETED' : 'step:4',
      finalState: {
        status: job.status,
        step: job.intermediate_data?.step,
        researchingCompleted: job.intermediate_data?.researchingCompleted
      }
    }, null, 2));
    
    // Cancelar timeout de segurança
    if (deepSearchTimeoutId) {
      clearTimeout(deepSearchTimeoutId);
      setDeepSearchTimeoutId(null);
      console.log('⏱️ Deep search timeout cancelled');
    }
    
    setIsDeepSearchLoading(false);
    setDeepSearchProgress(4);
    
    setTimeout(() => {
      setDeepSearchProgress(0);
    }, 2000);
    
    console.log('🔍 Step 2: Reloading conversations');
    loadConversations();
    
    if (!activeConversationId) {
      console.warn('🔍 No active conversation, skipping message reload');
      return;
    }
    
    console.log('🔍 Step 3: Fetching messages');
    (async () => {
      try {
        const { data: messagesData, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', activeConversationId)
          .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        console.log('✅ Messages reloaded:', messagesData?.length);
        const loadedMessages: Message[] = messagesData?.map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          isUser: msg.role === 'user',
          timestamp: new Date(msg.created_at),
          isReport: msg.metadata?.isReport || false,
          reportTitle: msg.metadata?.reportTitle || undefined,
          suggestionsJobId: job.intermediate_data?.suggestionsJobId,
        })) || [];
        
        setMessages(loadedMessages);
      } catch (error) {
        console.error('❌ Error reloading messages:', error);
      }
    })();
  };

  // ============= END HELPER FUNCTIONS =============

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

  // Subscribe to job updates
  useEffect(() => {
    if (!activeConversationId) {
      return;
    }

    // ✅ Se já existe um listener para esta conversa, não cria outro
    if (activeChannelRef.current === activeConversationId) {
      console.log('⏭️ Listener already active for this conversation, skipping');
      return;
    }

    console.log('📡 Setting up job listener for conversation:', activeConversationId);
    console.log(`\n📡 REALTIME-SETUP [Deep Search]:`, JSON.stringify({
      timestamp: new Date().toISOString(),
      channelName: `jobs-conversation-${activeConversationId}`,
      activeConversationId: activeConversationId,
      filter: `conversation_id=eq.${activeConversationId}`
    }, null, 2));
    activeChannelRef.current = activeConversationId;

    // ✅ Limpar apenas jobs de outras conversas do processedJobsRef
    const jobsToKeep = new Set<string>();
    activeJobs.forEach((job, jobId) => {
      if (job.payload?.conversationId === activeConversationId) {
        jobsToKeep.add(jobId);
      }
    });
    processedJobsRef.current = jobsToKeep;
    console.log(`📌 Kept ${jobsToKeep.size} jobs from current conversation`);

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
          // 🚨 LOG CRUS DO PAYLOAD - ABSOLUTAMENTE PRIMEIRO
          console.log(`\n📬 RAW-REALTIME-EVENT:`, JSON.stringify({
            timestamp: new Date().toISOString(),
            eventType: payload.eventType,
            table: payload.table,
            schema: payload.schema,
            new: payload.new,
            old: payload.old
          }, null, 2));
          
          const job = payload.new as any;
          
          // ✅ NOVA LÓGICA: Deep Search processa IMEDIATAMENTE, sem debounce
          if (job.job_type === 'DEEP_SEARCH') {
            console.log('⚡ Deep Search event - Processing IMMEDIATELY (no debounce)');
            processJobUpdate(job, activeConversationId);
            return; // Sair sem debounce
          }
          
          // ✅ Outros jobs continuam com debounce
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
    
    // ✅ LIMPEZA RIGOROSA
    return () => {
      console.log('🔌 Cleaning up job listener for conversation:', activeConversationId);
      supabase.removeChannel(channel);
      activeChannelRef.current = null;
    };
  }, [activeConversationId]);

  // ✅ FALLBACK: Polling para verificar job completion se Realtime falhar
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
      
      if (error) {
        console.error('❌ Error polling job:', error);
        return;
      }
      
      if (!job) {
        console.warn('⚠️ Job not found during polling');
        return;
      }
      
      const intermediateData = job.intermediate_data as any;
      
      console.log('📊 Polling result:', {
        status: job.status,
        step: intermediateData?.step,
        researchingCompleted: intermediateData?.researchingCompleted
      });
      
      // Atualizar progresso se mudou
      const stepNumber = parseInt(intermediateData?.step || '0', 10);
      if (stepNumber > deepSearchProgress) {
        console.log(`📊 POLLING: Progress update detected: ${deepSearchProgress} → ${stepNumber}`);
        setDeepSearchProgress(stepNumber);
      }
      
      // Se completou, fechar modal
      if (job.status === 'COMPLETED' || intermediateData?.step === '4') {
        console.log('✅ POLLING: Job completed, triggering completion handler');
        handleDeepSearchCompletion(job);
        clearInterval(pollInterval);
      }
    }, 2000); // Verificar a cada 2 segundos
    
    return () => {
      console.log('🛑 Stopping polling fallback');
      clearInterval(pollInterval);
    };
  }, [deepSearchJobId, isDeepSearchLoading, deepSearchProgress]);

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

              {/* Conteúdo Gerado na Conversa */}
              {(conversationContent.quizzes.length > 0 || conversationContent.flashcards.length > 0) && (
                <div className="pb-4 border-b border-border">
                  <h3 className="text-sm font-semibold text-foreground-muted px-2 mb-3">
                    📚 Conteúdo Gerado
                  </h3>
                  <div className="space-y-2">
                    {conversationContent.quizzes
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .map((quiz) => {
                        // Extrair tópico principal do título
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
                        // Extrair tópico principal do título
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

              {/* Chat History List */}
              <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar">
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
                          className={`max-w-[85%] p-5 rounded-xl ${
                            message.isUser
                              ? "bg-primary text-white"
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

                  {message.isUser ? (
                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-white">
                      {message.content}
                    </div>
                  ) : (
                    <div className="text-sm leading-relaxed max-h-96 overflow-y-auto max-w-none">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                        h2: ({node, ...props}) => <h2 className="text-lg font-bold mt-4 mb-2 text-foreground" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-base font-semibold mt-3 mb-2 text-foreground" {...props} />,
                        p: ({node, ...props}) => <p className="mb-2 text-foreground" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-bold text-foreground" {...props} />,
                        div: ({node, className, ...props}: any) => {
                          if (className === 'math math-display') {
                            return <div className="my-4 overflow-x-auto text-center" {...props} />;
                          }
                          return <div className={className} {...props} />;
                        },
                        span: ({node, className, ...props}: any) => {
                          if (className === 'math math-inline') {
                            return <span className="mx-1" {...props} />;
                          }
                          return <span className={className} {...props} />;
                        },
                        code: ({node, inline, ...props}: any) => 
                          inline 
                            ? <code className="bg-background/50 px-1.5 py-0.5 rounded text-xs font-mono text-primary" {...props} />
                            : <code className="block bg-background/50 p-3 rounded text-xs font-mono overflow-x-auto my-2 text-foreground" {...props} />,
                        pre: ({node, ...props}) => <pre className="bg-background/50 p-3 rounded overflow-x-auto my-2" {...props} />,
                        a: ({node, ...props}) => <a className="text-primary underline hover:text-primary/80 transition-colors" target="_blank" rel="noopener noreferrer" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc list-outside ml-6 space-y-1 my-2 text-foreground" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal list-outside ml-6 space-y-1 my-2 text-foreground" {...props} />,
                        li: ({node, ...props}) => <li className="text-foreground pl-1" {...props} />,
                        blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-primary/50 pl-4 italic my-2 text-foreground/80" {...props} />,
                        sup: ({node, ...props}) => <sup className="text-primary font-semibold" {...props} />,
                      }}
                    >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  )}

                          {/* Add action buttons for Mia's responses */}
                      {!message.isUser && message.content.length > 100 && (
                        <ActionButtons
                          messageContent={message.content}
                          topic={message.content.split('\n')[0].substring(0, 50)}
                          onAction={handleAction}
                          disabled={isLoading}
                          activeJobs={activeJobs}
                          messageJobIds={message.jobIds}
                        />
                      )}

                          {/* Job Status - Exibir status de processamento */}
                        {!message.isUser && message.jobIds?.map(jobId => {
                          const job = activeJobs.get(jobId);
                          
                          if (!job) {
                            console.log('⏭️ Job not found in activeJobs:', jobId);
                            return null;
                          }
                          
                          console.log('🎨 Rendering JobStatus:', jobId, job.type, job.status);
                          
                          return (
                  <JobStatus
                    key={jobId}
                    job={job}
                    conversationTitle={conversations.find(c => c.id === activeConversationId)?.title}
                    onOpenQuiz={handleOpenQuiz}
                    onOpenFlashcards={handleOpenFlashcards}
                  />
                          );
                        })}

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