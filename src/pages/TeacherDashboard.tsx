import React, { useState, useEffect } from 'react';
import { Calendar, Mic, BarChart3, BookOpen, Users, GraduationCap, Brain, Upload, Megaphone, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MainLayout from '@/components/MainLayout';
import { BackgroundRippleEffect } from '@/components/ui/background-ripple-effect';
import { InsightCard } from '@/components/InsightCard';
import { UploadMaterialModal } from '@/components/UploadMaterialModal';
import { LessonPlanFloatingIndicator } from '@/components/LessonPlanFloatingIndicator';
import UniversalSchedulingModal from '@/components/UniversalSchedulingModal';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface Class {
  id: string;
  name: string;
  course: string;
  period: string;
}

interface Insight {
  id: string;
  insight_type: string;
  title: string;
  description: string;
  action_label?: string;
  action_route?: string;
}

const TeacherDashboard = () => {
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [classes, setClasses] = useState<Class[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isSchedulingModalOpen, setIsSchedulingModalOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch classes
  useEffect(() => {
    const fetchClasses = async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching classes:', error);
        return;
      }

      setClasses(data || []);
      if (data && data.length > 0) {
        setSelectedClass(data[0].id);
      }
    };

    fetchClasses();
  }, []);

  // Fetch insights when class changes
  useEffect(() => {
    if (!selectedClass) return;

    const fetchInsights = async () => {
      setIsLoadingInsights(true);
      try {
        const { data, error } = await supabase.functions.invoke('get-teacher-dashboard-insights', {
          body: { classId: selectedClass },
        });

        if (error) throw error;
        setInsights(data?.insights || []);
      } catch (error) {
        console.error('Error fetching insights:', error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar insights",
          description: "Não foi possível carregar os insights da turma.",
        });
      } finally {
        setIsLoadingInsights(false);
      }
    };

    fetchInsights();
  }, [selectedClass, toast]);

  const statCards = [
    {
      title: 'Aulas Publicadas',
      value: '28',
      subtitle: 'sem alteração',
      icon: BookOpen,
      color: 'text-blue-400',
    },
    {
      title: 'Alunos Ativos',
      value: '152',
      subtitle: '▲ 3%',
      icon: Users,
      color: 'text-green-400',
    },
    {
      title: 'Média da Turma',
      value: '8.3',
      subtitle: '▲ 0.2',
      icon: GraduationCap,
      color: 'text-purple-400',
    },
  ];

  const upcomingEvents = [
    { date: '10 Jan', title: 'Aula: Termodinâmica Aplicada', time: '14:00' },
    { date: '12 Jan', title: 'Entrega de Projeto de Estruturas', time: '23:59' },
    { date: '15 Jan', title: 'Laboratório de Circuitos Elétricos', time: '10:00' },
    { date: '18 Jan', title: 'Reunião de Alinhamento de Projeto', time: '16:00' },
  ];

  return (
    <MainLayout>
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-purple-950 via-gray-950 to-blue-950">
        {/* Animated Background with Ripple Effect */}
        <BackgroundRippleEffect className="opacity-30" />
        
        {/* Gradient Blobs for Depth */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-48 w-96 h-96 bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-full blur-3xl" />
          <div className="absolute top-2/3 -right-32 w-80 h-80 bg-gradient-to-br from-purple-400/15 to-pink-400/15 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-full blur-3xl" />
        </div>

        {/* Main Content */}
        <div className="relative z-10 p-6 max-w-[1600px] mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Painel do Professor</h1>
            <p className="text-gray-400">Gerencie suas aulas e acompanhe o desempenho da turma</p>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_350px] gap-6">
            {/* Left Column - Main Content */}
            <div className="space-y-6">
              {/* Quick Actions Bar with AI Co-pilot */}
              <Card className="bg-gray-900/70 backdrop-blur-lg border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-400" />
                    IA Co-piloto
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => navigate('/livelecture')}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Mic className="h-4 w-4 mr-2" />
                    Gravar Nova Aula
                  </Button>
                  <Button
                    onClick={() => navigate('/teacher/lesson-plans/new')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Brain className="h-4 w-4 mr-2" />
                    Criar Plano de Aula com Mia
                  </Button>
                  <Button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Adicionar Material à Biblioteca
                  </Button>
                  <Button
                    onClick={() => setIsSchedulingModalOpen(true)}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Agendar Evento
                  </Button>
                  <Button
                    onClick={() => toast({ title: "Em breve", description: "Funcionalidade em desenvolvimento" })}
                    className="bg-pink-600 hover:bg-pink-700"
                  >
                    <Megaphone className="h-4 w-4 mr-2" />
                    Enviar Anúncio à Turma
                  </Button>
                </CardContent>
              </Card>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {statCards.map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <Card key={index} className="bg-gray-900/70 backdrop-blur-lg border-gray-700">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                          <Icon className={`h-6 w-6 ${stat.color}`} />
                        </div>
                        <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
                        <p className="text-sm text-gray-400">{stat.title}</p>
                        <p className="text-xs text-gray-500 mt-1">{stat.subtitle}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Insights Panel with Tabs */}
              <Card className="bg-gray-900/70 backdrop-blur-lg border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Insights da Turma</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="insights" className="w-full">
                    <TabsList className="bg-gray-800 border-gray-700">
                      <TabsTrigger value="insights" className="data-[state=active]:bg-purple-600">
                        Alertas e Oportunidades
                      </TabsTrigger>
                      <TabsTrigger value="performance" className="data-[state=active]:bg-purple-600">
                        Desempenho
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="insights" className="space-y-3 mt-4">
                      {isLoadingInsights ? (
                        <p className="text-gray-400 text-center py-8">Carregando insights...</p>
                      ) : insights.length > 0 ? (
                        insights.map((insight) => (
                          <InsightCard
                            key={insight.id}
                            type={insight.insight_type as 'alert' | 'opportunity'}
                            title={insight.title}
                            description={insight.description}
                            actionLabel={insight.action_label}
                            actionRoute={insight.action_route}
                          />
                        ))
                      ) : (
                        <Card className="bg-gray-800/40 border-gray-700 p-8">
                          <div className="text-center">
                            <Sparkles className="h-12 w-12 text-purple-400 mx-auto mb-3" />
                            <p className="text-gray-400 mb-2">Nenhum insight disponível</p>
                            <p className="text-sm text-gray-500">
                              A IA ainda está analisando os dados da turma
                            </p>
                          </div>
                        </Card>
                      )}
                    </TabsContent>
                    <TabsContent value="performance" className="mt-4">
                      <Card className="bg-gray-800/40 border-gray-700 p-6">
                        <p className="text-gray-400 text-center">
                          Gráficos de desempenho em desenvolvimento
                        </p>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              {/* Class Selector */}
              <Card className="bg-gray-900/70 backdrop-blur-lg border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Turma Selecionada</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Selecione uma turma" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700">
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id} className="text-white">
                          {cls.name} - {cls.period}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* Upcoming Events */}
              <Card className="bg-gray-900/70 backdrop-blur-lg border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg flex items-center justify-between">
                    Próximos Eventos
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsSchedulingModalOpen(true)}
                      className="text-purple-400 hover:text-purple-300"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {upcomingEvents.map((event, index) => (
                      <div
                        key={index}
                        className="p-3 rounded-lg bg-gray-800/40 border border-gray-700"
                      >
                        <div className="flex gap-3">
                          <div className="flex flex-col items-center justify-center bg-purple-600/20 rounded-lg p-2 min-w-[50px]">
                            <span className="text-xs text-purple-400 font-medium">
                              {event.date.split(' ')[0]}
                            </span>
                            <span className="text-lg font-bold text-white">
                              {event.date.split(' ')[1]}
                            </span>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-white">{event.title}</p>
                            <p className="text-xs text-gray-400 mt-1">{event.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card className="bg-gray-900/70 backdrop-blur-lg border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Estatísticas Rápidas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Taxa de Presença</span>
                    <span className="text-lg font-bold text-green-400">94%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Materiais Enviados</span>
                    <span className="text-lg font-bold text-blue-400">127</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Revisões Pendentes</span>
                    <span className="text-lg font-bold text-orange-400">8</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Modals */}
        <UploadMaterialModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          classes={classes}
        />
        
        <LessonPlanFloatingIndicator />
        
        <UniversalSchedulingModal
          open={isSchedulingModalOpen}
          onOpenChange={setIsSchedulingModalOpen}
        />
      </div>
    </MainLayout>
  );
};

export default TeacherDashboard;