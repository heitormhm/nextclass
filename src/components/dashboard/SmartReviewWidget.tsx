import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Brain, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

const SmartReviewWidget = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [dueFlashcardsCount, setDueFlashcardsCount] = useState<number>(0);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-student-dashboard-data');
        
        if (error) {
          console.error('Error fetching flashcards data:', error);
          // Gracefully default to 0 on error
          setDueFlashcardsCount(0);
          return;
        }
        
        // Robust data handling - default to 0 if data is invalid
        const count = data?.dueFlashcardsCount;
        if (typeof count === 'number' && !isNaN(count) && count >= 0) {
          setDueFlashcardsCount(count);
        } else {
          setDueFlashcardsCount(0);
        }
      } catch (error) {
        console.error('Error fetching flashcards data:', error);
        // Gracefully default to 0 on error
        setDueFlashcardsCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

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

  return (
    <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-xl hover:shadow-md transition-all duration-300 animate-fade-in">
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
          <div className="text-center py-4">
            <div className="text-5xl font-bold text-primary mb-2">{dueFlashcardsCount}</div>
            <p className="text-sm text-foreground-muted">
              flashcards para revisar hoje
            </p>
          </div>
          <p className="text-center text-sm text-foreground">
            {dueFlashcardsCount > 0 
              ? "Você tem flashcards aguardando revisão! Vamos começar." 
              : "Parabéns! Você está em dia com suas revisões."}
          </p>
        </div>
        <Link to="/annotations">
          <Button className="w-full group" variant="secondary" disabled={dueFlashcardsCount === 0}>
            {dueFlashcardsCount > 0 ? 'Iniciar Revisão' : 'Nenhum Flashcard Pendente'}
            {dueFlashcardsCount > 0 && (
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            )}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
};

export default SmartReviewWidget;
