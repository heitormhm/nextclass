import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { FlashcardData } from '../types/flashcards.types';

interface FlashcardsPreviewProps {
  cards: FlashcardData[];
  maxItems?: number;
}

export const FlashcardsPreview: React.FC<FlashcardsPreviewProps> = ({ cards, maxItems = 4 }) => {
  const previewCards = cards.slice(0, maxItems);
  const [flippedCards, setFlippedCards] = useState<{ [key: number]: boolean }>({});

  const handleFlip = (index: number) => {
    setFlippedCards(prev => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-in fade-in duration-500">
        {previewCards.map((card, index) => {
          const front = card.front || card.termo || '';
          const back = card.back || card.definicao || '';
          const isFlipped = flippedCards[index] || false;
          
          return (
            <div
              key={index}
              className="perspective-1000 cursor-pointer h-[160px]"
              onClick={() => handleFlip(index)}
            >
              <div className={`flashcard-inner ${isFlipped ? 'flipped' : ''} h-full`}>
                {/* Front */}
                <Card className="flashcard-face flashcard-front h-full border-2 border-purple-300 hover:border-purple-400 transition-colors shadow-md hover:shadow-lg">
                  <div className="h-full flex flex-col bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg">
                    <div className="flex-1 p-4 flex flex-col justify-center">
                      <p className="text-sm font-semibold text-slate-900 text-center line-clamp-3">
                        {front}
                      </p>
                    </div>
                    <div className="px-3 py-2 border-t border-purple-300/30 bg-purple-50/50">
                      <p className="text-[10px] text-purple-700 text-center font-medium">
                        Clique para ver a resposta
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Back */}
                <Card className="flashcard-face flashcard-back h-full border-2 border-emerald-300 shadow-md">
                  <div className="h-full flex flex-col bg-gradient-to-br from-emerald-100 to-teal-100 rounded-lg">
                    <div className="flex-1 p-4 flex flex-col justify-center">
                      <p className="text-sm text-slate-800 text-center line-clamp-4">
                        {back}
                      </p>
                    </div>
                    {card.tags && card.tags.length > 0 && (
                      <div className="px-3 py-2 border-t border-emerald-300/30 bg-emerald-50/50">
                        <div className="flex gap-1 flex-wrap justify-center">
                          {card.tags.slice(0, 2).map((tag, tagIndex) => (
                            <Badge
                              key={tagIndex}
                              variant="secondary"
                              className="text-[9px] px-1.5 py-0 h-4 bg-emerald-200 text-emerald-900"
                            >
                              {tag}
                            </Badge>
                          ))}
                          {card.tags.length > 2 && (
                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-emerald-200 text-emerald-900">
                              +{card.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }

        .flashcard-inner {
          position: relative;
          width: 100%;
          height: 100%;
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
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }

        .flashcard-back {
          transform: rotateY(180deg);
        }
      `}</style>
    </>
  );
};
