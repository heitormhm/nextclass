/**
 * 🏗️ ARQUITETURA REFATORADA - LectureTranscriptionPage
 * Página modularizada usando custom hooks e componentes dedicados
 */

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import MainLayout from '@/components/MainLayout';
import { TeacherBackgroundRipple } from '@/components/ui/teacher-background-ripple';
import { PublishLectureModal } from '@/components/PublishLectureModal';
import { TeacherQuizModal } from '@/components/TeacherQuizModal';
import { TeacherFlashcardViewerModal } from '@/components/TeacherFlashcardViewerModal';
import { MaterialGenerationContainer } from '@/features/material-didatico-generation/components/MaterialGenerationContainer';
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

// Components
import { LectureHeader } from '@/features/lecture-transcription/components/LectureHeader';
import { LectureTitleEditor } from '@/features/lecture-transcription/components/LectureTitleEditor';
import { QuizSection } from '@/features/lecture-transcription/components/QuizSection';
import { FlashcardsSection } from '@/features/lecture-transcription/components/FlashcardsSection';
import { TopicsSection } from '@/features/lecture-transcription/components/TopicsSection';
import { ReferencesSection } from '@/features/lecture-transcription/components/ReferencesSection';
import { ContentTabs } from '@/features/lecture-transcription/components/ContentTabs';
import { ThumbnailDisplay } from '@/features/lecture-transcription/components/ThumbnailDisplay';
import { QualityMetricsCard } from '@/features/lecture-transcription/components/QualityMetricsCard';
import { AudioPlayerCard } from '@/features/lecture-transcription/components/AudioPlayerCard';
import { PublishingControls } from '@/features/lecture-transcription/components/PublishingControls';
import { LessonPlanComparisonSection } from '@/features/lecture-transcription/components/LessonPlanComparisonSection';
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

  // Data Hooks
  const { lecture, isLoading, reloadLecture, structuredContent: initialContent, setStructuredContent: setLectureContent } = useLectureData(id);
  const { structuredContent, setStructuredContent, updateContent, hasUnsavedChanges, resetUnsavedChanges } = useLectureState(initialContent);
  
  // Feature Hooks
  const quizManagement = useQuizManagement(id, lectureTitle, lecture?.tags || []);
  const flashcardsManagement = useFlashcardsManagement(id, lecture?.teacher_id || '', lectureTitle, lecture?.tags || []);
  const referencesManagement = useReferencesManagement(id, structuredContent, updateContent);
  const { thumbnailUrl, setThumbnailUrl, isGenerating: isGeneratingThumbnail, generateThumbnail, uploadThumbnail } = useThumbnailGeneration(structuredContent?.titulo_aula, true);
  const { saveProgress } = useAutoSave(id, structuredContent, lectureTitle, thumbnailUrl, hasUnsavedChanges);

  // Job Subscription
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
      <TeacherBackgroundRipple />
      
      <div className="container mx-auto px-4 py-8 relative z-10">
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
        
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 mt-8">
          {/* Main Content */}
          <div className="space-y-6">
            <LectureTitleEditor
              title={lectureTitle}
              onTitleChange={setLectureTitle}
            />
            
            <MaterialGenerationContainer
              lectureId={id || ''}
              lectureTitle={lectureTitle}
              transcript={lecture.raw_transcript}
              currentMaterial={typeof structuredContent?.material_didatico === 'string' ? structuredContent.material_didatico : undefined}
              onSuccess={reloadLecture}
            />
            
            <QuizSection
              quiz={quizManagement.quiz}
              isGenerating={quizManagement.isGenerating}
              onGenerate={quizManagement.generateQuiz}
              onViewQuiz={() => setShowQuizModal(true)}
            />
            
            <FlashcardsSection
              flashcards={flashcardsManagement.flashcards}
              isGenerating={flashcardsManagement.isGenerating}
              onGenerate={flashcardsManagement.generateFlashcards}
              onViewFlashcards={() => setShowFlashcardsModal(true)}
            />
            
            <TopicsSection topics={structuredContent?.topicos_principais} />
            
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
            
            <ContentTabs 
              rawTranscript={lecture.raw_transcript}
              structuredContent={structuredContent}
            />
            
            <LessonPlanComparisonSection 
              onCompare={handleCompareLessonPlan}
              isComparing={isComparing}
            />
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6">
            <ThumbnailDisplay 
              url={thumbnailUrl} 
              isGenerating={isGeneratingThumbnail}
              onRegenerate={() => structuredContent?.titulo_aula && generateThumbnail(structuredContent.titulo_aula)}
              onUpload={handleThumbnailUpload}
            />
            
            <QualityMetricsCard metrics={(lecture as any).quality_metrics} />
            
            <AudioPlayerCard audioUrl={lecture.audio_url} />
            
            <PublishingControls 
              onSave={handleSave}
              onPublish={() => setOpenPublishModal(true)}
              hasUnsavedChanges={hasUnsavedChanges}
            />
          </div>
        </div>
      </div>
      
      {/* Modals */}
      <PublishLectureModal 
        open={openPublishModal}
        onOpenChange={setOpenPublishModal}
        lectureId={id || ''}
        initialTitle={lectureTitle}
      />
      
      {quizManagement.quiz && (
        <TeacherQuizModal 
          open={showQuizModal}
          onOpenChange={setShowQuizModal}
          quizData={{
            id: quizManagement.quiz.id,
            title: quizManagement.quiz.title,
            questions: quizManagement.quiz.questions.map(q => ({
              question: q.pergunta,
              options: { A: q.opcoes[0], B: q.opcoes[1], C: q.opcoes[2], D: q.opcoes[3] },
              correctAnswer: q.resposta_correta,
              explanation: q.explicacao || ''
            }))
          }}
        />
      )}
      
      {flashcardsManagement.flashcards && (
        <TeacherFlashcardViewerModal
          isOpen={showFlashcardsModal}
          onClose={() => setShowFlashcardsModal(false)}
          flashcardSet={{
            id: flashcardsManagement.flashcards.id,
            title: flashcardsManagement.flashcards.title,
            cards: flashcardsManagement.flashcards.cards.map(c => ({
              front: c.front || c.termo || '',
              back: c.back || c.definicao || '',
              tags: c.tags
            }))
          }}
        />
      )}
    </MainLayout>
  );
};

export default LectureTranscriptionPage;
