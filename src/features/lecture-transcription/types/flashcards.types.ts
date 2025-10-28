export interface FlashcardData {
  front?: string;
  back?: string;
  termo?: string;
  definicao?: string;
  tags?: string[];
}

export interface GeneratedFlashcards {
  id: string;
  lecture_id: string;
  teacher_id: string;
  title: string;
  cards: FlashcardData[];
  created_at: string;
}
