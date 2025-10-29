import { supabase } from '@/integrations/supabase/client';
import { GeneratedFlashcards, FlashcardData } from '../types/flashcards.types';

export class FlashcardsService {
  static async loadFlashcards(lectureId: string): Promise<GeneratedFlashcards | null> {
    console.log('[FlashcardsService] Loading flashcards for lecture:', lectureId);
    
    const { data, error } = await supabase
      .from('teacher_flashcards')
      .select('*')
      .eq('lecture_id', lectureId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) {
      console.error('[FlashcardsService] Error loading flashcards:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      return null;
    }
    
    if (!data) {
      console.log('[FlashcardsService] No flashcards found for lecture');
      return null;
    }
    
    const cards = data.cards as any[];
    console.log('[FlashcardsService] Flashcards loaded successfully:', {
      id: data.id,
      cardCount: cards?.length || 0,
      firstCardSample: cards?.[0]
    });
    
    return data as GeneratedFlashcards;
  }

  static async updateFlashcards(lectureId: string, cards: FlashcardData[]) {
    if (cards.length === 0) {
      return this.deleteFlashcards(lectureId);
    }

    const { error } = await supabase
      .from('teacher_flashcards')
      .update({ cards: cards as any })
      .eq('lecture_id', lectureId);
    
    if (error) throw error;
  }

  static async deleteFlashcards(lectureId: string) {
    const { error } = await supabase
      .from('teacher_flashcards')
      .delete()
      .eq('lecture_id', lectureId);
    
    if (error) throw error;
  }

  static async createFlashcards(lectureId: string, teacherId: string, title: string, cards: FlashcardData[]) {
    const { data, error } = await supabase
      .from('teacher_flashcards')
      .insert({
        lecture_id: lectureId,
        teacher_id: teacherId,
        title,
        cards: cards as any
      } as any)
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      cards: data.cards as any
    } as GeneratedFlashcards;
  }

  static async generateSingleFlashcard(title: string, tags: string[]) {
    const { data, error } = await supabase.functions.invoke('generate-single-flashcard', {
      body: { title, tags }
    });
    
    if (error) throw error;
    return data.card;
  }

  static async invokeFlashcardsGeneration(lectureId: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Sessão expirada');

    const { data, error } = await supabase.functions.invoke('lecture-generate-flashcards', {
      body: { lectureId }
    });

    if (error) throw error;
    return data?.jobId;
  }
}
