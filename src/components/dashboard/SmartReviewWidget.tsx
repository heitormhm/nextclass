import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Brain, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

interface ReviewItem {
  id: string;
  topic: string;
  cardsReady: number;
  totalCards: number;
  nextReview: string;
}

const SmartReviewWidget = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [reviewData, setReviewData] = useState<ReviewItem | null>(null);

  useEffect(() => {
    // Simulate data fetching
    const timer = setTimeout(() => {
      setReviewData({
        id: '1',
        topic: 'Circuitos Elétricos',
        cardsReady: 12,
        totalCards: 12,
        nextReview: 'agora'
      });
      setIsLoading(false);
    }, 1400);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm bg-white/20 backdrop-blur-xl animate-fade-in">
        <CardHeader>
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!reviewData) return null;

  const completionPercentage = (reviewData.cardsReady / reviewData.totalCards) * 100;

  return (
    <Card className="border-0 shadow-sm bg-white/20 backdrop-blur-xl hover:shadow-md transition-all duration-300 animate-fade-in">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">Revisão Espaçada</CardTitle>
            <CardDescription>
              Flashcards prontos para revisar
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-foreground">{reviewData.topic}</h4>
              <p className="text-sm text-foreground-muted">
                {reviewData.cardsReady} de {reviewData.totalCards} cards prontos
              </p>
            </div>
            {completionPercentage === 100 && (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            )}
          </div>
          <Progress value={completionPercentage} className="h-2" />
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            <p className="text-sm text-foreground-muted">
              Próxima revisão: <span className="font-medium text-foreground">{reviewData.nextReview}</span>
            </p>
          </div>
        </div>
        <Link to="/annotations">
          <Button className="w-full group" variant="secondary">
            Iniciar Revisão
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
};

export default SmartReviewWidget;
