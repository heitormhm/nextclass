import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { engineeringFlashcards } from '@/data/engineeringModules';

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  tags: string[];
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
      setFlashcards(data.cards as unknown as Flashcard[]);
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
      <DialogContent className="max-w-[95vw] sm:max-w-4xl h-[90vh] sm:h-[80vh] p-0 overflow-hidden mx-2 sm:mx-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">Flashcards Interativos</h2>
            <p className="text-sm text-muted-foreground">
              Card {currentCardIndex + 1} de {flashcards.length}
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
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8 sm:h-10 sm:w-10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 3D Flashcard Deck with Navigation Arrows */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8 bg-gradient-to-br from-primary/5 to-secondary/10 relative">
          {/* Left Navigation Arrow */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrevious}
            className="absolute left-2 sm:left-8 top-1/2 -translate-y-1/2 h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-background/80 hover:bg-background shadow-lg z-20"
          >
            <ChevronLeft className="h-6 w-6 sm:h-8 sm:w-8" />
          </Button>

          {/* Right Navigation Arrow */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNext}
            className="absolute right-2 sm:right-8 top-1/2 -translate-y-1/2 h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-background/80 hover:bg-background shadow-lg z-20"
          >
            <ChevronRight className="h-6 w-6 sm:h-8 sm:w-8" />
          </Button>

          <div className="relative w-full max-w-2xl h-64 sm:h-80">
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
              className="relative w-full h-full cursor-pointer"
              style={{ perspective: '1000px', zIndex: 10 }}
              onClick={handleCardClick}
            >
              <div
                className={`relative w-full h-full transition-transform duration-700 transform-style-3d ${
                  isFlipped ? 'rotate-y-180' : ''
                }`}
              >
                {/* Front of Card (Question) */}
                <div className="absolute inset-0 w-full h-full rounded-2xl border-2 border-primary/20 bg-card shadow-2xl p-4 sm:p-8 flex flex-col justify-between backface-hidden">
                  <div className="flex-1 flex items-center justify-center text-center">
                    <h3 className="text-lg sm:text-2xl font-semibold leading-tight text-foreground">
                      {currentCard.question}
                    </h3>
                  </div>

                  <div className="flex flex-wrap gap-2 justify-center mt-4 sm:mt-6">
                    {currentCard.tags.map((tag, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium border ${
                          tagColors[tag as keyof typeof tagColors] || 'bg-gray-100 text-gray-800 border-gray-200'
                        }`}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="absolute top-4 right-4 bg-primary/10 rounded-full w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">
                      {currentCardIndex + 1}
                    </span>
                  </div>

                  <div className="absolute top-4 left-4 text-xs text-muted-foreground">
                    Pergunta
                  </div>
                </div>

                {/* Back of Card (Answer) */}
                <div className="absolute inset-0 w-full h-full rounded-2xl border-2 border-secondary/20 bg-secondary/5 shadow-2xl p-4 sm:p-8 flex flex-col justify-between backface-hidden rotate-y-180">
                  <div className="flex-1 flex items-center justify-center text-center">
                    <p className="text-base sm:text-xl leading-relaxed text-foreground">
                      {currentCard.answer}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 justify-center mt-4 sm:mt-6">
                    {currentCard.tags.map((tag, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium border ${
                          tagColors[tag as keyof typeof tagColors] || 'bg-gray-100 text-gray-800 border-gray-200'
                        }`}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="absolute top-4 right-4 bg-secondary/20 rounded-full w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center">
                    <span className="text-xs font-bold text-secondary">
                      {currentCardIndex + 1}
                    </span>
                  </div>

                  <div className="absolute top-4 left-4 text-xs text-muted-foreground">
                    Resposta
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 p-4 sm:p-6 border-t bg-background/50">
          {/* Progress Dots */}
          <div className="flex items-center gap-2">
            {flashcards.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentCardIndex(index);
                  setIsFlipped(false);
                }}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentCardIndex
                    ? 'bg-primary scale-125'
                    : 'bg-border hover:bg-primary/50'
                }`}
              />
            ))}
          </div>

          <div className="text-sm text-muted-foreground text-center">
            Clique no card para ver a resposta
          </div>

          {/* Action Buttons for Generated Flashcards */}
          {flashcardSetId && isFlipped && !reviewedCards.has(currentCardIndex) && (
            <div className="flex gap-2">
              <Button
                onClick={() => handleCardResult(false)}
                variant="outline"
                size="sm"
                className="px-4"
              >
                ❌ Errei
              </Button>
              <Button
                onClick={() => handleCardResult(true)}
                size="sm"
                className="bg-green-500 hover:bg-green-600 text-white px-4"
              >
                ✅ Acertei
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
