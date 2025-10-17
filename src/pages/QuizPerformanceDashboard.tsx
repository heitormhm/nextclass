import React, { useMemo } from 'react';
import { Trophy, Star, HelpCircle, TrendingUp, BarChart3, Brain } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import MainLayout from '@/components/MainLayout';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';

const QuizPerformanceDashboard = () => {
  const { user } = useAuth();

  // Fetch student-generated quizzes
  const { data: studentQuizzes, isLoading: loadingStudent } = useQuery({
    queryKey: ['student-quizzes', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('user_id', user!.id)
        .eq('quiz_source', 'student_generated')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  // Fetch official quizzes (from teachers)
  const { data: officialQuizzes, isLoading: loadingOfficial } = useQuery({
    queryKey: ['official-quizzes', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select(`
          *,
          lecture:lectures(id, title, class_id)
        `)
        .eq('user_id', user!.id)
        .eq('quiz_source', 'teacher_official')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  // Fetch flashcard performance
  const { data: flashcardStats, isLoading: loadingFlashcards } = useQuery({
    queryKey: ['flashcard-stats', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('flashcard_reviews')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const totalCards = data.reduce((sum, r) => sum + (r.total_count || 0), 0);
      const correctCards = data.reduce((sum, r) => sum + (r.correct_count || 0), 0);
      const avgPercentage = totalCards > 0 
        ? ((correctCards / totalCards) * 100).toFixed(1)
        : '0.0';
      
      return {
        totalReviews: data.length,
        totalCards,
        correctCards,
        avgPercentage,
        reviews: data
      };
    },
    enabled: !!user
  });

  // Calculate stats for official quizzes
  const officialStats = useMemo(() => {
    if (!officialQuizzes?.length) return { avg: '0.0', max: '0.0', count: 0 };
    
    const sum = officialQuizzes.reduce((acc, q) => acc + (q.percentage || 0), 0);
    const avg = (sum / officialQuizzes.length).toFixed(1);
    const max = Math.max(...officialQuizzes.map(q => q.percentage || 0)).toFixed(1);
    
    return { avg, max, count: officialQuizzes.length };
  }, [officialQuizzes]);

  // Calculate stats for student quizzes
  const studentStats = useMemo(() => {
    if (!studentQuizzes?.length) return { avg: '0.0', max: '0.0', count: 0 };
    
    const sum = studentQuizzes.reduce((acc, q) => acc + (q.percentage || 0), 0);
    const avg = (sum / studentQuizzes.length).toFixed(1);
    const max = Math.max(...studentQuizzes.map(q => q.percentage || 0)).toFixed(1);
    
    return { avg, max, count: studentQuizzes.length };
  }, [studentQuizzes]);

  // Score over time data (official quizzes)
  const scoreOverTimeData = useMemo(() => {
    if (!officialQuizzes?.length) return [];
    
    const monthlyScores: Record<string, { month: string; scores: number[]; total: number; count: number }> = {};
    
    officialQuizzes.forEach(quiz => {
      const month = new Date(quiz.created_at).toLocaleDateString('pt-BR', { month: 'short' });
      
      if (!monthlyScores[month]) {
        monthlyScores[month] = { month, scores: [], total: 0, count: 0 };
      }
      
      monthlyScores[month].scores.push(quiz.percentage || 0);
      monthlyScores[month].total += (quiz.percentage || 0);
      monthlyScores[month].count += 1;
    });
    
    return Object.values(monthlyScores).map(data => ({
      month: data.month,
      score: Number((data.total / data.count).toFixed(1))
    }));
  }, [officialQuizzes]);

  // Performance by topic data (official quizzes)
  const performanceByTopicData = useMemo(() => {
    if (!officialQuizzes?.length) return [];
    
    const topicScores: Record<string, { topic: string; total: number; count: number }> = {};
    
    officialQuizzes.forEach(quiz => {
      const topic = quiz.topic || 'Sem tópico';
      
      if (!topicScores[topic]) {
        topicScores[topic] = { topic, total: 0, count: 0 };
      }
      
      topicScores[topic].total += (quiz.percentage || 0);
      topicScores[topic].count += 1;
    });
    
    const colors = ['#10b981', '#3b82f6', '#f97316', '#8b5cf6', '#ec4899'];
    
    return Object.values(topicScores)
      .map((data, index) => ({
        topic: data.topic,
        score: Number((data.total / data.count).toFixed(1)),
        color: colors[index % colors.length]
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [officialQuizzes]);

  // Areas for improvement (official quizzes with low performance)
  const improvementAreas = useMemo(() => {
    if (!officialQuizzes?.length) return [];
    
    return officialQuizzes
      .filter(quiz => (quiz.percentage || 0) < 75)
      .sort((a, b) => (a.percentage || 0) - (b.percentage || 0))
      .slice(0, 5)
      .map(quiz => ({
        lectureTitle: quiz.lecture?.title || 'Aula sem título',
        lectureId: quiz.lecture?.id,
        percentage: quiz.percentage || 0,
        topic: quiz.topic
      }));
  }, [officialQuizzes]);

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Dashboard de Desempenho
            </h1>
            <p className="text-foreground-muted mt-1">
              Acompanhe seu progresso em quizzes, flashcards e identifique áreas para melhoria
            </p>
          </div>

          {/* Tabs for Quiz Types */}
          <Tabs defaultValue="official" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="official">Quizzes Oficiais (Professor)</TabsTrigger>
              <TabsTrigger value="student">Quizzes Gerados por Mim</TabsTrigger>
            </TabsList>
            
            {/* Official Quizzes Tab */}
            <TabsContent value="official" className="space-y-6 mt-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-6">
                    {loadingOfficial ? (
                      <div className="space-y-2">
                        <Skeleton className="h-8 w-16" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    ) : (
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-yellow-100 rounded-full">
                          <Trophy className="h-6 w-6 text-yellow-600" />
                        </div>
                        <div>
                          <p className="text-3xl font-bold text-foreground">{officialStats.avg}%</p>
                          <p className="text-sm text-foreground-muted">Pontuação Média</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardContent className="p-6">
                    {loadingOfficial ? (
                      <div className="space-y-2">
                        <Skeleton className="h-8 w-16" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    ) : (
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-blue-100 rounded-full">
                          <Star className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-3xl font-bold text-foreground">{officialStats.max}%</p>
                          <p className="text-sm text-foreground-muted">Maior Pontuação</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardContent className="p-6">
                    {loadingOfficial ? (
                      <div className="space-y-2">
                        <Skeleton className="h-8 w-16" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    ) : (
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-green-100 rounded-full">
                          <HelpCircle className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                          <p className="text-3xl font-bold text-foreground">{officialStats.count}</p>
                          <p className="text-sm text-foreground-muted">Quizzes Realizados</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Data Visualization for Official Quizzes */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Line Chart */}
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <span>Pontuações ao Longo do Tempo</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingOfficial ? (
                      <Skeleton className="h-64 w-full" />
                    ) : scoreOverTimeData.length === 0 ? (
                      <div className="h-64 flex items-center justify-center text-foreground-muted">
                        Nenhum quiz oficial realizado ainda
                      </div>
                    ) : (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={scoreOverTimeData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="month" stroke="#666" fontSize={12} />
                            <YAxis domain={[0, 100]} stroke="#666" fontSize={12} />
                            <Tooltip 
                              contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px'
                              }}
                              formatter={(value) => [`${value}%`, 'Pontuação']}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="score" 
                              stroke="hsl(var(--primary))" 
                              strokeWidth={3}
                              dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Bar Chart */}
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      <span>Desempenho por Tópico</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingOfficial ? (
                      <Skeleton className="h-64 w-full" />
                    ) : performanceByTopicData.length === 0 ? (
                      <div className="h-64 flex items-center justify-center text-foreground-muted">
                        Nenhum tópico avaliado ainda
                      </div>
                    ) : (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart 
                            data={performanceByTopicData}
                            layout="horizontal"
                            margin={{ left: 60, right: 20, top: 5, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis type="number" domain={[0, 100]} stroke="#666" fontSize={12} />
                            <YAxis type="category" dataKey="topic" stroke="#666" fontSize={12} width={60} />
                            <Tooltip 
                              contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px'
                              }}
                              formatter={(value) => [`${value}%`, 'Pontuação']}
                            />
                            <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                              {performanceByTopicData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Student Generated Quizzes Tab */}
            <TabsContent value="student" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-6">
                    {loadingStudent ? (
                      <div className="space-y-2">
                        <Skeleton className="h-8 w-16" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    ) : (
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-yellow-100 rounded-full">
                          <Trophy className="h-6 w-6 text-yellow-600" />
                        </div>
                        <div>
                          <p className="text-3xl font-bold text-foreground">{studentStats.avg}%</p>
                          <p className="text-sm text-foreground-muted">Pontuação Média</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardContent className="p-6">
                    {loadingStudent ? (
                      <div className="space-y-2">
                        <Skeleton className="h-8 w-16" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    ) : (
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-blue-100 rounded-full">
                          <Star className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-3xl font-bold text-foreground">{studentStats.max}%</p>
                          <p className="text-sm text-foreground-muted">Maior Pontuação</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardContent className="p-6">
                    {loadingStudent ? (
                      <div className="space-y-2">
                        <Skeleton className="h-8 w-16" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    ) : (
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-green-100 rounded-full">
                          <HelpCircle className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                          <p className="text-3xl font-bold text-foreground">{studentStats.count}</p>
                          <p className="text-sm text-foreground-muted">Quizzes Realizados</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {studentQuizzes && studentQuizzes.length === 0 && !loadingStudent && (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-8 text-center">
                    <p className="text-foreground-muted">
                      Você ainda não gerou nenhum quiz. Vá para uma aula e gere quizzes para testar seus conhecimentos!
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          {/* Flashcard Performance Section */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="h-5 w-5 text-primary" />
                <span>Desempenho em Flashcards</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingFlashcards ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="text-center space-y-2">
                      <Skeleton className="h-8 w-16 mx-auto" />
                      <Skeleton className="h-4 w-24 mx-auto" />
                    </div>
                  ))}
                </div>
              ) : flashcardStats && flashcardStats.totalReviews > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {flashcardStats.avgPercentage}%
                    </div>
                    <div className="text-sm text-foreground-muted">Taxa de Acerto</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {flashcardStats.totalReviews}
                    </div>
                    <div className="text-sm text-foreground-muted">Revisões</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {flashcardStats.correctCards}
                    </div>
                    <div className="text-sm text-foreground-muted">Acertos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {flashcardStats.totalCards}
                    </div>
                    <div className="text-sm text-foreground-muted">Total de Cards</div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-foreground-muted py-4">
                  Você ainda não revisou nenhum flashcard. Comece a revisar para acompanhar seu progresso!
                </p>
              )}
            </CardContent>
          </Card>

          {/* Areas for Improvement */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Áreas para Melhoria</CardTitle>
              <p className="text-sm text-foreground-muted">
                Aulas onde você pode focar seus estudos para melhorar o desempenho
              </p>
            </CardHeader>
            <CardContent>
              {loadingOfficial ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : improvementAreas.length === 0 ? (
                <p className="text-center text-foreground-muted py-4">
                  {officialQuizzes && officialQuizzes.length === 0 
                    ? 'Realize quizzes oficiais para identificar áreas de melhoria!'
                    : 'Parabéns! Você está indo muito bem em todos os quizzes! 🎉'}
                </p>
              ) : (
                <div className="space-y-4">
                  {improvementAreas.map((area, index) => (
                    <div 
                      key={index}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-red-50 rounded-lg border border-red-100"
                    >
                      <div className="space-y-1">
                        <h4 className="font-medium text-foreground">
                          {area.lectureTitle}
                        </h4>
                        <div className="flex items-center space-x-2">
                          <Badge variant="destructive" className="text-xs">
                            {area.percentage.toFixed(1)}% de acerto
                          </Badge>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="mt-2 sm:mt-0 border-red-200 text-red-700 hover:bg-red-100"
                        asChild
                        disabled={!area.lectureId}
                      >
                        <Link to={area.lectureId ? `/lecture/${area.lectureId}` : '#'}>
                          Revisar Módulo
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild className="bg-primary hover:bg-primary/90">
              <Link to="/courses">
                Continuar Estudando
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/quiz/new">
                Fazer Novo Quiz
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default QuizPerformanceDashboard;
