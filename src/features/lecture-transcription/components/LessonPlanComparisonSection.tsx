import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface LessonPlanComparisonSectionProps {
  onCompare: (lessonPlanText: string) => Promise<any>;
  isComparing: boolean;
}

export const LessonPlanComparisonSection: React.FC<LessonPlanComparisonSectionProps> = ({
  onCompare,
  isComparing,
}) => {
  const [lessonPlanText, setLessonPlanText] = useState('');
  const [comparisonResult, setComparisonResult] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCompare = async () => {
    const result = await onCompare(lessonPlanText);
    if (result) {
      setComparisonResult(result);
      setIsModalOpen(true);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            <CardTitle>Comparar com Plano de Aula</CardTitle>
          </div>
          <CardDescription>
            Analise a cobertura do conteúdo em relação ao plano de aula
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Textarea
              value={lessonPlanText}
              onChange={(e) => setLessonPlanText(e.target.value)}
              placeholder="Cole aqui o plano de aula para comparação..."
              className="min-h-[150px]"
            />
            <Button
              onClick={handleCompare}
              disabled={!lessonPlanText.trim() || isComparing}
              className="w-full"
            >
              {isComparing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Analisar Cobertura
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Result Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Relatório de Cobertura</DialogTitle>
          </DialogHeader>
          {comparisonResult && (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown>{comparisonResult}</ReactMarkdown>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
