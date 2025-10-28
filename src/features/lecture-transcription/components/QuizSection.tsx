import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileCheck, Eye, Plus, Trash2, Loader2 } from 'lucide-react';
import type { GeneratedQuiz } from '../types/quiz.types';

interface QuizSectionProps {
  quiz: GeneratedQuiz | null;
  isGenerating: boolean;
  onGenerate: () => void;
  onViewQuiz: () => void;
}

export const QuizSection: React.FC<QuizSectionProps> = ({
  quiz,
  isGenerating,
  onGenerate,
  onViewQuiz,
}) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-purple-600" />
            <CardTitle>Quiz</CardTitle>
          </div>
          {quiz && (
            <Badge variant="secondary">
              {quiz.questions.length} questões
            </Badge>
          )}
        </div>
        <CardDescription>
          {quiz 
            ? 'Visualize e gerencie o quiz desta aula' 
            : 'Gere um quiz automaticamente com IA'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={onGenerate}
            disabled={isGenerating}
            variant={quiz ? 'outline' : 'default'}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando...
              </>
          ) : (
            <>
              <FileCheck className="mr-2 h-4 w-4" />
              {quiz ? 'Gerar Novo Quiz' : 'Gerar Quiz'}
            </>
          )}
          </Button>
          
          {quiz && !isGenerating && (
            <Button onClick={onViewQuiz} variant="secondary">
              <Eye className="mr-2 h-4 w-4" />
              Visualizar Quiz
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
