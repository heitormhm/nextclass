import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, BookOpen, Video, Briefcase, FileText, Library, Calendar, Play, Clock, Users, Brain, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import MainLayout from '@/components/MainLayout';
import ProactiveRecommendationWidget from '@/components/dashboard/ProactiveRecommendationWidget';
import SmartReviewWidget from '@/components/dashboard/SmartReviewWidget';
import GamifiedProgressTracking from '@/components/dashboard/GamifiedProgressTracking';
import { BackgroundRippleEffect } from '@/components/ui/background-ripple-effect';

interface LearningPathItem {
  id: string;
  title: string;
  time: string;
  type: 'lecture' | 'case-study' | 'quiz' | 'live-session';
  duration: string;
  progress?: number;
}

const Dashboard = () => {
  const currentUser = { name: 'Antônio' };
  const [searchQuery, setSearchQuery] = useState('');

  const todaySchedule: LearningPathItem[] = [
    {
      id: '1',
      title: 'Termodinâmica: Ciclo de Rankine',
      time: '09:00',
      type: 'lecture',
      duration: '45 min',
      progress: 0
    },
    {
      id: '2', 
      title: 'Estudo de Caso: Análise de Tensão em Viga',
      time: '10:30',
      type: 'case-study',
      duration: '30 min',
      progress: 0
    },
    {
      id: '3',
      title: 'Teste: Leis de Kirchhoff',
      time: '14:00',
      type: 'quiz',
      duration: '15 min',
      progress: 0
    },
    {
      id: '4',
      title: 'Live: Otimização de Sistemas de Controle',
      time: '16:00',
      type: 'live-session',
      duration: '60 min',
      progress: 0
    }
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'lecture':
        return <Play className="h-4 w-4" />;
      case 'case-study':
        return <FileText className="h-4 w-4" />;
      case 'quiz':
        return <Brain className="h-4 w-4" />;
      case 'live-session':
        return <Users className="h-4 w-4" />;
      default:
        return <BookOpen className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'lecture':
        return 'bg-blue-500';
      case 'case-study':
        return 'bg-green-500';
      case 'quiz':
        return 'bg-purple-500';
      case 'live-session':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const filteredSchedule = todaySchedule.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="relative min-h-screen bg-slate-50">
        {/* Gradient Blobs */}
        <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-br from-pink-300 to-purple-300 rounded-full filter blur-3xl opacity-50" />
        <div className="absolute bottom-40 right-20 w-80 h-80 bg-gradient-to-br from-purple-300 to-pink-300 rounded-full filter blur-3xl opacity-50" />
        <div className="absolute top-1/2 left-1/3 w-72 h-72 bg-gradient-to-br from-pink-400 to-purple-400 rounded-full filter blur-3xl opacity-40" />
        
        {/* Background Ripple Effect */}
        <BackgroundRippleEffect />
        
        {/* Main Content */}
        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-6 sm:space-y-8">
          {/* Page Header */}
          <div className="animate-fade-in">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-800 mb-2">
              Bem-vindo de volta, <span className="text-primary">{currentUser.name}</span>!
            </h1>
            <p className="text-sm sm:text-base text-slate-700">
              Continue sua jornada em engenharia. Você está fazendo um ótimo progresso!
            </p>
          </div>

        {/* LAYER 1: Proactive Action Hub */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <ProactiveRecommendationWidget />
          <SmartReviewWidget />
        </div>

        {/* LAYER 2: Gamified Progress Tracking */}
        <GamifiedProgressTracking />

        {/* LAYER 3: Utility Modules */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Quick Menu */}
          <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-xl animate-fade-in">
            <CardHeader>
              <CardTitle className="text-xl">Acesso Rápido</CardTitle>
              <CardDescription>
                Navegue rapidamente para as principais seções
              </CardDescription>
            </CardHeader>
            <CardContent>
                {/* Mobile: Single column list, Desktop: Grid */}
                <div className="block md:hidden space-y-3">
                  <Link to="/courses">
                    <Card className="border border-border hover:border-primary/50 hover:shadow-md transition-all duration-200 cursor-pointer group">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-primary/10 group-hover:bg-primary/20 rounded-lg flex items-center justify-center transition-colors shrink-0">
                            <Video className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                              Meus Cursos
                            </h3>
                            <p className="text-sm text-foreground-muted">
                              Continue onde parou
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>

                  <Link to="/internship">
                    <Card className="border border-border hover:border-primary/50 hover:shadow-md transition-all duration-200 cursor-pointer group">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-primary/10 group-hover:bg-primary/20 rounded-lg flex items-center justify-center transition-colors shrink-0">
                             <Briefcase className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                              Modo Estágio
                            </h3>
                            <p className="text-sm text-foreground-muted">
                              Simule cenários reais
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>

                  <Link to="/aichat">
                    <Card className="border border-border hover:border-primary/50 hover:shadow-md transition-all duration-200 cursor-pointer group">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-primary/10 group-hover:bg-primary/20 rounded-lg flex items-center justify-center transition-colors shrink-0">
                            <Sparkles className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                              AI Chat
                            </h3>
                            <p className="text-sm text-foreground-muted">
                              Pergunte sobre critérios e diretrizes
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>

                  <Link to="/calendar">
                    <Card className="border border-border hover:border-primary/50 hover:shadow-md transition-all duration-200 cursor-pointer group">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-primary/10 group-hover:bg-primary/20 rounded-lg flex items-center justify-center transition-colors shrink-0">
                            <Calendar className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                              Calendário
                            </h3>
                            <p className="text-sm text-foreground-muted">
                              Aulas e eventos programados
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>

                  <Link to="/annotations">
                    <Card className="border border-border hover:border-primary/50 hover:shadow-md transition-all duration-200 cursor-pointer group">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-primary/10 group-hover:bg-primary/20 rounded-lg flex items-center justify-center transition-colors shrink-0">
                            <FileText className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                              Minhas Anotações
                            </h3>
                            <p className="text-sm text-foreground-muted">
                              Acesse suas notas e resumos
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>

                  <Link to="/library">
                    <Card className="border border-border hover:border-primary/50 hover:shadow-md transition-all duration-200 cursor-pointer group">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-primary/10 group-hover:bg-primary/20 rounded-lg flex items-center justify-center transition-colors shrink-0">
                            <Library className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                              Biblioteca
                            </h3>
                            <p className="text-sm text-foreground-muted">
                              Acesse materiais e recursos
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </div>

                {/* Desktop: 2x3 Grid */}
                <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <Link to="/courses">
                    <Card className="border border-border hover:border-primary/50 hover:shadow-md transition-all duration-200 cursor-pointer group h-full">
                      <CardContent className="p-6 h-full">
                        <div className="flex flex-col items-center text-center space-y-4 h-full justify-center">
                          <div className="w-12 h-12 bg-primary/10 group-hover:bg-primary/20 rounded-lg flex items-center justify-center transition-colors">
                            <Video className="h-6 w-6 text-primary" />
                          </div>
                          <div className="space-y-1">
                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                              Meus Cursos
                            </h3>
                            <p className="text-sm text-foreground-muted">
                              Continue onde parou
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>

                  <Link to="/internship">
                    <Card className="border border-border hover:border-primary/50 hover:shadow-md transition-all duration-200 cursor-pointer group h-full">
                      <CardContent className="p-6 h-full">
                        <div className="flex flex-col items-center text-center space-y-4 h-full justify-center">
                          <div className="w-12 h-12 bg-primary/10 group-hover:bg-primary/20 rounded-lg flex items-center justify-center transition-colors">
                            <Briefcase className="h-6 w-6 text-primary" />
                          </div>
                          <div className="space-y-1">
                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                              Modo Estágio
                            </h3>
                            <p className="text-sm text-foreground-muted">
                              Simule cenários reais
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>

                  <Link to="/aichat">
                    <Card className="border border-border hover:border-primary/50 hover:shadow-md transition-all duration-200 cursor-pointer group h-full">
                      <CardContent className="p-6 h-full">
                        <div className="flex flex-col items-center text-center space-y-4 h-full justify-center">
                          <div className="w-12 h-12 bg-primary/10 group-hover:bg-primary/20 rounded-lg flex items-center justify-center transition-colors">
                            <Sparkles className="h-6 w-6 text-primary" />
                          </div>
                          <div className="space-y-1">
                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                              AI Chat
                            </h3>
                            <p className="text-sm text-foreground-muted">
                              Pergunte sobre critérios e diretrizes
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>

                  <Link to="/calendar">
                    <Card className="border border-border hover:border-primary/50 hover:shadow-md transition-all duration-200 cursor-pointer group h-full">
                      <CardContent className="p-6 h-full">
                        <div className="flex flex-col items-center text-center space-y-4 h-full justify-center">
                          <div className="w-12 h-12 bg-primary/10 group-hover:bg-primary/20 rounded-lg flex items-center justify-center transition-colors">
                            <Calendar className="h-6 w-6 text-primary" />
                          </div>
                          <div className="space-y-1">
                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                              Calendário
                            </h3>
                            <p className="text-sm text-foreground-muted">
                              Aulas e eventos programados
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>

                  <Link to="/annotations">
                    <Card className="border border-border hover:border-primary/50 hover:shadow-md transition-all duration-200 cursor-pointer group h-full">
                      <CardContent className="p-6 h-full">
                        <div className="flex flex-col items-center text-center space-y-4 h-full justify-center">
                          <div className="w-12 h-12 bg-primary/10 group-hover:bg-primary/20 rounded-lg flex items-center justify-center transition-colors">
                            <FileText className="h-6 w-6 text-primary" />
                          </div>
                          <div className="space-y-1">
                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                              Minhas Anotações
                            </h3>
                            <p className="text-sm text-foreground-muted">
                              Acesse suas notas e resumos
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>

                  <Link to="/library">
                    <Card className="border border-border hover:border-primary/50 hover:shadow-md transition-all duration-200 cursor-pointer group h-full">
                      <CardContent className="p-6 h-full">
                        <div className="flex flex-col items-center text-center space-y-4 h-full justify-center">
                          <div className="w-12 h-12 bg-primary/10 group-hover:bg-primary/20 rounded-lg flex items-center justify-center transition-colors">
                            <Library className="h-6 w-6 text-primary" />
                          </div>
                          <div className="space-y-1">
                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                              Biblioteca
                            </h3>
                            <p className="text-sm text-foreground-muted">
                              Acesse materiais e recursos
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              </CardContent>
            </Card>

          {/* Today's Schedule */}
          <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-xl animate-fade-in">
              <CardHeader>
                <CardTitle className="text-xl">Agenda de Hoje</CardTitle>
                <CardDescription>
                  Suas atividades programadas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground-muted h-4 w-4" />
                  <Input
                    placeholder="Buscar atividades..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Schedule Items */}
                <div className="space-y-3">
                  {filteredSchedule.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-4 border border-border rounded-lg hover:border-primary/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${getActivityColor(item.type)}`} />
                        <span className="text-sm font-medium text-foreground-muted min-w-[50px]">
                          {item.time}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground text-sm leading-tight mb-1">
                          {item.title}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-foreground-muted">
                          {getActivityIcon(item.type)}
                          <span>{item.duration}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {filteredSchedule.length === 0 && (
                  <div className="text-center py-8 text-foreground-muted">
                    <p>Nenhuma atividade encontrada</p>
                  </div>
            )}
          </CardContent>
        </Card>
        </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;