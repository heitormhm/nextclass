/**
 * 🏗️ ARQUITETURA REFATORADA - LectureTranscriptionPage
 * Página modularizada usando custom hooks e componentes dedicados
 */

import React, { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Image as ImageIcon } from 'lucide-react';
import MainLayout from '@/components/MainLayout';
import { TeacherBackgroundRipple } from '@/components/ui/teacher-background-ripple';
import { PublishLectureModal } from '@/components/PublishLectureModal';
import { TeacherQuizModal } from '@/components/TeacherQuizModal';
import { TeacherFlashcardViewerModal } from '@/components/TeacherFlashcardViewerModal';
import { Button } from '@/components/ui/button';

// Custom Hooks
import { useLectureData } from '@/features/lecture-transcription/hooks/useLectureData';
import { useLectureState } from '@/features/lecture-transcription/hooks/useLectureState';
import { useAutoSave } from '@/features/lecture-transcription/hooks/useAutoSave';
import { useQuizManagement } from '@/features/lecture-transcription/hooks/useQuizManagement';
import { useFlashcardsManagement } from '@/features/lecture-transcription/hooks/useFlashcardsManagement';
import { useReferencesManagement } from '@/features/lecture-transcription/hooks/useReferencesManagement';
import { useThumbnailGeneration } from '@/features/lecture-transcription/hooks/useThumbnailGeneration';
import { useJobSubscription } from '@/features/lecture-transcription/hooks/useJobSubscription';
import { useMaterialGeneration } from '@/features/lecture-transcription/hooks/useMaterialGeneration';

