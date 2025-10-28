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
        <div className="flex flex-col items-center gap-3">
          <Button
            onClick={onGenerate}
            disabled={isGenerating}
            className="gap-2 h-10 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold border-0 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 min-w-[240px]"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Gerando Flashcards...
              </>
            ) : (
              <>
                <Layers className="h-4 w-4" />
                {flashcards ? 'Gerar Novos Flashcards' : 'Gerar Flashcards'}
              </>
            )}
          </Button>
          
          {flashcards && !isGenerating && (
            <Button 
              onClick={onViewFlashcards} 
              variant="outline"
              className="min-w-[240px] border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              <Eye className="mr-2 h-4 w-4" />
              Visualizar Flashcards
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
