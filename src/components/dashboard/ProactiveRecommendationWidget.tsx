import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Lightbulb, ArrowRight, TrendingUp, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

interface Recommendation {
  text: string;
  link: string;
  priority: 'high' | 'medium' | 'low';
}

const ProactiveRecommendationWidget = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-student-dashboard-data');
        
        if (error) {
          console.error('Error fetching recommendation:', error);
          setHasError(true);
          return;
        }
        
        if (data?.recommendation) {
          setRecommendation(data.recommendation);
          setHasError(false);
        } else {
          setHasError(true);
        }
      } catch (error) {
        console.error('Error fetching recommendation:', error);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
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
      <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-xl animate-fade-in">
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

  // If error or no recommendation, show error state
  if (hasError || !recommendation) {
    return (
      <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-xl animate-fade-in">
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
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
            <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground">
              Não foi possível carregar sua recomendação no momento.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-xl hover:shadow-md transition-all duration-300 animate-fade-in">
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
          <p className="text-sm text-foreground-muted leading-relaxed flex items-start gap-2">
            <TrendingUp className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <span>{recommendation.text}</span>
          </p>
        </div>
        <Link to={recommendation.link}>
          <Button className="w-full group">
            Ver Detalhes
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
};

export default ProactiveRecommendationWidget;
