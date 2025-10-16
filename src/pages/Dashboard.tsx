import React from 'react';
import { Link } from 'react-router-dom';
import { Video, Briefcase, FileText, Library, Calendar, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import MainLayout from '@/components/MainLayout';
import ProactiveRecommendationWidget from '@/components/dashboard/ProactiveRecommendationWidget';
import SmartReviewWidget from '@/components/dashboard/SmartReviewWidget';
import GamifiedProgressTracking from '@/components/dashboard/GamifiedProgressTracking';
import { FlashcardsSection } from '@/components/dashboard/FlashcardsSection';
import { UpcomingEventsSection } from '@/components/dashboard/UpcomingEventsSection';
import { BackgroundRippleEffect } from '@/components/ui/background-ripple-effect';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const Dashboard = () => {
  const { firstName, loading: authLoading } = useAuth();

  // Create recommendation job on mount if needed
  React.useEffect(() => {
    const ensureRecommendation = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return;
        
        // Verificar se já existe recomendação ativa
        const { data: existingRec } = await supabase
          .from('recommendations')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();
        
        if (existingRec) {
          console.log('✅ Active recommendation already exists');
          return;
        }
        
        // Verificar se já existe job PENDING
        const { data: existingJob } = await supabase
          .from('jobs')
          .select('id')
          .eq('user_id', user.id)
          .eq('job_type', 'GENERATE_RECOMMENDATION')
          .eq('status', 'PENDING')
          .maybeSingle();
        
        if (existingJob) {
          console.log('⏳ Recommendation job already pending');
          return;
        }
        
        // Criar novo job
        const { error: jobError } = await supabase
          .from('jobs')
          .insert({
            user_id: user.id,
            job_type: 'GENERATE_RECOMMENDATION',
            status: 'PENDING',
            input_payload: {
              userId: user.id
            }
          });
        
        if (jobError) {
          console.error('Error creating recommendation job:', jobError);
          return;
        }
        
        // Invocar job-runner
        await supabase.functions.invoke('job-runner', {
          body: { trigger: 'manual' }
        });
        
        console.log('✅ Recommendation job created and triggered');
        
      } catch (error) {
        console.error('Error ensuring recommendation:', error);
      }
    };
    
    ensureRecommendation();
  }, []);

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
            {authLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-5 w-full max-w-md" />
              </div>
            ) : (
              <>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-800 mb-2">
                  Bem-vindo de volta, <span className="text-primary">{firstName || 'Utilizador'}</span>!
                </h1>
                <p className="text-sm sm:text-base text-slate-700">
                  Continue sua jornada em engenharia. Você está fazendo um ótimo progresso!
                </p>
              </>
            )}
          </div>

        {/* LAYER 1: Proactive Action Hub */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <ProactiveRecommendationWidget />
          <SmartReviewWidget />
        </div>

        {/* LAYER 2: Gamified Progress Tracking */}
        <GamifiedProgressTracking />

        {/* LAYER 3: Content Sections - Flashcards and Events */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <FlashcardsSection />
          <UpcomingEventsSection />
        </div>

        {/* LAYER 4: Utility Modules - Quick Access Menu */}
        <div className="grid grid-cols-1 gap-6 lg:gap-8">
          <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-xl animate-fade-in">
            <CardHeader>
              <CardTitle className="text-xl">Acesso Rápido</CardTitle>
              <CardDescription>
                Navegue rapidamente para as principais seções
              </CardDescription>
            </CardHeader>
            <CardContent>
                {/* Mobile: Single column list */}
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
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
