import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { QuizService } from '../services/quizService';
import { GeneratedQuiz, QuizQuestion } from '../types/quiz.types';

export const useQuizManagement = (lectureId: string | undefined, lectureTitle: string, lectureTags: string[]) => {
  const [quiz, setQuiz] = useState<GeneratedQuiz | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const { toast } = useToast();

  const loadQuiz = useCallback(async () => {
    if (!lectureId) return;
    
    try {
      const data = await QuizService.loadQuiz(lectureId);
      setQuiz(data);
    } catch (error) {
      console.error('[Quiz] Error loading quiz:', error);
      setQuiz(null);
    }
  }, [lectureId]);

  const generateQuiz = async () => {
    if (!lectureId || isGenerating) return;

    setIsGenerating(true);
    toast({
      title: 'Gerando quiz...',
      description: 'Você receberá uma notificação quando concluir',
      duration: 5000,
    });

    try {
      const jobId = await QuizService.invokeQuizGeneration(lectureId);
      setCurrentJobId(jobId);
    } catch (error) {
      setIsGenerating(false);
      toast({
        variant: 'destructive',
        title: 'Erro ao gerar quiz',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  };

  const addQuestion = async () => {
    if (!quiz || !lectureId) return;

    try {
      toast({
        title: '🤖 Gerando nova pergunta...',
        description: 'A IA está criando uma pergunta baseada no tema da aula',
      });

      const newQuestion = await QuizService.generateSingleQuestion(lectureTitle, lectureTags);
      const updatedQuestions = [...quiz.questions, newQuestion];
      await QuizService.updateQuizQuestions(lectureId, updatedQuestions);
      setQuiz({ ...quiz, questions: updatedQuestions });
      
      toast({ title: '✅ Pergunta adicionada' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao adicionar pergunta' });
    }
  };

  const deleteQuestion = async (index: number) => {
    if (!quiz || !lectureId) return;

    const confirmDelete = window.confirm('Deseja deletar esta pergunta? Esta ação não pode ser desfeita.');
    if (!confirmDelete) return;

    const updatedQuestions = quiz.questions.filter((_, i) => i !== index);
    await QuizService.updateQuizQuestions(lectureId, updatedQuestions);
    setQuiz({ ...quiz, questions: updatedQuestions });
    toast({ title: '✅ Pergunta deletada' });
  };

  const updateQuestion = async (index: number, updatedQuestion: QuizQuestion) => {
    if (!quiz || !lectureId) return;

    const updatedQuestions = [...quiz.questions];
    updatedQuestions[index] = updatedQuestion;
    await QuizService.updateQuizQuestions(lectureId, updatedQuestions);
    setQuiz({ ...quiz, questions: updatedQuestions });
    toast({ title: '✅ Pergunta atualizada' });
  };

  const handleJobCompletion = () => {
    setIsGenerating(false);
    setCurrentJobId(null);
    loadQuiz();
  };

  const handleJobFailure = () => {
    setIsGenerating(false);
    setCurrentJobId(null);
  };

  return {
    quiz,
    isGenerating,
    currentJobId,
    loadQuiz,
    generateQuiz,
    addQuestion,
    deleteQuestion,
    updateQuestion,
    handleJobCompletion,
    handleJobFailure
  };
};
