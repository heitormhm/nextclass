export interface QuizQuestion {
  pergunta: string;
  opcoes: string[];
  resposta_correta: string;
  explicacao?: string;
}

export interface GeneratedQuiz {
  id: string;
  lecture_id: string;
  teacher_id: string;
  title: string;
  questions: QuizQuestion[];
  created_at: string;
}
