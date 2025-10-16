import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FlashcardSet {
  id: string;
  title: string;
  topic: string;
  cards: any;
  created_at: string;
}

export const FlashcardsSection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [flashcardSets, setFlashcardSets] = useState<FlashcardSet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchFlashcardSets = async () => {
      try {
        const { data, error } = await supabase
          .from('generated_flashcard_sets')
          .select('id, title, topic, cards, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) throw error;
        setFlashcardSets(data || []);
      } catch (error) {
        console.error('Error fetching flashcard sets:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFlashcardSets();
  }, [user]);

  const handleReviewSet = (setId: string) => {
    navigate(`/review?setId=${setId}`);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Meus Flashcards
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (flashcardSets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Meus Flashcards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-3">
            <Brain className="w-12 h-12 mx-auto text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">
              Você ainda não criou nenhum conjunto de flashcards.
            </p>
            <p className="text-xs text-muted-foreground">
              Que tal criar um a partir da sua próxima conversa com a Mia?
            </p>
            <Button 
              onClick={() => navigate('/aichat')}
              variant="outline"
              size="sm"
              className="mt-4"
            >
              Conversar com Mia
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5" />
          Meus Flashcards
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {flashcardSets.map((set) => (
          <div
            key={set.id}
            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
          >
            <div className="flex-1">
              <h4 className="font-medium text-sm">{set.title}</h4>
              <p className="text-xs text-muted-foreground">
                {set.topic} • {Array.isArray(set.cards) ? set.cards.length : 0} cards
              </p>
            </div>
            <Button
              onClick={() => handleReviewSet(set.id)}
              size="sm"
              variant="ghost"
            >
              Revisar
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
