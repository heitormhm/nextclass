import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { FlashcardsService } from '../services/flashcardsService';
import { GeneratedFlashcards, FlashcardData } from '../types/flashcards.types';

export const useFlashcardsManagement = (
  lectureId: string | undefined,
  teacherId: string | undefined, 
  lectureTitle: string, 
  lectureTags: string[]
) => {
  const [flashcards, setFlashcards] = useState<GeneratedFlashcards | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const { toast } = useToast();

  const loadFlashcards = useCallback(async () => {
    if (!lectureId) return;
    
    try {
      const data = await FlashcardsService.loadFlashcards(lectureId);
      setFlashcards(data);
    } catch (error) {
      console.error('[Flashcards] Error loading flashcards:', error);
      setFlashcards(null);
    }
  }, [lectureId]);

  const generateFlashcards = async () => {
    if (!lectureId || isGenerating) return;

    setIsGenerating(true);
    toast({
      title: 'Gerando flashcards...',
      description: 'Você receberá uma notificação quando concluir',
      duration: 5000,
    });

    try {
      const jobId = await FlashcardsService.invokeFlashcardsGeneration(lectureId);
      setCurrentJobId(jobId);
    } catch (error) {
      setIsGenerating(false);
      toast({
        variant: 'destructive',
        title: 'Erro ao gerar flashcards',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  };

  const addFlashcard = async () => {
    if (!lectureId || !teacherId) return;

    try {
      toast({
        title: '🤖 Gerando novo flashcard...',
        description: 'A IA está criando um flashcard baseado no tema da aula',
      });

      const newCard = await FlashcardsService.generateSingleFlashcard(lectureTitle, lectureTags);
      
      if (!flashcards) {
        const newFlashcards = await FlashcardsService.createFlashcards(
          lectureId,
          teacherId,
          `Flashcards - ${lectureTitle}`,
          [newCard]
        );
        setFlashcards(newFlashcards);
        toast({ title: '✅ Primeiro flashcard criado' });
      } else {
        const updatedCards = [...flashcards.cards, newCard];
        await FlashcardsService.updateFlashcards(lectureId, updatedCards);
        setFlashcards({ ...flashcards, cards: updatedCards });
        toast({ title: '✅ Flashcard adicionado' });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao adicionar flashcard' });
    }
  };

  const deleteFlashcard = async (index: number) => {
    if (!flashcards || !lectureId) return;

    const confirmDelete = window.confirm('Deseja deletar este flashcard? Esta ação não pode ser desfeita.');
    if (!confirmDelete) return;

    const updatedCards = flashcards.cards.filter((_, i) => i !== index);
    await FlashcardsService.updateFlashcards(lectureId, updatedCards);
    
    if (updatedCards.length === 0) {
      setFlashcards(null);
    } else {
      setFlashcards({ ...flashcards, cards: updatedCards });
    }
    
    toast({ title: '✅ Flashcard deletado' });
  };

  const updateFlashcard = async (index: number, updatedCard: FlashcardData) => {
    if (!flashcards || !lectureId) return;

    const updatedCards = [...flashcards.cards];
    updatedCards[index] = updatedCard;
    await FlashcardsService.updateFlashcards(lectureId, updatedCards);
    setFlashcards({ ...flashcards, cards: updatedCards });
    toast({ title: '✅ Flashcard atualizado' });
  };

  const handleJobCompletion = useCallback(() => {
    console.log('[FlashcardsManagement] Job completed, reloading flashcards...');
    setIsGenerating(false);
    setCurrentJobId(null);
    
    // Delay reload to ensure DB has been updated
    setTimeout(() => {
      loadFlashcards();
    }, 500);
  }, [loadFlashcards]);

  const handleJobFailure = () => {
    setIsGenerating(false);
    setCurrentJobId(null);
  };

  return {
    flashcards,
    isGenerating,
    currentJobId,
    loadFlashcards,
    generateFlashcards,
    addFlashcard,
    deleteFlashcard,
    updateFlashcard,
    handleJobCompletion,
    handleJobFailure
  };
};
