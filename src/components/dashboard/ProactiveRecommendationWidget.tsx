import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const fetchRecommendation = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.error('User not authenticated');
          setHasError(true);
          setIsLoading(false);
          return;
        }

        // Query da tabela recommendations
        const { data: recommendations, error } = await supabase
          .from('recommendations')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('priority', { ascending: false })  // high → medium → low
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Error fetching recommendation:', error);
          setHasError(true);
          return;
        }

        if (recommendations) {
          setRecommendation({
            text: `${recommendations.title} - ${recommendations.description}`,
            link: recommendations.action_route,
            priority: recommendations.priority as 'high' | 'medium' | 'low'
          });
          setHasError(false);
        } else {
          // Sem recomendação ativa
          setRecommendation(null);
          setHasError(false);
        }
      } catch (error) {
        console.error('Error fetching recommendation:', error);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommendation();
  }, []);

  const handleNavigate = () => {
    if (recommendation?.link) {
      navigate(recommendation.link);
    }
  };

  const getActionText = (text: string, link: string) => {
    // Derive action text from recommendation content
    if (text.toLowerCase().includes('flashcard') || link.includes('review')) {
      return 'Revisar Flashcards Agora';
    }
    if (text.toLowerCase().includes('quiz') || link.includes('quiz')) {
      return 'Fazer Quiz Agora';
    }
    if (text.toLowerCase().includes('aula') || link.includes('lecture') || link.includes('courses')) {
      return 'Ver Aulas Agora';
    }
    if (text.toLowerCase().includes('grade') || link.includes('grades')) {
      return 'Ver Notas Agora';
    }
    return 'Ver Agora';
  };

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
      <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-xl animate-fade-in font-['Manrope']">
        <CardHeader className="pb-4">
          <Skeleton className="h-7 w-56 mb-2" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-5 pt-2">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  // If error, show error state
  if (hasError) {
    return (
      <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-xl animate-fade-in font-['Manrope']">
        <CardHeader className="pb-4">
          <div>
            <CardTitle className="text-xl font-semibold">Recomendação Inteligente</CardTitle>
            <p className="text-sm text-gray-400 mt-0.5">
              Baseado no seu desempenho recente
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
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

  // If no recommendation, show empty state
  if (!recommendation) {
    return (
      <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-xl animate-fade-in font-['Manrope']">
        <CardHeader className="pb-4">
          <div>
            <CardTitle className="text-xl font-semibold">Recomendação Inteligente</CardTitle>
            <p className="text-sm text-gray-400 mt-0.5">
              Baseado no seu desempenho recente
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <div className="text-center p-6 bg-muted/50 rounded-lg">
            <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Continue interagindo com a plataforma e em breve teremos recomendações personalizadas para você!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-xl hover:shadow-md transition-all duration-300 animate-fade-in font-['Manrope'] flex flex-col min-h-[280px]">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-xl font-semibold">Recomendação Inteligente</CardTitle>
            <p className="text-sm text-gray-400 mt-0.5">
              Baseado no seu desempenho recente
            </p>
          </div>
          {recommendation.priority === 'high' && (
            <Badge 
              variant="outline" 
              className="bg-red-500/5 text-red-600 border-red-200 text-xs px-2.5 py-0.5 rounded-full font-medium flex-shrink-0"
            >
              Urgente
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-2 flex flex-col justify-between flex-1">
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-gradient-to-br from-pink-100/80 to-purple-100/80 rounded-full flex items-center justify-center">
              <Sparkles className="h-10 w-10 text-pink-500" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-pink-50/50 to-purple-50/50 p-5 rounded-xl border border-pink-100/50">
            <p className="text-base font-bold text-gray-800 leading-relaxed text-center">
              {recommendation.text}
            </p>
          </div>
        </div>
        <Button 
          onClick={handleNavigate}
          disabled={!recommendation.link}
          className="w-full group bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02] h-12 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {getActionText(recommendation.text, recommendation.link)}
          <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
        </Button>
      </CardContent>
    </Card>
  );
};

export default ProactiveRecommendationWidget;
