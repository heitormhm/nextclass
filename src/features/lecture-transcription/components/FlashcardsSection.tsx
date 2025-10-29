import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Layers, Eye, Loader2 } from 'lucide-react';
import type { GeneratedFlashcards } from '../types/flashcards.types';
import { FlashcardsPreview } from './FlashcardsPreview';
import { Skeleton } from '@/components/ui/skeleton';

interface FlashcardsSectionProps {
  flashcards: GeneratedFlashcards | null;
  isGenerating: boolean;
  isLoading?: boolean;
  onGenerate: () => void;
  onViewFlashcards: () => void;
}

export const FlashcardsSection: React.FC<FlashcardsSectionProps> = ({
  flashcards,
  isGenerating,
  isLoading = false,
  onGenerate,
  onViewFlashcards,
}) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isLoading ? (
              <Loader2 className="h-5 w-5 text-purple-600 animate-spin" />
            ) : (
              <Layers className="h-5 w-5 text-purple-600" />
            )}
            <CardTitle className="text-lg">Flashcards</CardTitle>
          </div>
          {flashcards && !isLoading && (
            <Badge className="bg-green-100 text-green-700 border-green-300">
              ✓ {flashcards.cards.length} cards
            </Badge>
          )}
        </div>
        <CardDescription>
          {isLoading 
            ? 'Carregando flashcards...'
            : flashcards 
              ? 'Visualize e gerencie os flashcards desta aula' 
              : 'Gere flashcards automaticamente com IA'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Preview Section */}
        {isLoading ? (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-3">
            <Skeleton className="h-[120px] w-full" />
            <Skeleton className="h-[120px] w-full" />
            <Skeleton className="h-[120px] w-full" />
            <Skeleton className="h-[120px] w-full" />
          </div>
        ) : flashcards && flashcards.cards.length > 0 && !isGenerating ? (
          <div className="mb-6">
            <FlashcardsPreview cards={flashcards.cards} maxItems={4} />
            <div className="text-center text-xs text-muted-foreground mt-4">
              Mostrando {Math.min(4, flashcards.cards.length)} de {flashcards.cards.length} flashcards
            </div>
          </div>
        ) : null}

        {/* Action Buttons */}
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
          
          {flashcards && !isGenerating && !isLoading && (
            <Button 
              onClick={onViewFlashcards} 
              variant="outline"
              className="min-w-[240px] border-purple-300 text-purple-700 hover:bg-purple-50 hover:border-purple-400"
            >
              <Eye className="mr-2 h-4 w-4" />
              Ver Todos os {flashcards.cards.length} Flashcards →
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
