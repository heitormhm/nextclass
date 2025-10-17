import React, { useState, useEffect } from 'react';
import { Calendar, Video, BookOpen, Users, Upload, Bell, MessageCircle, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MainLayout from '@/components/MainLayout';
import { TeacherLayoutWrapper } from '@/components/TeacherLayoutWrapper';
import { InsightCard } from '@/components/InsightCard';
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

  return (
    <MainLayout>
      <TeacherLayoutWrapper>
        <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-8 animate-fade-in-up">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              Dashboard do Professor
            </h1>
            <p className="text-gray-600">
              Gerencie suas turmas, monitore o progresso dos alunos e acesse insights de IA
            </p>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Actions & Stats */}
            <div className="lg:col-span-2 space-y-6">
              {/* IA Co-piloto Card */}
              <Card className="frost-white-teacher-primary animate-fade-in-up relative z-20" style={{ animationDelay: '100ms' }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-800">
                    <Sparkles className="h-6 w-6 text-purple-600" />
                    IA Co-piloto do Professor
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Otimize seu tempo com assistência inteligente
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Button
                      className="action-button w-full bg-purple-600 hover:bg-purple-700 text-white relative"
                      onClick={() => navigate('/livelecture')}
                    >
                      <Video className="icon h-4 w-4 mr-2" />
                      Gravar Nova Aula
                    </Button>
                    <Button
                      className="action-button w-full bg-purple-600 hover:bg-purple-700 text-white relative"
                      onClick={() => navigate('/teacher/aichat')}
                    >
                      <MessageCircle className="icon h-4 w-4 mr-2" />
                      Chat com Mia
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-pink-500"></span>
                      </span>
                    </Button>
                    <Button
                      className="action-button w-full bg-purple-600 hover:bg-purple-700 text-white"
                      onClick={() => navigate('/teacher/lesson-plans')}
                    >
                      <BookOpen className="icon h-4 w-4 mr-2" />
                      Criar Plano de Aula
                    </Button>
                    <Button
                      variant="outline"
                      className="action-button w-full bg-white border-purple-600 text-purple-600 hover:bg-purple-50"
                      onClick={() => setIsUploadModalOpen(true)}
                    >
                      <Upload className="icon h-4 w-4 mr-2" />
                      Adicionar Material
                    </Button>
                    <Button
                      variant="outline"
                      className="action-button w-full bg-white border-purple-600 text-purple-600 hover:bg-purple-50"
                      onClick={() => setIsSchedulingModalOpen(true)}
                    >
                      <Calendar className="icon h-4 w-4 mr-2" />
                      Agendar Evento
                    </Button>
                    <Button
                      variant="outline"
                      className="action-button w-full bg-white border-purple-600 text-purple-600 hover:bg-purple-50"
                      onClick={() => setIsAnnouncementModalOpen(true)}
                    >
                      <Bell className="icon h-4 w-4 mr-2" />
                      Enviar Anúncio
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Visual Separator */}
              <div className="h-px w-full bg-gradient-to-r from-transparent via-purple-300/50 to-transparent" />

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="frost-white-teacher animate-fade-in-up relative z-20" style={{ animationDelay: '200ms' }}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Aulas Publicadas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-gray-800">24</p>
                    <p className="text-xs text-gray-500 mt-1">+3 este mês</p>
                  </CardContent>
                </Card>

                <Card className="frost-white-teacher animate-fade-in-up relative z-20" style={{ animationDelay: '300ms' }}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Alunos Ativos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-gray-800">152</p>
                    <p className="text-xs text-gray-500 mt-1">Em 3 turmas</p>
                  </CardContent>
                </Card>

                <Card className="frost-white-teacher animate-fade-in-up relative z-20" style={{ animationDelay: '400ms' }}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Média da Turma
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-gray-800">8.5</p>
                    <p className="text-xs text-gray-500 mt-1">+0.3 vs mês anterior</p>
                  </CardContent>
                </Card>
              </div>

              {/* Visual Separator */}
              <div className="h-px w-full bg-gradient-to-r from-transparent via-purple-300/50 to-transparent" />

              {/* Insights Panel */}
              <Card className="frost-white-teacher-card animate-fade-in-up relative z-20" style={{ animationDelay: '500ms' }}>
                <CardHeader>
                  <CardTitle className="text-gray-800">Insights de IA</CardTitle>
                  <CardDescription className="text-gray-600">
                    Recomendações personalizadas baseadas no desempenho da turma
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="alerts" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4 bg-purple-100/50">
                      <TabsTrigger value="alerts" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                        Alertas & Oportunidades
                      </TabsTrigger>
                      <TabsTrigger value="performance" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                        Desempenho
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="alerts" className="space-y-3">
                      {isLoadingInsights ? (
                        <div className="space-y-3">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="frost-white-teacher-card p-4 animate-pulse">
                              <div className="h-4 bg-purple-200/50 rounded w-3/4 mb-2" />
                              <div className="h-3 bg-purple-200/30 rounded w-full mb-1" />
                              <div className="h-3 bg-purple-200/30 rounded w-2/3" />
                            </div>
                          ))}
                          <div className="text-center py-4">
                            <p className="text-sm text-gray-600">Analisando dados de 152 alunos...</p>
                          </div>
                        </div>
                      ) : insights.length === 0 ? (
                        <div className="text-center py-8">
                          <div className="relative">
                            <Sparkles className="h-16 w-16 text-purple-500 mx-auto mb-4 animate-pulse" />
                            <div className="space-y-2 mt-4">
                              <div className="h-3 w-3/4 bg-purple-200/50 rounded animate-pulse mx-auto" />
                              <div className="h-3 w-1/2 bg-purple-200/50 rounded animate-pulse mx-auto" />
                            </div>
                          </div>
                          <p className="text-gray-700 font-medium mt-6">Analisando dados da turma...</p>
                          <p className="text-sm text-gray-500 mt-1">
                            A IA está processando o desempenho de 152 alunos
                          </p>
                        </div>
                      ) : (
                        insights
                          .filter(i => i.insight_type === 'alert' || i.insight_type === 'opportunity')
                          .map((insight) => (
                            <InsightCard
                              key={insight.id}
                              type={insight.insight_type as 'alert' | 'opportunity'}
                              title={insight.title}
                              description={insight.description}
                              actionLabel={insight.action_label}
                              actionRoute={insight.action_route}
                            />
                          ))
                      )}
                    </TabsContent>
                    
                    <TabsContent value="performance" className="space-y-3">
                      {insights
                        .filter(i => i.insight_type === 'performance')
                        .map((insight) => (
                          <InsightCard
                            key={insight.id}
                            type={insight.insight_type as 'alert' | 'opportunity'}
                            title={insight.title}
                            description={insight.description}
                            actionLabel={insight.action_label}
                            actionRoute={insight.action_route}
                          />
                        ))}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Class Selector & Events */}
            <div className="space-y-6">
              {/* Class Selector */}
              <Card className="frost-white-teacher-card animate-fade-in-up relative z-20" style={{ animationDelay: '600ms' }}>
                <CardHeader>
                  <CardTitle className="text-gray-800">Turma Selecionada</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger className="bg-purple-50 border-purple-300 text-gray-800 hover:bg-purple-100 transition-colors">
                      <SelectValue placeholder="Selecione uma turma" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((classItem) => (
                        <SelectItem key={classItem.id} value={classItem.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{classItem.name}</span>
                            <span className="text-xs text-gray-500">
                              {classItem.course} - {classItem.period}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card className="frost-white-teacher-card animate-fade-in-up relative z-20" style={{ animationDelay: '700ms' }}>
                <CardHeader>
                  <CardTitle className="text-gray-800">Estatísticas Rápidas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-600">Taxa de Presença</span>
                      <span className="text-sm font-medium text-gray-800">94%</span>
                    </div>
                    <div className="w-full bg-purple-100 rounded-full h-2">
                      <div className="bg-purple-600 h-2 rounded-full transition-all duration-1000 ease-out" style={{ width: '94%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-600">Engajamento</span>
                      <span className="text-sm font-medium text-gray-800">87%</span>
                    </div>
                    <div className="w-full bg-purple-100 rounded-full h-2">
                      <div className="bg-purple-600 h-2 rounded-full transition-all duration-1000 ease-out" style={{ width: '87%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-600">Material Entregue</span>
                      <span className="text-sm font-medium text-gray-800">78%</span>
                    </div>
                    <div className="w-full bg-purple-100 rounded-full h-2">
                      <div className="bg-purple-600 h-2 rounded-full transition-all duration-1000 ease-out" style={{ width: '78%' }}></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Upcoming Events */}
              <Card className="frost-white-teacher-card animate-fade-in-up relative z-20" style={{ animationDelay: '800ms' }}>
                <CardHeader>
                  <CardTitle className="text-gray-800">Próximos Eventos</CardTitle>
                  <CardDescription className="text-gray-600">Aulas e compromissos agendados</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-50/50 hover:bg-purple-100 transition-all duration-200 hover:scale-[1.02] cursor-pointer">
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          Aula de Circuitos Elétricos
                        </p>
                        <p className="text-xs text-gray-500">
                          Hoje, 14:00 - Sala 301
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-purple-50 transition-all duration-200 hover:scale-[1.02] cursor-pointer">
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Users className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          Reunião de Coordenação
                        </p>
                        <p className="text-xs text-gray-500">
                          Amanhã, 10:00 - Online
                        </p>
                      </div>
                    </div>
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
        
        <AnnouncementModal
          open={isAnnouncementModalOpen}
          onOpenChange={setIsAnnouncementModalOpen}
          classes={classes}
        />
      </TeacherLayoutWrapper>
    </MainLayout>
  );
};

export default TeacherDashboard;
