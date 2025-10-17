import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { TeacherLayoutWrapper } from "@/components/TeacherLayoutWrapper";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Plus, FileText, Clock, CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LessonPlan {
  id: string;
  topic: string;
  duration: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

const TeacherLessonPlans = () => {
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchLessonPlans();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('lesson-plans-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lesson_plans'
        },
        () => {
          fetchLessonPlans();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLessonPlans = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('lesson_plans')
        .select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLessonPlans(data || []);
    } catch (error) {
      console.error('Error fetching lesson plans:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os planos de aula.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = () => {
    navigate('/teacher/lesson-plans/new');
  };

  const handleViewPlan = (id: string) => {
    navigate(`/teacher/lesson-plans/${id}`);
  };

  const getStatusIcon = (status: string) => {
    if (status === 'generating') {
      return <Loader2 className="h-5 w-5 text-purple-400 animate-spin" />;
    }
    return <CheckCircle className="h-5 w-5 text-green-400" />;
  };

  const getStatusText = (status: string) => {
    if (status === 'generating') return 'Gerando...';
    return 'Concluído';
  };

  return (
    <MainLayout>
      <TeacherLayoutWrapper>
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-purple-500/20 border border-purple-300 backdrop-blur-sm">
                <Sparkles className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Planos de Aula</h1>
                <p className="text-gray-600">Criados com a assistência da Mia</p>
              </div>
            </div>
            <Button
              onClick={handleCreateNew}
              className="bg-purple-600 hover:bg-purple-700 text-white backdrop-blur-sm"
            >
              <Plus className="h-5 w-5 mr-2" />
              Criar Novo Plano de Aula
            </Button>
          </div>

          {/* Content */}
          {isLoading ? (
            <Card className="frost-white-teacher p-12 text-center relative z-20 pointer-events-auto">
              <Loader2 className="h-12 w-12 text-purple-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Carregando planos de aula...</p>
            </Card>
          ) : lessonPlans.length === 0 ? (
            <Card className="frost-white-teacher p-12 text-center relative z-20 pointer-events-auto">
              <div className="max-w-md mx-auto space-y-4">
                <div className="p-4 rounded-full bg-purple-500/20 w-20 h-20 flex items-center justify-center mx-auto">
                  <FileText className="h-10 w-10 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800">Nenhum plano de aula ainda</h3>
                <p className="text-gray-600">
                  Comece criando seu primeiro plano de aula com a ajuda da Mia
                </p>
                <Button onClick={handleCreateNew} className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Plano
                </Button>
              </div>
            </Card>
          ) : (
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {lessonPlans.map((plan) => (
                  <Card
                    key={plan.id}
                    className="frost-white-teacher-card p-6 hover:shadow-lg transition-all cursor-pointer group transform hover:scale-[1.02] relative z-20 pointer-events-auto"
                    onClick={() => handleViewPlan(plan.id)}
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-800 mb-2 line-clamp-2 group-hover:text-purple-600 transition-colors">
                            {plan.topic}
                          </h3>
                          {plan.duration && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Clock className="h-4 w-4" />
                              {plan.duration} minutos
                            </div>
                          )}
                        </div>
                        {getStatusIcon(plan.status)}
                      </div>

                      <div className="pt-4 border-t border-gray-300">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">
                            {new Date(plan.created_at).toLocaleDateString('pt-BR')}
                          </span>
                          <span className={`font-medium ${
                            plan.status === 'generating' ? 'text-purple-600' : 'text-green-600'
                          }`}>
                            {getStatusText(plan.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </TeacherLayoutWrapper>
    </MainLayout>
  );
};

export default TeacherLessonPlans;
