import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FlashcardSet {
  id: string;
  title: string;
  topic: string;
  cards: Array<{ front: string; back: string }>;
}

interface FlashcardViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  flashcardSet: FlashcardSet | null;
}

export const FlashcardViewerModal = ({ isOpen, onClose, flashcardSet }: FlashcardViewerModalProps) => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  if (!flashcardSet || !flashcardSet.cards || flashcardSet.cards.length === 0) {
    return null;
  }

  const currentCard = flashcardSet.cards[currentIndex];
  const totalCards = flashcardSet.cards.length;

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < totalCards - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleStartReview = () => {
    onClose();
    navigate('/review');
  };

  const handleClose = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            {flashcardSet.title}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{flashcardSet.topic}</p>
        </DialogHeader>

        <div className="space-y-6">
          <div className="text-center text-sm text-muted-foreground">
            Card {currentIndex + 1} de {totalCards}
          </div>

          <div 
            className="relative h-80 max-h-80 cursor-pointer perspective-1000"
            onClick={handleFlip}
          >
            <div 
              className={`flashcard-inner ${isFlipped ? 'flipped' : ''}`}
            >
              {/* Front */}
              <div className="flashcard-face flashcard-front bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-8 flex items-center justify-center border-2 border-primary/20">
                <p className="text-xl font-medium text-center">{currentCard.front}</p>
              </div>

              {/* Back */}
              <div className="flashcard-face flashcard-back bg-gradient-to-br from-secondary/5 to-secondary/10 rounded-lg p-8 flex items-center justify-center border-2 border-secondary/20">
                <p className="text-lg text-center">{currentCard.back}</p>
              </div>
            </div>
          </div>

          {!isFlipped && (
            <div className="text-center">
              <Button variant="outline" size="sm" onClick={handleFlip}>
                Mostrar Resposta
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between gap-4">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Anterior
            </Button>

            <Button
              variant="outline"
              onClick={handleNext}
              disabled={currentIndex === totalCards - 1}
            >
              Próximo
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          <Button 
            className="w-full" 
            onClick={handleStartReview}
          >
            Iniciar Revisão
          </Button>
        </div>

        <style>{`
          .perspective-1000 {
            perspective: 1000px;
          }

          .flashcard-inner {
            position: relative;
            width: 100%;
            height: 100%;
            text-align: center;
            transition: transform 0.6s;
            transform-style: preserve-3d;
          }

          .flashcard-inner.flipped {
            transform: rotateY(180deg);
          }

          .flashcard-face {
            position: absolute;
            width: 100%;
            height: 100%;
            -webkit-backface-visibility: hidden;
            backface-visibility: hidden;
          }

          .flashcard-back {
            transform: rotateY(180deg);
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
};
