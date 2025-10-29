import { supabase } from '@/integrations/supabase/client';
import { GeneratedQuiz, QuizQuestion } from '../types/quiz.types';

export class QuizService {
  static async loadQuiz(lectureId: string): Promise<GeneratedQuiz | null> {
    console.log('[QuizService] Loading quiz for lecture:', lectureId);
    
    const { data, error } = await supabase
      .from('teacher_quizzes')
      .select('*')
      .eq('lecture_id', lectureId)
      .maybeSingle();
    
    if (error) {
      console.error('[QuizService] Error loading quiz:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      return null;
    }
    
    if (!data) {
      console.log('[QuizService] No quiz found for lecture');
      return null;
    }
    
    const questions = data.questions as any[];
    console.log('[QuizService] Quiz loaded successfully:', {
      id: data.id,
      questionCount: questions?.length || 0,
      firstQuestionSample: questions?.[0]
    });
    
    return {
      ...data,
      questions: data.questions as any
    } as GeneratedQuiz;
  }

  static async updateQuizQuestions(lectureId: string, questions: QuizQuestion[]) {
    const { error } = await supabase
      .from('teacher_quizzes')
      .update({ questions: questions as any })
      .eq('lecture_id', lectureId);
    
    if (error) throw error;
  }

  static async generateSingleQuestion(title: string, tags: string[]) {
    const { data, error } = await supabase.functions.invoke('generate-single-quiz-question', {
      body: { title, tags }
    });
    
    if (error) throw error;
    return data.question;
  }

  static async invokeQuizGeneration(lectureId: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Sessão expirada');

    const { data, error } = await supabase.functions.invoke('teacher-generate-quiz-v2', {
      body: { lectureId }
    });

    if (error) throw error;
    return data?.jobId;
  }
}
