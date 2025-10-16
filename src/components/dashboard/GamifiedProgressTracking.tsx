import { useEffect, useState } from "react";
import { Trophy, Flame, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface GamificationData {
  streak: number;
  currentXP: number;
  level: number;
  nextLevelXP: number;
  xpProgress: number;
}

const calculateLevel = (xp: number) => {
  if (xp < 500) return { level: 1, nextLevelXP: 500, previousLevelXP: 0 };
  if (xp < 1500) return { level: 2, nextLevelXP: 1500, previousLevelXP: 500 };
  if (xp < 3000) return { level: 3, nextLevelXP: 3000, previousLevelXP: 1500 };
  if (xp < 5000) return { level: 4, nextLevelXP: 5000, previousLevelXP: 3000 };
  const level = 5 + Math.floor((xp - 5000) / 2000);
  const previousLevelXP = 5000 + (level - 5) * 2000;
  const nextLevelXP = 5000 + (level - 4) * 2000;
  return { level, nextLevelXP, previousLevelXP };
};

const GamifiedProgressTracking = () => {
  const { user } = useAuth();
  const [data, setData] = useState<GamificationData>({
    streak: 0,
    currentXP: 0,
    level: 1,
    nextLevelXP: 500,
    xpProgress: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchGamificationData = async () => {
      try {
        // Calculate streak from student_insights
        const { data: insights } = await supabase
          .from('student_insights')
          .select('created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(30);

        let streak = 0;
        if (insights && insights.length > 0) {
          const dates = insights.map(i => new Date(i.created_at).toDateString());
          const uniqueDates = [...new Set(dates)];
          
          const today = new Date().toDateString();
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          
          // Check if there's activity today or yesterday
          if (uniqueDates.includes(today) || uniqueDates.includes(yesterday.toDateString())) {
            streak = 1;
            let checkDate = new Date();
            if (!uniqueDates.includes(today)) {
              checkDate.setDate(checkDate.getDate() - 1);
            }
            
            // Count consecutive days backwards
            for (let i = 1; i < 30; i++) {
              checkDate.setDate(checkDate.getDate() - 1);
              if (uniqueDates.includes(checkDate.toDateString())) {
                streak++;
              } else {
                break;
              }
            }
          }
        }

        // Calculate total XP from multiple sources
        const [quizzes, flashcards, annotations] = await Promise.all([
          supabase.from('quiz_attempts').select('id').eq('user_id', user.id),
          supabase.from('flashcard_reviews').select('id').eq('user_id', user.id),
          supabase.from('annotations').select('id').eq('user_id', user.id)
        ]);

        const totalXP = 
          (quizzes.data?.length || 0) * 50 +
          (flashcards.data?.length || 0) * 20 +
          (annotations.data?.length || 0) * 10;

        const { level, nextLevelXP, previousLevelXP } = calculateLevel(totalXP);
        const xpProgress = ((totalXP - previousLevelXP) / (nextLevelXP - previousLevelXP)) * 100;

        setData({
          streak,
          currentXP: totalXP,
          level,
          nextLevelXP,
          xpProgress
        });
      } catch (error) {
        console.error('Error fetching gamification data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGamificationData();
  }, [user]);

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-xl animate-fade-in">
        <CardHeader>
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full sm:col-span-2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-xl animate-fade-in">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-pink-500/10 to-purple-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Trophy className="h-6 w-6 text-pink-600" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-xl font-semibold">Progresso Gamificado</CardTitle>
            <p className="text-sm text-gray-400 mt-0.5">
              Acompanhe suas conquistas e evolução
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Streak Counter */}
          <div className="p-4 rounded-lg bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="h-5 w-5 text-orange-500" />
              <h4 className="font-semibold text-foreground">Sequência</h4>
            </div>
            <p className="text-2xl font-bold text-foreground">{data.streak} dias</p>
            <p className="text-xs text-foreground-muted mt-1">
              {data.streak > 0 ? 'Continue assim! 🔥' : 'Comece sua sequência hoje!'}
            </p>
          </div>

          {/* XP Progress */}
          <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 sm:col-span-2">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-5 w-5 text-blue-500" />
              <h4 className="font-semibold text-foreground">Nível {data.level}</h4>
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-foreground">{data.currentXP}</p>
                <p className="text-sm text-foreground-muted">/ {data.nextLevelXP} XP</p>
              </div>
              <Progress value={data.xpProgress} className="h-2" />
              <p className="text-xs text-foreground-muted">
                Faltam {data.nextLevelXP - data.currentXP} XP para o próximo nível
              </p>
            </div>
          </div>
        </div>

        {/* Placeholder for Badges */}
        <div className="mt-4 p-4 rounded-lg border border-dashed border-border">
          <p className="text-sm text-foreground-muted text-center">
            🏆 Sistema de conquistas e badges em breve
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default GamifiedProgressTracking;
