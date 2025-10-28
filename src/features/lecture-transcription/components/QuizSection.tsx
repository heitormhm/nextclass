import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileCheck, Eye, Plus, Trash2, Loader2 } from 'lucide-react';
import type { GeneratedQuiz } from '../types/quiz.types';
import { QuizPreview } from './QuizPreview';
import { Skeleton } from '@/components/ui/skeleton';

interface QuizSectionProps {
  quiz: GeneratedQuiz | null;
  isGenerating: boolean;
  isLoading?: boolean;
  onGenerate: () => void;
  onViewQuiz: () => void;
}

export const QuizSection: React.FC<QuizSectionProps> = ({
  quiz,
  isGenerating,
  isLoading = false,
  onGenerate,
  onViewQuiz,
}) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isLoading ? (
              <Loader2 className="h-5 w-5 text-purple-600 animate-spin" />
            ) : (
              <FileCheck className="h-5 w-5 text-purple-600" />
            )}
            <CardTitle>Quiz</CardTitle>
          </div>
          {quiz && !isLoading && (
            <Badge className="bg-green-100 text-green-700 border-green-300">
              ✓ {quiz.questions.length} questões
            </Badge>
          )}
        </div>
        <CardDescription>
          {isLoading 
            ? 'Carregando quiz...'
            : quiz 
              ? 'Visualize e gerencie o quiz desta aula' 
              : 'Gere um quiz automaticamente com IA'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Preview Section */}
        {isLoading ? (
          <div className="mb-6 space-y-3">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : quiz && quiz.questions.length > 0 && !isGenerating ? (
          <div className="mb-6">
            <QuizPreview questions={quiz.questions} maxItems={3} />
            <div className="text-center text-xs text-muted-foreground mt-4">
              Mostrando {Math.min(3, quiz.questions.length)} de {quiz.questions.length} questões
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
                Gerando...
              </>
            ) : (
              <>
                <FileCheck className="h-4 w-4" />
                {quiz ? 'Gerar Novo Quiz' : 'Gerar Quiz'}
              </>
            )}
          </Button>
          
          {quiz && !isGenerating && !isLoading && (
            <Button 
              onClick={onViewQuiz} 
              variant="outline"
              className="min-w-[240px] border-purple-300 text-purple-700 hover:bg-purple-50 hover:border-purple-400"
            >
              <Eye className="mr-2 h-4 w-4" />
              Ver Todas as {quiz.questions.length} Questões →
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
