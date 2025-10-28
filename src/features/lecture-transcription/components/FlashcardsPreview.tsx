import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { FlashcardData } from '../types/flashcards.types';

interface FlashcardsPreviewProps {
  cards: FlashcardData[];
  maxItems?: number;
}

export const FlashcardsPreview: React.FC<FlashcardsPreviewProps> = ({ cards, maxItems = 4 }) => {
  const previewCards = cards.slice(0, maxItems);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-in fade-in duration-500">
      {previewCards.map((card, index) => {
        const front = card.front || card.termo || '';
        const back = card.back || card.definicao || '';
        
        return (
          <Card key={index} className="overflow-hidden border-border/50 hover:border-primary/30 transition-colors">
            <div className="h-[120px] flex flex-col">
              {/* Front (Pergunta/Termo) */}
              <div className="flex-1 p-3 bg-gradient-to-br from-purple-50 to-indigo-50 border-b border-border/30">
                <div className="h-full flex flex-col">
                  <div className="text-[10px] font-semibold text-purple-600 mb-1">FRENTE</div>
                  <p className="text-xs font-medium text-foreground line-clamp-2 flex-1">
                    {front}
                  </p>
                </div>
              </div>
              
              {/* Back (Resposta/Definição) */}
              <div className="flex-1 p-3 bg-gradient-to-br from-green-50 to-emerald-50">
                <div className="h-full flex flex-col">
                  <div className="text-[10px] font-semibold text-green-600 mb-1">VERSO</div>
                  <p className="text-xs text-muted-foreground line-clamp-2 flex-1">
                    {back}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Tags */}
            {card.tags && card.tags.length > 0 && (
              <div className="px-3 py-2 bg-muted/30 border-t border-border/30">
                <div className="flex gap-1 flex-wrap">
                  {card.tags.slice(0, 2).map((tag, tagIndex) => (
                    <Badge
                      key={tagIndex}
                      variant="secondary"
                      className="text-[9px] px-1.5 py-0 h-4"
                    >
                      {tag}
                    </Badge>
                  ))}
                  {card.tags.length > 2 && (
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
                      +{card.tags.length - 2}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};
