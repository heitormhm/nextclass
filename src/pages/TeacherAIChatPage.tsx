import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Mic, Plus, MessageCircle, Trash2, Paperclip, FileQuestion, Layers, BookOpen, CheckSquare, Edit, Presentation, FileDown, X } from "lucide-react";

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
import { generateReportPDF } from "@/utils/pdfGenerator";

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

interface ActionTag {
  id: string;
  label: string;
  emoji: string;
  color: string;
  systemPrompt: string;
  userPromptTemplate: string;
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
  const [activeTag, setActiveTag] = useState<ActionTag | null>(null);
  const [userInput, setUserInput] = useState("");

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

  const ACTION_TAGS: Record<string, ActionTag> = {
    "study-material": {
      id: "study-material",
      label: "Material de Estudo",
      emoji: "📚",
      color: "bg-blue-100 text-blue-800 border-blue-300",
      systemPrompt: `# PERSONA: Master College Teacher Assistant + Content Architect

## MISSÃO
Criar materiais de estudo rigorosos, academicamente sólidos e pedagogicamente eficazes para engenharia.

## DIRETRIZES OBRIGATÓRIAS
1. **Fontes Confiáveis**: Citar apenas referências acadêmicas verificáveis (IEEE, Springer, Elsevier, ABNT)
2. **Estrutura ABNT**: Seguir normas brasileiras de formatação acadêmica
3. **Profundidade Técnica**: Nível superior de engenharia (não simplificar excessivamente)
4. **Aplicação Prática**: Incluir exemplos da indústria brasileira
5. **Idioma**: Português brasileiro técnico-acadêmico

## ESTRUTURA OBRIGATÓRIA
- Introdução contextualizada (200 palavras)
- Fundamentação teórica com equações (LaTeX quando aplicável)
- Exemplos resolvidos passo a passo
- Exercícios propostos com 3 níveis de dificuldade
- Referências bibliográficas completas (ABNT)
- Glossário de termos técnicos

## OUTPUT
Markdown estruturado com seções numeradas, equações em LaTeX, e no mínimo 3 referências acadêmicas.`,
      userPromptTemplate: "Criar material de estudo completo sobre: "
    },
    
    "quiz": {
      id: "quiz",
      label: "Quiz Avaliativo",
      emoji: "📝",
      color: "bg-purple-100 text-purple-800 border-purple-300",
      systemPrompt: `# PERSONA: Master Assessment Designer + Bloom's Taxonomy Expert

## MISSÃO
Criar quizzes avaliativos que medem competências de alta ordem cognitiva (Bloom: Análise, Avaliação, Criação).

## DIRETRIZES OBRIGATÓRIAS
1. **Taxonomia de Bloom**: 70% questões de análise/síntese/avaliação
2. **Contextualização**: Cenários da indústria brasileira (Petrobras, Embraer, Vale)
3. **Distratores Plausíveis**: Alternativas incorretas com erros conceituais comuns
4. **Justificativas Pedagógicas**: Explicar por que cada alternativa está correta/incorreta
5. **Norma ENADE**: Seguir padrão de avaliação do ensino superior brasileiro

## ESTRUTURA OBRIGATÓRIA POR QUESTÃO
- Enunciado contextualizado (80-120 palavras)
- 4 alternativas (A-D) com complexidade equivalente
- Gabarito comentado (100 palavras)
- Competência avaliada (segundo Bloom)
- Nível de dificuldade (Fácil/Médio/Difícil)
- Tempo estimado de resolução

## QUANTIDADE
- Mínimo: 8 questões
- Distribuição: 2 fáceis, 4 médias, 2 difíceis

## OUTPUT
JSON estruturado ou Markdown com questões numeradas, gabarito separado.`,
      userPromptTemplate: "Criar quiz avaliativo sobre: "
    },
    
    "flashcard": {
      id: "flashcard",
      label: "Flashcards",
      emoji: "🎴",
      color: "bg-pink-100 text-pink-800 border-pink-300",
      systemPrompt: `# PERSONA: Cognitive Science Expert + Spaced Repetition Specialist

## MISSÃO
Criar flashcards otimizados para retenção de longo prazo usando princípios de ciência cognitiva.

## DIRETRIZES OBRIGATÓRIAS
1. **Princípio da Mínima Informação**: 1 conceito por card
2. **Técnica Feynman**: Frente com pergunta simples, verso com explicação profunda
3. **Mnemônicos**: Incluir acrônimos/analogias quando aplicável
4. **Progressão Cognitiva**: Do concreto ao abstrato
5. **Imagens Mentais**: Descrever visualizações quando possível

## ESTRUTURA OBRIGATÓRIA POR CARD
### FRENTE
- Pergunta direta (máximo 15 palavras)
- Emoji contextual para memória visual

### VERSO
- Resposta concisa (50-80 palavras)
- Exemplo aplicado
- Dica mnemônica (quando aplicável)
- Tags: [conceito], [fórmula], [aplicação]

## QUANTIDADE
- Mínimo: 15 flashcards
- Distribuição: 5 conceituais, 5 procedimentais, 5 aplicados

## OUTPUT
Formato tabular com colunas: Frente | Verso | Tags | Nível`,
      userPromptTemplate: "Criar flashcards de revisão sobre: "
    },
    
    "slides": {
      id: "slides",
      label: "Apresentação",
      emoji: "📊",
      color: "bg-indigo-100 text-indigo-800 border-indigo-300",
      systemPrompt: `# PERSONA: Visual Communication Expert + Master Presenter

## MISSÃO
Criar apresentações visuais impactantes seguindo princípios de design instrucional e comunicação visual.

## DIRETRIZES OBRIGATÓRIAS
1. **Regra 6x6**: Máximo 6 bullets, 6 palavras por bullet
2. **Narrativa Visual**: Cada slide conta uma história
3. **Hierarquia Visual**: Usar títulos, subtítulos, destaque de palavras-chave
4. **Dados Visuais**: Sugerir gráficos/diagramas quando aplicável
5. **Speaker Notes**: Notas de apresentação para o professor (150 palavras/slide)

## ESTRUTURA OBRIGATÓRIA
1. **Slide Título**: Título impactante + subtítulo contextual
2. **Agenda**: Roadmap visual da apresentação
3. **Slides de Conteúdo** (10-15):
   - Título chamativo
   - 3-5 bullets concisos
   - Imagem/diagrama sugerido
   - Speaker notes detalhadas
4. **Slide Conclusão**: Key takeaways (3 pontos)
5. **Referências**: Fontes bibliográficas

## ELEMENTOS VISUAIS
- Sugestões de ícones (Lucide React)
- Paleta de cores (código hex)
- Tipo de gráfico recomendado (quando aplicável)

## OUTPUT
Markdown estruturado com slides numerados e speaker notes.`,
      userPromptTemplate: "Criar apresentação de slides sobre: "
    },
    
    "lesson-plan": {
      id: "lesson-plan",
      label: "Roteiro de Aula",
      emoji: "📋",
      color: "bg-orange-100 text-orange-800 border-orange-300",
      systemPrompt: `# PERSONA: Master Instructional Designer + Pedagogy Expert

## MISSÃO
Criar roteiros de aula completos seguindo metodologias ativas e alinhamento construtivo (Biggs).

## DIRETRIZES OBRIGATÓRIAS
1. **Alinhamento Construtivo**: Objetivos → Atividades → Avaliação
2. **Taxonomia de Bloom**: Verbos de ação mensuráveis
3. **Metodologias Ativas**: PBL, Sala Invertida, Think-Pair-Share
4. **Tempo Real**: Cronograma minuto a minuto
5. **Recursos Concretos**: Materiais disponíveis no Brasil

## ESTRUTURA OBRIGATÓRIA
1. **Identificação** (100 palavras): Disciplina, Tema, Duração, Público-alvo
2. **Objetivos de Aprendizagem** (5-7 objetivos): Formato: "Ao final, o aluno será capaz de [verbo Bloom] + [conteúdo] + [critério]"
3. **Conteúdo Programático**: Tópicos principais, conceitos-chave, pré-requisitos
4. **Metodologia Detalhada**: Cronograma por fase (abertura, desenvolvimento, fechamento)
5. **Recursos Necessários**: Materiais físicos, tecnologia, espaço
6. **Avaliação**: Formativa e somativa com rubricas
7. **Referências**: Bibliografia ABNT

## OUTPUT
Markdown estruturado com cronograma visual (tabela) e checklist de preparação.`,
      userPromptTemplate: "Criar roteiro de aula completo sobre: "
    },
    
    "assessment": {
      id: "assessment",
      label: "Atividade Avaliativa",
      emoji: "✅",
      color: "bg-green-100 text-green-800 border-green-300",
      systemPrompt: `# PERSONA: Master Assessment Architect + Rubric Designer

## MISSÃO
Criar atividades avaliativas rigorosas com rubricas analíticas e múltiplas formas de avaliação.

## DIRETRIZES OBRIGATÓRIAS
1. **Validade de Constructo**: Avaliar exatamente o que se propõe
2. **Confiabilidade**: Critérios objetivos e mensuráveis
3. **Autenticidade**: Contextos reais da engenharia brasileira
4. **Equidade**: Acessível a diferentes perfis de aprendizagem
5. **Feedback Construtivo**: Critérios claros de excelência

## ESTRUTURA OBRIGATÓRIA
1. **Questões Objetivas** (10 questões): Múltipla escolha contextualizadas, 4 alternativas, gabarito comentado, competências Bloom
2. **Questões Abertas** (5 questões): Estudos de caso da indústria, problemas autênticos, resposta esperada (150-200 palavras), rubrica analítica (4 níveis)
3. **Rubrica Analítica** (por questão aberta): Tabela com critérios e níveis (Insuficiente, Suficiente, Excelente)
4. **Especificações**: Tempo total (90-120 min), distribuição de pontos (60% objetivas, 40% abertas)
5. **Gabarito do Professor**: Respostas completas, pontos de atenção, erros comuns

## OUTPUT
Markdown estruturado com enunciado, questões numeradas, espaço para respostas, gabarito separado, rubricas tabuladas.`,
      userPromptTemplate: "Criar atividade avaliativa (múltipla escolha + dissertativas) sobre: "
    }
  };

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
        .order('created_at', { ascending: false })
        .limit(10); // Últimas 10 conversas

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast({
        title: "Erro ao carregar conversas",
        description: "Não foi possível carregar o histórico.",
        variant: "destructive",
      });
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
      
