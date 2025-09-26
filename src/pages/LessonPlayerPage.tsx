import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { 
  Play, 
  Bookmark, 
  Share2, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  Lock, 
  FileText, 
  Brain, 
  HelpCircle,
  Clock,
  BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import MainLayout from '@/components/MainLayout';
import { FlashcardModal } from '@/components/FlashcardModal';

// Static lesson data
const lessonData = {
  id: 1,
  title: "Cardiologia: Anatomia e Fisiologia",
  description: "Neste módulo, você aprenderá sobre a estrutura anatômica do coração, suas câmaras, válvulas e a fisiologia do sistema cardiovascular. Compreenderemos como o coração funciona como uma bomba, os ciclos cardíacos e os mecanismos de regulação da pressão arterial.",
  moduleProgress: 45,
  currentLessonIndex: 2
};

const moduleContent = [
  {
    id: 1,
    title: "Introdução à Cardiologia",
    duration: "5 min",
    status: "completed"
  },
  {
    id: 2,
    title: "Anatomia Cardíaca Básica",
    duration: "12 min", 
    status: "completed"
  },
  {
    id: 3,
    title: "Fisiologia do Coração",
    duration: "15 min",
    status: "current"
  },
  {
    id: 4,
    title: "Sistema de Condução",
    duration: "10 min",
    status: "locked"
  },
  {
    id: 5,
    title: "Ciclo Cardíaco",
    duration: "18 min",
    status: "locked"
  },
  {
    id: 6,
    title: "Regulação da Pressão Arterial",
    duration: "20 min",
    status: "locked"
  }
];

const additionalResources = [
  {
    id: 1,
    title: "Resumo em PDF",
    icon: FileText,
    type: "pdf"
  },
  {
    id: 2,
    title: "Flashcards Interativos", 
    icon: Brain,
    type: "flashcards"
  },
  {
    id: 3,
    title: "Quiz de Autoavaliação",
    icon: HelpCircle,
    type: "quiz"
  }
];

const LessonPlayerPage = () => {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isFlashcardModalOpen, setIsFlashcardModalOpen] = useState(false);
  const { id } = useParams(); // Get the current lesson ID from the URL
  
  console.log('LessonPlayerPage is rendering');

  const getLessonIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-success" />;
      case 'current':
        return <Play className="h-5 w-5 text-primary" fill="currentColor" />;
      case 'locked':
        return <Lock className="h-5 w-5 text-foreground-muted" />;
      default:
        return <Play className="h-5 w-5 text-foreground-muted" />;
    }
  };

  const getLessonItemClass = (status: string) => {
    const baseClass = "flex items-center gap-4 p-4 rounded-lg transition-all hover:bg-accent/50";
    switch (status) {
      case 'completed':
        return `${baseClass} bg-success/5`;
      case 'current':
        return `${baseClass} bg-primary/10 border border-primary/20`;
      case 'locked':
        return `${baseClass} opacity-60`;
      default:
        return baseClass;
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Video Player */}
              <Card className="border-0 shadow-sm overflow-hidden">
                <div className="relative aspect-video bg-gradient-to-br from-primary/20 to-primary/10">
                  {/* Video Placeholder */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                    <Button
                      size="lg"
                      className="w-20 h-20 rounded-full bg-primary/90 hover:bg-primary backdrop-blur-sm shadow-lg hover:scale-110 transition-all duration-300"
                    >
                      <Play className="h-8 w-8 text-white ml-1" fill="currentColor" />
                    </Button>
                  </div>
                  
                  {/* Video Controls Overlay */}
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="bg-black/50 backdrop-blur-sm rounded-lg p-3">
                      <div className="flex items-center gap-4 text-white">
                        <span className="text-sm">15:32</span>
                        <div className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: '65%' }} />
                        </div>
                        <span className="text-sm">24:00</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Lesson Details */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  {/* Title and Actions */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h1 className="text-2xl font-bold mb-2">{lessonData.title}</h1>
                      <div className="flex items-center gap-2 text-foreground-muted">
                        <BookOpen className="h-4 w-4" />
                        <span className="text-sm">Módulo 1 • Cardiologia Básica</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsBookmarked(!isBookmarked)}
                        className={isBookmarked ? "text-primary" : "text-foreground-muted"}
                      >
                        <Bookmark className="h-5 w-5" fill={isBookmarked ? "currentColor" : "none"} />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-foreground-muted">
                        <Share2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-foreground-muted leading-relaxed mb-6">
                    {lessonData.description}
                  </p>

                  {/* Progress Section */}
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Progresso do Módulo</span>
                      <span className="text-sm font-semibold">{lessonData.moduleProgress}% concluído</span>
                    </div>
                    <div className="w-full h-3 bg-background-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full transition-all duration-500"
                        style={{ width: `${lessonData.moduleProgress}%` }}
                      />
                    </div>
                  </div>

                  <Separator className="my-6" />

                  {/* Navigation */}
                  <div className="flex items-center justify-between">
                    <Button variant="outline" className="gap-2">
                      <ChevronLeft className="h-4 w-4" />
                      Módulo Anterior
                    </Button>
                    <Button className="gap-2 bg-primary hover:bg-primary-light">
                      Próximo Módulo
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              {/* Module Content */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Conteúdo do Módulo</CardTitle>
                </CardHeader>
                <CardContent className="p-0 pb-6">
                  <div className="space-y-1">
                    {moduleContent.map((lesson, index) => (
                      <div key={lesson.id} className="px-6">
                        <div className={getLessonItemClass(lesson.status)}>
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background-secondary">
                            {getLessonIcon(lesson.status)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm leading-tight mb-1">
                              {index + 1}. {lesson.title}
                            </h4>
                            <div className="flex items-center gap-1 text-xs text-foreground-muted">
                              <Clock className="h-3 w-3" />
                              {lesson.duration}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Additional Resources */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Recursos Adicionais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {additionalResources.map((resource) => (
                    <Button
                      key={resource.id}
                      variant="ghost"
                      className="w-full justify-start gap-3 h-auto p-4 hover:bg-accent/50"
                      asChild
                    >
                      {resource.type === 'quiz' ? (
                        <Link to={`/quiz/${id}`} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <resource.icon className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium">{resource.title}</span>
                        </Link>
                      ) : resource.type === 'flashcards' ? (
                        <button 
                          onClick={() => setIsFlashcardModalOpen(true)}
                          className="flex items-center gap-3 w-full"
                        >
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <resource.icon className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium">{resource.title}</span>
                        </button>
                      ) : (
                        <a href="#" className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <resource.icon className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium">{resource.title}</span>
                        </a>
                      )}
                    </Button>
                  ))}
                </CardContent>
              </Card>

              {/* Module Stats */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-primary">6</div>
                      <div className="text-xs text-foreground-muted">Aulas Total</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-success">2</div>
                      <div className="text-xs text-foreground-muted">Concluídas</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
      </div>

      {/* Flashcard Modal */}
      <FlashcardModal 
        open={isFlashcardModalOpen} 
        onOpenChange={setIsFlashcardModalOpen} 
      />
    </MainLayout>
  );
};

export default LessonPlayerPage;