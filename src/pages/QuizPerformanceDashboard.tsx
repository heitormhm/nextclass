import React from 'react';
import { Trophy, Star, HelpCircle, TrendingUp, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import MainLayout from '@/components/MainLayout';
import { Link } from 'react-router-dom';
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
  // Static data for line chart (Scores Over Time)
  const scoreOverTimeData = [
    { month: 'Jan', score: 78 },
    { month: 'Fev', score: 82 },
    { month: 'Mar', score: 85 },
    { month: 'Abr', score: 88 },
    { month: 'Mai', score: 92 },
    { month: 'Jun', score: 95 }
  ];

  // Static data for performance by topic - Updated as per requirements
  const performanceByTopicData = [
    { topic: 'Termodinâmica', score: 95, color: '#10b981' },
    { topic: 'Análise de Circuitos', score: 82, color: '#3b82f6' },
    { topic: 'Mecânica dos Fluidos', score: 75, color: '#f97316' }
  ];

  // Areas for improvement data
  const improvementAreas = [
    {
      topic: 'Sistemas de Controle',
      score: 65,
      moduleId: 'sistemas-controle'
    },
    {
      topic: 'Análise Estrutural',
      score: 70,
      moduleId: 'analise-estrutural'
    },
    {
      topic: 'Eletromagnetismo',
      score: 72,
      moduleId: 'eletromagnetismo'
    }
  ];

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Header */}
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Dashboard de Desempenho em Testes
              </h1>
              <p className="text-foreground-muted mt-1">
                Acompanhe seu progresso e identifique áreas para melhoria
              </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Average Score Card */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-yellow-100 rounded-full">
                      <Trophy className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-foreground">92%</p>
                      <p className="text-sm text-foreground-muted">Pontuação Média</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Highest Score Card */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-blue-100 rounded-full">
                      <Star className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-foreground">100%</p>
                      <p className="text-sm text-foreground-muted">Maior Pontuação</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quizzes Completed Card */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-green-100 rounded-full">
                      <HelpCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-foreground">12</p>
                      <p className="text-sm text-foreground-muted">Testes Realizados</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Data Visualization Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Line Chart - Scores Over Time */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <span>Pontuações ao Longo do Tempo</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={scoreOverTimeData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="month" 
                          stroke="#666"
                          fontSize={12}
                        />
                        <YAxis 
                          domain={[70, 100]}
                          stroke="#666"
                          fontSize={12}
                        />
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
                          activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Bar Chart - Performance by Topic */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    <span>Desempenho por Tópico</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={performanceByTopicData}
                        layout="horizontal"
                        margin={{ left: 60, right: 20, top: 5, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                          type="number" 
                          domain={[0, 100]}
                          stroke="#666"
                          fontSize={12}
                        />
                        <YAxis 
                          type="category" 
                          dataKey="topic"
                          stroke="#666"
                          fontSize={12}
                          width={60}
                        />
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
                </CardContent>
              </Card>
            </div>

            {/* Areas for Improvement */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Áreas para Melhoria</CardTitle>
                <p className="text-sm text-foreground-muted">
                  Tópicos onde você pode focar seus estudos para melhorar o desempenho
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {improvementAreas.map((area, index) => (
                    <div 
                      key={index}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-red-50 rounded-lg border border-red-100"
                    >
                      <div className="space-y-1">
                        <h4 className="font-medium text-foreground">
                          {area.topic}
                        </h4>
                        <div className="flex items-center space-x-2">
                          <Badge variant="destructive" className="text-xs">
                            {area.score}% de acerto
                          </Badge>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="mt-2 sm:mt-0 border-red-200 text-red-700 hover:bg-red-100"
                        asChild
                      >
                        <Link to={`/lecture/${area.moduleId}`}>
                          Revisar Módulo
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
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