      const { data, error } = await supabase.functions.invoke('mia-teacher-chat', {
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
    const currentMessage = activeTag ? userInput.trim() : inputMessage.trim();
    if (!currentMessage) return;

    // Limpar inputs
    setInputMessage("");
    setUserInput("");
    
    let conversationId = activeConversationId;
    let finalMessage = currentMessage;
    let systemPromptToSend = "";
    
    // Se há tag ativa, preparar contexto especializado
    if (activeTag) {
      finalMessage = `${activeTag.userPromptTemplate}${currentMessage}`;
      systemPromptToSend = activeTag.systemPrompt;
    }
    
    // Manter tag ativa para permitir múltiplas mensagens no mesmo contexto
    const tagWasActive = !!activeTag;
    // Tag só é removida quando usuário clica no X ou seleciona outra tag
    
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
            user_role: 'teacher',
          })
          .select()
          .single();

        if (conversationError) throw conversationError;
        
        conversationId = newConversation.id;
        setActiveConversationId(conversationId);
        loadConversations();
        
        // Gerar título pedagógico automaticamente
        setTimeout(async () => {
          try {
            const { data: titleData } = await supabase.functions.invoke('generate-teacher-conversation-title', {
              body: { 
                conversationId: conversationId, 
                firstMessage: currentMessage 
              }
            });
            
            if (titleData?.title) {
              console.log('✅ Título pedagógico gerado:', titleData.title);
              loadConversations();
            }
          } catch (error) {
            console.error('Error generating teacher title:', error);
          }
        }, 2000);
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

