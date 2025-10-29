export interface QuizQuestion {
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: string;
  explanation?: string;
  bloomLevel?: string;
}

export interface GeneratedQuiz {
  id: string;
  lecture_id: string;
  teacher_id: string;
  title: string;
  questions: QuizQuestion[];
  created_at: string;
}
