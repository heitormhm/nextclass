import { Card } from '@/components/ui/card';
import { Check } from 'lucide-react';
import type { QuizQuestion } from '../types/quiz.types';

interface QuizPreviewProps {
  questions: QuizQuestion[];
  maxItems?: number;
}

export const QuizPreview: React.FC<QuizPreviewProps> = ({ questions, maxItems = 3 }) => {
  const previewQuestions = questions.slice(0, maxItems);

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {previewQuestions.map((question, index) => (
        <Card key={index} className="p-4 border-border/50 bg-card/50">
          <div className="space-y-3">
            <p className="font-medium text-sm leading-relaxed line-clamp-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold mr-2">
                {index + 1}
              </span>
              {question.question}
            </p>
            
            <div className="grid grid-cols-1 gap-2">
              {Object.entries(question.options).map(([letter, text]) => {
                const isCorrect = letter === question.correctAnswer;
                
                return (
                  <div
                    key={letter}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-colors ${
                      isCorrect
                        ? 'bg-green-50 border border-green-200 text-green-900'
                        : 'bg-muted/50 border border-border/30 text-muted-foreground'
                    }`}
                  >
                    <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                      isCorrect ? 'bg-green-200 text-green-900' : 'bg-muted text-muted-foreground'
                    }`}>
                      {letter}
                    </span>
                    <span className="flex-1 line-clamp-1">{text}</span>
                    {isCorrect && (
                      <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