      const { data: functionData, error: functionError } = await supabase.functions.invoke('mia-teacher-chat', {
        body: {
          message: finalMessage,
          isDeepSearch,
          conversationId,
          systemPrompt: systemPromptToSend || undefined,
          autoDetectSearch: !tagWasActive,
          useAdvancedModel: isDeepSearch, // Usar Gemini Pro para busca profunda
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
        
        // Detectar estado da tag e escolher o setter correto
        if (activeTag) {
          setUserInput(prev => prev + transcript);
        } else {
          setInputMessage(prev => prev + transcript);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
        toast({
          title: "Erro no reconhecimento",
          description: "Não foi possível capturar o áudio. Tente novamente.",
          variant: "destructive"
        });
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
      
      toast({
        title: "🎤 Gravando",
        description: "Fale agora...",
      });
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputMessage(suggestion);
  };

  const handleActionButtonClick = (action: string) => {
    const tag = ACTION_TAGS[action];
    if (!tag) return;
    
    setActiveTag(tag);
    setUserInput("");
    setInputMessage("");
    
    setTimeout(() => {
      document.querySelector('textarea')?.focus();
    }, 100);
  };

  const handleRemoveTag = () => {
    setActiveTag(null);
    setUserInput("");
    setInputMessage("");
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

    // ✅ Fechar loader quando DEEP_SEARCH completa
    if (job.type === 'DEEP_SEARCH' && job.status === 'COMPLETED') {
      console.log('✅ Deep search completed, closing loader');
      setIsDeepSearchLoading(false);
    }

    if (job.type === 'DEEP_SEARCH' && job.status === 'FAILED') {
      console.log('❌ Deep search failed, closing loader');
      setIsDeepSearchLoading(false);
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
    
    const startTime = Date.now();
    const totalDuration = 15000; // ✅ EXATAMENTE 15 segundos
    const stepsCount = deepSearchSteps.length;
    const stepDuration = totalDuration / stepsCount; // ~2.5s por step
    
    let currentStep = 0;
    setDeepSearchProgress(0);
    
    // Timer para progressão dos steps
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep < stepsCount) {
        setDeepSearchProgress(currentStep);
      } else {
        setDeepSearchProgress(stepsCount - 1);
      }
    }, stepDuration);
    
    // ✅ TIMER ABSOLUTO: Fechar após EXATAMENTE 15 segundos
    const closeTimer = setTimeout(() => {
      clearInterval(interval);
      setIsDeepSearchLoading(false);
      setDeepSearchProgress(0);
    }, totalDuration);
    
    return () => {
      clearInterval(interval);
      clearTimeout(closeTimer);
    };
  }, [isDeepSearchLoading, deepSearchSteps.length]);

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
            <ScrollArea className="h-[calc(100vh-280px)] pr-2">
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
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="font-medium text-sm text-gray-900 dark:text-white truncate max-w-[180px]">
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
          
