/**
 * FLUXO DE GERAÇÃO DE QUIZ/FLASHCARDS (Job-Based Architecture)
 * 
 * 1. User clica "Gerar Novas" → handleGenerateQuiz() ou handleGenerateFlashcards()
 * 2. Frontend obtém session.access_token via invokeGenerationFunction()
 * 3. Frontend invoca edge function COM Authorization header explícito
 * 4. Edge function valida JWT + lecture ownership (usando supabaseAuth)
 * 5. Edge function cria job na tabela teacher_jobs com status PENDING (usando supabaseAdmin)
 * 6. Edge function invoca teacher-job-runner de forma assíncrona
 * 7. Edge function retorna jobId imediatamente ao frontend
 * 8. Frontend seta isGenerating=true e salva currentJob
 * 9. teacher-job-runner processa job em background (30-60s) chamando Lovable AI
 * 10. teacher-job-runner atualiza job com status COMPLETED/FAILED
 * 11. Realtime subscription detecta UPDATE na tabela teacher_jobs
 * 12. Frontend recebe notificação via Realtime payload
 * 13. Frontend chama loadQuizData() ou loadFlashcardsData()
 * 14. Frontend seta isGenerating=false e limpa currentJob
 * 15. Frontend mostra toast + botão "Visualizar" aparece
 * 
 * CRÍTICO: Authorization header DEVE ser passado explicitamente em supabase.functions.invoke()
 * porque verify_jwt=true no config.toml NÃO adiciona header automaticamente!
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, BookOpen, FileText, ExternalLink, Check, Sparkles, Upload, FileUp, Image as ImageIcon, Users, CheckSquare, Search, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import MainLayout from '@/components/MainLayout';
import { TeacherBackgroundRipple } from '@/components/ui/teacher-background-ripple';
import { EditWithAIModal } from '@/components/EditWithAIModal';
import { PublishLectureModal } from '@/components/PublishLectureModal';
import { GenerateSummaryWithDeepSearch } from '@/components/GenerateSummaryWithDeepSearch';
import { QuizModal } from '@/components/QuizModal';
import { FlashcardViewerModal } from '@/components/FlashcardViewerModal';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface StructuredContent {
  titulo_aula: string;
  resumo: string;
  topicos_principais: Array<{ conceito: string; definicao: string }>;
  referencias_externas: Array<{ titulo: string; url: string; tipo: string }>;
  perguntas_revisao: Array<{ pergunta: string; opcoes: string[]; resposta_correta: string }>;
  flashcards: Array<{ termo: string; definicao: string }>;
}

interface UploadedFile {
  name: string;
  url: string;
  type: string;
}

interface Student {
  id: string;
  name: string;
  hasAccess: boolean;
}

const LectureTranscriptionPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [lecture, setLecture] = useState<any>(null);
  const [structuredContent, setStructuredContent] = useState<StructuredContent | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [derivedTurmaId, setDerivedTurmaId] = useState<string>('');
  const [selectAllStudents, setSelectAllStudents] = useState(true);
  const [classes, setClasses] = useState<any[]>([]);
  const [lectureTitle, setLectureTitle] = useState('');
  
  // Edit with AI modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSectionTitle, setEditingSectionTitle] = useState('');
  const [editingSectionContent, setEditingSectionContent] = useState<any>(null);

  // Thumbnail state
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);

  // Materials state
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Lesson plan comparison state
  const [lessonPlanText, setLessonPlanText] = useState('');
  const [isComparingPlan, setIsComparingPlan] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<any>(null);
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);

  // Student access state
  const [students, setStudents] = useState<Student[]>([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  
  // Publish modal state
  const [openPublishModal, setOpenPublishModal] = useState(false);
  
  // AI Generation state
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);
  const [hasQuiz, setHasQuiz] = useState(false);
  const [hasFlashcards, setHasFlashcards] = useState(false);
  
  // Job tracking state
  const [currentQuizJob, setCurrentQuizJob] = useState<string | null>(null);
  const [currentFlashcardsJob, setCurrentFlashcardsJob] = useState<string | null>(null);
  
  // Generated materials state
  const [generatedQuiz, setGeneratedQuiz] = useState<{
    id: string;
    title: string;
    questions: any[];
  } | null>(null);
  
  const [generatedFlashcards, setGeneratedFlashcards] = useState<{
    id: string;
    title: string;
    cards: any[];
  } | null>(null);
  
  // Modal state for viewing
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [showFlashcardsModal, setShowFlashcardsModal] = useState(false);

  useEffect(() => {
    if (id) {
      loadLectureData();
      loadClasses();
      checkExistingMaterials();
      // loadQuizData e loadFlashcardsData movidos para o Realtime useEffect
      // para evitar race condition
    }
  }, [id]);

  useEffect(() => {
    if (structuredContent?.titulo_aula && !thumbnailUrl) {
      generateThumbnail(structuredContent.titulo_aula);
    }
  }, [structuredContent]);

  useEffect(() => {
    if (selectedClassId) {
      loadStudents(selectedClassId);
    }
  }, [selectedClassId]);

  // Subscribe to teacher_jobs updates for this lecture
  useEffect(() => {
    if (!id) return;

    console.group('🔔 [Realtime Subscription Setup]');
    console.log('Lecture ID:', id);
    
    // 🔧 CORREÇÃO: Carregar dados ANTES de subscrever para evitar race condition
    loadQuizData();
    loadFlashcardsData();
    
    console.log('Setting up subscription to teacher_jobs table...');
    console.groupEnd();

    let processingTimeoutId: NodeJS.Timeout | null = null;

    const channel = supabase
      .channel(`teacher-jobs-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teacher_jobs',
          filter: `lecture_id=eq.${id}`
        },
        async (payload) => {
          console.group('📬 [Realtime] Job Update Received');
          console.log('Payload:', payload);
          console.groupEnd();

          // Clear any existing timeout
          if (processingTimeoutId) {
            clearTimeout(processingTimeoutId);
            processingTimeoutId = null;
          }
          
          const job = payload.new as any;
          
          if (!job) return;

          // Handle PROCESSING status - set timeout
          if (job.status === 'PROCESSING') {
            console.log('🔄 [Realtime] Job is being processed:', job.id);
            
            // Set timeout de 180 segundos (3 minutos)
            processingTimeoutId = setTimeout(() => {
              console.error('[Realtime] ⏱️ Job timeout - processing took too long');
              toast({
                variant: 'destructive',
                title: 'Tempo esgotado',
                description: 'A geração está demorando. Tente recarregar a página.',
              });
            }, 180000);
          }

          // Handle COMPLETED jobs
          if (job.status === 'COMPLETED') {
            console.group(`✅ [Realtime] Job ${job.job_type} COMPLETED`);
            console.log('Job ID:', job.id);
            console.log('Result Payload:', job.result_payload);
            
            if (job.job_type === 'GENERATE_QUIZ') {
              console.log('🎯 Updating quiz state and reloading data...');
              setIsGeneratingQuiz(false);
              setCurrentQuizJob(null);
              await loadQuizData();
              console.log('✅ Quiz data reloaded successfully');
              console.groupEnd();
              
              toast({
                title: 'Quiz gerado!',
                description: 'Seu quiz foi gerado com sucesso',
              });
            } else if (job.job_type === 'GENERATE_FLASHCARDS') {
              console.log('🎯 Updating flashcards state and reloading data...');
              setIsGeneratingFlashcards(false);
              setCurrentFlashcardsJob(null);
              await loadFlashcardsData();
              console.log('✅ Flashcards data reloaded successfully');
              console.groupEnd();
              
              toast({
                title: 'Flashcards gerados!',
                description: 'Seus flashcards foram gerados com sucesso',
              });
            }
          }
          
          // Handle FAILED jobs
          if (job.status === 'FAILED') {
            console.group(`❌ [Realtime] Job ${job.job_type} FAILED`);
            console.error('Job ID:', job.id);
            console.error('Error Message:', job.error_message);
            console.groupEnd();
            
            if (job.job_type === 'GENERATE_QUIZ') {
              setIsGeneratingQuiz(false);
              setCurrentQuizJob(null);
              
              toast({
                variant: 'destructive',
                title: 'Erro ao gerar quiz',
                description: job.error_message || 'Não foi possível gerar o quiz',
              });
            } else if (job.job_type === 'GENERATE_FLASHCARDS') {
              setIsGeneratingFlashcards(false);
              setCurrentFlashcardsJob(null);
              
              toast({
                variant: 'destructive',
                title: 'Erro ao gerar flashcards',
                description: job.error_message || 'Não foi possível gerar os flashcards',
              });
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('🔌 [Realtime] Subscription status:', status);
      });

    return () => {
      console.log('🔌 [Realtime] Cleaning up subscription for lecture:', id);
      if (processingTimeoutId) {
        clearTimeout(processingTimeoutId);
      }
      supabase.removeChannel(channel);
    };
  }, [id]);

  /**
   * Helper para invocar edge functions de geração com autenticação
   * Padroniza: validação de sessão, headers, error handling
   */
  const invokeGenerationFunction = async (
    functionName: 'teacher-generate-quiz-v2' | 'teacher-generate-flashcards-v2',
    lectureId: string
  ): Promise<{ success: boolean; jobId?: string; error?: string }> => {
    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries) {
      try {
        // 1. Validar sessão
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          console.error(`[${functionName}] ❌ Session error:`, sessionError);
          return { 
            success: false, 
            error: 'Sessão expirada. Por favor, faça login novamente.' 
          };
        }

        console.group(`📤 [${functionName}] Preparing request`);
        console.log('Lecture ID:', lectureId);
        console.log('Session exists:', !!session);
        console.log('Access token exists:', !!session?.access_token);
        console.log('Access token (first 20 chars):', session?.access_token?.substring(0, 20));
        console.log('Retry attempt:', retryCount);
        console.groupEnd();

        // 2. Invocar edge function SEM Authorization header manual
        // SDK adiciona automaticamente usando o session context
        const { data, error } = await supabase.functions.invoke(functionName, {
          body: { lectureId }
          // ✅ SDK usa automaticamente o session do auth context
        });

        // 3. Tratar erros
        if (error) {
          console.error(`[${functionName}] ❌ Function error:`, error);
          
          const errorMsg = error.message || '';
          
          // Se erro 500 ou timeout, tentar novamente
          if ((errorMsg.includes('500') || errorMsg.includes('timeout')) && retryCount < maxRetries) {
            retryCount++;
            console.log(`[${functionName}] ⚠️ Retry ${retryCount}/${maxRetries} após erro 500/timeout...`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s
            continue;
          }
          
          if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
            return { success: false, error: 'Sessão expirada. Por favor, faça login novamente.' };
          }
          if (errorMsg.includes('403') || errorMsg.includes('Forbidden')) {
            return { success: false, error: 'Você não tem permissão para editar esta aula.' };
          }
          if (errorMsg.includes('404')) {
            return { success: false, error: 'Aula não encontrada.' };
          }
          if (errorMsg.includes('500')) {
            return { success: false, error: 'Erro no servidor. Tente novamente em alguns instantes.' };
          }
          
          console.error(`[${functionName}] ❌ Full error object:`, JSON.stringify(error, null, 2));
          
          return { 
            success: false, 
            error: errorMsg || 'Erro ao iniciar geração' 
          };
        }

        console.log(`[${functionName}] ✅ Function invoked successfully:`, data);

        return { 
          success: true, 
          jobId: data?.jobId 
        };

      } catch (error) {
        console.error(`[${functionName}] ❌ Unexpected error:`, error);
        
        retryCount++;
        if (retryCount > maxRetries) {
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Erro inesperado' 
          };
        }
        
        console.log(`[${functionName}] ⚠️ Retry ${retryCount}/${maxRetries} após exceção...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return { 
      success: false, 
      error: 'Número máximo de tentativas excedido' 
    };
  };

  const loadLectureData = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await (supabase as any)
        .from('lectures')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setLecture(data);
      setLectureTitle(data?.title || 'Nova Aula');
      
      // Derive turma_id from disciplina_id if class_id is not set
      if (data?.disciplina_id && !data.class_id) {
        const { data: disciplinaData } = await supabase
          .from('disciplinas')
          .select('turma_id')
          .eq('id', data.disciplina_id)
          .single();
        
        if (disciplinaData?.turma_id) {
          setDerivedTurmaId(disciplinaData.turma_id);
          setSelectedClassId(disciplinaData.turma_id);
          loadStudents(disciplinaData.turma_id);
        }
      } else if (data?.class_id) {
        setSelectedClassId(data.class_id);
        loadStudents(data.class_id);
      }

      if (data?.structured_content) {
        setStructuredContent(data.structured_content as StructuredContent);
        setLectureTitle(data.structured_content.titulo_aula || data?.title || 'Nova Aula');
      } else if (data?.status === 'processing' && data?.raw_transcript) {
        processTranscript(data.raw_transcript);
      }
    } catch (error) {
      console.error('Error loading lecture:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar aula',
        description: 'Não foi possível carregar os dados da aula',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadClasses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  };

  const loadStudents = async (classId: string) => {
    try {
      const { data, error } = await supabase
        .from('turma_enrollments')
        .select(`
          aluno_id,
          users!turma_enrollments_aluno_id_fkey (
            id,
            full_name
          )
        `)
        .eq('turma_id', classId);

      if (error) throw error;

      const studentsData: Student[] = (data || []).map((enrollment: any) => ({
        id: enrollment.aluno_id,
        name: enrollment.users?.full_name || 'Aluno sem nome',
        hasAccess: true, // All enrolled students have access by default
      }));

      setStudents(studentsData);
    } catch (error) {
      console.error('Error loading students:', error);
      setStudents([]);
    }
  };

  const processTranscript = async (transcript: string) => {
    try {
      setIsProcessing(true);
      toast({
        title: 'Processando transcrição',
        description: 'A IA está gerando o material didático...',
      });

      const { data, error } = await supabase.functions.invoke('process-lecture-transcript', {
        body: { 
          lectureId: id, 
          transcript
        }
      });

      if (error) throw error;

      if (data?.structuredContent) {
        setStructuredContent(data.structuredContent);
        setLectureTitle(data.structuredContent.titulo_aula || 'Nova Aula');
        toast({
          title: 'Processamento concluído',
          description: 'Material didático gerado com sucesso',
        });
      }
    } catch (error) {
      console.error('Error processing transcript:', error);
      toast({
        variant: 'destructive',
        title: 'Erro no processamento',
        description: 'Não foi possível processar a transcrição',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const generateThumbnail = async (topic: string) => {
    try {
      setIsGeneratingThumbnail(true);
      const { data, error } = await supabase.functions.invoke('generate-lecture-thumbnail', {
        body: { topic }
      });

      if (error) throw error;
      if (data?.imageUrl) {
        setThumbnailUrl(data.imageUrl);
      }
    } catch (error) {
      console.error('Error generating thumbnail:', error);
    } finally {
      setIsGeneratingThumbnail(false);
    }
  };

  const handleFileUpload = (files: FileList) => {
    const newFiles: UploadedFile[] = Array.from(files).map(file => ({
      name: file.name,
      url: URL.createObjectURL(file),
      type: file.type,
    }));
    setUploadedFiles(prev => [...prev, ...newFiles]);
    toast({
      title: 'Arquivos adicionados',
      description: `${files.length} arquivo(s) carregado(s)`,
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleCompareLessonPlan = async () => {
    if (!lessonPlanText.trim()) {
      toast({
        variant: 'destructive',
        title: 'Plano de aula vazio',
        description: 'Por favor, insira o plano de aula',
      });
      return;
    }

    try {
      setIsComparingPlan(true);
      const { data, error } = await supabase.functions.invoke('compare-with-lesson-plan', {
        body: {
          lessonPlan: lessonPlanText,
          lectureContent: structuredContent,
        },
      });

      if (error) throw error;
      setComparisonResult(data.comparison);
      toast({
        title: 'Análise concluída',
        description: 'Relatório de cobertura gerado',
      });
    } catch (error) {
      console.error('Error comparing lesson plan:', error);
      toast({
        variant: 'destructive',
        title: 'Erro na comparação',
        description: 'Não foi possível comparar com o plano de aula',
      });
    } finally {
      setIsComparingPlan(false);
    }
  };

  const openEditModal = (sectionTitle: string, sectionContent: any) => {
    setEditingSectionTitle(sectionTitle);
    setEditingSectionContent(sectionContent);
    setIsEditModalOpen(true);
  };

  const handleContentUpdate = (updatedContent: any) => {
    if (!structuredContent) return;
    
    const newContent = { ...structuredContent, ...updatedContent };
    setStructuredContent(newContent);
  };

  const handlePublish = () => {
    setOpenPublishModal(true);
  };

  const loadQuizData = async () => {
    if (!id) return;
    
    try {
      const { data: quizData, error } = await supabase
        .from('teacher_quizzes')
        .select('id, title, questions')
        .eq('lecture_id', id)
        .single();

      if (error || !quizData) {
        console.log('[Quiz] Nenhum quiz encontrado');
        setGeneratedQuiz(null);
        setHasQuiz(false);
        return;
      }

      setGeneratedQuiz({
        ...quizData,
        questions: quizData.questions as any[]
      });
      setHasQuiz(true);
      console.log('[Quiz] Carregado com sucesso:', quizData);
    } catch (error) {
      console.error('[Quiz] Error loading quiz:', error);
      setGeneratedQuiz(null);
      setHasQuiz(false);
    }
  };

  const loadFlashcardsData = async () => {
    if (!id) return;
    
    try {
      const { data: flashcardsData, error } = await supabase
        .from('teacher_flashcards')
        .select('id, title, cards')
        .eq('lecture_id', id)
        .single();

      if (error || !flashcardsData) {
        console.log('[Flashcards] Nenhum flashcard encontrado');
        setGeneratedFlashcards(null);
        setHasFlashcards(false);
        return;
      }

      setGeneratedFlashcards({
        ...flashcardsData,
        cards: flashcardsData.cards as any[]
      });
      setHasFlashcards(true);
      console.log('[Flashcards] Carregados com sucesso:', flashcardsData);
    } catch (error) {
      console.error('[Flashcards] Error loading flashcards:', error);
      setGeneratedFlashcards(null);
      setHasFlashcards(false);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!id) return;
    
    console.group('🎯 [handleGenerateQuiz] Iniciando');
    console.log('Estado atual:', { isGeneratingQuiz, hasQuiz, currentQuizJob });
    console.groupEnd();
    
    if (isGeneratingQuiz) {
      toast({ 
        title: 'Geração em andamento', 
        description: 'Aguarde a geração atual terminar' 
      });
      return;
    }
    
    setIsGeneratingQuiz(true);
    
    toast({
      title: 'Gerando quiz...',
      description: 'Você receberá uma notificação quando concluir (30-60s)',
      duration: 5000,
    });

    // Usar helper unificado
    const result = await invokeGenerationFunction('teacher-generate-quiz-v2', id);
    
    if (!result.success) {
      setIsGeneratingQuiz(false);
      toast({
        variant: 'destructive',
        title: 'Erro ao gerar quiz',
        description: result.error,
      });
      return;
    }
    
    if (result.jobId) {
      setCurrentQuizJob(result.jobId);
      console.log('✅ [Quiz] Job ID saved:', result.jobId);
    }
  };

  const handleGenerateFlashcards = async () => {
    if (!id) return;
    
    console.group('🎯 [handleGenerateFlashcards] Iniciando');
    console.log('Estado atual:', { isGeneratingFlashcards, hasFlashcards, currentFlashcardsJob });
    console.groupEnd();
    
    if (isGeneratingFlashcards) {
      toast({
        title: 'Geração em andamento',
        description: 'Aguarde a geração atual terminar',
      });
      return;
    }
    
    setIsGeneratingFlashcards(true);
    
    toast({
      title: 'Gerando flashcards...',
      description: 'Você receberá uma notificação quando concluir (30-60s)',
      duration: 5000,
    });

    // Usar helper unificado
    const result = await invokeGenerationFunction('teacher-generate-flashcards-v2', id);
    
    if (!result.success) {
      setIsGeneratingFlashcards(false);
      toast({
        variant: 'destructive',
        title: 'Erro ao gerar flashcards',
        description: result.error,
      });
      return;
    }
    
    if (result.jobId) {
      setCurrentFlashcardsJob(result.jobId);
      console.log('✅ [Flashcards] Job ID saved:', result.jobId);
    }
  };

  const checkExistingMaterials = async () => {
    if (!id) return;

    try {
      const [quizResult, flashcardsResult] = await Promise.all([
        supabase.from('teacher_quizzes').select('id').eq('lecture_id', id).single(),
        supabase.from('teacher_flashcards').select('id').eq('lecture_id', id).single(),
      ]);

      setHasQuiz(!!quizResult.data);
      setHasFlashcards(!!flashcardsResult.data);
    } catch (error) {
      console.error('Error checking materials:', error);
    }
  };

  const handlePublishConfirmed = async () => {
    if (!selectedClassId) {
      toast({
        variant: 'destructive',
        title: 'Selecione uma turma',
        description: 'É necessário selecionar uma turma para publicar',
      });
      return;
    }

    try {
      setIsPublishing(true);

      const { error } = await (supabase as any)
        .from('lectures')
        .update({
          title: lectureTitle,
          class_id: selectedClassId,
          status: 'published',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Aula publicada',
        description: 'A aula foi publicada com sucesso',
      });

      setTimeout(() => {
        navigate('/teacherdashboard');
      }, 1500);
    } catch (error) {
      console.error('Error publishing lecture:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao publicar',
        description: 'Não foi possível publicar a aula',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(studentSearchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <MainLayout>
        <div className="relative min-h-screen bg-gradient-to-br from-blue-900 via-purple-600 to-pink-500 animate-gradient-xy bg-[length:200%_200%] flex items-center justify-center">
        <div className="absolute inset-0 z-0">
          <TeacherBackgroundRipple />
        </div>
          <div className="relative z-10 flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 text-white animate-spin drop-shadow-lg" />
            <p className="text-white text-lg font-semibold drop-shadow-sm">Carregando aula...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="relative min-h-screen bg-gradient-to-br from-blue-900 via-purple-600 to-pink-500 animate-gradient-xy bg-[length:200%_200%]">
        <div className="absolute inset-0 z-0">
          <TeacherBackgroundRipple />
        </div>

        {/* Gradient Blobs for Depth */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-48 w-96 h-96 bg-gradient-to-br from-pink-500/30 to-purple-500/30 rounded-full blur-3xl animate-float" />
          <div className="absolute top-2/3 -right-32 w-80 h-80 bg-gradient-to-br from-blue-400/25 to-purple-400/25 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-gradient-to-br from-purple-500/20 to-pink-400/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        </div>

        <div className="relative z-10 container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 flex items-center gap-3 drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
                <Sparkles className="h-8 w-8 text-purple-300 animate-pulse" />
                Centro de Publicação Inteligente
              </h1>
              <p className="text-white/80 text-base drop-shadow-sm">
                Revise, edite e publique seu material didático gerado por IA
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Badge 
                variant="outline" 
                className={`
                  backdrop-blur-xl shadow-lg
                  ${lecture?.status === 'processing' ? 'bg-yellow-500/30 text-yellow-100 border-yellow-300/40' : ''}
                  ${lecture?.status === 'ready' ? 'bg-blue-500/30 text-blue-100 border-blue-300/40' : ''}
                  ${lecture?.status === 'published' ? 'bg-green-500/30 text-green-100 border-green-300/40' : ''}
                `}
              >
                {lecture?.status === 'processing' && '⏳ Processando'}
                {lecture?.status === 'ready' && '✏️ Rascunho'}
                {lecture?.status === 'published' && '✅ Publicado'}
              </Badge>
              <Button
                onClick={handlePublish}
                disabled={!selectedClassId || isPublishing || !structuredContent}
                className="
                  bg-gradient-to-r from-green-600 to-green-700 
                  hover:from-green-700 hover:to-green-800
                  text-white font-bold
                  shadow-2xl shadow-green-500/30
                  hover:scale-105 hover:shadow-green-500/50
                  transition-all duration-300
                  border-2 border-green-400/20
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                "
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Publicando...
                  </>
                ) : (
                  <>
                    <CheckSquare className="mr-2 h-4 w-4" />
                    Publicar Aula
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Processing state */}
          {isProcessing && (
            <Card className="bg-white/75 backdrop-blur-xl border-white/40 mb-8 shadow-2xl">
              <CardContent className="flex items-center gap-4 py-6">
                <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
                <div>
                  <h3 className="text-slate-900 font-semibold mb-1 drop-shadow-sm">
                    🤖 Processando com IA...
                  </h3>
                  <p className="text-slate-700 text-sm drop-shadow-sm">
                    A IA está analisando a transcrição e gerando material didático estruturado
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main content grid */}
          {structuredContent && (
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-6">
              {/* Left column - Generated content */}
              <div className="space-y-6">
                {/* Title */}
                <Card className="bg-white/75 backdrop-blur-xl border-white/40 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-slate-900 font-bold">Título da Aula</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Input
                      value={lectureTitle}
                      onChange={(e) => setLectureTitle(e.target.value)}
                      className="bg-white border-slate-300 text-slate-900"
                      placeholder="Digite o título da aula"
                    />
                  </CardContent>
                </Card>


                {/* Summary */}
                <Card className="bg-white/75 backdrop-blur-xl border-white/40 shadow-xl">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-slate-900 font-bold flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-purple-600" />
                      Resumo da Aula
                    </CardTitle>
                    <div className="flex gap-2">
                      <GenerateSummaryWithDeepSearch
                        lectureId={id || ''}
                        lectureTitle={lectureTitle}
                        tags={lecture?.tags || []}
                        currentSummary={structuredContent.resumo}
                        fullTranscript={lecture?.raw_transcript || ''}
                        mainTopics={structuredContent.topicos_principais}
                        onUpdate={(newSummary) => {
                          setStructuredContent({ ...structuredContent, resumo: newSummary });
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal('Resumo', { resumo: structuredContent.resumo })}
                        className="bg-white/50 border-slate-300 text-slate-900 hover:bg-white/80"
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        Editar com IA
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-white p-4 rounded-lg prose prose-sm max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                          h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-4 mb-2 text-slate-900" {...props} />,
                          h2: ({node, ...props}) => <h2 className="text-xl font-bold mt-3 mb-2 text-slate-900" {...props} />,
                          h3: ({node, ...props}) => <h3 className="text-lg font-bold mt-2 mb-1 text-slate-900" {...props} />,
                          p: ({node, ...props}) => <p className="mb-2 text-slate-900 leading-relaxed" {...props} />,
                          strong: ({node, ...props}) => <strong className="font-bold text-purple-700" {...props} />,
                          ul: ({node, ...props}) => <ul className="list-disc list-inside mb-2 text-slate-900" {...props} />,
                          ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-2 text-slate-900" {...props} />,
                          li: ({node, ...props}) => <li className="mb-1 text-slate-900" {...props} />,
                          code: ({node, inline, ...props}: any) => 
                            inline ? 
                            <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm text-purple-700 font-mono" {...props} /> :
                            <code className="block bg-slate-100 p-3 rounded mb-2 overflow-x-auto text-sm font-mono text-slate-900" {...props} />,
                          blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-purple-600 pl-4 italic text-slate-700 my-2" {...props} />,
                        }}
                      >
                        {structuredContent.resumo}
                      </ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>

                {/* Main topics */}
                <Card className="bg-white/75 backdrop-blur-xl border-white/40 shadow-xl">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-slate-900 font-bold flex items-center gap-2">
                      <FileText className="h-5 w-5 text-purple-600" />
                      Tópicos Principais
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal('Tópicos', { topicos_principais: structuredContent.topicos_principais })}
                      className="bg-white/50 border-slate-300 text-slate-900 hover:bg-white/80"
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      Editar com IA
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-white p-4 rounded-lg space-y-4">
                      {structuredContent.topicos_principais.map((topico, index) => (
                        <div key={index} className="border-l-2 border-purple-600 pl-4">
                          <h4 className="text-slate-900 font-semibold mb-2">
                            {topico.conceito}
                          </h4>
                          <p className="text-slate-700 text-sm">
                            {topico.definicao}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* References */}
                <Card className="bg-white/75 backdrop-blur-xl border-white/40 shadow-xl">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-slate-900 font-bold flex items-center gap-2">
                      <ExternalLink className="h-5 w-5 text-purple-600" />
                      Referências Externas
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal('Referências', { referencias_externas: structuredContent.referencias_externas })}
                      className="bg-white/50 border-slate-300 text-slate-900 hover:bg-white/80"
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      Editar com IA
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {structuredContent.referencias_externas.map((ref, index) => (
                        <a
                          key={index}
                          href={ref.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start gap-3 p-4 bg-white rounded-lg hover:bg-white/80 transition-colors border border-slate-200"
                        >
                          <ExternalLink className="h-5 w-5 text-purple-600 mt-1 shrink-0" />
                          <div className="flex-1">
                            <p className="text-slate-900 font-medium mb-1">{ref.titulo}</p>
                            <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700 border-purple-300">
                              {ref.tipo}
                            </Badge>
                          </div>
                        </a>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Quiz questions */}
                <Card className="bg-white/75 backdrop-blur-xl border-white/40 shadow-xl">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-slate-900 font-bold">
                      Perguntas de Revisão ({generatedQuiz?.questions?.length || structuredContent.perguntas_revisao.length})
                    </CardTitle>
                    <div className="flex gap-2">
                      {hasQuiz && generatedQuiz && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowQuizModal(true)}
                          className="bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Visualizar
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (hasQuiz && !window.confirm('Já existe um quiz. Deseja gerar um novo? Isso substituirá o anterior.')) {
                            return;
                          }
                          handleGenerateQuiz();
                        }}
                        disabled={isGeneratingQuiz}
                        className="bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-200"
                      >
                        {isGeneratingQuiz ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <Sparkles className="h-3 w-3 mr-1" />
                        )}
                        Gerar Novas
                      </Button>
                      {isGeneratingQuiz && (
                        <Badge variant="outline" className="ml-2 animate-pulse bg-blue-50 border-blue-300 text-blue-700">
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Processando...
                        </Badge>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal('Perguntas', { perguntas_revisao: generatedQuiz?.questions || structuredContent.perguntas_revisao })}
                        className="bg-white/50 border-slate-300 text-slate-900 hover:bg-white/80"
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        Editar com IA
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-6">
                        {(generatedQuiz?.questions || structuredContent.perguntas_revisao).map((pergunta, index) => (
                          <div key={index} className="bg-white rounded-lg p-4 border border-slate-200">
                            <p className="text-slate-900 font-medium mb-3">
                              {index + 1}. {pergunta.pergunta}
                            </p>
                            <div className="space-y-2">
                              {pergunta.opcoes.map((opcao, opIndex) => (
                                <div
                                  key={opIndex}
                                  className={`p-3 rounded ${
                                    opcao.startsWith(pergunta.resposta_correta)
                                      ? 'bg-green-100 border border-green-300'
                                      : 'bg-slate-50'
                                  }`}
                                >
                                  <span className="text-slate-900 text-sm">{opcao}</span>
                                  {opcao.startsWith(pergunta.resposta_correta) && (
                                    <Check className="inline-block h-4 w-4 text-green-600 ml-2" />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Flashcards */}
                <Card className="bg-white/75 backdrop-blur-xl border-white/40 shadow-xl">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-slate-900 font-bold">
                      Flashcards ({generatedFlashcards?.cards?.length || structuredContent.flashcards.length})
                    </CardTitle>
                    <div className="flex gap-2">
                      {hasFlashcards && generatedFlashcards && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowFlashcardsModal(true)}
                          className="bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Visualizar
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (hasFlashcards && !window.confirm('Já existem flashcards. Deseja gerar novos? Isso substituirá os anteriores.')) {
                            return;
                          }
                          handleGenerateFlashcards();
                        }}
                        disabled={isGeneratingFlashcards}
                        className="bg-purple-100 border-purple-300 text-purple-700 hover:bg-purple-200"
                      >
                        {isGeneratingFlashcards ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <Sparkles className="h-3 w-3 mr-1" />
                        )}
                        Gerar Novos
                      </Button>
                      {isGeneratingFlashcards && (
                        <Badge variant="outline" className="ml-2 animate-pulse bg-purple-50 border-purple-300 text-purple-700">
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Processando...
                        </Badge>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal('Flashcards', { flashcards: generatedFlashcards?.cards || structuredContent.flashcards })}
                        className="bg-white/50 border-slate-300 text-slate-900 hover:bg-white/80"
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        Editar com IA
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(generatedFlashcards?.cards || structuredContent.flashcards).map((card, index) => (
                        <div
                          key={index}
                          className="bg-white rounded-lg p-4 border border-slate-200"
                        >
                          <h4 className="text-purple-700 font-semibold mb-2">
                            {card.front || card.termo}
                          </h4>
                          <p className="text-slate-900 text-sm">
                            {card.back || card.definicao}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right column - Tools and actions */}
              <div className="space-y-6">
                {/* Thumbnail panel */}
                <Card className="bg-white/75 backdrop-blur-xl border-white/40 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-slate-900 font-bold text-sm flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-purple-600" />
                      Thumbnail da Aula
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {isGeneratingThumbnail ? (
                      <div className="flex items-center justify-center h-40 bg-white rounded-lg border border-slate-300">
                        <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
                      </div>
                    ) : thumbnailUrl ? (
                      <div className="relative rounded-lg overflow-hidden border border-slate-300">
                        <img
                          src={thumbnailUrl}
                          alt="Thumbnail da aula"
                          className="w-full h-40 object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-40 bg-white rounded-lg border border-dashed border-slate-400">
                        <p className="text-slate-600 text-sm">Nenhuma thumbnail</p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        onClick={() => generateThumbnail(lectureTitle)}
                        disabled={isGeneratingThumbnail}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                        size="sm"
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        Gerar Outra
                      </Button>
                      <label htmlFor="thumbnail-upload" className="flex-1">
                        <Input
                          id="thumbnail-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            
                            try {
                              const { data: { user } } = await supabase.auth.getUser();
                              if (!user) throw new Error('Not authenticated');
                              
                              const fileName = `${Date.now()}_${file.name}`;
                              const { data: uploadData, error: uploadError } = await supabase.storage
                                .from('lecture-audio')
                                .upload(`thumbnails/${user.id}/${fileName}`, file);
                              
                              if (uploadError) throw uploadError;
                              
                              const { data: urlData } = supabase.storage
                                .from('lecture-audio')
                                .getPublicUrl(uploadData.path);
                              
                              setThumbnailUrl(urlData.publicUrl);
                              
                              toast({
                                title: 'Thumbnail enviada',
                                description: 'A imagem foi carregada com sucesso',
                              });
                            } catch (error) {
                              console.error('Error uploading thumbnail:', error);
                              toast({
                                variant: 'destructive',
                                title: 'Erro no upload',
                                description: 'Não foi possível carregar a imagem',
                              });
                            }
                          }}
                        />
                        <Button
                          variant="outline"
                          className="w-full bg-white border-slate-300 text-slate-900 hover:bg-white/80"
                          size="sm"
                          asChild
                        >
                          <span>
                            <Upload className="h-3 w-3 mr-1" />
                            Upload
                          </span>
                        </Button>
                      </label>
                    </div>
                  </CardContent>
                </Card>

                 {/* Audio Player */}
                <Card className="bg-white/75 backdrop-blur-xl border-white/40 shadow-xl mt-4">
                  <CardHeader>
                    <CardTitle className="text-slate-900 font-bold text-sm flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-600" />
                      Áudio da Aula
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {lecture?.audio_url ? (
                      <audio
                        controls
                        className="w-full"
                        src={lecture.audio_url}
                      >
                        Seu navegador não suporta o elemento de áudio.
                      </audio>
                    ) : (
                      <div className="bg-white p-4 rounded-lg text-center">
                        <p className="text-slate-600 text-sm">Nenhum áudio disponível para esta aula.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Materials panel */}
                <Card className="bg-white/75 backdrop-blur-xl border-white/40 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-slate-900 font-bold text-sm flex items-center gap-2">
                      <FileUp className="h-4 w-4 text-purple-600" />
                      Materiais Suplementares
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Input
                      type="file"
                      multiple
                      onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`block border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer hover:border-purple-600 hover:bg-purple-100/50 ${
                        isDragging
                          ? 'border-purple-600 bg-purple-100'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      <Upload className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-slate-700 text-sm mb-3">
                        Arraste arquivos ou clique para selecionar
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-purple-100 border-purple-300 text-purple-700 hover:bg-purple-200 pointer-events-none"
                      >
                        <FileUp className="h-3 w-3 mr-1" />
                        Selecionar Arquivos
                      </Button>
                    </label>
                    {uploadedFiles.length > 0 && (
                      <ScrollArea className="h-32">
                        <div className="space-y-2">
                          {uploadedFiles.map((file, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2 p-2 bg-white rounded border border-slate-300"
                            >
                              <FileText className="h-4 w-4 text-purple-600 shrink-0" />
                              <span className="text-slate-900 text-xs truncate flex-1">
                                {file.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>

                {/* Lesson plan comparison */}
                <Card className="bg-white/75 backdrop-blur-xl border-white/40 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-slate-900 font-bold text-sm">Análise da Aula</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Dialog open={isComparisonModalOpen} onOpenChange={setIsComparisonModalOpen}>
                      <DialogTrigger asChild>
                        <Button
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                          size="sm"
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          Comparar com Plano de Aula
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl bg-white/20 backdrop-blur-xl border-white/30">
                        <DialogHeader>
                          <DialogTitle className="text-slate-900 font-bold">Comparar com Plano de Aula</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label className="text-slate-900 font-semibold mb-2">Cole o plano de aula</Label>
                            <Textarea
                              value={lessonPlanText}
                              onChange={(e) => setLessonPlanText(e.target.value)}
                              placeholder="Cole aqui o plano de aula..."
                              className="min-h-[200px] bg-white border-slate-300 text-slate-900"
                            />
                          </div>
                          <Button
                            onClick={handleCompareLessonPlan}
                            disabled={isComparingPlan || !lessonPlanText.trim()}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                          >
                            {isComparingPlan ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Analisando...
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-4 w-4 mr-2" />
                                Analisar Cobertura
                              </>
                            )}
                          </Button>
                          {comparisonResult && (
                            <div className="mt-4 p-4 bg-white rounded-lg border border-slate-300">
                              <h3 className="text-slate-900 font-semibold mb-2">
                                Cobertura: {comparisonResult.coverage_percentage}%
                              </h3>
                              <div className="space-y-2 text-sm">
                                {comparisonResult.missing_topics?.length > 0 && (
                                  <div>
                                    <p className="text-orange-600 font-medium">Tópicos não abordados:</p>
                                    <ul className="text-slate-700 ml-4">
                                      {comparisonResult.missing_topics.map((topic: any, i: number) => (
                                        <li key={i}>• {topic.topic}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>

                {/* Student access control */}
                <Card className="bg-white/75 backdrop-blur-xl border-white/40 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-slate-900 font-bold text-sm flex items-center gap-2">
                      <Users className="h-4 w-4 text-purple-600" />
                      Controle de Acesso
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-600" />
                      <Input
                        value={studentSearchQuery}
                        onChange={(e) => setStudentSearchQuery(e.target.value)}
                        placeholder="Buscar aluno..."
                        className="pl-9 bg-white border-slate-300 text-slate-900"
                      />
                    </div>
                    <ScrollArea className="h-48">
                      <div className="space-y-2">
                        {filteredStudents.length > 0 ? filteredStudents.map((student) => (
                          <div
                            key={student.id}
                            className="flex items-center gap-2 p-2 bg-white rounded border border-slate-300"
                          >
                            <Checkbox
                              checked={student.hasAccess}
                              onCheckedChange={(checked) => {
                                setStudents(prev =>
                                  prev.map(s =>
                                    s.id === student.id ? { ...s, hasAccess: !!checked } : s
                                  )
                                );
                              }}
                              className="border-slate-400"
                            />
                            <span className="text-slate-900 text-sm">{student.name}</span>
                          </div>
                        )) : (
                          <p className="text-slate-600 text-sm text-center py-4">
                            {selectedClassId ? 'Nenhum aluno matriculado nesta turma' : 'Selecione uma turma primeiro'}
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>


                {/* Stats */}
                <Card className="bg-white/75 backdrop-blur-xl border-white/40 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-slate-900 font-bold text-sm">Estatísticas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-700">Tópicos</span>
                      <span className="text-slate-900 font-semibold">{structuredContent.topicos_principais.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-700">Perguntas</span>
                      <span className="text-slate-900 font-semibold">{structuredContent.perguntas_revisao.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-700">Flashcards</span>
                      <span className="text-slate-900 font-semibold">{structuredContent.flashcards.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-700">Referências</span>
                      <span className="text-slate-900 font-semibold">{structuredContent.referencias_externas.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-700">Materiais</span>
                      <span className="text-slate-900 font-semibold">{uploadedFiles.length}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>

        {/* Edit with AI Modal */}
        <EditWithAIModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          sectionTitle={editingSectionTitle}
          currentContent={editingSectionContent}
          onUpdate={handleContentUpdate}
          lectureId={id || ''}
        />

        {/* Publish Lecture Modal */}
        <PublishLectureModal
          open={openPublishModal}
          onOpenChange={setOpenPublishModal}
          lectureId={id || ''}
          initialTitle={lectureTitle}
          initialTurmaId={lecture?.class_id || derivedTurmaId || selectedClassId}
          initialDisciplinaId={lecture?.disciplina_id || ''}
        />

        {/* Quiz Viewer Modal */}
        {showQuizModal && generatedQuiz && (
          <QuizModal
            open={showQuizModal}
            onOpenChange={setShowQuizModal}
            quizId={generatedQuiz.id}
          />
        )}

        {/* Flashcards Viewer Modal */}
        {showFlashcardsModal && generatedFlashcards && (
          <FlashcardViewerModal
            isOpen={showFlashcardsModal}
            onClose={() => setShowFlashcardsModal(false)}
            flashcardSet={{
              id: generatedFlashcards.id,
              title: generatedFlashcards.title,
              topic: lectureTitle,
              cards: generatedFlashcards.cards
            }}
          />
        )}
      </div>
    </MainLayout>
  );
};

export default LectureTranscriptionPage;
