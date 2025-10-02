import { Trophy, Flame, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

const GamifiedProgressTracking = () => {
  // Mock data - will be replaced with real data
  const currentStreak = 7;
  const currentXP = 2450;
  const nextLevelXP = 3000;
  const xpProgress = (currentXP / nextLevelXP) * 100;

  return (
    <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-xl animate-fade-in">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Trophy className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">Progresso Gamificado</CardTitle>
            <CardDescription>
              Acompanhe suas conquistas e evolução
            </CardDescription>
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
            <p className="text-2xl font-bold text-foreground">{currentStreak} dias</p>
            <p className="text-xs text-foreground-muted mt-1">Continue assim! 🔥</p>
          </div>

          {/* XP Progress */}
          <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 sm:col-span-2">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-5 w-5 text-blue-500" />
              <h4 className="font-semibold text-foreground">Experiência (XP)</h4>
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-foreground">{currentXP}</p>
                <p className="text-sm text-foreground-muted">/ {nextLevelXP} XP</p>
              </div>
              <Progress value={xpProgress} className="h-2" />
              <p className="text-xs text-foreground-muted">
                Faltam {nextLevelXP - currentXP} XP para o próximo nível
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
