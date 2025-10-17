import React, { useState, useEffect } from 'react';
import { Calendar, Mic, BookOpen, Users, GraduationCap, Brain, Upload, Megaphone, Plus, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import MainLayout from '@/components/MainLayout';
import { BackgroundRippleEffect } from '@/components/ui/background-ripple-effect';
import { InsightCard } from '@/components/InsightCard';
import { ActionCard } from '@/components/dashboard/ActionCard';
import { StatCard } from '@/components/dashboard/StatCard';
import { EventCard } from '@/components/dashboard/EventCard';
import { MiniStatCard } from '@/components/dashboard/MiniStatCard';
import { UploadMaterialModal } from '@/components/UploadMaterialModal';
import { LessonPlanFloatingIndicator } from '@/components/LessonPlanFloatingIndicator';
import UniversalSchedulingModal from '@/components/UniversalSchedulingModal';
import AnnouncementModal from '@/components/AnnouncementModal';
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
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
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

  const actionCards = [
    {
      icon: Mic,
      title: 'Gravar Nova Aula',
      description: 'Capture sua aula com transcrição automática',
      gradientFrom: 'from-purple-500',
      gradientTo: 'to-purple-600',
      onClick: () => navigate('/livelecture'),
      badge: 'IA',
    },
    {
      icon: Brain,
      title: 'Plano de Aula',
      description: 'Crie com auxílio da Mia',
      gradientFrom: 'from-blue-500',
      gradientTo: 'to-blue-600',
      onClick: () => navigate('/teacher/lesson-plans'),
      badge: 'IA',
    },
    {
      icon: Upload,
      title: 'Biblioteca',
      description: 'Adicione materiais à biblioteca',
      gradientFrom: 'from-green-500',
      gradientTo: 'to-green-600',
      onClick: () => setIsUploadModalOpen(true),
    },
    {
      icon: Calendar,
      title: 'Agendar Evento',
      description: 'Crie eventos no calendário',
      gradientFrom: 'from-orange-500',
      gradientTo: 'to-orange-600',
      onClick: () => setIsSchedulingModalOpen(true),
    },
    {
      icon: Megaphone,
      title: 'Enviar Anúncio',
      description: 'Comunique-se com a turma',
      gradientFrom: 'from-pink-500',
      gradientTo: 'to-pink-600',
      onClick: () => setIsAnnouncementModalOpen(true),
    },
  ];

  const statCards = [
    {
      title: 'Aulas Publicadas',
      value: 28,
      icon: BookOpen,
      trend: { value: 0, direction: 'neutral' as const },
      gradientFrom: 'from-blue-500',
      gradientTo: 'to-blue-600',
      iconColor: 'text-blue-500',
    },
    {
      title: 'Alunos Ativos',
      value: 152,
      icon: Users,
      trend: { value: 3, direction: 'up' as const },
      gradientFrom: 'from-green-500',
      gradientTo: 'to-green-600',
      iconColor: 'text-green-500',
    },
    {
      title: 'Média da Turma',
      value: '8.3',
      icon: GraduationCap,
      trend: { value: 2, direction: 'up' as const },
      gradientFrom: 'from-purple-500',
      gradientTo: 'to-purple-600',
      iconColor: 'text-purple-500',
    },
  ];

  const upcomingEvents = [
    { date: '10 Jan', title: 'Aula: Termodinâmica Aplicada', time: '14:00', type: 'lecture' as const, priority: 'normal' as const },
    { date: '12 Jan', title: 'Entrega de Projeto de Estruturas', time: '23:59', type: 'deadline' as const, priority: 'urgent' as const },
    { date: '15 Jan', title: 'Laboratório de Circuitos Elétricos', time: '10:00', type: 'lab' as const, priority: 'normal' as const },
    { date: '18 Jan', title: 'Reunião de Alinhamento de Projeto', time: '16:00', type: 'meeting' as const, priority: 'normal' as const },
  ];

  return (
    <MainLayout>
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-900 via-purple-600 to-pink-500 animate-gradient-xy bg-[length:200%_200%]">
        {/* Animated Background with Ripple Effect */}
        <BackgroundRippleEffect className="opacity-30" />
        
        {/* Gradient Blobs for Depth */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-48 w-96 h-96 bg-gradient-to-br from-pink-500/30 to-purple-500/30 rounded-full blur-3xl animate-float" />
          <div className="absolute top-2/3 -right-32 w-80 h-80 bg-gradient-to-br from-blue-400/25 to-purple-400/25 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-gradient-to-br from-purple-500/20 to-pink-400/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        </div>

        {/* Main Content */}
        <div className="relative z-10 p-6 max-w-[1600px] mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Painel do Professor</h1>
            <p className="text-gray-600">Gerencie suas aulas e acompanhe o desempenho da turma</p>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_350px] gap-6">
            {/* Left Column - Main Content */}
            <div className="space-y-6">
              {/* Quick Actions - Novo Design com Cards Vibrantes */}
              <Card className="bg-white/75 bg-blend-overlay backdrop-blur-xl border-blue-100/30 shadow-[0_8px_30px_rgb(59,130,246,0.08)]">
                <CardHeader>
                  <CardTitle className="text-gray-800 flex items-center gap-2">
                    <Zap className="h-5 w-5 text-purple-500" />
                    Ações Rápidas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {actionCards.map((action, index) => (
                      <ActionCard key={index} {...action} index={index} />
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Stats Cards - Novo Design com Gradientes e Badges */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {statCards.map((stat, index) => (
                  <StatCard key={index} {...stat} index={index} />
                ))}
              </div>

              {/* Insights Panel with Tabs */}
              <Card className="bg-white/75 bg-blend-overlay backdrop-blur-xl border-blue-100/30 shadow-[0_8px_30px_rgb(59,130,246,0.08)]">
                <CardHeader>
                  <CardTitle className="text-gray-800">Insights da Turma</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="insights" className="w-full">
                    <TabsList className="bg-white/60 bg-blue-50/20 bg-blend-overlay backdrop-blur-md border-blue-100/40">
                      <TabsTrigger value="insights" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white data-[state=inactive]:text-gray-700">
                        Alertas e Oportunidades
                      </TabsTrigger>
                      <TabsTrigger value="performance" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white data-[state=inactive]:text-gray-700">
                        Desempenho
                      </TabsTrigger>
                    </TabsList>
                     <TabsContent value="insights" className="space-y-4 mt-4">
                      {isLoadingInsights ? (
                        <div className="space-y-3">
                          <Skeleton className="h-32 w-full rounded-xl" />
                          <Skeleton className="h-32 w-full rounded-xl" />
                          <Skeleton className="h-32 w-full rounded-xl" />
                        </div>
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
                        <Card className="bg-gradient-to-br from-purple-50/90 to-blue-50/90 backdrop-blur-xl border-purple-200/50 shadow-lg p-8">
                          <div className="text-center">
                            <div className="bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl p-4 w-fit mx-auto mb-4 shadow-lg">
                              <Brain className="h-12 w-12 text-white" strokeWidth={2} />
                            </div>
                            <p className="text-gray-900 font-semibold text-lg mb-2">Nenhum insight disponível</p>
                            <p className="text-sm text-gray-600">
                              A IA ainda está analisando os dados da turma
                            </p>
                          </div>
                        </Card>
                      )}
                    </TabsContent>
                    <TabsContent value="performance" className="mt-4">
                      <Card className="bg-white/50 bg-blue-50/15 bg-blend-overlay backdrop-blur-md border-blue-100/30 shadow-sm p-6">
                        <p className="text-gray-600 text-center">
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
              <Card className="bg-white/75 bg-blend-overlay backdrop-blur-xl border-blue-100/30 shadow-[0_8px_30px_rgb(59,130,246,0.08)]">
                <CardHeader>
                  <CardTitle className="text-gray-800 text-lg">Turma Selecionada</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger className="bg-white/70 bg-blue-50/15 bg-blend-overlay backdrop-blur-md border-blue-100/40 text-gray-900 shadow-sm">
                      <SelectValue placeholder="Selecione uma turma" />
                    </SelectTrigger>
                    <SelectContent className="bg-white/95 backdrop-blur-xl border-blue-100/50 shadow-2xl shadow-blue-500/10">
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id} className="text-gray-800 hover:bg-purple-50">
                          {cls.name} - {cls.period}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* Upcoming Events - Novo Design com EventCard */}
              <Card className="bg-white/75 bg-blend-overlay backdrop-blur-xl border-blue-100/30 shadow-[0_8px_30px_rgb(59,130,246,0.08)]">
                <CardHeader>
                  <CardTitle className="text-gray-800 text-lg flex items-center justify-between">
                    Próximos Eventos
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsSchedulingModalOpen(true)}
                      className="text-purple-500 hover:text-purple-600 hover:bg-purple-50"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {upcomingEvents.map((event, index) => (
                      <EventCard key={index} {...event} index={index} />
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats - Novo Design com MiniStatCard */}
              <Card className="bg-white/75 bg-blend-overlay backdrop-blur-xl border-blue-100/30 shadow-[0_8px_30px_rgb(59,130,246,0.08)]">
                <CardHeader>
                  <CardTitle className="text-gray-800 text-lg">Estatísticas Rápidas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <MiniStatCard
                    label="Taxa de Presença"
                    value="94%"
                    trend="up"
                    color="green"
                  />
                  <MiniStatCard
                    label="Materiais Enviados"
                    value="127"
                    trend="neutral"
                    color="blue"
                  />
                  <MiniStatCard
                    label="Revisões Pendentes"
                    value="8"
                    trend="down"
                    color="orange"
                  />
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
        
        <AnnouncementModal
          open={isAnnouncementModalOpen}
          onOpenChange={setIsAnnouncementModalOpen}
          classes={classes}
        />
      </div>
    </MainLayout>
  );
};

export default TeacherDashboard;