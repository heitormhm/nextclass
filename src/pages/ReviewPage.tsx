import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, Home, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import MainLayout from '@/components/MainLayout';

interface Review {
  review_id: string;
  card_id: string;
  term: string;
  definition: string;
  course_name: string;
  last_reviewed: string | null;
  review_count: number;
}

const ReviewPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const lectureIdFromState = location.state?.lectureId;
  const lectureTitle = location.state?.lectureTitle;
  const [reviews, setReviews] = useState<Review[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    fetchDueReviews();
  }, []);

  const fetchDueReviews = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsCompleted(true);
        return;
      }

      // Buscar todos os conjuntos de flashcards do usuário
      const { data: sets, error: setsError } = await supabase
        .from('generated_flashcard_sets')
        .select('id, title, topic, cards, created_at')
        .eq('user_id', user.id);

      if (setsError) throw setsError;
      if (!sets || sets.length === 0) {
        setIsCompleted(true);
        return;
      }

      // Buscar últimas revisões
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('flashcard_reviews')
        .select('lecture_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (reviewsError) throw reviewsError;

      // Calcular flashcards devido (repetição espaçada - simplificado: 1 dia)
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const reviewMap = new Map(
        (reviewsData || []).map(r => [r.lecture_id, new Date(r.created_at)])
      );

      const dueSets = sets.filter(set => {
        const lastReview = reviewMap.get(set.id);
        return !lastReview || lastReview < oneDayAgo;
      });

      if (dueSets.length === 0) {
        setIsCompleted(true);
        return;
      }

      // Transformar em formato de Review (flatten cards)
      const reviewCards: Review[] = [];
      dueSets.forEach(set => {
        if (Array.isArray(set.cards)) {
          set.cards.forEach((card: any) => {
            reviewCards.push({
              review_id: `${set.id}_${card.front}`,
              card_id: card.front,
              term: card.front,
              definition: card.back,
              course_name: set.topic,
              last_reviewed: null,
              review_count: 0
            });
          });
        }
      });

      setReviews(reviewCards);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Erro ao carregar flashcards para revisão');
      setIsCompleted(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFlip = () => {
    if (!isFlipped) {
      setIsFlipped(true);
    }
  };

  const handleFeedback = async (correct: boolean) => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      const currentReview = reviews[currentIndex];
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Extrair lecture_id do review_id (formato: "setId_term")
      const [lectureId] = currentReview.review_id.split('_');

      // Salvar feedback na tabela flashcard_reviews
      await supabase
        .from('flashcard_reviews')
        .insert({
          user_id: user.id,
          lecture_id: lectureId,
          topic: currentReview.course_name,
          percentage: correct ? 100 : 0,
          correct_count: correct ? 1 : 0,
          total_count: 1
        });

      // Próximo card
      if (currentIndex + 1 < reviews.length) {
        setCurrentIndex(currentIndex + 1);
        setIsFlipped(false);
      } else {
        setIsCompleted(true);
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Erro ao registrar resposta');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-foreground-muted">Carregando flashcards...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (isCompleted) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-lg w-full border-0 shadow-lg bg-white/60 backdrop-blur-xl">
            <CardContent className="p-8 text-center">
              <div className="mb-6">
                <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-10 w-10 text-success" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Parabéns!</h2>
                <p className="text-foreground-muted">
                  {reviews.length > 0 
                    ? 'Você completou todas as revisões de hoje!' 
                    : 'Você não tem flashcards para revisar hoje!'}
                </p>
              </div>

              {reviews.length > 0 && (
                <div className="bg-primary/5 rounded-lg p-4 mb-6">
                  <p className="text-sm text-foreground-muted">
                    Você revisou <span className="font-bold text-primary">{reviews.length}</span> flashcard{reviews.length > 1 ? 's' : ''} hoje
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                {lectureIdFromState ? (
                  <Button
                    size="lg"
                    className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                    onClick={() => navigate(`/lecture/${lectureIdFromState}`)}
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Voltar para a Aula
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => navigate('/dashboard')}
                    >
                      <Home className="h-4 w-4 mr-2" />
                      Dashboard
                    </Button>
                    <Button
                      className="flex-1 bg-primary hover:bg-primary/90"
                      onClick={() => navigate('/courses')}
                    >
                      <BookOpen className="h-4 w-4 mr-2" />
                      Ver Cursos
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const currentReview = reviews[currentIndex];
  const progress = ((currentIndex + 1) / reviews.length) * 100;

  // Safety check - if no current review, show completion screen
  if (!currentReview) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-lg w-full border-0 shadow-lg bg-white/60 backdrop-blur-xl">
            <CardContent className="p-8 text-center">
              <div className="mb-6">
                <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-10 w-10 text-success" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Tudo pronto!</h2>
                <p className="text-foreground-muted">
                  Você não tem flashcards para revisar no momento.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate('/dashboard')}
                >
                  <Home className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
                <Button
                  className="flex-1 bg-primary hover:bg-primary/90"
                  onClick={() => navigate('/courses')}
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Ver Cursos
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        {/* Progress Indicator */}
        <div className="w-full max-w-2xl mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground-muted">
              Card {currentIndex + 1} de {reviews.length}
            </span>
            <Badge variant="secondary" className="text-xs">
              {currentReview.course_name}
            </Badge>
          </div>
          <div className="w-full h-2 bg-background-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Flashcard */}
        <div className="w-full max-w-2xl perspective-1000">
          <div
            className={`relative w-full transition-transform duration-500 transform-style-3d cursor-pointer ${
              isFlipped ? 'rotate-y-180' : ''
            }`}
            onClick={handleFlip}
            style={{
              transformStyle: 'preserve-3d',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
            }}
          >
            {/* Front of Card */}
            <Card
              className={`min-h-[400px] border-0 shadow-lg backface-hidden bg-white/60 backdrop-blur-xl ${
                isFlipped ? 'invisible' : 'visible'
              }`}
              style={{ backfaceVisibility: 'hidden' }}
            >
              <CardContent className="p-12 flex flex-col items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <p className="text-sm text-foreground-muted mb-4">Termo</p>
                  <h2 className="text-3xl font-bold mb-8">{currentReview.term}</h2>
                  <p className="text-sm text-foreground-muted italic">
                    Clique para revelar a definição
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Back of Card */}
            <Card
              className={`absolute inset-0 min-h-[400px] border-0 shadow-lg backface-hidden bg-white/60 backdrop-blur-xl ${
                isFlipped ? 'visible' : 'invisible'
              }`}
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)'
              }}
            >
              <CardContent className="p-12 flex flex-col items-center justify-center min-h-[400px]">
                <div className="text-center mb-8">
                  <p className="text-sm text-foreground-muted mb-2">Definição</p>
                  <p className="text-lg leading-relaxed">{currentReview.definition}</p>
                </div>

                {isFlipped && (
                  <div className="w-full animate-fade-in">
                    <div className="border-t pt-8">
                      <h3 className="text-xl font-semibold mb-6 text-center">
                        Você acertou?
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <Button
                          size="lg"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFeedback(false);
                          }}
                          disabled={isSubmitting}
                          className="h-14 text-lg hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
                        >
                          {isSubmitting ? (
                            <Loader2 className="h-5 w-5 animate-spin mr-2" />
                          ) : (
                            <XCircle className="h-5 w-5 mr-2" />
                          )}
                          Não
                        </Button>
                        <Button
                          size="lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFeedback(true);
                          }}
                          disabled={isSubmitting}
                          className="h-14 text-lg bg-success hover:bg-success/90"
                        >
                          {isSubmitting ? (
                            <Loader2 className="h-5 w-5 animate-spin mr-2" />
                          ) : (
                            <CheckCircle className="h-5 w-5 mr-2" />
                          )}
                          Sim
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Help Text */}
        {!isFlipped && (
          <p className="text-sm text-foreground-muted mt-8 text-center max-w-md animate-fade-in">
            Tente lembrar a definição antes de virar o card
          </p>
        )}
      </div>

      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </MainLayout>
  );
};

export default ReviewPage;