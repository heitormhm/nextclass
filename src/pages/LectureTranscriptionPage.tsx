/**
 * 🏗️ ARQUITETURA DE GERAÇÃO DE QUIZ/FLASHCARDS (Job-Based)
 * 
 * 1. Frontend: User clica "Gerar Novas" → valida session.access_token
 * 2. Frontend: supabase.functions.invoke() → SDK passa JWT automaticamente
 * 3. Edge Function: Valida JWT com supabaseAdmin.auth.getUser(token)
 * 4. Edge Function: Verifica lecture ownership com supabaseAdmin
 * 5. Edge Function: Cria job (status: PENDING) em teacher_jobs
 * 6. Edge Function: Invoca teacher-job-runner assincronamente
 * 7. Edge Function: Retorna { success: true, jobId } ao frontend
 * 8. Frontend: Seta isGenerating=true, salva currentJob
 * 9. Job Runner: Processa em background (30-60s), chama Lovable AI
 * 10. Job Runner: Salva quiz/flashcards, atualiza job (status: COMPLETED)
 * 11. Realtime: Detecta UPDATE em teacher_jobs, notifica frontend
 * 12. Frontend: Recarrega dados via loadQuizData/loadFlashcardsData
 * 13. Frontend: Seta isGenerating=false, mostra toast + botão "Visualizar"
 * 
 * ✅ CORREÇÕES APLICADAS:
 * - Edge functions usam supabaseAdmin.auth.getUser(token) para validar JWT
 * - RLS policy "Service role full access" criada para teacher_jobs
 * - Frontend simplificado, sem retry logic desnecessário
 * - verify_jwt=false no config.toml (validação manual de JWT na edge function)
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trash2, Pencil, Plus, Play, Pause, Download, BarChart3, Save, RefreshCw, Printer, Camera, Copy, ChevronUp, X as CloseIcon, Monitor, Smartphone, MoreVertical, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import { Loader2, BookOpen, FileText, ExternalLink, Check, Sparkles, Upload, FileUp, Image as ImageIcon, Users, CheckSquare, Search, Eye, Brain } from 'lucide-react';
import { useIsMobile } from "@/hooks/use-mobile";
import { printMaterialDidatico } from '@/utils/printMaterialDidatico';
import { 
  captureAllCallouts, 
  downloadCalloutScreenshots, 
  downloadSingleScreenshot,
  generateCalloutDocumentation,
  copyDocumentationToClipboard,
  type CalloutScreenshot 
} from '@/utils/calloutScreenshotCapture';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerClose } from '@/components/ui/drawer';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import MainLayout from '@/components/MainLayout';
import { TeacherBackgroundRipple } from '@/components/ui/teacher-background-ripple';
import { EditWithAIModal } from '@/components/EditWithAIModal';
import { PublishLectureModal } from '@/components/PublishLectureModal';
import { GenerateLectureDeepSearchSummary } from '@/components/GenerateLectureDeepSearchSummary';
import { TeacherQuizModal } from '@/components/TeacherQuizModal';
import { TeacherFlashcardViewerModal } from '@/components/TeacherFlashcardViewerModal';
import { FormattedTranscriptViewer } from '@/components/FormattedTranscriptViewer';
// Mermaid components removed - using expanded callout system
import { StructuredContentRenderer } from '@/components/StructuredContentRenderer';
import { MaterialDidaticoRenderer } from '@/components/MaterialDidaticoRenderer';
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
  material_didatico?: string;
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
  const isMobile = useIsMobile();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [lecture, setLecture] = useState<any>(null);
  const [structuredContent, setStructuredContent] = useState<StructuredContent | null>(null);
  const [materialDidaticoV2, setMaterialDidaticoV2] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [teacherName, setTeacherName] = useState<string | null>(null);
  // Progress bar tracking removed per user request
  const [hasLatexErrors, setHasLatexErrors] = useState(false);

  // FASE 9: Detector automático de erros LaTeX
  React.useEffect(() => {
    if (materialDidaticoV2) {
      const criticalPatterns = [
        /\$\$\$\$/g,
        /\$\$\$/g,
        /\(verificar sintaxe\)/gi,
      ];
      
      const hasErrors = criticalPatterns.some(pattern => 
        pattern.test(materialDidaticoV2)
      );
      
      setHasLatexErrors(hasErrors);
      
      if (hasErrors) {
        console.warn('[LaTeX] ⚠️ Errors detected in material, regeneration recommended');
      }
    }
  }, [materialDidaticoV2]);

  // Material quality check (callouts count)
  React.useEffect(() => {
    if (materialDidaticoV2) {
      const calloutsCount = (materialDidaticoV2.match(/^>/gm) || []).length;
      if (calloutsCount < 5) {
        console.warn('[LectureTranscription] ⚠️ Material com poucos callouts:', calloutsCount);
        toast({
          title: "⚠️ Material com Poucos Destaques",
          description: `Apenas ${calloutsCount} callouts encontrados. Considere regenerar para material mais rico visualmente.`,
          variant: "destructive",
        });
      }
    }
  }, [materialDidaticoV2]);

  // Scroll progress tracking removed per user request
  
  // Helper function to generate references section
  const generateReferencesMarkdown = (refs: Array<{ titulo: string; url: string; tipo: string }> = []) => {
    if (!refs || refs.length === 0) return '';
    
    const typeIcons: Record<string, string> = {
      'site': '🌐',
      'livro': '📚',
      'artigo': '📄',
      'apresentação': '📊',
      'vídeo': '🎥',
    };
    
    let markdown = '\n\n---\n\n## 📚 Referências Bibliográficas\n\n';
    
    refs.forEach((ref, index) => {
      const icon = typeIcons[ref.tipo] || '🔗';
      markdown += `${index + 1}. ${icon} [${ref.titulo}](${ref.url}) _(${ref.tipo})_\n`;
    });
    
    return markdown;
  };
  
  const [derivedTurmaId, setDerivedTurmaId] = useState<string>('');
  const [selectAllStudents, setSelectAllStudents] = useState(true);
  const [classes, setClasses] = useState<any[]>([]);
  const [lectureTitle, setLectureTitle] = useState('');
  
  // Edit with AI modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSectionTitle, setEditingSectionTitle] = useState('');
  const [editingSectionContent, setEditingSectionContent] = useState<any>(null);
  const [editPrefilledPrompt, setEditPrefilledPrompt] = useState<string>('');

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

  // PDF printing state
  const [isPrintingPDF, setIsPrintingPDF] = useState(false);
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);

  // Student access state
  const [students, setStudents] = useState<Student[]>([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  
  // Utility function to remove AI conversational intro text
  const removeAIIntroText = (content: string): string => {
    if (!content) return content;
    let cleaned = content
      .replace(/^Com certeza\.\s+Como (?:um |)professor[^.]+\.\s*/i, '')
      .replace(/^Certamente!\s+Como professor[^.]+\.\s*/i, '')
      .replace(/^Claro!\s+Vou preparar[^.]+\.\s*/i, '')
      .replace(/^(?:Vou apresentar|Preparei|Segue)\s+(?:um material|uma aula)[^.]+\.\s*/i, '')
      .replace(/^Aqui está[^.]+\.\s*/i, '')
      .replace(/^Olá![^.]+\.\s*/i, '');
    return cleaned.trim();
  };
  
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
  
  // Reference CRUD state
  const [isAddingReference, setIsAddingReference] = useState(false);
  const [newReference, setNewReference] = useState({
    titulo: '',
    url: '',
    tipo: 'site' as 'site' | 'livro' | 'artigo' | 'apresentação' | 'vídeo'
  });
  const [editingReferenceIndex, setEditingReferenceIndex] = useState<number | null>(null);
  const [editingReference, setEditingReference] = useState<any>(null);
  
  // Graphics enrichment state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Material generation progress state
  const [materialGenerationProgress, setMaterialGenerationProgress] = useState<number>(0);
  const [isGeneratingMaterial, setIsGeneratingMaterial] = useState(false);
  const [generationMessage, setGenerationMessage] = useState<string>('');
  const [isGeneratingMaterialV2, setIsGeneratingMaterialV2] = useState(false);
  const [materialV2Progress, setMaterialV2Progress] = useState<string>('');
  const [currentMaterialV2Job, setCurrentMaterialV2Job] = useState<string | null>(null);

  // Screenshot capture state
  const [capturedScreenshots, setCapturedScreenshots] = useState<CalloutScreenshot[]>([]);
  const [isCapturingScreenshots, setIsCapturingScreenshots] = useState(false);
  
  // Swipe navigation state for questions and flashcards
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questionTouchStart, setQuestionTouchStart] = useState(0);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [isFlashcardFlipped, setIsFlashcardFlipped] = useState(false);
  const [flashcardTouchStart, setFlashcardTouchStart] = useState(0);

  // Tab state for swipe gestures
  const [activeTab, setActiveTab] = useState<'resumo' | 'material-v2'>('resumo');
  
  // Touch event handlers for swipe gestures
  const touchStart = useRef<number | null>(null);
  const touchEnd = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEnd.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStart.current || !touchEnd.current || !isMobile) return;
    
    const distance = touchStart.current - touchEnd.current;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    
    if (isLeftSwipe && activeTab === 'resumo' && materialDidaticoV2) {
      setActiveTab('material-v2');
    }
    if (isRightSwipe && activeTab === 'material-v2') {
      setActiveTab('resumo');
    }
    
    touchStart.current = null;
    touchEnd.current = null;
  };

  // Smooth scroll navigation for mobile sections
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 84; // 64px navbar + 20px padding
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  // URL validation helper
  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };
  
  // Audio player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);

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

  // Save changes before leaving page
  useEffect(() => {
    const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'Você tem alterações não salvas. Deseja realmente sair?';
        
        // Try to save in the background
        if (id && structuredContent) {
          try {
            await supabase
              .from('lectures')
              .update({
                structured_content: structuredContent as any,
                title: lectureTitle,
                updated_at: new Date().toISOString()
              })
              .eq('id', id);
          } catch (err) {
            console.error('[LectureTranscription] Failed to save on exit:', err);
          }
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, id, structuredContent, lectureTitle]);

  // Track unsaved changes
  useEffect(() => {
    // Mark as changed whenever structuredContent updates
    if (structuredContent) {
      setHasUnsavedChanges(true);
    }
  }, [structuredContent]);

  // Polling para recarregar dados quando lecture está processing
  useEffect(() => {
    if (!lecture || lecture.status !== 'processing' || structuredContent) return;

    console.log('⏱️ Setting up polling for processing lecture...');
    const pollingInterval = setInterval(async () => {
      console.log('🔄 Polling: checking if lecture is ready...');
      const { data, error } = await supabase
        .from('lectures')
        .select('status, structured_content')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Polling error:', error);
        return;
      }

      if (data?.structured_content) {
        console.log('✅ Structured content is ready! Reloading...');
        clearInterval(pollingInterval);
        loadLectureData();
      } else if (data?.status === 'ready' || data?.status === 'published') {
        console.log('✅ Lecture status changed to ready/published! Reloading...');
        clearInterval(pollingInterval);
        loadLectureData();
      }
    }, 5000); // Poll a cada 5 segundos

    // Limpar após 2 minutos (timeout)
    const timeout = setTimeout(() => {
      console.warn('⏱️ Polling timeout reached (2 minutes)');
      clearInterval(pollingInterval);
      toast({
        variant: 'destructive',
        title: 'Processamento demorado',
        description: 'Tente recarregar a página manualmente.',
      });
    }, 120000);

    return () => {
      clearInterval(pollingInterval);
      clearTimeout(timeout);
    };
  }, [lecture, structuredContent, id]);

  // Subscribe to Material V2 job updates
  useEffect(() => {
    if (!id) return;

    console.log('[Material V2] Setting up realtime subscription for job updates');

    const channel = supabase
      .channel(`material-v2-jobs-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'material_v2_jobs',
          filter: `lecture_id=eq.${id}`
        },
        async (payload) => {
          console.log('[Material V2 Realtime] Job update:', payload);
          
          const job = payload.new as any;
          if (!job) return;

          // Update progress
          if (job.status === 'PROCESSING') {
            setIsGeneratingMaterialV2(true);
            setCurrentMaterialV2Job(job.id);
            setMaterialV2Progress(job.progress_step || `${job.progress || 0}% concluído`);
          }

          // Handle completion
          if (job.status === 'COMPLETED') {
            setIsGeneratingMaterialV2(false);
            setCurrentMaterialV2Job(null);
            setMaterialV2Progress('');
            
            // Reload lecture data
            await loadLectureData();
            
            toast({
              title: '✅ Material Modular gerado!',
              description: 'O conteúdo está disponível na aba Material Modular',
            });
          }

          // Handle failure
          if (job.status === 'FAILED') {
            setIsGeneratingMaterialV2(false);
            setCurrentMaterialV2Job(null);
            setMaterialV2Progress('');
            
            // Parse error for user-friendly message
            let errorMessage = job.error_message || 'Erro desconhecido';
            let actionButton = null;
            
            if (errorMessage.includes('Limite de requisições')) {
              actionButton = {
                label: 'Tentar novamente',
                onClick: handleGenerateMaterialV2
              };
            }
            
            toast({
              variant: 'destructive',
              title: 'Erro ao gerar material',
              description: errorMessage,
              action: actionButton ? (
                <Button size="sm" onClick={actionButton.onClick}>
                  {actionButton.label}
                </Button>
              ) : undefined
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('[Material V2 Realtime] Subscription status:', status);
      });

    return () => {
      console.log('[Material V2] Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, [id]);

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
    try {
      // Validar sessão localmente (para UX imediato)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        return { 
          success: false, 
          error: 'Sessão expirada. Por favor, faça login novamente.' 
        };
      }

      console.log(`[${functionName}] 📤 Invoking with JWT token`);

      // Invocar edge function - SDK passa Authorization automaticamente
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { lectureId }
      });

      if (error) {
        console.error(`[${functionName}] ❌ Error:`, error);
        return { 
          success: false, 
          error: error.message || 'Erro ao iniciar geração' 
        };
      }

      console.log(`[${functionName}] ✅ Success, jobId:`, data?.jobId);
      return { success: true, jobId: data?.jobId };

    } catch (error) {
      console.error(`[${functionName}] ❌ Exception:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro inesperado' 
      };
    }
  };

  // Post-process material didatico to sanitize Mermaid diagrams
  const postProcessMaterialDidatico = async (markdown: string): Promise<string> => {
    console.log('[LectureTranscription] Post-processing material with format-lecture-content...');
    
    try {
      const { data, error } = await supabase.functions.invoke('format-lecture-content', {
        body: { markdown }
      });
      
      if (error) {
        console.error('[LectureTranscription] Post-processing failed:', error);
        return markdown; // Fallback to original
      }
      
      console.log('[LectureTranscription] ✅ Material post-processed successfully');
      return data.cleanedMarkdown || markdown;
    } catch (err) {
      console.error('[LectureTranscription] Post-processing exception:', err);
      return markdown; // Fallback to original
    }
  };

  const loadLectureData = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await (supabase as any)
        .from('lectures')
        .select(`
          *,
          teacher:teacher_id (
            id,
            full_name,
            email
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      setLecture(data);
      setLectureTitle(data?.title || 'Nova Aula');
      
      // Extract teacher name
      if (data?.teacher) {
        const name = data.teacher.full_name || data.teacher.email?.split('@')[0] || 'Professor';
        setTeacherName(name);
      }
      
      // Load new modular material didático (Phase 3)
      if (data?.material_didatico_v2) {
        console.log('[LectureTranscription] Loading material_didatico_v2');
        setMaterialDidaticoV2(data.material_didatico_v2);
      }
      
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
        console.log('[LectureTranscription] Structured content loaded');
        
        // Always post-process material_didatico (don't rely on regex detection)
        const materialDidatico = data.structured_content.material_didatico;
        if (materialDidatico) {
          console.log('[LectureTranscription] Post-processing material didatico (always)...');
          
          // Post-process to sanitize diagrams
          const cleanedMarkdown = await postProcessMaterialDidatico(materialDidatico);
          
          // Update structured content with cleaned version
          setStructuredContent({
            ...data.structured_content,
            material_didatico: cleanedMarkdown
          } as StructuredContent);
        } else {
          setStructuredContent(data.structured_content as StructuredContent);
        }
        
        setLectureTitle(data.structured_content.titulo_aula || data?.title || 'Nova Aula');
      } else if (data?.status === 'processing' && data?.raw_transcript) {
        console.log('🔄 Lecture is processing, calling processTranscript...');
        processTranscript(data.raw_transcript);
      } else if (data?.status === 'processing' && !data?.raw_transcript) {
        console.warn('⚠️ Lecture status is processing but no raw_transcript found');
        toast({
          title: 'Processamento pendente',
          description: 'A transcrição ainda não foi salva. Aguarde alguns instantes.',
        });
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

      // Buscar turmas via teacher_turma_access
      const { data: accessData, error: accessError } = await supabase
        .from('teacher_turma_access')
        .select('turma_id')
        .eq('teacher_id', user.id);

      if (accessError) throw accessError;

      const turmaIds = accessData?.map(a => a.turma_id) || [];
      
      if (turmaIds.length === 0) {
        setClasses([]);
        return;
      }

      const { data, error } = await supabase
        .from('turmas')
        .select('*')
        .in('id', turmaIds);

      if (error) throw error;

      // PRÉ-FILTRAR por 6º Período automaticamente
      const filtered = (data || []).filter((turma: any) => 
        turma.periodo === '6' || turma.periodo === '6º Período' || turma.period === '6'
      );

      console.log('[loadClasses] 📚 Classes (filtered for 6th period):', filtered.length);

      setClasses(filtered);
      
      // Auto-selecionar primeira turma do 6º período se existir e lecture.turma_id corresponder
      if (filtered.length > 0 && lecture?.turma_id) {
        const matchingClass = filtered.find((c: any) => c.id === lecture.turma_id);
        if (matchingClass) {
          setSelectedClassId(matchingClass.id);
          loadStudents(matchingClass.id);
          console.log('[loadClasses] ✅ Auto-selected class:', matchingClass);
        } else if (filtered.length > 0) {
          // Fallback para primeira turma disponível
          const firstClass = filtered[0];
          setSelectedClassId(firstClass.id);
          loadStudents(firstClass.id);
          console.log('[loadClasses] ✅ Auto-selected first available class:', firstClass);
        }
      }
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  };

  const loadStudents = async (classId: string) => {
    console.log('[loadStudents] 📚 Loading students for turma:', classId);
    
    try {
      // QUERY SIMPLIFICADA: buscar IDs primeiro
      const { data: enrollments, error: enrollError } = await supabase
        .from('turma_enrollments')
        .select('aluno_id')
        .eq('turma_id', classId);

      if (enrollError) {
        console.error('[loadStudents] ❌ Error fetching enrollments:', enrollError);
        return;
      }

      const studentIds = enrollments?.map(e => e.aluno_id) || [];
      console.log('[loadStudents] 👥 Found', studentIds.length, 'enrollments:', studentIds);

      if (studentIds.length === 0) {
        console.warn('[loadStudents] ⚠️ No students enrolled in this turma');
        setStudents([]);
        return;
      }

      // Query SEPARADA para buscar dados dos usuários
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, email')
        .in('id', studentIds);

      if (usersError) {
        console.error('[loadStudents] ❌ Error fetching users:', usersError);
        return;
      }

      console.log('[loadStudents] 🔍 Raw users data:', usersData);

      if (!usersData || usersData.length === 0) {
        console.error('[loadStudents] ❌ No user data found for IDs:', studentIds);
        setStudents([]);
        return;
      }

      const studentsData: Student[] = usersData.map((user) => {
        // Multi-level fallback for name
        const fullName = 
          user.full_name?.trim() || 
          user.email?.split('@')[0] || 
          'Aluno sem cadastro';
        
        const isPlaceholder = !user.full_name;
        
        console.log(`[loadStudents] 📝 User ${user.id}: "${fullName}" ${isPlaceholder ? '(from email)' : '(real name)'}`);
        
        return {
          id: user.id,
          name: isPlaceholder ? `${fullName} 📧` : fullName,
          hasAccess: true,
        };
      });

      console.log('[loadStudents] ✅ Loaded', studentsData.length, 'students');
      setStudents(studentsData);
      
    } catch (error) {
      console.error('[loadStudents] ❌ Unexpected error:', error);
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

  const handleGenerateMaterialV2 = async () => {
    if (!id) {
      toast({ variant: 'destructive', title: 'Erro', description: 'ID da aula não encontrado' });
      return;
    }
    
    setIsGeneratingMaterialV2(true);
    setMaterialV2Progress('Criando job de geração...');
    
    try {
      const { data, error } = await supabase.functions.invoke('material-didatico-generator-v2', {
        body: { lectureId: id }
      });
      
      if (error) {
        // Handle specific error types
        if (error.message?.includes('408')) {
          throw new Error('Tempo esgotado. Verifique sua conexão e tente novamente.');
        }
        throw error;
      }
      
      if (!data?.success || !data?.jobId) {
        throw new Error('Falha ao iniciar geração');
      }
      
      setCurrentMaterialV2Job(data.jobId);
      setMaterialV2Progress('Aguardando processamento...');
      
      toast({
        title: 'Geração iniciada',
        description: 'O material será gerado em background. Você pode navegar livremente.',
      });
      
    } catch (error: any) {
      console.error('[Material V2] Generation error:', error);
      
      setIsGeneratingMaterialV2(false);
      setMaterialV2Progress('');
      
      let errorMessage = 'Tente novamente mais tarde';
      if (error.message?.includes('Limite de requisições')) {
        errorMessage = 'Aguarde alguns minutos e tente novamente.';
      } else if (error.message?.includes('Créditos insuficientes')) {
        errorMessage = 'Contate o administrador para adicionar créditos.';
      } else if (error.message?.includes('Tempo esgotado')) {
        errorMessage = error.message;
      }
      
      toast({
        variant: 'destructive',
        title: 'Erro ao gerar material',
        description: errorMessage,
        action: errorMessage.includes('Aguarde') ? (
          <Button size="sm" onClick={handleGenerateMaterialV2}>
            Tentar novamente
          </Button>
        ) : undefined
      });
    }
  };

  // 🧪 TEST FUNCTION: Generate test material with all 12 callout types
  const handleGenerateTestCallouts = async () => {
    if (!id) {
      toast({ variant: 'destructive', title: 'Erro', description: 'ID da aula não encontrado' });
      return;
    }
    
    setIsGeneratingMaterialV2(true);
    setMaterialV2Progress('🧪 Gerando material de teste...');
    
    try {
      console.log('[TestCallouts] Invoking generate-test-callouts-material...');
      
      const { data, error } = await supabase.functions.invoke('generate-test-callouts-material');
      
      if (error) {
        console.error('[TestCallouts] Error:', error);
        throw error;
      }
      
      if (!data?.success || !data?.markdown_content) {
        throw new Error('Falha ao gerar material de teste');
      }
      
      console.log('[TestCallouts] ✅ Material generated, saving to database...');
      
      // Save test material directly to lecture
      const { error: updateError } = await supabase
        .from('lectures')
        .update({ material_didatico_v2: data.markdown_content })
        .eq('id', id);
      
      if (updateError) {
        console.error('[TestCallouts] Database error:', updateError);
        throw updateError;
      }
      
      console.log('[TestCallouts] ✅ Test material saved successfully');
      
      // Update local state
      setMaterialDidaticoV2(data.markdown_content);
      setIsGeneratingMaterialV2(false);
      setMaterialV2Progress('');
      
      toast({
        title: '🧪 Material de teste gerado!',
        description: `Contém todos os ${data.stats.total_callouts} tipos de callouts para validação.`,
      });

      // 📸 NOVO: Aguardar renderização e capturar screenshots automaticamente
      console.log('[TestCallouts] Waiting for render before screenshot capture...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2s para renderização completa
      
      setMaterialV2Progress('📸 Capturando screenshots...');
      console.log('[TestCallouts] Starting automatic screenshot capture...');
      
      const screenshots = await captureAllCallouts('.material-didatico-content');
      
      if (screenshots.length > 0) {
        setCapturedScreenshots(screenshots);
        
        toast({
          title: `📸 ${screenshots.length} callouts capturados!`,
          description: 'Screenshots salvos. Veja a galeria abaixo para download.',
        });
        
        console.log(`[TestCallouts] ✅ ${screenshots.length} screenshots captured and stored`);
      } else {
        console.warn('[TestCallouts] ⚠️ No callouts were captured');
      }
      
    } catch (error: any) {
      console.error('[TestCallouts] Error:', error);
      
      setIsGeneratingMaterialV2(false);
      setMaterialV2Progress('');
      
      toast({
        variant: 'destructive',
        title: 'Erro ao gerar material de teste',
        description: error.message || 'Erro desconhecido',
      });
    }
  };

  // 📸 NEW FUNCTION: Manual screenshot capture of current callouts
  const handleCaptureCurrentCallouts = async () => {
    if (!materialDidaticoV2) {
      toast({
        variant: 'destructive',
        title: 'Nenhum material disponível',
        description: 'Gere material didático primeiro para capturar callouts',
      });
      return;
    }

    setIsCapturingScreenshots(true);
    
    try {
      console.log('[Screenshot] Starting manual capture...');
      
      // Aguarda renderização estável
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const screenshots = await captureAllCallouts('.material-didatico-content');
      
      if (screenshots.length === 0) {
        toast({
          variant: 'destructive',
          title: 'Nenhum callout encontrado',
          description: 'O material não contém callouts para capturar',
        });
        return;
      }
      
      setCapturedScreenshots(screenshots);
      
      toast({
        title: `✅ ${screenshots.length} callouts capturados!`,
        description: 'Visualize abaixo ou faça download individual/em lote',
      });
      
      console.log(`[Screenshot] ✅ Manual capture completed: ${screenshots.length} callouts`);
      
    } catch (error: any) {
      console.error('[Screenshot] Error:', error);
      toast({
        variant: 'destructive',
        title: 'Erro na captura',
        description: error.message || 'Falha ao capturar screenshots',
      });
    } finally {
      setIsCapturingScreenshots(false);
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
        
        // Tentar migrar flashcards do structured_content se existirem
        if (structuredContent?.flashcards && structuredContent.flashcards.length > 0) {
          console.log('[Flashcards] Iniciando migração automática...');
          await migrateFlashcardsToTeacherTable();
        }
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

  const migrateFlashcardsToTeacherTable = async () => {
    if (!lecture?.id || !structuredContent?.flashcards?.length || generatedFlashcards) return;
    
    console.log('🔄 Migrando flashcards para teacher_flashcards table...');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const flashcardsData = {
        lecture_id: lecture.id,
        teacher_id: user.id,
        title: lectureTitle,
        cards: structuredContent.flashcards.map((fc: any) => ({
          front: fc.termo,
          back: fc.definicao,
          tags: []
        }))
      };
      
      const { error } = await supabase
        .from('teacher_flashcards')
        .insert(flashcardsData);
      
      if (error) throw error;
      
      console.log('✅ Flashcards migrados com sucesso');
      await loadFlashcardsData();
      toast({
        title: 'Flashcards migrados',
        description: 'Os flashcards foram atualizados com sucesso',
      });
    } catch (error) {
      console.error('❌ Erro ao migrar flashcards:', error);
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

  // Individual Quiz Question Management
  const handleDeleteQuizQuestion = async (index: number) => {
    if (!generatedQuiz || !id) return;
    
    const confirmDelete = window.confirm('Deseja deletar esta pergunta? Esta ação não pode ser desfeita.');
    if (!confirmDelete) return;

    const updatedQuestions = generatedQuiz.questions.filter((_, i) => i !== index);
    
    try {
      const { error } = await supabase
        .from('teacher_quizzes')
        .update({ questions: updatedQuestions })
        .eq('lecture_id', id);

      if (error) throw error;

      setGeneratedQuiz({ ...generatedQuiz, questions: updatedQuestions });
      toast({ title: '✅ Pergunta deletada', description: 'Quiz atualizado com sucesso' });
    } catch (error) {
      console.error('Error deleting question:', error);
      toast({ variant: 'destructive', title: 'Erro ao deletar', description: 'Tente novamente' });
    }
  };

  const handleEditQuizQuestionWithAI = (index: number, question: any) => {
    openEditModal('Pergunta Individual', { 
      pergunta: question,
      index: index,
      onSave: async (updatedQuestion: any) => {
        if (!generatedQuiz || !id) return;
        
        const updatedQuestions = [...generatedQuiz.questions];
        updatedQuestions[index] = updatedQuestion;
        
        const { error } = await supabase
          .from('teacher_quizzes')
          .update({ questions: updatedQuestions })
          .eq('lecture_id', id);

        if (!error) {
          setGeneratedQuiz({ ...generatedQuiz, questions: updatedQuestions });
          toast({ title: '✅ Pergunta atualizada', description: 'Alterações salvas com sucesso' });
        }
      }
    });
  };

  const handleAddQuizQuestion = async () => {
    if (!generatedQuiz || !id || !lecture) return;
    
    try {
      toast({
        title: '🤖 Gerando nova pergunta...',
        description: 'A IA está criando uma pergunta baseada no tema da aula',
      });

      const { data, error } = await supabase.functions.invoke('generate-single-quiz-question', {
        body: {
          title: lecture.title,
          tags: lecture.tags || []
        }
      });

      if (error) throw error;

      const updatedQuestions = [...generatedQuiz.questions, data.question];
      
      const { error: updateError } = await supabase
        .from('teacher_quizzes')
        .update({ questions: updatedQuestions })
        .eq('lecture_id', id);

      if (updateError) throw updateError;

      setGeneratedQuiz({ ...generatedQuiz, questions: updatedQuestions });
      
      toast({
        title: '✅ Pergunta adicionada',
        description: 'Nova pergunta gerada automaticamente com IA',
      });

    } catch (error) {
      console.error('Error adding question:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao gerar pergunta',
        description: 'Tente novamente',
      });
    }
  };

  const handleAddFlashcard = async () => {
    if (!id || !lecture) return;
    
    try {
      toast({
        title: '🤖 Gerando novo flashcard...',
        description: 'A IA está criando um flashcard baseado no tema da aula',
      });

      const { data, error } = await supabase.functions.invoke('generate-single-flashcard', {
        body: {
          title: lecture.title,
          tags: lecture.tags || []
        }
      });

      if (error) throw error;

      // Check if flashcards record exists
      if (!generatedFlashcards) {
        // Create new record (first flashcard)
        const newFlashcards = {
          lecture_id: id,
          teacher_id: lecture.teacher_id,
          title: `Flashcards - ${lecture.title}`,
          cards: [data.card]
        };

        const { data: insertedData, error: insertError } = await supabase
          .from('teacher_flashcards')
          .insert(newFlashcards)
          .select()
          .single();

        if (insertError) throw insertError;

        setGeneratedFlashcards({
          id: insertedData.id,
          title: insertedData.title,
          cards: insertedData.cards as any[]
        });
        setHasFlashcards(true);
        
        toast({
          title: '✅ Primeiro flashcard criado',
          description: 'Conjunto de flashcards iniciado com sucesso',
        });
      } else {
        // Update existing record
        const updatedCards = [...generatedFlashcards.cards, data.card];
        
        const { error: updateError } = await supabase
          .from('teacher_flashcards')
          .update({ cards: updatedCards })
          .eq('lecture_id', id);

        if (updateError) throw updateError;

        setGeneratedFlashcards({ ...generatedFlashcards, cards: updatedCards });
        
        toast({
          title: '✅ Flashcard adicionado',
          description: 'Novo flashcard gerado automaticamente com IA',
        });
      }

    } catch (error) {
      console.error('Error adding flashcard:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao gerar flashcard',
        description: error instanceof Error ? error.message : 'Tente novamente',
      });
    }
  };
  const handleDeleteFlashcard = async (index: number) => {
    if (!generatedFlashcards || !id) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Nenhum flashcard disponível para deletar',
      });
      return;
    }
    
    const confirmDelete = window.confirm('Deseja deletar este flashcard? Esta ação não pode ser desfeita.');
    if (!confirmDelete) return;

    const updatedCards = generatedFlashcards.cards.filter((_, i) => i !== index);
    
    try {
      // If deleting the last flashcard, remove the entire record
      if (updatedCards.length === 0) {
        const { error } = await supabase
          .from('teacher_flashcards')
          .delete()
          .eq('lecture_id', id);

        if (error) throw error;

        setGeneratedFlashcards(null);
        setHasFlashcards(false);
        
        toast({ 
          title: '✅ Todos os flashcards deletados', 
          description: 'Conjunto removido completamente' 
        });
      } else {
        // Update with remaining cards
        const { error } = await supabase
          .from('teacher_flashcards')
          .update({ cards: updatedCards })
          .eq('lecture_id', id);

        if (error) throw error;

        setGeneratedFlashcards({ ...generatedFlashcards, cards: updatedCards });
        
        toast({ 
          title: '✅ Flashcard deletado', 
          description: `${updatedCards.length} flashcard(s) restante(s)` 
        });
      }
    } catch (error) {
      console.error('Error deleting flashcard:', error);
      toast({ 
        variant: 'destructive', 
        title: 'Erro ao deletar', 
        description: error instanceof Error ? error.message : 'Tente novamente' 
      });
    }
  };

  const handleEditFlashcardWithAI = (index: number, card: any) => {
    openEditModal('Flashcard Individual', {
      card: card,
      index: index,
      onSave: async (updatedCard: any) => {
        if (!generatedFlashcards || !id) return;
        
        const updatedCards = [...generatedFlashcards.cards];
        updatedCards[index] = updatedCard;
        
        const { error } = await supabase
          .from('teacher_flashcards')
          .update({ cards: updatedCards })
          .eq('lecture_id', id);

        if (!error) {
          setGeneratedFlashcards({ ...generatedFlashcards, cards: updatedCards });
          toast({ title: '✅ Flashcard atualizado', description: 'Alterações salvas com sucesso' });
        }
      }
    });
  };


  const handleAddReference = async () => {
    if (!newReference.titulo.trim() || !newReference.url.trim()) {
      toast({ variant: 'destructive', title: 'Preencha todos os campos' });
      return;
    }
    
    const urlRegex = /^https?:\/\/.+/;
    if (!urlRegex.test(newReference.url)) {
      toast({ variant: 'destructive', title: 'URL inválida' });
      return;
    }
    
    const updatedRefs = [...(structuredContent?.referencias_externas || []), newReference];
    
    const { error } = await supabase
      .from('lectures')
      .update({
        structured_content: {
          ...structuredContent,
          referencias_externas: updatedRefs
        }
      })
      .eq('id', lecture.id);
    
    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao adicionar referência' });
      return;
    }
    
    setStructuredContent({ ...structuredContent, referencias_externas: updatedRefs } as any);
    setIsAddingReference(false);
    setNewReference({ titulo: '', url: '', tipo: 'site' });
    toast({ title: '✅ Referência adicionada com sucesso' });
  };

  const handleEditReference = async () => {
    if (editingReferenceIndex === null || !editingReference) return;
    
    const updatedRefs = [...(structuredContent?.referencias_externas || [])];
    updatedRefs[editingReferenceIndex] = editingReference;
    
    const { error } = await supabase
      .from('lectures')
      .update({
        structured_content: {
          ...structuredContent,
          referencias_externas: updatedRefs
        }
      })
      .eq('id', lecture.id);
    
    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao editar referência' });
      return;
    }
    
    setStructuredContent({ ...structuredContent, referencias_externas: updatedRefs } as any);
    setEditingReferenceIndex(null);
    setEditingReference(null);
    toast({ title: '✅ Referência editada com sucesso' });
  };

  const handleDeleteReference = async (index: number) => {
    if (!window.confirm('Tem certeza que deseja deletar esta referência?')) return;
    
    const updatedRefs = (structuredContent?.referencias_externas || []).filter((_, i) => i !== index);
    
    const { error } = await supabase
      .from('lectures')
      .update({
        structured_content: {
          ...structuredContent,
          referencias_externas: updatedRefs
        }
      })
      .eq('id', lecture.id);
    
    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao deletar referência' });
      return;
    }
    
    setStructuredContent({ ...structuredContent, referencias_externas: updatedRefs } as any);
    toast({ title: '✅ Referência deletada com sucesso' });
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Touch handlers for swipe navigation
  const handleQuestionTouchStart = (e: React.TouchEvent) => {
    setQuestionTouchStart(e.touches[0].clientX);
  };

  const handleQuestionTouchEnd = (e: React.TouchEvent) => {
    const touchEnd = e.changedTouches[0].clientX;
    const diff = questionTouchStart - touchEnd;
    
    if (Math.abs(diff) > 50) {
      const questions = generatedQuiz?.questions || structuredContent?.perguntas_revisao || [];
      if (diff > 0 && currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else if (diff < 0 && currentQuestionIndex > 0) {
        setCurrentQuestionIndex(prev => prev - 1);
      }
    }
  };

  const handleFlashcardTouchStart = (e: React.TouchEvent) => {
    setFlashcardTouchStart(e.touches[0].clientX);
  };

  const handleFlashcardTouchEnd = (e: React.TouchEvent) => {
    const touchEnd = e.changedTouches[0].clientX;
    const diff = flashcardTouchStart - touchEnd;
    
    if (Math.abs(diff) > 50) {
      const cards = generatedFlashcards?.cards || structuredContent?.flashcards || [];
      if (diff > 0 && currentFlashcardIndex < cards.length - 1) {
        setCurrentFlashcardIndex(prev => prev + 1);
        setIsFlashcardFlipped(false);
      } else if (diff < 0 && currentFlashcardIndex > 0) {
        setCurrentFlashcardIndex(prev => prev - 1);
        setIsFlashcardFlipped(false);
      }
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

        <div className={cn(
          "relative z-10 container mx-auto py-8",
          isMobile ? "px-2" : "px-4"
        )}>
          {/* Header - Mobile Optimized */}
          <div className={cn(
            "flex flex-col gap-4 mb-8",
            isMobile ? "items-stretch" : "lg:flex-row items-start lg:items-center justify-between"
          )}>
            <div>
              <div className="flex items-center gap-3">
                <Sparkles className={cn(
                  "text-purple-300 animate-pulse",
                  isMobile ? "h-6 w-6" : "h-8 w-8"
                )} />
                <div>
                  <h1 className={cn(
                    "font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]",
                    isMobile ? "text-xl" : "text-3xl md:text-4xl"
                  )}>
                    Centro de Publicação Inteligente
                  </h1>
                  {!isMobile && (
                    <p className="text-white/80 text-base drop-shadow-sm mt-1">
                      Revise, edite e publique seu material didático gerado por IA
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className={cn(
              "flex gap-3",
              isMobile ? "flex-col w-full" : "items-center"
            )}>
              <Badge 
                variant="outline" 
                className={cn(
                  "backdrop-blur-xl shadow-lg",
                  isMobile && "self-start",
                  lecture?.status === 'processing' && "bg-yellow-500/30 text-yellow-100 border-yellow-300/40",
                  lecture?.status === 'ready' && "bg-blue-500/30 text-blue-100 border-blue-300/40",
                  lecture?.status === 'published' && "bg-green-500/30 text-green-100 border-green-300/40"
                )}
              >
                {lecture?.status === 'processing' && '⏳ Processando'}
                {lecture?.status === 'ready' && '✏️ Rascunho'}
                {lecture?.status === 'published' && '✅ Publicado'}
              </Badge>
              <Button
                variant="outline"
                className={cn(
                  "backdrop-blur-xl bg-white/20 hover:bg-white/30 border-white/40 text-white min-h-[44px]",
                  isMobile && "w-full justify-center"
                )}
                onClick={async () => {
                  if (!id || !structuredContent) return;
                  
                  try {
                    const currentContent = structuredContent as Record<string, any>;
                    const contentToSave = {
                      ...currentContent,
                      thumbnail: thumbnailUrl || currentContent.thumbnail || ''
                    };

                    console.log('[SaveProgress] Salvando com thumbnail:', contentToSave.thumbnail);

                    const { error } = await supabase
                      .from('lectures')
                      .update({
                        structured_content: contentToSave,
                        title: lectureTitle,
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', id);

                    if (error) throw error;

                    toast({
                      title: 'Salvo! 💾',
                      description: 'Progresso salvo com sucesso',
                    });
                    
                    setHasUnsavedChanges(false);
                  } catch (err) {
                    console.error('Save error:', err);
                    toast({
                      title: 'Erro ao salvar',
                      description: 'Não foi possível salvar o progresso',
                      variant: 'destructive',
                    });
                  }
                }}
              >
                <Save className="h-4 w-4 mr-2" />
                {isMobile ? "Salvar" : "Salvar Progresso"}
              </Button>
              
              {lecture?.status !== 'published' && (
                <Button
                  onClick={handlePublish}
                  disabled={!selectedClassId || isPublishing || !structuredContent}
                  className={cn(
                    "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold shadow-2xl shadow-green-500/30 hover:scale-105 hover:shadow-green-500/50 transition-all duration-300 border-2 border-green-400/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 min-h-[44px]",
                    isMobile && "w-full justify-center"
                  )}
                >
                  {isPublishing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isMobile ? "Publicando..." : "Publicando..."}
                    </>
                  ) : (
                    <>
                      <CheckSquare className="mr-2 h-4 w-4" />
                      {isMobile ? "Publicar" : "Publicar Aula"}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Processing state - Mobile Optimized */}
          {isProcessing && (
            <Card className={cn(
              "bg-white/75 backdrop-blur-xl border-white/40 mb-8 shadow-2xl",
              isMobile && "mx-0"
            )}>
              <CardContent className={cn(
                "flex items-center gap-4 py-6",
                isMobile && "flex-col text-center py-4"
              )}>
                <Loader2 className={cn(
                  "text-purple-600 animate-spin",
                  isMobile ? "h-6 w-6" : "h-8 w-8"
                )} />
                <div>
                  <h3 className={cn(
                    "text-slate-900 font-semibold mb-1 drop-shadow-sm",
                    isMobile && "text-sm"
                  )}>
                    🤖 Processando com IA...
                  </h3>
                  <p className={cn(
                    "text-slate-700 drop-shadow-sm",
                    isMobile ? "text-xs" : "text-sm"
                  )}>
                    {isMobile 
                      ? "Analisando transcrição..." 
                      : "A IA está analisando a transcrição e gerando material didático estruturado"
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loading state quando lecture existe mas structured_content ainda não */}
          {!isLoading && lecture && !structuredContent && lecture.status === 'processing' && (
            <Card className="bg-white/75 backdrop-blur-xl border-white/40 mb-8 shadow-2xl">
              <CardContent className="flex flex-col items-center gap-4 py-12">
                <Loader2 className="h-12 w-12 text-purple-600 animate-spin" />
                <div className="text-center">
                  <h3 className="text-slate-900 font-semibold mb-2 text-lg">
                    🤖 IA está processando sua aula...
                  </h3>
                  <p className="text-slate-600 text-sm mb-4">
                    Isso pode levar até 1 minuto. Aguarde enquanto geramos seu material didático estruturado.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => window.location.reload()}
                    className="mt-2"
                  >
                    Recarregar Página
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main content grid - Mobile Optimized */}
          {structuredContent && (
            <div className={cn(
              "gap-4 md:gap-6",
              isMobile 
                ? "flex flex-col space-y-4" 
                : "grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]"
            )}>
              {/* Left column - Generated content */}
              <div className="space-y-6">
                 {/* Title - Mobile Optimized */}
                <Card id="titulo-aula" className={cn(
                  "bg-white/75 backdrop-blur-xl border-white/40 shadow-xl",
                  isMobile && "mx-0"
                )}>
                  <CardHeader className={cn(isMobile && "px-4 py-3")}>
                    <CardTitle className={cn(
                      "text-xl text-slate-900 font-bold flex items-center gap-2",
                      isMobile && "text-lg"
                    )}>
                      <BookOpen className="h-5 w-5 text-purple-600" />
                      Título da Aula
                    </CardTitle>
                  </CardHeader>
                  <CardContent className={cn(isMobile && "px-4 py-3")}>
                    {isMobile ? (
                      <Textarea
                        value={lectureTitle}
                        onChange={(e) => setLectureTitle(e.target.value)}
                        className="bg-white border-slate-300 text-slate-900 min-h-[80px] resize-none"
                        placeholder="Digite o título da aula"
                        spellCheck={false}
                      />
                    ) : (
                      <Input
                        value={lectureTitle}
                        onChange={(e) => setLectureTitle(e.target.value)}
                        className="bg-white border-slate-300 text-slate-900"
                        placeholder="Digite o título da aula"
                        spellCheck={false}
                      />
                    )}
                  </CardContent>
                </Card>

                {/* Conteúdo Gerado com Tabs - Mobile Optimized */}
                <Card id="conteudo-gerado" className={cn(
                  "bg-white/75 backdrop-blur-xl border-white/40 shadow-xl",
                  isMobile && "mx-0 shadow-md"
                )}>
                  <CardHeader className={cn(isMobile && "px-4 py-3")}>
                    <CardTitle className={cn(
                      "text-xl text-slate-900 font-bold flex items-center gap-2",
                      isMobile && "text-lg"
                    )}>
                      <FileText className="h-5 w-5 text-purple-600" />
                      Conteúdo Gerado
                    </CardTitle>
                  </CardHeader>

                  {/* Mobile Action Toolbar */}
                  {isMobile && materialDidaticoV2 && (
                    <div className="px-4 pb-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          onClick={async () => {
                            if (!materialDidaticoV2) {
                              toast({
                                title: "Erro",
                                description: "Material didático não disponível para impressão",
                                variant: "destructive",
                              });
                              return;
                            }

                            setIsPrintingPDF(true);
                            
                            try {
                              await printMaterialDidatico('material-didatico-content', {
                                lectureTitle: lectureTitle || 'Material Didático',
                                teacherName: teacherName || undefined,
                                date: new Date().toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: 'long',
                                  year: 'numeric',
                                }),
                              });
                              
                              toast({
                                title: "✅ PDF gerado com sucesso!",
                                description: "O arquivo foi baixado para seu dispositivo",
                              });
                            } catch (error) {
                              console.error('Erro ao gerar PDF:', error);
                              toast({
                                title: "Erro ao gerar PDF",
                                description: error instanceof Error ? error.message : "Erro desconhecido ao gerar PDF",
                                variant: "destructive",
                              });
                            } finally {
                              setIsPrintingPDF(false);
                            }
                          }}
                          disabled={isPrintingPDF}
                          variant="outline"
                          className="w-full min-h-[44px]"
                        >
                          {isPrintingPDF ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Gerando...
                            </>
                          ) : (
                            <>
                              <Printer className="h-4 w-4 mr-2" />
                              PDF
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={handleGenerateMaterialV2}
                          disabled={isGeneratingMaterialV2}
                          className="w-full min-h-[44px] bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
                        >
                          {isGeneratingMaterialV2 ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Gerando...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 mr-2" />
                              Gerar
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Desktop Action Buttons - Keep original button group */}
                  {!isMobile && (
                    <div className="absolute top-6 right-6 flex gap-2">
                      {/* Botão de Impressão - só aparece quando material v2 existe */}
                      {materialDidaticoV2 && (
                        <Button
                          onClick={async () => {
                            if (!materialDidaticoV2) {
                              toast({
                                title: "Erro",
                                description: "Material didático não disponível para impressão",
                                variant: "destructive",
                              });
                              return;
                            }

                            setIsPrintingPDF(true);
                            
                            try {
                              await printMaterialDidatico('material-didatico-content', {
                                lectureTitle: lectureTitle || 'Material Didático',
                                teacherName: teacherName || undefined,
                                date: new Date().toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: 'long',
                                  year: 'numeric',
                                }),
                              });
                              
                              toast({
                                title: "✅ PDF gerado com sucesso!",
                                description: "O arquivo foi baixado para seu dispositivo",
                              });
                            } catch (error) {
                              console.error('Erro ao gerar PDF:', error);
                              toast({
                                title: "Erro ao gerar PDF",
                                description: "Ocorreu um erro ao processar o material para impressão",
                                variant: "destructive",
                              });
                            } finally {
                              setIsPrintingPDF(false);
                            }
                          }}
                          disabled={isPrintingPDF}
                          size="sm"
                          variant="outline"
                          className={cn(
                            "border-purple-600 text-purple-700 hover:bg-purple-50",
                            isMobile && "min-h-[44px]"
                          )}
                        >
                          {isPrintingPDF ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              {isMobile ? "PDF..." : "Gerando PDF..."}
                            </>
                          ) : (
                            <>
                              <Printer className="h-4 w-4 mr-2" />
                              {isMobile ? "PDF" : "Imprimir PDF"}
                            </>
                          )}
                        </Button>
                      )}
                      
                      {/* FASE 8: GenerateLectureDeepSearchSummary component hidden - only using V2 button */}
                      <div className="flex gap-2">
                        <Button
                          onClick={handleGenerateMaterialV2}
                          disabled={isGeneratingMaterialV2}
                          size="sm"
                          className={cn(
                            "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md",
                            isMobile && "min-h-[44px]"
                          )}
                        >
                          {isGeneratingMaterialV2 ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              {isMobile ? "Gerando..." : "Gerando..."}
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 mr-2" />
                              {isMobile ? "Gerar Material" : "Gerar Material Didático"}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {isGeneratingMaterialV2 && (
                    <div className={cn(
                      "px-6 pb-4",
                      isMobile && "px-4 pb-3"
                    )}>
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-purple-700">
                          <Loader2 className={cn(
                            "animate-spin",
                            isMobile ? "h-3 w-3" : "h-4 w-4"
                          )} />
                          <span className={cn(
                            "font-medium",
                            isMobile ? "text-xs" : "text-sm"
                          )}>
                            {materialV2Progress}
                          </span>
                        </div>
                        {!isMobile && (
                          <p className="text-xs text-purple-600 mt-1">
                            Este processo pode levar 1-2 minutos (pesquisa acadêmica + geração de conteúdo)
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <CardContent className={cn(isMobile && "px-4 py-3")}>
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'resumo' | 'material-v2')} className="w-full">
                      <TabsList className={cn(
                        "grid w-full grid-cols-2 bg-muted/50 p-1 gap-1",
                        isMobile ? "min-h-[48px]" : "min-h-[52px]"
                      )}>
                        <TabsTrigger 
                          value="resumo" 
                          className="text-sm sm:text-base data-[state=active]:shadow-none h-full py-3 flex items-center justify-center gap-2"
                        >
                          <FileText className="h-4 w-4 flex-shrink-0" />
                          <span className={cn(isMobile && "text-xs")}>
                            {isMobile ? "Transcrição" : "Transcrição da Aula"}
                          </span>
                        </TabsTrigger>
                        <TabsTrigger 
                          value="material-v2" 
                          disabled={!materialDidaticoV2}
                          className="text-sm sm:text-base data-[state=active]:shadow-none h-full py-3 flex items-center justify-center gap-2"
                        >
                          <Sparkles className="h-4 w-4 flex-shrink-0" />
                          <span className={cn(isMobile && "text-xs")}>
                            {isMobile ? "Material" : "Material Didático"}
                          </span>
                          {materialDidaticoV2 && (
                            <Badge variant="default" className={cn(
                              "ml-1 bg-green-600",
                              isMobile ? "text-[10px] px-1" : "text-xs"
                            )}>
                              ✓
                            </Badge>
                          )}
                        </TabsTrigger>
                      </TabsList>
                      
                      {/* Swipe hint indicator for mobile */}
                      {isMobile && (
                        <div className="flex items-center justify-center gap-2 py-2 text-xs text-purple-600 animate-pulse">
                          <span>←</span>
                          <span>Deslize para trocar abas</span>
                          <span>→</span>
                        </div>
                      )}
                      
                      <TabsContent 
                        value="resumo" 
                        className="mt-4"
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                      >
                        <ScrollArea className={cn(
                          isMobile 
                            ? "h-[calc(100vh-500px)]" 
                            : "h-[calc(100vh-200px)]"
                        )}>
                          <div className="overflow-x-auto">
                            <FormattedTranscriptViewer transcript={lecture?.raw_transcript || ''} />
                          </div>
                        </ScrollArea>
                      </TabsContent>
                      
                      <TabsContent 
                        value="material-v2" 
                        className="overflow-x-auto mt-4"
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                      >
                        {materialDidaticoV2 ? (
                          <>
                            <div>
                              {/* Teacher Badge - Mobile Optimized */}
                              {teacherName && (
                                <div className={cn(
                                  "flex items-center gap-2 mb-2 px-3 py-1.5 bg-primary/5 border border-primary/10 rounded-md w-fit",
                                  isMobile && "px-2 py-1 mb-1"
                                )}>
                                  <Users className={cn(
                                    "h-4 w-4 text-primary",
                                    isMobile && "h-3 w-3"
                                  )} />
                                  <span className={cn(
                                    "text-xs font-medium",
                                    isMobile && "text-[10px]"
                                  )}>
                                    Prof: <strong className="text-foreground">{teacherName}</strong>
                                  </span>
                                </div>
                              )}
                              
                              {/* WRAP CONTENT IN SCROLLABLE CONTAINER */}
                              <ScrollArea className={cn(
                                isMobile 
                                  ? "h-[calc(100vh-450px)] overflow-x-hidden" 
                                  : "h-[calc(100vh-200px)]"
                              )}>
                                <div id="material-didatico-content" className={cn(
                                  "min-w-0 max-w-full bg-white rounded-lg overflow-hidden overflow-x-hidden",
                                  isMobile ? "p-3" : "p-6"
                                )}>
                              {/* FASE 9: Banner de Aviso de Erros LaTeX */}
                              {hasLatexErrors && (
                                <div className="mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg">
                                  <div className="flex items-start gap-3">
                                    <span className="text-2xl">⚠️</span>
                                    <div className="flex-1">
                                      <p className="font-semibold text-yellow-900 mb-1">
                                        Erros de Renderização Detectados
                                      </p>
                                      <p className="text-sm text-yellow-800 mb-3">
                                        Detectamos problemas na renderização de fórmulas LaTeX. Recomendamos gerar o material novamente para corrigir automaticamente.
                                      </p>
                                      <Button
                                        onClick={handleGenerateMaterialV2}
                                        disabled={isGeneratingMaterialV2}
                                        size="sm"
                                        variant="outline"
                                        className="border-yellow-600 text-yellow-700 hover:bg-yellow-100"
                                      >
                                        {isGeneratingMaterialV2 ? (
                                          <>
                                            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                                            Regenerando...
                                          </>
                                        ) : (
                                          <>
                                            <RefreshCw className="h-3 w-3 mr-2" />
                                            Regenerar Material
                                          </>
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              <MaterialDidaticoRenderer
                                markdown={removeAIIntroText(materialDidaticoV2)}
                              />
                            </div>

                            {/* 📸 SCREENSHOT GALLERY */}
                            {capturedScreenshots.length > 0 && (
                              <Card className="p-6 mt-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
...
                              </Card>
                            )}
                          </ScrollArea>
                        </div>
                      </>
                    ) : (
                          <div className="text-center py-8 bg-slate-50 rounded-lg">
                            <Sparkles className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-600 mb-4 font-medium">Material modular ainda não gerado</p>
                            <p className="text-slate-500 text-sm px-4">
                              Este é o novo sistema de geração de material didático com pesquisa acadêmica e validação avançada
                            </p>
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>

                {/* Main topics */}
                <Card id="topicos-principais" className="bg-white/75 backdrop-blur-xl border-white/40 shadow-xl">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-xl text-slate-900 font-bold flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-purple-600" />
                      Tópicos Principais
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9"
                      onClick={() => openEditModal('Tópicos', { topicos_principais: structuredContent.topicos_principais })}
                    >
                      <Sparkles className="h-4 w-4 mr-1" />
                      Editar com IA
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-white p-4 rounded-lg space-y-4">
                      {(structuredContent?.topicos_principais || []).map((topico, index) => (
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


                {/* Quiz questions */}
                <Card id="perguntas-revisao" className="bg-white/75 backdrop-blur-xl border-white/40 shadow-xl">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-xl text-slate-900 font-bold flex items-center gap-2">
                      <CheckSquare className="h-5 w-5 text-purple-600" />
                      Perguntas de Revisão ({generatedQuiz?.questions?.length || structuredContent?.perguntas_revisao?.length || 0})
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
                    {isMobile ? (
                      // Mobile: Single question with swipe navigation
                      <div className="relative">
                        {(() => {
                          const questions = generatedQuiz?.questions || structuredContent?.perguntas_revisao || [];
                          if (questions.length === 0) return <p className="text-center text-slate-500 py-8">Nenhuma pergunta disponível</p>;
                          
                          const pergunta = questions[currentQuestionIndex];
                          const isTeacherQuiz = pergunta.options && typeof pergunta.options === 'object';
                          
                          return (
                            <>
                              <div className="text-center mb-3">
                                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">
                                  Questão {currentQuestionIndex + 1} de {questions.length}
                                </Badge>
                              </div>
                              
                              <div
                                onTouchStart={handleQuestionTouchStart}
                                onTouchEnd={handleQuestionTouchEnd}
                                className="bg-white rounded-lg p-4 border border-slate-200 min-h-[240px]"
                              >
                                {isTeacherQuiz ? (
                                  <>
                                    {pergunta.bloomLevel && <Badge className="mb-2 bg-purple-50 text-purple-700">{pergunta.bloomLevel}</Badge>}
                                    <p className="text-slate-900 font-medium mb-3">{currentQuestionIndex + 1}. {pergunta.question}</p>
                                    <div className="space-y-2">
                                      {Object.entries(pergunta.options).map(([letter, text]) => (
                                        <div key={letter} className={`p-3 rounded ${letter === pergunta.correctAnswer ? 'bg-green-100 border border-green-300' : 'bg-slate-50'}`}>
                                          <span className="text-slate-900 text-sm"><span className="font-semibold mr-2">{letter})</span>{text as string}</span>
                                          {letter === pergunta.correctAnswer && <Check className="inline-block h-4 w-4 text-green-600 ml-2" />}
                                        </div>
                                      ))}
                                    </div>
                                    {pergunta.explanation && (
                                      <div className="mt-3 p-3 bg-blue-50 rounded">
                                        <p className="text-xs font-semibold text-blue-900">💡 Explicação:</p>
                                        <p className="text-sm text-blue-800">{pergunta.explanation}</p>
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <p className="text-slate-900 font-medium mb-3">{currentQuestionIndex + 1}. {pergunta.pergunta}</p>
                                    <div className="space-y-2">
                                      {(pergunta?.opcoes || []).map((opcao, opIndex) => (
                                        <div key={opIndex} className={`p-3 rounded ${opcao.startsWith(pergunta.resposta_correta) ? 'bg-green-100 border border-green-300' : 'bg-slate-50'}`}>
                                          <span className="text-slate-900 text-sm">{opcao}</span>
                                          {opcao.startsWith(pergunta.resposta_correta) && <Check className="inline-block h-4 w-4 text-green-600 ml-2" />}
                                        </div>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                              
                              <div className="flex items-center justify-between mt-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                                  disabled={currentQuestionIndex === 0}
                                  className="min-h-[44px] min-w-[90px] px-3 text-xs"
                                >
                                  <ChevronLeft className="h-4 w-4 mr-1" />
                                  Anterior
                                </Button>
                                
                                <div className="flex gap-1 min-w-[60px] justify-center">
                                  {questions.map((_, idx) => (
                                    <div
                                      key={idx}
                                      className={cn(
                                        "h-2 rounded-full transition-all",
                                        idx === currentQuestionIndex 
                                          ? "bg-purple-600 w-4" 
                                          : "bg-slate-300 w-2"
                                      )}
                                    />
                                  ))}
                                </div>
                                
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
                                  disabled={currentQuestionIndex === questions.length - 1}
                                  className="min-h-[44px] min-w-[90px] px-3 text-xs"
                                >
                                  Próxima
                                  <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      // Desktop: Original ScrollArea view
                      <ScrollArea className="h-[400px] pr-4">
                        <div className="space-y-6">
                          {(generatedQuiz?.questions || structuredContent?.perguntas_revisao || []).map((pergunta, index) => {
                            const isTeacherQuiz = pergunta.options && typeof pergunta.options === 'object';
                            
                            if (isTeacherQuiz) {
                              const opts = Object.entries(pergunta.options).map(([k, v]) => ({ letter: k, text: v as string }));
                              return (
                                <div key={index} className="bg-white rounded-lg p-4 border border-slate-200 relative group">
                                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 hover:bg-purple-100 text-purple-600 hover:text-purple-700"
                                      onClick={() => handleEditQuizQuestionWithAI(index, pergunta)}
                                    >
                                      <Pencil className="h-3.5 w-3.5 icon-shimmer" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 hover:bg-red-100 text-red-500 hover:text-red-600"
                                      onClick={() => handleDeleteQuizQuestion(index)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>

                                  {pergunta.bloomLevel && <Badge className="mb-2 bg-purple-50 text-purple-700">{pergunta.bloomLevel}</Badge>}
                                  <p className="text-slate-900 font-medium mb-3 pr-16">{index + 1}. {pergunta.question}</p>
                                  <div className="space-y-2">
                                    {opts.map(o => (
                                      <div key={o.letter} className={`p-3 rounded ${o.letter === pergunta.correctAnswer ? 'bg-green-100 border border-green-300' : 'bg-slate-50'}`}>
                                        <span className="text-slate-900 text-sm"><span className="font-semibold mr-2">{o.letter})</span>{o.text}</span>
                                        {o.letter === pergunta.correctAnswer && <Check className="inline-block h-4 w-4 text-green-600 ml-2" />}
                                      </div>
                                    ))}
                                  </div>
                                  {pergunta.explanation && <div className="mt-3 p-3 bg-blue-50 rounded"><p className="text-xs font-semibold text-blue-900">💡 Explicação:</p><p className="text-sm text-blue-800">{pergunta.explanation}</p></div>}
                                </div>
                              );
                            }
                            return (
                              <div key={index} className="bg-white rounded-lg p-4 border border-slate-200">
                                <p className="text-slate-900 font-medium mb-3">{index + 1}. {pergunta.pergunta}</p>
                                <div className="space-y-2">
                                  {(pergunta?.opcoes || []).map((opcao, opIndex) => (
                                    <div key={opIndex} className={`p-3 rounded ${opcao.startsWith(pergunta.resposta_correta) ? 'bg-green-100 border border-green-300' : 'bg-slate-50'}`}>
                                      <span className="text-slate-900 text-sm">{opcao}</span>
                                      {opcao.startsWith(pergunta.resposta_correta) && <Check className="inline-block h-4 w-4 text-green-600 ml-2" />}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                          
                          <Button
                            variant="outline"
                            className="w-full border-2 border-dashed border-slate-300 hover:border-purple-400 hover:bg-purple-50 text-slate-600 hover:text-purple-700"
                            onClick={handleAddQuizQuestion}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Adicionar Nova Pergunta
                          </Button>
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>

                {/* Flashcards */}
                <Card id="flashcards" className="bg-white/75 backdrop-blur-xl border-white/40 shadow-xl">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-xl text-slate-900 font-bold flex items-center gap-2">
                      <Brain className="h-5 w-5 text-purple-600" />
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
                    {(generatedFlashcards && generatedFlashcards.cards.length > 0) || 
                     (structuredContent?.flashcards && structuredContent.flashcards.length > 0) ? (
                      isMobile ? (
                        <div className="relative">
                          {(() => {
                            const cards = generatedFlashcards?.cards || structuredContent.flashcards.map((fc: any) => ({ front: fc.termo, back: fc.definicao, tags: [] }));
                            if (cards.length === 0) return null;
                            const card = cards[currentFlashcardIndex];
                            return (
                              <>
                                <div className="text-center mb-3">
                                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">Card {currentFlashcardIndex + 1} de {cards.length}</Badge>
                                </div>
                                <div onClick={() => setIsFlashcardFlipped(!isFlashcardFlipped)} onTouchStart={handleFlashcardTouchStart} onTouchEnd={handleFlashcardTouchEnd} className={cn("relative h-[200px] cursor-pointer transition-transform duration-500 [transform-style:preserve-3d]", isFlashcardFlipped && "[transform:rotateY(180deg)]")}>
                                  <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-6 border-2 border-purple-200 [backface-visibility:hidden] flex items-center justify-center"><h3 className="text-lg font-bold text-purple-900 text-center">{card.front || card.termo}</h3></div>
                                  <div className="absolute inset-0 bg-gradient-to-br from-pink-50 to-purple-50 rounded-lg p-6 border-2 border-pink-200 [transform:rotateY(180deg)] [backface-visibility:hidden] flex items-center justify-center"><p className="text-sm text-slate-700 text-center">{card.back || card.definicao}</p></div>
                                </div>
                                <p className="text-center text-xs text-slate-500 mt-2">Toque para virar · Deslize para navegar</p>
                                <div className="flex items-center justify-between mt-4">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => { 
                                      setCurrentFlashcardIndex(prev => Math.max(0, prev - 1)); 
                                      setIsFlashcardFlipped(false); 
                                    }} 
                                    disabled={currentFlashcardIndex === 0} 
                                    className="min-h-[44px] min-w-[90px] px-3 text-xs"
                                  >
                                    <ChevronLeft className="h-4 w-4 mr-1" />
                                    Anterior
                                  </Button>
                                  <div className="flex gap-1 min-w-[60px] justify-center">
                                    {cards.map((_, idx) => (
                                      <div 
                                        key={idx} 
                                        className={cn(
                                          "h-2 rounded-full transition-all", 
                                          idx === currentFlashcardIndex 
                                            ? "bg-purple-600 w-4" 
                                            : "bg-slate-300 w-2"
                                        )} 
                                      />
                                    ))}
                                  </div>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => { 
                                      setCurrentFlashcardIndex(prev => Math.min(cards.length - 1, prev + 1)); 
                                      setIsFlashcardFlipped(false); 
                                    }} 
                                    disabled={currentFlashcardIndex === cards.length - 1} 
                                    className="min-h-[44px] min-w-[90px] px-3 text-xs"
                                  >
                                    Próximo
                                    <ChevronRight className="h-4 w-4 ml-1" />
                                  </Button>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {(generatedFlashcards?.cards || structuredContent.flashcards.map((fc: any) => ({ front: fc.termo, back: fc.definicao, tags: [] }))).map((card, index) => (
                            <div key={index} className="bg-white rounded-lg p-4 border border-slate-200 relative group">
                              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-purple-100 text-purple-600 hover:text-purple-700" onClick={() => handleEditFlashcardWithAI(index, card)}><Pencil className="h-3 w-3 icon-shimmer" /></Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-red-100 text-red-500 hover:text-red-600" onClick={() => handleDeleteFlashcard(index)}><Trash2 className="h-3 w-3" /></Button>
                              </div>
                              {card.tags && card.tags.length > 0 && <div className="flex flex-wrap gap-1 mb-2">{card.tags.map((tag: string, i: number) => <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>)}</div>}
                              <h4 className="text-purple-700 font-semibold mb-2 text-base pr-14">{card.front || card.termo}</h4>
                              <p className="text-slate-600 text-sm">{card.back || card.definicao}</p>
                            </div>
                          ))}
                          <Button variant="outline" className="h-full min-h-[120px] border-2 border-dashed border-slate-300 hover:border-purple-400 hover:bg-purple-50 text-slate-600 hover:text-purple-700" onClick={handleAddFlashcard}><Plus className="h-5 w-5 mr-2" />Adicionar Novo Flashcard</Button>
                        </div>
                      )
                    ) : (
                      <div className="text-center py-8">
                        <Brain className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 mb-4">Nenhum flashcard gerado ainda</p>
                        <Button
                          onClick={handleAddFlashcard}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          Gerar Primeiro Flashcard com IA
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right column - Tools and actions */}
              <div className="space-y-6">
                {/* Thumbnail panel */}
                <Card className="bg-white/75 backdrop-blur-xl border-white/40 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-lg text-slate-900 font-bold flex items-center gap-2">
                      <ImageIcon className="h-5 w-5 text-purple-600" />
                      Thumbnail da Aula
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {isGeneratingThumbnail ? (
                      <div className="flex items-center justify-center h-40 bg-white rounded-lg border border-slate-300">
                        <Loader2 className="h-5 w-5 text-purple-600 animate-spin" />
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
                        className="flex-1 bg-white border-slate-300 text-slate-900 hover:bg-white/80"
                        size="sm"
                        onClick={() => document.getElementById('thumbnail-upload')?.click()}
                      >
                        <Upload className="h-3 w-3 mr-1" />
                        Upload
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                 {/* Audio Player */}
                <Card className="bg-white/75 backdrop-blur-xl border-white/40 shadow-xl mt-4">
                  <CardHeader>
                    <CardTitle className="text-lg text-slate-900 font-bold flex items-center gap-2">
                      <Play className="h-5 w-5 text-purple-600" />
                      Áudio da Aula
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {lecture?.audio_url ? (
                      <div className="bg-white/90 backdrop-blur-xl rounded-lg p-4 border border-white/30 shadow-lg">
                        <audio
                          ref={audioRef}
                          src={lecture.audio_url}
                          onTimeUpdate={(e) => {
                            const time = e.currentTarget.currentTime;
                            if (!isNaN(time)) setCurrentTime(time);
                          }}
                          onLoadedMetadata={(e) => {
                            const dur = e.currentTarget.duration;
                            if (!isNaN(dur) && isFinite(dur)) setDuration(dur);
                          }}
                          onDurationChange={(e) => {
                            const dur = e.currentTarget.duration;
                            if (!isNaN(dur) && isFinite(dur)) setDuration(dur);
                          }}
                          onCanPlay={(e) => {
                            const dur = e.currentTarget.duration;
                            if (!isNaN(dur) && isFinite(dur) && duration === 0) {
                              setDuration(dur);
                            }
                          }}
                          onEnded={() => setIsPlaying(false)}
                        />
                        
                        {/* Progress bar */}
                        <div className="mb-4">
                          <Slider
                            value={[currentTime]}
                            max={duration > 0 ? duration : 100}
                            step={0.1}
                            onValueChange={([value]) => {
                              if (audioRef.current && duration > 0) {
                                audioRef.current.currentTime = value;
                              }
                            }}
                            className="w-full [&_[role=slider]]:bg-purple-600 [&_[role=slider]]:border-2 [&_[role=slider]]:border-white [&_[role=slider]]:shadow-lg"
                          />
                          <div className="flex justify-between text-xs text-slate-600 mt-2">
                            <span className="font-medium">{formatTime(currentTime)}</span>
                            <span className="sm:hidden">{duration > 0 ? formatTime(duration) : '...'}</span>
                          </div>
                        </div>
                        
                        {/* Controls - Inline on mobile */}
                        <div className={cn(
                          "flex items-center gap-2",
                          isMobile ? "justify-between" : "justify-start flex-wrap"
                        )}>
                          {/* Play/Pause */}
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              if (audioRef.current) {
                                if (isPlaying) {
                                  audioRef.current.pause();
                                } else {
                                  audioRef.current.play();
                                }
                                setIsPlaying(!isPlaying);
                              }
                            }}
                            className="h-11 w-11 shrink-0"
                          >
                            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                          </Button>
                          
                          {/* Speed Control */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const speeds = [1, 1.5, 2, 0.5];
                              const currentIndex = speeds.indexOf(playbackSpeed);
                              const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
                              setPlaybackSpeed(nextSpeed);
                              if (audioRef.current) audioRef.current.playbackRate = nextSpeed;
                            }}
                            className={cn(
                              "shrink-0",
                              isMobile ? "min-w-[55px] h-11" : "min-w-[60px] h-10"
                            )}
                          >
                            {playbackSpeed}x
                          </Button>
                          
                          {/* Download Button - Icon only on mobile */}
                          <Button
                            variant="outline"
                            size={isMobile ? "icon" : "sm"}
                            className={cn(
                              "shrink-0",
                              isMobile ? "h-11 w-11" : "gap-2 h-10"
                            )}
                            onClick={async () => {
                              try {
                                toast({ title: 'Preparando download...' });
                                
                                const response = await fetch(lecture.audio_url!);
                                const blob = await response.blob();
                                const url = window.URL.createObjectURL(blob);
                                
                                const a = document.createElement('a');
                                a.style.display = 'none';
                                a.href = url;
                                a.download = `${lectureTitle}.webm`;
                                document.body.appendChild(a);
                                a.click();
                                
                                setTimeout(() => {
                                  window.URL.revokeObjectURL(url);
                                  document.body.removeChild(a);
                                }, 100);
                                
                                toast({ title: '✅ Áudio baixado com sucesso!' });
                              } catch (error) {
                                console.error('Download error:', error);
                                toast({ 
                                  variant: 'destructive', 
                                  title: 'Erro ao baixar áudio',
                                  description: 'Tente novamente ou verifique sua conexão'
                                });
                              }
                            }}
                          >
                            <Download className="h-4 w-4" />
                            {!isMobile && <span>Baixar Áudio</span>}
                          </Button>
                          
                          {/* Time display - Desktop only */}
                          {!isMobile && duration > 0 && (
                            <span className="text-sm text-slate-600 font-medium ml-auto">
                              {formatTime(duration)}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white p-4 rounded-lg text-center">
                        <p className="text-slate-600 text-sm">Nenhum áudio disponível para esta aula.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* References - Movido para o final */}
                <Card className="bg-white/75 backdrop-blur-xl border-white/40 shadow-xl">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg text-slate-900 font-bold flex items-center gap-2">
                      <ExternalLink className="h-5 w-5 text-purple-600" />
                      Referências Externas
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setIsAddingReference(true)}
                      className="h-9 w-9 bg-green-50 border-green-300 text-green-700 hover:bg-green-100 transition-colors"
                      title="Adicionar Nova Referência"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(structuredContent?.referencias_externas || []).map((ref, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-2 p-3 pr-16 sm:pr-20 lg:pr-16 bg-white rounded-lg border border-slate-200 group relative overflow-hidden"
                        >
                          {/* Action buttons (aparecem no hover) */}
                          <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 hover:bg-blue-100 text-blue-600"
                              onClick={() => {
                                setEditingReferenceIndex(index);
                                setEditingReference(ref);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 hover:bg-red-100 text-red-600"
                              onClick={() => handleDeleteReference(index)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          
                          <ExternalLink className="h-4 w-4 text-purple-600 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <a
                              href={ref.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-slate-900 font-medium hover:text-purple-600 transition-colors line-clamp-2 block"
                            >
                              {ref.titulo}
                            </a>
                            <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700 border-purple-300 mt-1">
                              {ref.tipo === 'site' && '🌐 '}
                              {ref.tipo === 'livro' && '📚 '}
                              {ref.tipo === 'artigo' && '📄 '}
                              {ref.tipo === 'apresentação' && '📊 '}
                              {ref.tipo === 'vídeo' && '🎥 '}
                              {ref.tipo.charAt(0).toUpperCase() + ref.tipo.slice(1)}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Dialog: Adicionar Nova Referência */}
                <Dialog open={isAddingReference} onOpenChange={setIsAddingReference}>
                  <DialogContent className="sm:max-w-lg bg-white">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-slate-900">
                        <Plus className="h-5 w-5 text-green-600" />
                        Adicionar Nova Referência
                      </DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                      {/* Título */}
                      <div className="space-y-2">
                        <Label htmlFor="ref-title" className="text-sm font-medium text-slate-700">
                          Título da Referência *
                        </Label>
                        <Input
                          id="ref-title"
                          placeholder="Ex: Introdução à Mecânica dos Fluidos"
                          value={newReference.titulo}
                          onChange={(e) => setNewReference({ ...newReference, titulo: e.target.value })}
                          className="border-slate-300 focus:border-purple-500"
                        />
                      </div>

                      {/* URL */}
                      <div className="space-y-2">
                        <Label htmlFor="ref-url" className="text-sm font-medium text-slate-700">
                          Link (URL) *
                        </Label>
                        <Input
                          id="ref-url"
                          type="url"
                          placeholder="https://..."
                          value={newReference.url}
                          onChange={(e) => setNewReference({ ...newReference, url: e.target.value })}
                          className={`border-slate-300 focus:border-purple-500 ${
                            newReference.url && !isValidUrl(newReference.url) 
                              ? 'border-red-500 focus:border-red-500' 
                              : ''
                          }`}
                        />
                        {newReference.url && !isValidUrl(newReference.url) && (
                          <p className="text-xs text-red-600">⚠️ URL inválida. Use o formato: https://...</p>
                        )}
                      </div>

                      {/* Tipo */}
                      <div className="space-y-2">
                        <Label htmlFor="ref-type" className="text-sm font-medium text-slate-700">
                          Tipo de Referência *
                        </Label>
                        <Select
                          value={newReference.tipo}
                          onValueChange={(value) => setNewReference({ ...newReference, tipo: value as any })}
                        >
                          <SelectTrigger className="border-slate-300 focus:border-purple-500">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="site">🌐 Site</SelectItem>
                            <SelectItem value="livro">📚 Livro</SelectItem>
                            <SelectItem value="artigo">📄 Artigo</SelectItem>
                            <SelectItem value="apresentação">📊 Apresentação</SelectItem>
                            <SelectItem value="vídeo">🎥 Vídeo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Botões */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsAddingReference(false);
                          setNewReference({ titulo: '', url: '', tipo: 'site' });
                        }}
                        className="border-slate-300 text-slate-700 hover:bg-slate-100"
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleAddReference}
                        disabled={
                          !newReference.titulo.trim() || 
                          !newReference.url.trim() || 
                          !isValidUrl(newReference.url)
                        }
                        className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Salvar Referência
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Dialog: Editar Referência */}
                <Dialog 
                  open={editingReferenceIndex !== null} 
                  onOpenChange={(open) => {
                    if (!open) {
                      setEditingReferenceIndex(null);
                      setEditingReference(null);
                    }
                  }}
                >
                  <DialogContent className="sm:max-w-lg bg-white">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-slate-900">
                        <Pencil className="h-5 w-5 text-blue-600" />
                        Editar Referência
                      </DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                      {/* Título */}
                      <div className="space-y-2">
                        <Label htmlFor="edit-ref-title" className="text-sm font-medium text-slate-700">
                          Título da Referência *
                        </Label>
                        <Input
                          id="edit-ref-title"
                          placeholder="Ex: Introdução à Mecânica dos Fluidos"
                          value={editingReference?.titulo || ''}
                          onChange={(e) => setEditingReference({ ...editingReference, titulo: e.target.value })}
                          className="border-slate-300 focus:border-purple-500"
                        />
                      </div>

                      {/* URL */}
                      <div className="space-y-2">
                        <Label htmlFor="edit-ref-url" className="text-sm font-medium text-slate-700">
                          Link (URL) *
                        </Label>
                        <Input
                          id="edit-ref-url"
                          type="url"
                          placeholder="https://..."
                          value={editingReference?.url || ''}
                          onChange={(e) => setEditingReference({ ...editingReference, url: e.target.value })}
                          className={`border-slate-300 focus:border-purple-500 ${
                            editingReference?.url && !isValidUrl(editingReference.url) 
                              ? 'border-red-500 focus:border-red-500' 
                              : ''
                          }`}
                        />
                        {editingReference?.url && !isValidUrl(editingReference.url) && (
                          <p className="text-xs text-red-600">⚠️ URL inválida. Use o formato: https://...</p>
                        )}
                      </div>

                      {/* Tipo */}
                      <div className="space-y-2">
                        <Label htmlFor="edit-ref-type" className="text-sm font-medium text-slate-700">
                          Tipo de Referência *
                        </Label>
                        <Select
                          value={editingReference?.tipo || 'site'}
                          onValueChange={(value) => setEditingReference({ ...editingReference, tipo: value })}
                        >
                          <SelectTrigger className="border-slate-300 focus:border-purple-500">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="site">🌐 Site</SelectItem>
                            <SelectItem value="livro">📚 Livro</SelectItem>
                            <SelectItem value="artigo">📄 Artigo</SelectItem>
                            <SelectItem value="apresentação">📊 Apresentação</SelectItem>
                            <SelectItem value="vídeo">🎥 Vídeo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Botões */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingReferenceIndex(null);
                          setEditingReference(null);
                        }}
                        className="border-slate-300 text-slate-700 hover:bg-slate-100"
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleEditReference}
                        disabled={
                          !editingReference?.titulo?.trim() || 
                          !editingReference?.url?.trim() || 
                          !isValidUrl(editingReference?.url || '')
                        }
                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Salvar Alterações
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Materials panel */}
                <Card className="bg-white/75 backdrop-blur-xl border-white/40 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-lg text-slate-900 font-bold flex items-center gap-2">
                      <FileUp className="h-5 w-5 text-purple-600" />
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
                    <CardTitle className="text-lg text-slate-900 font-bold flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      Análise da Aula
                    </CardTitle>
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
                    <CardTitle className="text-lg text-slate-900 font-bold flex items-center gap-2">
                      <Users className="h-5 w-5 text-purple-600" />
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
                    <CardTitle className="text-lg text-slate-900 font-bold flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-purple-600" />
                      Estatísticas
                    </CardTitle>
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

          {/* Sticky Action Buttons - Mobile Only */}
          {isMobile && structuredContent && (
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200 px-4 py-3 shadow-2xl">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={async () => {
                    if (!id || !structuredContent) return;
                    
                    try {
                      const currentContent = structuredContent as Record<string, any>;
                      const contentToSave = {
                        ...currentContent,
                        thumbnail: thumbnailUrl || currentContent.thumbnail || ''
                      };

                      const { error } = await supabase
                        .from('lectures')
                        .update({
                          structured_content: contentToSave,
                          title: lectureTitle,
                          updated_at: new Date().toISOString()
                        })
                        .eq('id', id);

                      if (error) throw error;

                      toast({
                        title: 'Salvo! 💾',
                        description: 'Progresso salvo com sucesso',
                      });
                      
                      setHasUnsavedChanges(false);
                    } catch (err) {
                      console.error('Save error:', err);
                      toast({
                        title: 'Erro ao salvar',
                        description: 'Não foi possível salvar o progresso',
                        variant: 'destructive',
                      });
                    }
                  }}
                  className="flex-1 min-h-[48px]"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </Button>
                {lecture?.status !== 'published' && (
                  <Button
                    onClick={handlePublish}
                    disabled={!selectedClassId || isPublishing}
                    className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white min-h-[48px]"
                  >
                    <CheckSquare className="mr-2 h-4 w-4" />
                    Publicar
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Add padding to prevent content from being hidden behind sticky bar */}
          <div className={cn(isMobile && "pb-20")} />
        </div>

        {/* Edit with AI Modal */}
        <EditWithAIModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditPrefilledPrompt('');
          }}
          sectionTitle={editingSectionTitle}
          currentContent={editingSectionContent}
          onUpdate={handleContentUpdate}
          lectureId={id || ''}
          prefilledPrompt={editPrefilledPrompt}
        />

        {/* Publish Lecture Modal */}
        <PublishLectureModal
          open={openPublishModal}
          onOpenChange={setOpenPublishModal}
          lectureId={id || ''}
          initialTitle={lectureTitle}
          initialTurmaId={lecture?.turma_id || lecture?.class_id || derivedTurmaId || selectedClassId}
          initialDisciplinaId={lecture?.disciplina_id || ''}
        />

        {/* Quiz Viewer Modal */}
        {showQuizModal && generatedQuiz && (
          <TeacherQuizModal
            open={showQuizModal}
            onOpenChange={setShowQuizModal}
            quizData={generatedQuiz}
          />
        )}

        {/* Flashcards Viewer Modal */}
        {showFlashcardsModal && generatedFlashcards && (
          <TeacherFlashcardViewerModal
            isOpen={showFlashcardsModal}
            onClose={() => setShowFlashcardsModal(false)}
            flashcardSet={{
              id: generatedFlashcards.id,
              title: generatedFlashcards.title,
              cards: generatedFlashcards.cards.map(card => ({
                front: card.front || card.frente,
                back: card.back || card.verso,
                tags: card.tags || []
              }))
            }}
            hasQuiz={hasQuiz}
            onViewQuiz={() => setShowQuizModal(true)}
          />
        )}
      </div>

      {/* Floating Action Button - Mobile Navigation with Label */}
      {isMobile && structuredContent && (
        <div className="fixed bottom-24 right-4 z-50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="h-14 px-6 rounded-full shadow-2xl bg-gradient-to-br from-pink-500 via-rose-500 to-fuchsia-500 hover:from-pink-600 hover:via-rose-600 hover:to-fuchsia-600 hover:scale-105 transition-all duration-300 flex items-center gap-2 font-semibold text-white"
              >
                <Zap className="h-5 w-5" />
                <span className="text-sm">Ações Rápidas</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-64 bg-white/98 backdrop-blur-xl border-pink-200/50 shadow-2xl"
            >
              <div className="px-2 py-1.5 text-xs font-semibold text-purple-600 uppercase tracking-wide">
                Navegação Rápida
              </div>
              <DropdownMenuItem 
                onClick={() => scrollToSection('titulo-aula')}
                className="cursor-pointer hover:bg-purple-50 py-3"
              >
                <BookOpen className="h-4 w-4 mr-3 text-purple-600" />
                <span className="font-medium">Título da Aula</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => scrollToSection('conteudo-gerado')}
                className="cursor-pointer hover:bg-purple-50 py-3"
              >
                <FileText className="h-4 w-4 mr-3 text-purple-600" />
                <span className="font-medium">Conteúdo Gerado</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => scrollToSection('topicos-principais')}
                className="cursor-pointer hover:bg-purple-50 py-3"
              >
                <BookOpen className="h-4 w-4 mr-3 text-purple-600" />
                <span className="font-medium">Tópicos Abordados</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => scrollToSection('perguntas-revisao')}
                className="cursor-pointer hover:bg-purple-50 py-3"
              >
                <CheckSquare className="h-4 w-4 mr-3 text-purple-600" />
                <span className="font-medium">Perguntas de Revisão</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => scrollToSection('flashcards')}
                className="cursor-pointer hover:bg-purple-50 py-3"
              >
                <Brain className="h-4 w-4 mr-3 text-purple-600" />
                <span className="font-medium">Flashcards</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Legacy Save/Publish FAB - Hidden, functionality moved to sticky bar */}
      {false && isMobile && structuredContent && (
        <div className="fixed bottom-20 right-4 z-50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                className="h-14 w-14 rounded-full shadow-2xl bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 hover:scale-110 transition-transform"
              >
                <MoreVertical className="h-6 w-6 text-white" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem 
                onClick={async () => {
                  if (!selectedClassId) {
                    toast({
                      title: "Erro",
                      description: "Selecione uma turma antes de salvar",
                      variant: "destructive",
                    });
                    return;
                  }

                  try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session) {
                      toast({
                        title: "Erro de autenticação",
                        description: "Você precisa estar logado para salvar.",
                        variant: "destructive",
                      });
                      return;
                    }

                    const { data: lecture, error } = await supabase
                      .from('lectures')
                      .update({
                        title: lectureTitle,
                        structured_content: structuredContent as any,
                        material_didatico_v2: materialDidaticoV2,
                        turma_id: selectedClassId,
                      })
                      .eq('id', id)
                      .select()
                      .single();

                    if (error) throw error;

                    toast({
                      title: "✅ Progresso salvo!",
                      description: "Todas as alterações foram salvas com sucesso.",
                    });
                  } catch (error) {
                    console.error('Erro ao salvar:', error);
                    toast({
                      title: "Erro ao salvar",
                      description: "Não foi possível salvar as alterações. Tente novamente.",
                      variant: "destructive",
                    });
                  }
                }}
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar Progresso
              </DropdownMenuItem>
              
              {lecture?.status !== 'published' && (
                <DropdownMenuItem 
                  onClick={handlePublish} 
                  disabled={!selectedClassId}
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Publicar Aula
                </DropdownMenuItem>
              )}
              
              {materialDidaticoV2 && (
                <DropdownMenuItem onClick={handleGenerateMaterialV2}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Gerar Material
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Sticky bottom bar padding on mobile */}
      {isMobile && <div className="pb-20" />}
    </MainLayout>
  );
};

export default LectureTranscriptionPage;
