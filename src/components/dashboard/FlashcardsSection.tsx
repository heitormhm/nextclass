import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { FlashcardViewerModal } from "@/components/FlashcardViewerModal";

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSet, setSelectedSet] = useState<FlashcardSet | null>(null);

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
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-pink-500/10 to-purple-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Brain className="h-6 w-6 text-pink-600" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-xl font-semibold">Meus Flashcards</CardTitle>
            <p className="text-sm text-gray-400 mt-0.5">
              Seus conjuntos de estudo
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {flashcardSets.map((set) => (
          <div
            key={set.id}
            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
          >
            <div className="flex-1">
              <h4 className="font-semibold text-lg mb-2">{set.title}</h4>
              <p className="text-sm text-muted-foreground mb-3">{set.topic}</p>
              <Badge variant="secondary" className="text-xs">
                {Array.isArray(set.cards) ? set.cards.length : 0} cards
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedSet(set);
                setIsModalOpen(true);
              }}
            >
              <Eye className="h-4 w-4 mr-2" />
              Ver Flashcards
            </Button>
          </div>
        ))}
      </CardContent>

      <FlashcardViewerModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedSet(null);
        }}
        flashcardSet={selectedSet}
      />
    </Card>
  );
};