          {/* Tag Display Component */}
          {(() => {
            const TagDisplay = ({ tag, onRemove }: { tag: ActionTag; onRemove: () => void }) => (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-dashed border-purple-300 rounded-lg mb-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <span className="text-lg">{tag.emoji}</span>
                <span className="text-sm font-semibold text-purple-900">{tag.label}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 hover:bg-destructive/10 ml-auto"
                  onClick={onRemove}
                  title="Remover tag"
                >
                  <X className="w-3 h-3 text-red-500" />
                </Button>
              </div>
            );
            return null;
          })()}
          
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
                    "max-w-[85%] rounded-2xl px-6 py-5 shadow-lg backdrop-blur-xl transition-all hover:shadow-xl break-words",
                    message.isUser
                      ? "bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-900/30 dark:to-purple-900/30 text-gray-900 dark:text-gray-100 border-2 border-pink-200 dark:border-pink-800 shadow-pink-200/50 dark:shadow-pink-900/30"
                      : "bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 text-gray-900 dark:text-gray-100 border-2 border-purple-200 dark:border-purple-800 shadow-purple-200/50 dark:shadow-purple-900/30"
                  )}
                >
                  <div className="prose prose-sm max-w-none prose-gray break-words overflow-x-auto">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                          components={{
                            h2: ({node, ...props}) => (
                              <h2 className="text-xl font-bold mt-6 mb-3 text-gray-900 dark:text-white pb-2 border-b-2 border-purple-200 dark:border-purple-800" {...props} />
                            ),
                            h3: ({node, ...props}) => (
                              <h3 className="text-lg font-semibold mt-4 mb-2 text-gray-800 dark:text-gray-100 flex items-center gap-2" {...props} />
                            ),
                            p: ({node, children, ...props}) => {
                              // Detectar caixas de destaque
                              const text = String(children);
                              if (text.startsWith('> **')) {
                                const match = text.match(/^> \*\*(.+?):\*\* (.+)$/);
                                if (match) {
                                  const [, title, content] = match;
                                  const bgColors: { [key: string]: string } = {
                                    'Nota': 'bg-yellow-50 border-yellow-300',
                                    'Atenção': 'bg-red-50 border-red-300',
                                    'Dica': 'bg-blue-50 border-blue-300',
                                    'Exemplo': 'bg-green-50 border-green-300'
                                  };
                                  const colorClass = bgColors[title] || 'bg-gray-50 border-gray-300';
                                  
                                  return (
                                    <div className={`my-3 p-3 rounded-lg border-l-4 ${colorClass}`}>
                                      <span className="font-bold text-sm">{title}:</span>{' '}
                                      <span className="text-sm">{content}</span>
                                    </div>
                                  );
                                }
                              }
                              return <p className="mb-2 text-foreground leading-relaxed" {...props}>{children}</p>;
                            },
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
                            code: ({node, inline, className, children, ...props}: any) => {
                              const content = String(children).replace(/\n$/, '');
                              
                              if (inline) {
                                // Detectar LaTeX inline
                                if (content.match(/^\$.+\$$/)) {
                                  return <span className="mx-1">{content}</span>;
                                }
                                
                                // Detectar JSON inline
                                if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
                                  try {
                                    const jsonObj = JSON.parse(content);
                                    return (
                                      <div className="my-3 p-4 rounded-lg bg-gray-900 dark:bg-gray-950 text-white overflow-x-auto">
                                        <div className="flex items-center gap-2 mb-2 text-xs text-gray-400">
                                          <Layers className="w-3 h-3" />
                                          <span>Estrutura de Dados</span>
                                        </div>
                                        <pre className="text-sm font-mono whitespace-pre-wrap">
                                          {JSON.stringify(jsonObj, null, 2)}
                                        </pre>
                                      </div>
                                    );
                                  } catch {
                                    return <code className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-xs font-mono text-pink-600 dark:text-pink-400 border border-gray-200 dark:border-gray-700" {...props}>{content}</code>;
                                  }
                                }
                                
                                // Detectar variáveis matemáticas simples (1-3 chars, pode ter números/subscritos)
                                if (content.match(/^[A-Za-z]{1,3}[₀-₉]*$/) || content.match(/^[A-Za-z]{1,3}_[0-9]$/)) {
                                  return <span className="font-medium text-purple-600 dark:text-purple-400">{content}</span>;
                                }
                                
                                // Código inline normal
                                return (
                                  <code 
                                    className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-xs font-mono text-pink-600 dark:text-pink-400 border border-gray-200 dark:border-gray-700 break-all whitespace-pre-wrap" 
                                    {...props}
                                  >
                                    {content}
                                  </code>
                                );
                              }
                              
                              // Código em bloco
                              return (
                                <div className="my-3 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                                  <div className="bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 font-medium">
                                    Código
                                  </div>
                                  <code 
                                    className="block bg-gray-50 dark:bg-gray-900 p-4 text-sm font-mono overflow-x-auto text-gray-800 dark:text-gray-200 whitespace-pre-wrap" 
                                    {...props}
                                  >
                                    {content}
                                  </code>
                                </div>
                              );
                            },
                            pre: ({node, ...props}) => <pre className="bg-background/50 p-3 rounded overflow-x-auto my-2" {...props} />,
                            a: ({node, ...props}) => <a className="text-primary underline hover:text-primary/80 transition-colors" target="_blank" rel="noopener noreferrer" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc list-outside ml-6 space-y-2 my-3 text-gray-800 dark:text-gray-200" {...props} />,
                            ol: ({node, ...props}) => <ol className="list-decimal list-outside ml-6 space-y-2 my-3 text-gray-800 dark:text-gray-200" {...props} />,
                            li: ({node, ...props}) => <li className="text-gray-800 dark:text-gray-200 pl-1 leading-relaxed" {...props} />,
                            blockquote: ({node, ...props}) => (
                              <blockquote className="border-l-4 border-purple-500 pl-4 py-2 italic my-3 bg-purple-50 dark:bg-purple-900/20 rounded-r-lg text-gray-700 dark:text-gray-300" {...props} />
                            ),
                            sub: ({node, ...props}) => <sub className="text-xs" {...props} />,
                            sup: ({node, ...props}) => <sup className="text-xs text-pink-600 font-semibold" {...props} />,
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>

                      {/* Botão Exportar PDF para mensagens de Deep Search */}
                      {!message.isUser && deepSearchIndicators.some(indicator => message.content.includes(indicator)) && (
                        <div className="mt-4">
                          <Button
                            size="sm"
                            onClick={async () => {
                              console.log('🎯 Iniciando geração de PDF...');
                              console.log('📄 Conteúdo:', message.content.substring(0, 200) + '...');
                              console.log('📏 Tamanho do conteúdo:', message.content.length, 'caracteres');
                              
                              const result = await generateReportPDF({
                                content: message.content,
                                title: 'Relatório de Pesquisa Profunda',
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
                            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg transition-all duration-300 px-4 py-2.5 rounded-xl"
                          >
                            <FileDown className="w-4 h-4 mr-2" />
                            <span className="font-bold text-sm">Exportar PDF</span>
                          </Button>
                        </div>
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
                
                {/* Tag Display */}
                {activeTag && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-dashed border-purple-300 rounded-lg mb-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <span className="text-lg">{activeTag.emoji}</span>
                    <span className="text-sm font-semibold text-purple-900">{activeTag.label}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 hover:bg-destructive/10 ml-auto"
                      onClick={handleRemoveTag}
                      title="Remover tag"
                    >
                      <X className="w-3 h-3 text-red-500" />
                    </Button>
                  </div>
                )}
                
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
                      value={activeTag ? userInput : inputMessage}
                      onChange={(e) => {
                        if (activeTag) {
                          setUserInput(e.target.value);
                        } else {
                          setInputMessage(e.target.value);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder={
                        activeTag 
                          ? `Complete: ${activeTag.userPromptTemplate}...` 
                          : "Pergunte à Mia sobre pedagogia, conteúdos, estratégias..."
                      }
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
                            <div className="flex flex-col items-start">
                              <span className="text-sm font-medium">Busca Profunda</span>
                              <span className="text-xs opacity-75">Gemini Pro</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            <div className="flex flex-col items-start">
                              <span className="text-sm font-medium">Busca Padrão</span>
                              <span className="text-xs opacity-75">Gemini Flash</span>
                            </div>
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
                    disabled={
                      (activeTag ? !userInput.trim() : !inputMessage.trim()) || isLoading
                    }
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

      </div>
    </MainLayout>
  );
};

export default TeacherAIChatPage;
