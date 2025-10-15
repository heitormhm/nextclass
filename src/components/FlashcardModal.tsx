import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { engineeringFlashcards } from '@/data/engineeringModules';

interface Flashcard {
  id?: string;
  question?: string;  // Para flashcards antigos
  answer?: string;    // Para flashcards antigos
  front?: string;     // Para flashcards gerados por IA
  back?: string;      // Para flashcards gerados por IA
  tags?: string[];
}

interface FlashcardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId?: number;
  flashcardSetId?: string;
}

// Updated tag colors for engineering themes
const tagColors = {
  'Termodinâmica': 'bg-red-100 text-red-800 border-red-200',
  'Leis Fundamentais': 'bg-blue-100 text-blue-800 border-blue-200',
  'Segunda Lei': 'bg-orange-100 text-orange-800 border-orange-200',
  'Ciclo de Carnot': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Processos': 'bg-green-100 text-green-800 border-green-200',
  'Trabalho': 'bg-purple-100 text-purple-800 border-purple-200',
  'Circuitos': 'bg-blue-100 text-blue-800 border-blue-200',
  'Análise Nodal': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'Série': 'bg-cyan-100 text-cyan-800 border-cyan-200',
  'Paralelo': 'bg-teal-100 text-teal-800 border-teal-200',
  'Potência': 'bg-pink-100 text-pink-800 border-pink-200',
  'Estruturas': 'bg-gray-100 text-gray-800 border-gray-200',
  'Flexão': 'bg-red-100 text-red-800 border-red-200',
  'Tensões': 'bg-orange-100 text-orange-800 border-orange-200',
  'Carregamentos': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Treliças': 'bg-green-100 text-green-800 border-green-200',
  'Esforços': 'bg-blue-100 text-blue-800 border-blue-200',
  'Fluidos': 'bg-cyan-100 text-cyan-800 border-cyan-200',
  'Propriedades': 'bg-teal-100 text-teal-800 border-teal-200',
  'Análise Dimensional': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'Energia': 'bg-purple-100 text-purple-800 border-purple-200',
  'Tipos de Escoamento': 'bg-pink-100 text-pink-800 border-pink-200',
  'Perdas': 'bg-red-100 text-red-800 border-red-200',
  'Controle': 'bg-green-100 text-green-800 border-green-200',
  'Modelagem': 'bg-blue-100 text-blue-800 border-blue-200',
  'Controladores': 'bg-purple-100 text-purple-800 border-purple-200',
  'Estabilidade': 'bg-orange-100 text-orange-800 border-orange-200',
  'Desempenho': 'bg-yellow-100 text-yellow-800 border-yellow-200'
};

