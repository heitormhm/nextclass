import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const SmartReviewWidget = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [dueFlashcardsCount, setDueFlashcardsCount] = useState<number>(0);

  useEffect(() => {
    const fetchDueFlashcards = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // Get all flashcard sets for the user
        const { data: sets, error: setsError } = await supabase
          .from('generated_flashcard_sets')
          .select('id, created_at')
          .eq('user_id', user.id);

        if (setsError) throw setsError;

        if (!sets || sets.length === 0) {
          setDueFlashcardsCount(0);
          setIsLoading(false);
          return;
        }

        // Get all reviews for these sets
        const { data: reviews, error: reviewsError } = await supabase
          .from('flashcard_reviews')
          .select('lecture_id, created_at')
          .eq('user_id', user.id);

        if (reviewsError) throw reviewsError;

        // Calculate due flashcards using spaced repetition logic
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);

        const reviewMap = new Map(
          (reviews || []).map(r => [r.lecture_id, new Date(r.created_at)])
        );

        const dueCount = sets.filter(set => {
          const lastReview = reviewMap.get(set.id);
          // Due if never reviewed OR last review was more than 1 day ago
          return !lastReview || lastReview < oneDayAgo;
        }).length;

        setDueFlashcardsCount(dueCount);
      } catch (error) {
        console.error('Error calculating due flashcards:', error);
        setDueFlashcardsCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDueFlashcards();
  }, [user]);

  const handleStartReview = () => {
    navigate('/review');
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

  return (
    <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-xl hover:shadow-md transition-all duration-300 animate-fade-in font-['Manrope'] flex flex-col min-h-[280px]">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-pink-500/10 to-purple-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Brain className="h-6 w-6 text-pink-600" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-xl font-semibold">Revisão Espaçada</CardTitle>
            <p className="text-sm text-gray-400 mt-0.5">
              Flashcards prontos para revisar
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-2 flex flex-col justify-between flex-1">
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-pink-50/50 to-purple-50/50 p-6 rounded-xl border border-pink-100/50">
            <div className="text-center space-y-2">
              <div className="text-6xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                {dueFlashcardsCount}
              </div>
              <p className="text-base font-medium text-gray-600">
                flashcards para revisar hoje
              </p>
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500">
              {dueFlashcardsCount > 0 
                ? "Você tem flashcards aguardando revisão! Vamos começar." 
                : "Parabéns! Você está em dia com suas revisões."}
            </p>
          </div>
        </div>
        <Button 
          onClick={handleStartReview}
          className="w-full group bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02] h-12 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          disabled={dueFlashcardsCount === 0}
        >
          {dueFlashcardsCount > 0 ? 'Iniciar Revisão Agora' : 'Nenhum Flashcard Pendente'}
          {dueFlashcardsCount > 0 && (
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default SmartReviewWidget;
