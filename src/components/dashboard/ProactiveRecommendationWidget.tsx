import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Lightbulb, ArrowRight, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface Recommendation {
  id: string;
  title: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  actionLabel: string;
  actionLink: string;
}

const ProactiveRecommendationWidget = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);

  useEffect(() => {
    // Simulate data fetching
    const timer = setTimeout(() => {
      setRecommendation({
        id: '1',
        title: 'Revisão Urgente: Termodinâmica',
        reason: 'Seu desempenho em Leis de Termodinâmica caiu 15% no último quiz. Recomendamos revisar este tópico antes da próxima avaliação.',
        priority: 'high',
        actionLabel: 'Revisar Agora',
        actionLink: '/courses'
      });
      setIsLoading(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'low':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

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

  if (!recommendation) return null;

  return (
    <Card className="border-0 shadow-sm bg-white/20 backdrop-blur-xl hover:shadow-md transition-all duration-300 animate-fade-in">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Lightbulb className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">Recomendação Inteligente</CardTitle>
            <CardDescription>
              Baseado no seu desempenho recente
            </CardDescription>
          </div>
          <Badge variant="outline" className={getPriorityColor(recommendation.priority)}>
            {recommendation.priority === 'high' ? 'Urgente' : recommendation.priority === 'medium' ? 'Importante' : 'Sugestão'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            {recommendation.title}
          </h4>
          <p className="text-sm text-foreground-muted leading-relaxed">
            {recommendation.reason}
          </p>
        </div>
        <Link to={recommendation.actionLink}>
          <Button className="w-full group">
            {recommendation.actionLabel}
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
};

export default ProactiveRecommendationWidget;