export function FlashcardModal({ open, onOpenChange, moduleId, flashcardSetId }: FlashcardModalProps) {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(false);
  const [flashcardData, setFlashcardData] = useState<{ topic: string } | null>(null);
  const [reviewedCards, setReviewedCards] = useState<Set<number>>(new Set());
  const [correctCards, setCorrectCards] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (flashcardSetId && open) {
      loadGeneratedFlashcards();
    } else if (moduleId !== undefined) {
      const cards = engineeringFlashcards[moduleId] || engineeringFlashcards[1];
      setFlashcards(cards);
      setCurrentCardIndex(0);
      setIsFlipped(false);
    }
  }, [moduleId, flashcardSetId, open]);

  const loadGeneratedFlashcards = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('generated_flashcard_sets')
        .select('*')
        .eq('id', flashcardSetId)
        .single();

      if (error) throw error;

      setFlashcardData({ topic: data.topic });
      
      // Converter formato { front, back } para { question, answer, tags }
      const convertedCards = (data.cards as any[]).map((card, index) => ({
        id: `generated-${index}`,
        question: card.front || card.question || '',
        answer: card.back || card.answer || '',
        tags: card.tags || [data.topic] // Usar tópico como tag padrão
      }));
      
      setFlashcards(convertedCards);
      setCurrentCardIndex(0);
      setIsFlipped(false);
    } catch (error) {
      console.error('Error loading flashcards:', error);
      toast.error('Erro ao carregar flashcards');
    } finally {
      setLoading(false);
    }
  };

  const handlePrevious = () => {
    setCurrentCardIndex((prev) => (prev === 0 ? flashcards.length - 1 : prev - 1));
    setIsFlipped(false);
  };

  const handleNext = () => {
    setCurrentCardIndex((prev) => (prev === flashcards.length - 1 ? 0 : prev + 1));
    setIsFlipped(false);
  };

  const handleCardClick = () => {
    setIsFlipped(!isFlipped);
  };

  const handleSaveAsImage = () => {
    toast.success("Flashcard salvo como imagem! (funcionalidade simulada)");
  };

  const handleCardResult = (correct: boolean) => {
    setReviewedCards(prev => new Set(prev).add(currentCardIndex));
    if (correct) {
      setCorrectCards(prev => new Set(prev).add(currentCardIndex));
    }
    handleNext();
  };

  const handleClose = async () => {
    if (reviewedCards.size > 0 && flashcardSetId && flashcardData) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('flashcard_reviews').insert({
          user_id: user.id,
          topic: flashcardData.topic,
          correct_count: correctCards.size,
          total_count: reviewedCards.size,
          percentage: (correctCards.size / reviewedCards.size) * 100,
          lecture_id: null,
        });
        toast.success('Revisão salva com sucesso!');
      }
    }
    
    onOpenChange(false);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setReviewedCards(new Set());
    setCorrectCards(new Set());
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!open) return null;

  const currentCard = flashcards[currentCardIndex];

  if (!currentCard) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl">
          <div className="text-center p-8">
            <p className="text-muted-foreground">Nenhum flashcard disponível</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl h-[95vh] p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pt-12 border-b bg-gradient-to-r from-primary/5 to-secondary/5">
          <div className="flex-1">
            <h2 className="text-2xl sm:text-3xl font-bold">Flashcards Interativos</h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Card {currentCardIndex + 1} de {flashcards.length}
              {flashcardSetId && reviewedCards.size > 0 && (
                <span className="ml-2 text-primary font-semibold">
                  • {correctCards.size}/{reviewedCards.size} acertos ({Math.round((correctCards.size / reviewedCards.size) * 100)}%)
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!flashcardSetId && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveAsImage}
                className="hidden sm:flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Salvar como Imagem
              </Button>
            )}
          </div>
        </div>

        {/* 3D Flashcard Deck with Navigation Arrows */}
        <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-primary/5 to-secondary/10 relative">
          {/* Left Navigation Arrow */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrevious}
            className="absolute left-4 sm:left-12 top-1/2 -translate-y-1/2 h-14 w-14 sm:h-20 sm:w-20 rounded-full bg-background/90 hover:bg-background shadow-2xl z-20 border-2 border-border"
          >
            <ChevronLeft className="h-7 w-7 sm:h-10 sm:w-10" />
          </Button>

          {/* Right Navigation Arrow */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNext}
            className="absolute right-4 sm:right-12 top-1/2 -translate-y-1/2 h-14 w-14 sm:h-20 sm:w-20 rounded-full bg-background/90 hover:bg-background shadow-2xl z-20 border-2 border-border"
          >
            <ChevronRight className="h-7 w-7 sm:h-10 sm:w-10" />
          </Button>

          <div className="relative w-full max-w-3xl h-96 sm:h-[500px]">
            {/* Background Cards (Deck Effect) */}
            <div className="absolute inset-0 flex items-center justify-center">
              {[...Array(3)].map((_, index) => (
                <div
                  key={index}
                  className="absolute w-full h-full rounded-2xl border-2 border-border/20 bg-card shadow-lg"
                  style={{
                    transform: `translateX(${(index - 1) * 4}px) translateY(${(index - 1) * 4}px) rotateZ(${(index - 1) * 1}deg)`,
                    zIndex: index,
                    opacity: 0.3 + (index * 0.2)
                  }}
                />
              ))}
            </div>

            {/* Main Card with 3D Flip */}
            <div 
              className="relative w-full h-full cursor-pointer transform transition-transform hover:scale-[1.02]"
              style={{ perspective: '1000px', zIndex: 10 }}
              onClick={handleCardClick}
            >
              <div
                className="relative w-full h-full transition-all duration-600 ease-out transform-style-3d"
                style={{ 
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  transition: 'transform 0.6s cubic-bezier(0.4, 0.0, 0.2, 1)',
                }}
              >
                {/* Front of Card (Question) */}
                <div className="absolute inset-0 w-full h-full rounded-2xl border-2 border-primary/20 bg-card shadow-2xl p-6 sm:p-12 flex flex-col justify-between backface-hidden">
                  <div className="flex-1 flex items-center justify-center text-center px-4">
                    <h3 className="text-xl sm:text-3xl font-bold leading-tight text-foreground">
                      {currentCard.question || currentCard.front || 'Sem pergunta'}
                    </h3>
                  </div>

                  {/* Tags */}
                  {currentCard.tags && currentCard.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 justify-center mt-6 sm:mt-8 pt-4 border-t border-border/50">
                      {currentCard.tags.map((tag, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className={`px-3 sm:px-4 py-1.5 text-sm sm:text-base font-semibold border-2 shadow-sm ${
                            tagColors[tag as keyof typeof tagColors] || 'bg-gray-100 text-gray-800 border-gray-300'
                          }`}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="absolute top-6 right-6 bg-gradient-to-br from-primary/20 to-primary/30 rounded-full w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center border-2 border-primary/40 shadow-lg">
                    <span className="text-base sm:text-lg font-bold text-primary">
                      {currentCardIndex + 1}
                    </span>
                  </div>

                  <div className="absolute top-6 left-6">
                    <Badge variant="outline" className="bg-background/80 backdrop-blur-sm border-2 font-semibold text-xs sm:text-sm px-3 py-1">
                      📝 Pergunta
                    </Badge>
                  </div>
                </div>

                {/* Back of Card (Answer) */}
                <div className="absolute inset-0 w-full h-full rounded-2xl border-2 border-secondary/20 bg-secondary/5 shadow-2xl p-6 sm:p-12 flex flex-col justify-between backface-hidden rotate-y-180">
                  <div className="flex-1 flex items-center justify-center text-center px-4">
                    <p className="text-lg sm:text-2xl leading-relaxed text-foreground font-medium">
                      {currentCard.answer || currentCard.back || 'Sem resposta'}
                    </p>
                  </div>

                  {/* Tags */}
                  {currentCard.tags && currentCard.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 justify-center mt-6 sm:mt-8 pt-4 border-t border-border/50">
                      {currentCard.tags.map((tag, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className={`px-3 sm:px-4 py-1.5 text-sm sm:text-base font-semibold border-2 shadow-sm ${
                            tagColors[tag as keyof typeof tagColors] || 'bg-gray-100 text-gray-800 border-gray-300'
                          }`}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="absolute top-6 right-6 bg-gradient-to-br from-secondary/20 to-secondary/30 rounded-full w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center border-2 border-secondary/40 shadow-lg">
                    <span className="text-base sm:text-lg font-bold text-secondary">
                      {currentCardIndex + 1}
                    </span>
                  </div>

                  <div className="absolute top-6 left-6">
                    <Badge variant="outline" className="bg-background/80 backdrop-blur-sm border-2 font-semibold text-xs sm:text-sm px-3 py-1">
                      💡 Resposta
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 p-6 border-t bg-background/50">
          {/* Progress Dots with Review Status */}
          <div className="flex items-center gap-2.5">
            {flashcards.map((_, index) => {
              const isReviewed = reviewedCards.has(index);
              const isCorrect = correctCards.has(index);
              
              return (
                <button
                  key={index}
                  onClick={() => {
                    setCurrentCardIndex(index);
                    setIsFlipped(false);
                  }}
                  className={`w-4 h-4 rounded-full transition-all ${
                    index === currentCardIndex
                      ? 'bg-primary scale-150 ring-4 ring-primary/30'
                      : isReviewed
                      ? isCorrect 
                        ? 'bg-green-500 scale-110' 
                        : 'bg-red-400 scale-110'
                      : 'bg-border hover:bg-primary/50 hover:scale-125'
                  }`}
                  aria-label={`Card ${index + 1}${isReviewed ? (isCorrect ? ' - Acertou' : ' - Errou') : ''}`}
                />
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-sm sm:text-base text-muted-foreground bg-primary/5 px-4 py-2 rounded-full border border-primary/20">
            <span className="font-medium">✨ Clique no card para revelar a resposta</span>
          </div>

          {/* Action Buttons for Generated Flashcards */}
          {flashcardSetId && isFlipped && !reviewedCards.has(currentCardIndex) && (
            <div className="flex gap-3 items-center">
              <Button
                onClick={() => handleCardResult(false)}
                variant="outline"
                size="lg"
                className="px-6 py-3 border-2 border-red-300 hover:bg-red-50 hover:border-red-400 transition-all"
              >
                <span className="text-lg mr-2">❌</span>
                <span className="font-semibold">Errei</span>
              </Button>
              <Button
                onClick={() => handleCardResult(true)}
                size="lg"
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 shadow-lg transition-all"
              >
                <span className="text-lg mr-2">✅</span>
                <span className="font-semibold">Acertei</span>
              </Button>
            </div>
          )}
          
          {/* Mobile Download Button */}
          {!flashcardSetId && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveAsImage}
              className="sm:hidden flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Salvar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
