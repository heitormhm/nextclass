import { useState, useEffect } from 'react';
import { BookOpen, Loader2 } from 'lucide-react';
import MainLayout from '@/components/MainLayout';
import LectureCard from '@/components/LectureCard';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Lecture {
  id: string;
  title: string;
  course_name: string;
  thumbnail: string;
  professor?: string;
  duration?: string;
  date?: string;
}

const MeusCursosPage = () => {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMyLectures();
  }, []);

  const fetchMyLectures = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.functions.invoke('get-my-lectures');

      if (error) {
        console.error('Error fetching lectures:', error);
        toast.error('Erro ao carregar aulas');
        return;
      }

      if (data?.lectures) {
        setLectures(data.lectures);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('Erro ao carregar aulas');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Meus Cursos</h1>
              <p className="text-foreground-muted mt-1">
                Acesse todas as aulas disponíveis para você
              </p>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && lectures.length === 0 && (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Nenhuma aula disponível</h3>
            <p className="text-foreground-muted">
              Você ainda não tem acesso a nenhuma aula.
            </p>
          </div>
        )}

        {/* Lectures Grid */}
        {!isLoading && lectures.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lectures.map((lecture) => (
              <LectureCard
                key={lecture.id}
                id={lecture.id}
                title={lecture.title}
                courseName={lecture.course_name}
                thumbnail={lecture.thumbnail}
                professor={lecture.professor}
                duration={lecture.duration}
                date={lecture.date}
              />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default MeusCursosPage;
