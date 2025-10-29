import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Eye, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

// Convert markdown to HTML for flashcard text formatting
const convertMarkdownToHtml = (text: string): string => {
  if (!text) return '';
  
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') // Negrito
    .replace(/\*(.+?)\*/g, '<em>$1</em>') // Itálico
    .replace(/\n/g, '<br>') // Quebras de linha
    .replace(/\$\$(.+?)\$\$/g, '<span class="math-inline">$1</span>') // LaTeX inline
    .replace(/`(.+?)`/g, '<code class="inline-code">$1</code>') // Código inline
    .trim();
};

interface FlashcardSet {
  id: string;
  title: string;
  cards: Array<{ 
    front: string; 
    back: string;
    tags?: string[];
  }>;
}

interface TeacherFlashcardViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  flashcardSet: FlashcardSet | null;
  hasQuiz?: boolean;
  onViewQuiz?: () => void;
}

export const TeacherFlashcardViewerModal = ({ isOpen, onClose, flashcardSet, hasQuiz, onViewQuiz }: TeacherFlashcardViewerModalProps) => {
  const [viewMode, setViewMode] = useState<'list' | 'interactive'>('list');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [flippedCardsInList, setFlippedCardsInList] = useState<{ [key: number]: boolean }>({});

  const handleClose = () => {
    setViewMode('list');
    setCurrentIndex(0);
    setIsFlipped(false);
    setFlippedCardsInList({});
    onClose();
  };

  const handleFlipCardInList = (index: number) => {
    setFlippedCardsInList(prev => ({ ...prev, [index]: !prev[index] }));
  };

  useEffect(() => {
    if (isOpen) {
      setViewMode('list');
      setCurrentIndex(0);
      setIsFlipped(false);
      setFlippedCardsInList({});
    }
  }, [isOpen]);

  if (!flashcardSet || !flashcardSet.cards || flashcardSet.cards.length === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Flashcards não disponíveis</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-4">
            Nenhum flashcard foi gerado ainda. Por favor, gere flashcards primeiro.
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  // VIEW MODE: Lista de Flashcards
  if (viewMode === 'list') {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Layers className="h-6 w-6 text-purple-600" />
              {flashcardSet.title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-6">
            {/* Estatísticas */}
            <div className="flex items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-lg border border-purple-200">
              <div>
                <p className="text-sm text-muted-foreground">Total de Flashcards</p>
                <p className="text-3xl font-bold text-purple-600">{flashcardSet.cards.length}</p>
              </div>
              <Button
                onClick={() => setViewMode('interactive')}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              >
                🃏 Modo Interativo
              </Button>
            </div>

            {/* Lista de Flashcards */}
            <div className="grid gap-4 md:grid-cols-2">
              {flashcardSet.cards.map((card, index) => {
                const isFlippedInList = flippedCardsInList[index] || false;
                
                return (
                  <div
                    key={index}
                    className="perspective-1000 cursor-pointer h-[200px]"
                    onClick={() => handleFlipCardInList(index)}
                  >
                    <div className={`flashcard-inner ${isFlippedInList ? 'flipped' : ''} h-full`}>
                      {/* Front */}
                      <div className="flashcard-face flashcard-front h-full border-2 border-purple-300 rounded-lg overflow-hidden hover:shadow-lg transition-shadow bg-gradient-to-br from-purple-100 to-pink-100">
                        <div className="p-4 h-full flex flex-col">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">
                              Card {index + 1}
                            </Badge>
                          </div>
                          {card.tags && card.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {card.tags.map((tag, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs bg-purple-200 text-purple-900">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <div className="flex-1 flex items-center justify-center">
                            <div 
                              className="text-base font-semibold text-slate-900 text-center line-clamp-4" 
                              dangerouslySetInnerHTML={{ __html: convertMarkdownToHtml(card.front) }}
                            />
                          </div>
                          <p className="text-xs text-purple-700 text-center font-medium mt-2">
                            Clique para ver a resposta
                          </p>
                        </div>
                      </div>
                      
                      {/* Back */}
                      <div className="flashcard-face flashcard-back h-full border-2 border-emerald-300 rounded-lg overflow-hidden bg-gradient-to-br from-emerald-100 to-teal-100">
                        <div className="p-4 h-full flex items-center justify-center">
                          <div 
                            className="text-sm text-slate-800 leading-relaxed text-center line-clamp-6" 
                            dangerouslySetInnerHTML={{ __html: convertMarkdownToHtml(card.back) }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t gap-3">
            <Button variant="outline" onClick={handleClose}>
              Fechar
            </Button>
            <div className="flex gap-3">
              {hasQuiz && onViewQuiz && (
                <Button 
                  variant="outline"
                  className="bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-700"
                  onClick={() => {
                    handleClose();
                    onViewQuiz();
                  }}
                >
                  📝 Ver Quiz
                </Button>
              )}
              <Button
                onClick={() => setViewMode('interactive')}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              >
                🃏 Modo Interativo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // VIEW MODE: Visualização Interativa
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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setViewMode('list')}
          className="absolute top-4 left-4 z-10"
        >
          ← Ver Todos
        </Button>

        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            {flashcardSet.title}
          </DialogTitle>
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
              <div className="flashcard-face flashcard-front bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg p-8 flex flex-col items-center justify-center border-2 border-purple-400 shadow-lg">
                {currentCard.tags && currentCard.tags.length > 0 && (
                  <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                    {currentCard.tags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary" className="bg-purple-200 text-purple-900 border-purple-300">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                <div 
                  className="text-3xl font-semibold text-center text-slate-900 mt-8" 
                  dangerouslySetInnerHTML={{ __html: convertMarkdownToHtml(currentCard.front) }}
                />
                <p className="text-sm text-purple-700 mt-6 font-medium">Clique para ver a resposta</p>
              </div>

              {/* Back */}
              <div className="flashcard-face flashcard-back bg-gradient-to-br from-emerald-100 to-teal-100 rounded-lg p-8 flex items-center justify-center border-2 border-emerald-400 shadow-lg">
                <div 
                  className="text-2xl text-center text-slate-900 leading-relaxed" 
                  dangerouslySetInnerHTML={{ __html: convertMarkdownToHtml(currentCard.back) }}
                />
              </div>
            </div>
          </div>

          {!isFlipped && (
            <div className="text-center">
              <Button variant="outline" size="sm" onClick={handleFlip} className="bg-purple-50 border-purple-300 hover:bg-purple-100">
                Mostrar Resposta
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between gap-4">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="flex-1"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Anterior
            </Button>

            <Button
              variant="outline"
              onClick={handleNext}
              disabled={currentIndex === totalCards - 1}
              className="flex-1"
            >
              Próximo
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          {/* FASE 3: Botão Ver Quiz */}
          {hasQuiz && onViewQuiz && (
            <Button 
              variant="outline"
              className="w-full bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-700"
              onClick={() => {
                handleClose();
                onViewQuiz();
              }}
            >
              📝 Ver Quiz Gerado
            </Button>
          )}
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
            transition: transform 0.6s cubic-bezier(0.4, 0.0, 0.2, 1);
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

          /* Formatação de texto em flashcards */
          .math-inline {
            font-family: 'KaTeX_Main', 'Times New Roman', serif;
            font-style: italic;
            color: #6B46C1;
          }

          .inline-code {
            background-color: rgba(100, 100, 100, 0.1);
            padding: 2px 6px;
            border-radius: 3px;
            font-family: monospace;
            font-size: 0.9em;
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
};