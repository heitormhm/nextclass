import { useState, useEffect } from 'react';
import { Search, Filter } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import MainLayout from '@/components/MainLayout';
import CourseCard from '@/components/CourseCard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Course {
  id: string;
  lessonNumber: string;
  title: string;
  instructor: string;
  duration: string;
  progress: number;
  thumbnail: string;
  topic: string;
  type: string;
}

const MyCoursesPage = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [topicFilter, setTopicFilter] = useState('all-topics');
  const [instructorFilter, setInstructorFilter] = useState('all-instructors');
  const [sortBy, setSortBy] = useState('title');

  useEffect(() => {
    if (user) {
      fetchStudentClasses();
    }
  }, [user]);

  const fetchStudentClasses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('get-student-classes');

      if (error) {
        console.error('Error fetching classes:', error);
        toast.error('Erro ao carregar aulas');
        return;
      }

      if (data?.classes) {
        setCourses(data.classes);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao carregar aulas');
    } finally {
      setLoading(false);
    }
  };

  // Extract unique topics and instructors for filter dropdowns
  const uniqueTopics = Array.from(new Set(courses.map(course => course.topic)));
  const uniqueInstructors = Array.from(new Set(courses.map(course => course.instructor)));

  // Filter courses based on search and filters
  const filteredCourses = courses.filter(course => {
    const matchesSearch = 
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.instructor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.topic.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTopic = topicFilter === 'all-topics' || course.topic === topicFilter;
    const matchesInstructor = instructorFilter === 'all-instructors' || course.instructor === instructorFilter;

    return matchesSearch && matchesTopic && matchesInstructor;
  });

  // Sort courses
  const sortedCourses = [...filteredCourses].sort((a, b) => {
    switch (sortBy) {
      case 'title':
        return a.title.localeCompare(b.title);
      case 'instructor':
        return a.instructor.localeCompare(b.instructor);
      default:
        return 0;
    }
  });

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Minhas Aulas</h1>
            <p className="text-foreground-muted mb-6">
              Acompanhe todas as suas aulas disponíveis e seu progresso.
            </p>
          </div>

          {/* Search and Filter Card */}
          <Card className="mb-8 shadow-sm border-0 bg-white/60 backdrop-blur-xl">
            <CardContent className="p-6">
              {/* Search Bar */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground-muted h-5 w-5" />
                  <Input
                    placeholder="Pesquisar cursos por título, professor ou área de engenharia..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-11 py-3 text-base border-border bg-background"
                  />
                </div>
              </div>

              {/* Filters and Sort */}
              <div className="flex flex-wrap gap-6 items-center">
                {/* Filter Section */}
                <div className="flex items-center gap-4">
                  <span className="text-foreground font-medium">Filtrar por:</span>
                  
                  {/* Topic Filter */}
                  <Select value={topicFilter} onValueChange={setTopicFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Tópico" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-lg z-50">
                      <SelectItem value="all-topics">Todos os tópicos</SelectItem>
                      {uniqueTopics.map(topic => (
                        <SelectItem key={topic} value={topic}>
                          {topic}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Instructor Filter */}
                  <Select value={instructorFilter} onValueChange={setInstructorFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Professor" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-lg z-50">
                      <SelectItem value="all-instructors">Todos os professores</SelectItem>
                      {uniqueInstructors.map(instructor => (
                        <SelectItem key={instructor} value={instructor}>
                          {instructor}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort Section */}
                <div className="flex items-center gap-4">
                  <span className="text-foreground font-medium">Ordenar por:</span>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Título" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-lg z-50">
                      <SelectItem value="title">Título</SelectItem>
                      <SelectItem value="instructor">Professor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Course Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="aspect-video w-full" />
                  <CardContent className="p-5 space-y-3">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-2 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : sortedCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedCourses.map((course) => (
                <CourseCard 
                  key={course.id} 
                  course={course} 
                  type="lesson"
                />
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center border-0 shadow-sm">
              <div className="text-foreground-muted">
                <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">
                  {courses.length === 0 ? 'Nenhuma aula disponível' : 'Nenhuma aula encontrada'}
                </h3>
                <p>
                  {courses.length === 0 
                    ? 'Nenhuma aula disponível para si neste momento.'
                    : 'Tente ajustar os filtros ou termo de busca.'}
                </p>
              </div>
            </Card>
          )}
        </div>
    </MainLayout>
  );
};

export default MyCoursesPage;