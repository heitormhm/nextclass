import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface GeneratingPlan {
  id: string;
  topic: string;
}

export const LessonPlanFloatingIndicator = () => {
  const [generatingPlans, setGeneratingPlans] = useState<GeneratingPlan[]>([]);
  const [isDismissed, setIsDismissed] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchGeneratingPlans();

    const channel = supabase
      .channel('generating-plans-indicator')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lesson_plans'
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' && payload.new.status === 'completed') {
            // Show completion toast
            toast({
              title: "✨ Plano de aula pronto!",
              description: `O plano "${payload.new.topic}" está concluído.`,
              action: (
                <button
                  onClick={() => navigate(`/teacher/lesson-plans/${payload.new.id}`)}
                  className="text-purple-400 hover:text-purple-300 text-sm font-medium"
                >
                  Ver plano
                </button>
              ),
            });

            // Refresh list
            fetchGeneratingPlans();
          } else if (payload.eventType === 'INSERT' && payload.new.status === 'generating') {
            fetchGeneratingPlans();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchGeneratingPlans = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('lesson_plans')
        .select('id, topic')
        .eq('teacher_id', user.id)
        .eq('status', 'generating');

      if (error) throw error;
      setGeneratingPlans(data || []);
      setIsDismissed(false);
    } catch (error) {
      console.error('Error fetching generating plans:', error);
    }
  };

  if (generatingPlans.length === 0 || isDismissed) return null;

  const currentPlan = generatingPlans[0];

  return (
    <div
      className="fixed top-20 right-6 z-50 bg-gray-800 border border-purple-500/30 rounded-lg shadow-lg p-4 max-w-sm cursor-pointer hover:bg-gray-750 transition-colors"
      onClick={() => navigate(`/teacher/lesson-plans/${currentPlan.id}`)}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsDismissed(true);
        }}
        className="absolute top-2 right-2 text-gray-400 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <div className="p-2 rounded-lg bg-purple-600/20 border border-purple-500/30 shrink-0">
          <Loader2 className="h-5 w-5 text-purple-400 animate-spin" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-purple-400" />
            <p className="text-sm font-medium text-white">Mia está criando...</p>
          </div>
          <p className="text-sm text-gray-300 line-clamp-2">{currentPlan.topic}</p>
          {generatingPlans.length > 1 && (
            <p className="text-xs text-gray-500 mt-2">
              +{generatingPlans.length - 1} outro{generatingPlans.length > 2 ? 's' : ''}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