// Components
import { LectureHeader } from '@/features/lecture-transcription/components/LectureHeader';
import { LectureTitleEditor } from '@/features/lecture-transcription/components/LectureTitleEditor';
import { ThumbnailDisplay } from '@/features/lecture-transcription/components/ThumbnailDisplay';
import { QuizSection } from '@/features/lecture-transcription/components/QuizSection';
import { FlashcardsSection } from '@/features/lecture-transcription/components/FlashcardsSection';
import { TopicsSection } from '@/features/lecture-transcription/components/TopicsSection';
import { ReferencesSection } from '@/features/lecture-transcription/components/ReferencesSection';
import { ContentTabs } from '@/features/lecture-transcription/components/ContentTabs';
import { AudioPlayerCard } from '@/features/lecture-transcription/components/AudioPlayerCard';
import { PublishingControls } from '@/features/lecture-transcription/components/PublishingControls';
import { LessonPlanComparisonSection } from '@/features/lecture-transcription/components/LessonPlanComparisonSection';
import { MaterialViewer } from '@/features/lecture-transcription/components/MaterialViewer';
import { MaterialGenerationButton } from '@/features/material-didatico-generation/components/MaterialGenerationButton';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const LectureTranscriptionPage = () => {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  
  // UI State
  const [openPublishModal, setOpenPublishModal] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [showFlashcardsModal, setShowFlashcardsModal] = useState(false);
  const [lectureTitle, setLectureTitle] = useState('');
  const [isComparing, setIsComparing] = useState(false);
  const [isProcessingTranscript, setIsProcessingTranscript] = useState(false);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);
  const [isLoadingFlashcards, setIsLoadingFlashcards] = useState(false);

  // Data Hooks
  const { lecture, isLoading, reloadLecture, structuredContent: initialContent, setStructuredContent: setLectureContent } = useLectureData(id);
  const { structuredContent, setStructuredContent, updateContent, hasUnsavedChanges, resetUnsavedChanges } = useLectureState(initialContent);
  
  // Feature Hooks
  const quizManagement = useQuizManagement(id, lectureTitle, lecture?.tags || []);
  const flashcardsManagement = useFlashcardsManagement(id, lecture?.teacher_id || '', lectureTitle, lecture?.tags || []);
  const referencesManagement = useReferencesManagement(id, structuredContent, updateContent);
  const { thumbnailUrl, setThumbnailUrl, isGenerating: isGeneratingThumbnail, generateThumbnail, uploadThumbnail } = useThumbnailGeneration(structuredContent?.titulo_aula, true);
  const { saveProgress } = useAutoSave(id, structuredContent, lectureTitle, thumbnailUrl, hasUnsavedChanges);
  
  // Material Generation Hook (NEW - Phase 2)
  const materialGeneration = useMaterialGeneration();

  // Job Subscription (Phase 7: Only quiz/flashcards, not material)
  useJobSubscription(id, {
    onQuizCompleted: quizManagement.handleJobCompletion,
    onQuizFailed: quizManagement.handleJobFailure,
    onFlashcardsCompleted: flashcardsManagement.handleJobCompletion,
    onFlashcardsFailed: flashcardsManagement.handleJobFailure,
  });

  // Sync lecture title
  React.useEffect(() => {
    if (lecture?.title) {
      setLectureTitle(lecture.title);
    } else if (structuredContent?.titulo_aula) {
      setLectureTitle(structuredContent.titulo_aula);
    }
  }, [lecture, structuredContent]);

  // Sync structured content
  React.useEffect(() => {
    if (initialContent) {
      setStructuredContent(initialContent);
    }
  }, [initialContent]);

  // Auto-load quiz and flashcards on mount
  React.useEffect(() => {
    const loadContent = async () => {
      if (id && lecture) {
        console.log('[LecturePage] Auto-loading Quiz and Flashcards for lecture:', id);
        
        setIsLoadingQuiz(true);
        await quizManagement.loadQuiz();
        setIsLoadingQuiz(false);
        
        setIsLoadingFlashcards(true);
        await flashcardsManagement.loadFlashcards();
        setIsLoadingFlashcards(false);
      }
    };
    
    loadContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, lecture]);

  // Debug logging
  React.useEffect(() => {
    console.log('[LectureTranscription] State Debug:', {
      lectureId: id,
      hasLecture: !!lecture,
      hasStructuredContent: !!structuredContent,
      quiz: {
        exists: !!quizManagement.quiz,
        isGenerating: quizManagement.isGenerating,
        questionCount: quizManagement.quiz?.questions.length
      },
      flashcards: {
        exists: !!flashcardsManagement.flashcards,
        isGenerating: flashcardsManagement.isGenerating,
        cardCount: flashcardsManagement.flashcards?.cards.length
      }
    });
  }, [id, lecture, structuredContent, quizManagement.quiz, flashcardsManagement.flashcards]);

  // Check for active PROCESS_TRANSCRIPT job
  React.useEffect(() => {
    if (!id || structuredContent) return;

    const checkProcessingJob = async () => {
      const { data: job } = await supabase
        .from('teacher_jobs')
        .select('id, status, progress')
        .eq('lecture_id', id)
        .eq('job_type', 'PROCESS_TRANSCRIPT')
        .in('status', ['PENDING', 'PROCESSING'])
        .maybeSingle();

      setIsProcessingTranscript(!!job);
    };

    checkProcessingJob();
  }, [id, structuredContent]);

  // Lesson Plan Comparison
  const handleCompareLessonPlan = async (lessonPlanText: string) => {
    if (!lessonPlanText.trim()) {
      toast({
        variant: 'destructive',
        title: 'Plano de aula vazio',
        description: 'Por favor, insira o plano de aula',
      });
      return null;
    }

    try {
      setIsComparing(true);
      const { data, error } = await supabase.functions.invoke('compare-with-lesson-plan', {
        body: {
          lessonPlan: lessonPlanText,
          lectureContent: structuredContent,
        },
      });

      if (error) throw error;
      
      toast({
        title: 'Análise concluída',
        description: 'Relatório de cobertura gerado',
      });
      
      return data.comparison;
    } catch (error) {
      console.error('Error comparing lesson plan:', error);
      toast({
        variant: 'destructive',
        title: 'Erro na comparação',
        description: 'Não foi possível comparar com o plano de aula',
      });
      return null;
    } finally {
      setIsComparing(false);
    }
  };

  // Handle save with reset
  const handleSave = async () => {
    const success = await saveProgress();
    if (success) {
      resetUnsavedChanges();
    }
    return success;
  };

  // Handle thumbnail upload
  const handleThumbnailUpload = async (file: File) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    try {
      const url = await uploadThumbnail(file, user.id);
      if (url && id && structuredContent) {
        await supabase
          .from('lectures')
          .update({ 
            structured_content: { 
              ...structuredContent, 
              thumbnail: url 
            } as any 
          })
          .eq('id', id);
        
        toast({ title: 'Thumbnail atualizada com sucesso' });
      }
    } catch (error) {
      console.error('Error uploading thumbnail:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao fazer upload',
        description: 'Não foi possível atualizar a thumbnail',
      });
    }
  };


  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!lecture) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Aula não encontrada</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-900 via-purple-600 to-pink-500 animate-gradient-xy bg-[length:200%_200%]">
        <TeacherBackgroundRipple />
        
        {/* Gradient Blobs for Depth */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-48 w-96 h-96 bg-gradient-to-br from-pink-500/30 to-purple-500/30 rounded-full blur-3xl animate-float" />
          <div className="absolute top-2/3 -right-32 w-80 h-80 bg-gradient-to-br from-blue-400/25 to-purple-400/25 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-gradient-to-br from-purple-500/20 to-pink-400/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        </div>

        <div data-teacher-mode="true" className="relative z-10 container mx-auto px-4 py-8 max-w-full overflow-x-hidden">
        <LectureHeader lectureTitle={lectureTitle} />
        
      {/* Processing Banner */}
      {isProcessingTranscript && !structuredContent && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6 animate-pulse">
          <div className="flex items-center gap-3 mb-2">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <h3 className="font-semibold text-blue-900 text-lg">
              🤖 Processando transcrição com IA...
            </h3>
          </div>
          <p className="text-blue-700 text-sm">
            Aguarde enquanto geramos o material didático estruturado. Isso pode levar alguns minutos.
          </p>
          <div className="mt-4 w-full bg-blue-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full transition-all duration-500" style={{ width: '40%' }} />
          </div>
        </div>
      )}

      {/* Manual Fallback Banner */}
      {!structuredContent && !isProcessingTranscript && lecture?.raw_transcript && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-yellow-800 mb-2">
            📝 Material didático ainda não gerado
          </h3>
          <p className="text-yellow-700 text-sm mb-4">
            A transcrição está disponível, mas o conteúdo estruturado ainda não foi gerado.
          </p>
          <Button 
            onClick={async () => {
              try {
                setIsProcessingTranscript(true);
                
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error('Não autenticado');

                console.log('[Manual] Creating job for lecture:', id);

                const { data: jobData, error } = await supabase
                  .from('teacher_jobs')
                  .insert({
                    teacher_id: user.id,
                    lecture_id: id,
                    job_type: 'PROCESS_TRANSCRIPT',
                    status: 'PENDING',
                    input_payload: { lectureId: id, transcript: lecture.raw_transcript },
                    progress: 0,
                    progress_message: 'Iniciando processamento manual...'
                  })
                  .select()
                  .single();

                if (error) throw error;

                console.log('[Manual] Job created:', jobData.id);

                await supabase.functions.invoke('teacher-job-runner', {
                  body: { jobId: jobData.id },
                });

                toast({
                  title: '🤖 Processamento iniciado',
                  description: 'Gerando material didático...',
                });
              } catch (err) {
                console.error('[Manual] Job creation failed:', err);
                setIsProcessingTranscript(false);
                toast({
                  variant: 'destructive',
                  title: 'Erro',
                  description: err instanceof Error ? err.message : 'Erro ao iniciar processamento',
                });
              }
            }}
            className="bg-yellow-600 hover:bg-yellow-700 text-white"
          >
            🚀 Gerar Material Didático Manualmente
          </Button>
        </div>
      )}
        
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-8 mt-8 max-w-full overflow-hidden">
          {/* Main Content */}
          <div className="space-y-6 max-w-full overflow-hidden">
            {/* 1. Título da Aula - Card separado */}
            <div className="backdrop-blur-sm bg-white/95 shadow-xl border border-white/20 rounded-lg p-6">
              <LectureTitleEditor
                title={lectureTitle}
                onTitleChange={setLectureTitle}
              />
            </div>
            
            {/* 2. Conteúdo com tabs */}
            <ContentTabs 
              rawTranscript={lecture.raw_transcript}
              structuredContent={structuredContent}
              topics={structuredContent?.topicos_principais}
              htmlContent={
                typeof structuredContent?.material_didatico === 'string' 
                  ? structuredContent.material_didatico 
                  : undefined
              }
              isGeneratingMaterial={materialGeneration.isGenerating}
              materialProgress={materialGeneration.progress}
              materialProgressMessage={materialGeneration.progressMessage}
              onGenerateMaterial={async () => {
                if (id && lectureTitle) {
                  console.log('[RegenerateFlow] Starting initial generation');
                  const success = await materialGeneration.generate(
                    id,
                    lectureTitle,
                    lecture.tags || []
                  );
                  if (success) {
                    console.log('[RegenerateFlow] Generation success, reloading lecture');
                    await reloadLecture();
                    toast({
                      title: '✅ Material gerado',
                      description: 'Página recarregada com novo conteúdo',
                    });
                  }
                }
              }}
              onRegenerateMaterial={async () => {
                if (id && lectureTitle) {
                  console.log('[RegenerateFlow] Starting regeneration');
                  const success = await materialGeneration.generate(
                    id,
                    lectureTitle,
                    lecture.tags || []
                  );
                  if (success) {
                    console.log('[RegenerateFlow] Generation success, reloading lecture');
                    await reloadLecture();
                    toast({
                      title: '✅ Material atualizado',
                      description: 'Página recarregada com novo conteúdo',
                    });
                  }
                }
              }}
            />
            
            {/* 3. Quiz */}
            <div className="backdrop-blur-sm bg-white/95 shadow-xl border border-white/20 rounded-lg">
              <QuizSection
                quiz={quizManagement.quiz}
                isGenerating={quizManagement.isGenerating}
                isLoading={isLoadingQuiz}
                onGenerate={quizManagement.generateQuiz}
                onViewQuiz={() => setShowQuizModal(true)}
              />
            </div>
            
            {/* 4. Flashcards */}
            <div className="backdrop-blur-sm bg-white/95 shadow-xl border border-white/20 rounded-lg">
              <FlashcardsSection
                flashcards={flashcardsManagement.flashcards}
                isGenerating={flashcardsManagement.isGenerating}
                isLoading={isLoadingFlashcards}
                onGenerate={flashcardsManagement.generateFlashcards}
                onViewFlashcards={() => setShowFlashcardsModal(true)}
              />
            </div>
            
            {/* 5. Comparar com Plano de Aula */}
            <div className="backdrop-blur-sm bg-white/95 shadow-xl border border-white/20 rounded-lg p-6">
              <LessonPlanComparisonSection 
                onCompare={handleCompareLessonPlan}
                isComparing={isComparing}
              />
            </div>
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6">
            {/* 1. Publishing Controls - NO TOPO */}
            <div className="backdrop-blur-sm bg-white/95 shadow-xl border border-white/20 rounded-lg overflow-hidden">
              <PublishingControls 
                onSave={handleSave}
                onPublish={() => setOpenPublishModal(true)}
                hasUnsavedChanges={hasUnsavedChanges}
              />
            </div>
            
            {/* 2. Thumbnail da Aula */}
            <div className="backdrop-blur-sm bg-white/95 shadow-xl border border-white/20 rounded-lg p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-purple-600" />
                Thumbnail da Aula
              </h3>
              <ThumbnailDisplay 
                url={thumbnailUrl}
                isGenerating={isGeneratingThumbnail}
                onRegenerate={() => structuredContent?.titulo_aula && generateThumbnail(structuredContent.titulo_aula)}
                onUpload={handleThumbnailUpload}
              />
            </div>
            
            {/* 3. Audio Player */}
            <div className="backdrop-blur-sm bg-white/95 shadow-xl border border-white/20 rounded-lg overflow-hidden">
              <AudioPlayerCard audioUrl={lecture.audio_url} />
            </div>
            
            {/* 4. References */}
            <div className="backdrop-blur-sm bg-white/95 shadow-xl border border-white/20 rounded-lg p-6">
              <ReferencesSection
                references={structuredContent?.referencias_externas as any}
                isAdding={referencesManagement.isAdding}
                setIsAdding={referencesManagement.setIsAdding}
                editingIndex={referencesManagement.editingIndex}
                setEditingIndex={referencesManagement.setEditingIndex}
                newReference={referencesManagement.newReference}
                setNewReference={referencesManagement.setNewReference}
                editingReference={referencesManagement.editingReference}
                setEditingReference={referencesManagement.setEditingReference}
                onAddReference={referencesManagement.addReference}
                onEditReference={referencesManagement.editReference}
                onDeleteReference={referencesManagement.deleteReference}
              />
            </div>
          </div>
        </div>
        </div> {/* close data-teacher-mode div */}
      </div> {/* close gradient wrapper div */}
      
      {/* Modals */}
      <PublishLectureModal 
        open={openPublishModal}
        onOpenChange={setOpenPublishModal}
        lectureId={id || ''}
        initialTitle={lectureTitle}
      />
      
      <TeacherQuizModal 
        open={showQuizModal}
        onOpenChange={setShowQuizModal}
        quizData={quizManagement.quiz ? {
          id: quizManagement.quiz.id,
          title: quizManagement.quiz.title,
          questions: quizManagement.quiz.questions.map(q => ({
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation || '',
            bloomLevel: q.bloomLevel
          }))
        } : null}
      />
      
      <TeacherFlashcardViewerModal
        isOpen={showFlashcardsModal}
        onClose={() => setShowFlashcardsModal(false)}
        flashcardSet={flashcardsManagement.flashcards ? {
          id: flashcardsManagement.flashcards.id,
          title: flashcardsManagement.flashcards.title,
          cards: flashcardsManagement.flashcards.cards.map(c => ({
            front: c.front || c.termo || '',
            back: c.back || c.definicao || '',
            tags: c.tags
          }))
        } : null}
      />
    </MainLayout>
  );
};

export default LectureTranscriptionPage;
