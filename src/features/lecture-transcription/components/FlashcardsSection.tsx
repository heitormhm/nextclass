import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Layers, Eye, Loader2 } from 'lucide-react';
import type { GeneratedFlashcards } from '../types/flashcards.types';

interface FlashcardsSectionProps {
  flashcards: GeneratedFlashcards | null;
  isGenerating: boolean;
  onGenerate: () => void;
  onViewFlashcards: () => void;
}

export const FlashcardsSection: React.FC<FlashcardsSectionProps> = ({
  flashcards,
  isGenerating,
  onGenerate,
  onViewFlashcards,
}) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-purple-600" />
            <CardTitle>Flashcards</CardTitle>
          </div>
          {flashcards && (
            <Badge variant="secondary">
              {flashcards.cards.length} cards
            </Badge>
          )}
        </div>
        <CardDescription>
          {flashcards 
            ? `${flashcards.cards.length} flashcard${flashcards.cards.length !== 1 ? 's' : ''} • Clique para visualizar ou gerar novos` 
            : 'Gere flashcards automaticamente baseados no conteúdo da aula'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={onGenerate}
            disabled={isGenerating}
            variant={flashcards ? 'outline' : 'default'}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando Flashcards...
              </>
            ) : (
              <>
                <Layers className="mr-2 h-4 w-4" />
                {flashcards ? 'Gerar Novos Flashcards' : 'Gerar Flashcards'}
              </>
            )}
          </Button>
          
          {flashcards && !isGenerating && (
            <Button onClick={onViewFlashcards} variant="secondary">
              <Eye className="mr-2 h-4 w-4" />
              Visualizar Flashcards
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
