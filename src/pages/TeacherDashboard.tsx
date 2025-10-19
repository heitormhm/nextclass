import React, { useState, useEffect } from 'react';
import { Calendar, Mic, BookOpen, Users, GraduationCap, Brain, Upload, Megaphone, Plus, Zap, MessageCircle, StickyNote, Calendar as CalendarIcon } from 'lucide-react';
import { parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Dashboard statistics state
  const [dashboardStats, setDashboardStats] = useState({
    publishedLectures: 0,
    activeStudents: 0,
    classAverage: '0.0',
    isLoading: true,
  });

  // Upcoming events state
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);

  // Quick stats state
  const [quickStats, setQuickStats] = useState({
    attendanceRate: '85%',
    materialsSent: 0,
    pendingReviews: 0,
    isLoading: true,
  });

  // Fetch turmas
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: accessData, error } = await supabase
          .from('teacher_turma_access')
          .select('turma_id, turmas(*)')
          .eq('teacher_id', user.id);

        if (error) throw error;

        const transformedClasses = accessData?.map((access: any) => ({
          id: access.turmas.id,
          name: access.turmas.nome_turma,
          course: access.turmas.curso,
          period: access.turmas.periodo,
        })) || [];

        setClasses(transformedClasses);
        if (transformedClasses.length > 0) {
          setSelectedClass(transformedClasses[0].id);
        }
      } catch (error) {
        console.error('Error fetching turmas:', error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar turmas",
          description: "Não foi possível carregar suas turmas.",
        });
      }
    };

    fetchClasses();
  }, [toast]);

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

  // Fetch dashboard stats when selectedClass changes
  useEffect(() => {
    if (!selectedClass) {
      setDashboardStats({ publishedLectures: 0, activeStudents: 0, classAverage: '0.0', isLoading: false });
      return;
    }

    const fetchDashboardStats = async () => {
      setDashboardStats(prev => ({ ...prev, isLoading: true }));
      
      try {
        // 1. Buscar número de alunos ativos
        const { count: studentCount } = await supabase
          .from('turma_enrollments')
          .select('*', { count: 'exact', head: true })
          .eq('turma_id', selectedClass);

        // 2. Buscar disciplinas da turma para contar lectures
        const { data: disciplinas } = await supabase
          .from('disciplinas')
          .select('id')
          .eq('turma_id', selectedClass);

        const disciplinaIds = disciplinas?.map(d => d.id) || [];

        // 3. Buscar lectures publicadas
        let lectureCount = 0;
        if (disciplinaIds.length > 0) {
          const { count } = await supabase
            .from('lectures')
            .select('*', { count: 'exact', head: true })
            .in('class_id', disciplinaIds)
            .eq('status', 'completed');
          
          lectureCount = count || 0;
        }

        // 4. Calcular média da turma
        let averageGrade = '0.0';
        if (disciplinaIds.length > 0) {
          const { data: grades } = await supabase
            .from('grades')
            .select('grade')
            .in('class_id', disciplinaIds);

          if (grades && grades.length > 0) {
            const sum = grades.reduce((acc, g) => acc + Number(g.grade), 0);
            averageGrade = (sum / grades.length).toFixed(1);
          }
        }

        setDashboardStats({
          publishedLectures: lectureCount,
          activeStudents: studentCount || 0,
          classAverage: averageGrade,
          isLoading: false,
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        setDashboardStats({ publishedLectures: 0, activeStudents: 0, classAverage: '0.0', isLoading: false });
      }
    };

    fetchDashboardStats();
  }, [selectedClass]);

  // Fetch upcoming events when selectedClass changes
  useEffect(() => {
    if (!selectedClass) {
      setUpcomingEvents([]);
      setIsLoadingEvents(false);
      return;
    }

    const fetchUpcomingEvents = async () => {
      setIsLoadingEvents(true);
      
      try {
        const now = new Date();
        
        const { data: events } = await supabase
          .from('class_events')
          .select('*')
          .eq('class_id', selectedClass)
          .gte('event_date', now.toISOString())
          .order('event_date', { ascending: true })
          .order('start_time', { ascending: true })
          .limit(4);

        setUpcomingEvents(events || []);
      } catch (error) {
        console.error('Error fetching upcoming events:', error);
        setUpcomingEvents([]);
      } finally {
        setIsLoadingEvents(false);
      }
    };

    fetchUpcomingEvents();
  }, [selectedClass]);

  // Fetch quick stats when selectedClass changes
  useEffect(() => {
    if (!selectedClass) {
      setQuickStats({ attendanceRate: '0%', materialsSent: 0, pendingReviews: 0, isLoading: false });
      return;
    }

    const fetchQuickStats = async () => {
      setQuickStats(prev => ({ ...prev, isLoading: true }));
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Não autenticado');

        // 1. Materiais enviados nos últimos 30 dias
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { count: materialsCount } = await supabase
          .from('library_materials')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', selectedClass)
          .eq('teacher_id', user.id)
          .gte('created_at', thirtyDaysAgo.toISOString());

        // 2. Anotações do professor
        const { count: annotationsCount } = await supabase
          .from('annotations')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        setQuickStats({
          attendanceRate: '85%',
          materialsSent: materialsCount || 0,
          pendingReviews: annotationsCount || 0,
          isLoading: false,
        });
      } catch (error) {
        console.error('Error fetching quick stats:', error);
        setQuickStats({ attendanceRate: '0%', materialsSent: 0, pendingReviews: 0, isLoading: false });
      }
    };

    fetchQuickStats();
  }, [selectedClass]);

  // Helper: Formatar data de evento
  const formatEventDate = (dateString: string): string => {
    try {
      const date = parseISO(dateString);
      return format(date, "dd MMM", { locale: ptBR });
    } catch {
      return "Data inválida";
    }
  };

  // Helper: Mapear tipo de evento
  const mapEventType = (eventType: string): 'lecture' | 'deadline' | 'lab' | 'meeting' => {
    const typeMap: { [key: string]: 'lecture' | 'deadline' | 'lab' | 'meeting' } = {
      'aula': 'lecture',
      'prova': 'deadline',
      'avaliacao': 'deadline',
      'laboratorio': 'lab',
      'evento': 'meeting',
      'seminario': 'meeting',
      'reuniao': 'meeting',
    };
    return typeMap[eventType?.toLowerCase()] || 'lecture';
  };

  // Helper: Mapear prioridade baseado em categoria
  const mapPriority = (category: string | null): 'urgent' | 'normal' => {
    if (!category) return 'normal';
    const urgentCategories = ['prova', 'avaliacao', 'entrega'];
    return urgentCategories.some(cat => category.toLowerCase().includes(cat)) ? 'urgent' : 'normal';
  };

  // Empty state for no classes
  if (classes.length === 0 && !dashboardStats.isLoading) {
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
          <div className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
            {/* Icon com estilo consistente */}
            <div className="mb-6 p-8 bg-white/10 backdrop-blur-lg rounded-full border border-white/20 shadow-2xl">
              <Users className="w-24 h-24 text-white" />
            </div>
            
            {/* Título e descrição com cores brancas */}
            <h2 className="text-4xl font-bold text-white mb-4 drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
              Nenhuma Turma Cadastrada
            </h2>
            <p className="text-white/90 text-lg max-w-md drop-shadow-[0_1px_4px_rgba(0,0,0,0.2)]">
              Você ainda não tem turmas vinculadas. Entre em contato com a coordenação para ter acesso às suas turmas.
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }

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
      icon: MessageCircle,
      title: 'Conversa com a Mia',
      description: 'Assistente pedagógica com IA',
      gradientFrom: 'from-blue-500',
      gradientTo: 'to-blue-600',
      onClick: () => navigate('/teacher-aichat'),
      badge: 'IA',
    },
    {
      icon: StickyNote,
      title: 'Minhas Anotações',
      description: 'Organize suas anotações pedagógicas',
      gradientFrom: 'from-indigo-500',
      gradientTo: 'to-indigo-600',
      onClick: () => navigate('/teacher/annotations'),
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
      title: 'Calendário',
      description: 'Ver e criar eventos da turma',
      gradientFrom: 'from-orange-500',
      gradientTo: 'to-orange-600',
      onClick: () => navigate('/teachercalendar'),
    },
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
            <h1 className="text-4xl font-bold text-white uppercase mb-2 drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]">Painel do Professor</h1>
            <p className="text-white/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.2)]">Gerencie suas aulas e acompanhe o desempenho da turma</p>
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

              {/* Stats Cards - Dados Reais com Loading */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {dashboardStats.isLoading ? (
                  <>
                    <Skeleton className="h-32 w-full rounded-xl" />
                    <Skeleton className="h-32 w-full rounded-xl" />
                    <Skeleton className="h-32 w-full rounded-xl" />
                  </>
                ) : (
                  <>
                    <StatCard
                      icon={BookOpen}
                      title="Aulas Publicadas"
                      value={dashboardStats.publishedLectures.toString()}
                      subtitle="Disponíveis na biblioteca"
                      gradientFrom="from-blue-500"
                      gradientTo="to-blue-600"
                      iconColor="text-blue-500"
                      index={0}
                    />
                    <StatCard
                      icon={Users}
                      title="Alunos Ativos"
                      value={dashboardStats.activeStudents.toString()}
                      subtitle={classes.find(c => c.id === selectedClass)?.name || 'Turma selecionada'}
                      gradientFrom="from-green-500"
                      gradientTo="to-green-600"
                      iconColor="text-green-500"
                      index={1}
                    />
                    <StatCard
                      icon={GraduationCap}
                      title="Média da Turma"
                      value={dashboardStats.classAverage}
                      subtitle="Geral do período"
                      gradientFrom="from-purple-500"
                      gradientTo="to-purple-600"
                      iconColor="text-purple-500"
                      index={2}
                    />
                  </>
                )}
              </div>

              {/* Insights Panel with Tabs */}
              <Card className="bg-white/75 bg-blend-overlay backdrop-blur-xl border-blue-100/30 shadow-[0_8px_30px_rgb(59,130,246,0.08)]">
                <CardHeader>
                  <CardTitle className="text-gray-800">Insights da Turma</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="insights" className="w-full">
                    <TabsList className="w-full bg-white/90 backdrop-blur-md border border-purple-200/50 shadow-sm p-1 rounded-lg">
                      <TabsTrigger 
                        value="insights" 
                        className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:text-gray-700 data-[state=inactive]:hover:bg-purple-50 transition-all duration-200 rounded-md"
                      >
                        Alertas e Oportunidades
                      </TabsTrigger>
                      <TabsTrigger 
                        value="performance" 
                        className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:text-gray-700 data-[state=inactive]:hover:bg-purple-50 transition-all duration-200 rounded-md"
                      >
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
                      onClick={() => navigate('/teachercalendar')}
                      className="text-purple-500 hover:text-purple-600 hover:bg-purple-50"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {isLoadingEvents ? (
                      <>
                        <Skeleton className="h-24 w-full rounded-lg" />
                        <Skeleton className="h-24 w-full rounded-lg" />
                        <Skeleton className="h-24 w-full rounded-lg" />
                      </>
                    ) : upcomingEvents.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <CalendarIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Nenhum evento agendado</p>
                      </div>
                    ) : (
                      upcomingEvents.map((event, index) => (
                        <EventCard
                          key={event.id}
                          date={formatEventDate(event.event_date)}
                          title={event.title}
                          time={`${event.start_time} - ${event.end_time}`}
                          type={mapEventType(event.category || event.event_type)}
                          priority={mapPriority(event.category)}
                          index={index}
                        />
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats - Novo Design com MiniStatCard */}
              <Card className="bg-white/75 bg-blend-overlay backdrop-blur-xl border-blue-100/30 shadow-[0_8px_30px_rgb(59,130,246,0.08)]">
                <CardHeader>
                  <CardTitle className="text-gray-800 text-lg">Estatísticas Rápidas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {quickStats.isLoading ? (
                    <>
                      <Skeleton className="h-16 w-full rounded-lg" />
                      <Skeleton className="h-16 w-full rounded-lg" />
                      <Skeleton className="h-16 w-full rounded-lg" />
                    </>
                  ) : (
                    <>
                      <MiniStatCard
                        label="Taxa de Presença"
                        value={quickStats.attendanceRate}
                        trend="neutral"
                        color="green"
                      />
                      <MiniStatCard
                        label="Materiais Enviados"
                        value={quickStats.materialsSent.toString()}
                        trend={quickStats.materialsSent > 0 ? "up" : "neutral"}
                        color="blue"
                      />
                      <MiniStatCard
                        label="Anotações Salvas"
                        value={quickStats.pendingReviews.toString()}
                        trend="neutral"
                        color="purple"
                      />
                    </>
                  )}
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