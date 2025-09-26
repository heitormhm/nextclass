import { useState } from 'react';
import { Search, Filter, ChevronDown, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import MainLayout from '@/components/MainLayout';
import CourseCard from '@/components/CourseCard';

// Import engineering course images
import structuralAnalysisImg from '@/assets/course-structural-analysis.jpg';
import thermodynamicsImg from '@/assets/course-thermodynamics.jpg';
import electricalCircuitsImg from '@/assets/course-electrical-circuits.jpg';
import fluidMechanicsImg from '@/assets/course-fluid-mechanics.jpg';
import controlSystemsImg from '@/assets/course-control-systems.jpg';
import materialsScienceImg from '@/assets/course-materials-science.jpg';

// Static course data with realistic engineering courses
const coursesData = [
  {
    id: 1,
    lessonNumber: "Curso 1",
    title: "Introdução à Análise Estrutural",
    instructor: "Prof. Ricardo Costa",
    duration: "55 min",
    progress: 90,
    thumbnail: structuralAnalysisImg,
    topic: "Engenharia Civil",
    type: "online"
  },
  {
    id: 2,
    lessonNumber: "Curso 2", 
    title: "Princípios de Termodinâmica",
    instructor: "Prof. Beatriz Lima",
    duration: "45 min",
    progress: 80,
    thumbnail: thermodynamicsImg,
    topic: "Engenharia Mecânica",
    type: "online"
  },
  {
    id: 3,
    lessonNumber: "Curso 3",
    title: "Circuitos Elétricos I: Análise DC",
    instructor: "Prof. Ana Santos",
    duration: "60 min", 
    progress: 65,
    thumbnail: electricalCircuitsImg,
    topic: "Engenharia Elétrica",
    type: "presencial"
  },
  {
    id: 4,
    lessonNumber: "Curso 4",
    title: "Mecânica dos Fluidos Aplicada",
    instructor: "Prof. Fernando Dias",
    duration: "75 min",
    progress: 45,
    thumbnail: fluidMechanicsImg,
    topic: "Engenharia Mecânica",
    type: "online"
  },
  {
    id: 5,
    lessonNumber: "Curso 5",
    title: "Sistemas de Controle e Automação", 
    instructor: "Prof. Júlia Fernandes",
    duration: "50 min",
    progress: 70,
    thumbnail: controlSystemsImg,
    topic: "Engenharia de Controle",
    type: "presencial"
  },
  {
    id: 6,
    lessonNumber: "Curso 6",
    title: "Ciência dos Materiais: Metais e Ligas",
    instructor: "Prof. Carlos Mendoza",
    duration: "65 min",
    progress: 55,
    thumbnail: materialsScienceImg, 
    topic: "Engenharia de Materiais",
    type: "online"
  }
];

const MyCoursesPage = () => {
  const [activeFilter, setActiveFilter] = useState<'online' | 'presencial'>('online');
  const [searchQuery, setSearchQuery] = useState('');
  const [topicFilter, setTopicFilter] = useState('all-topics');
  const [instructorFilter, setInstructorFilter] = useState('all-instructors');
  const [sortBy, setSortBy] = useState('progress');

  // Extract unique topics and instructors for filter dropdowns
  const uniqueTopics = Array.from(new Set(coursesData.map(course => course.topic)));
  const uniqueInstructors = Array.from(new Set(coursesData.map(course => course.instructor)));

  // Filter courses based on active filters
  const filteredCourses = coursesData.filter(course => {
    const matchesType = course.type === activeFilter;
    const matchesSearch = 
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.instructor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.topic.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTopic = topicFilter === 'all-topics' || course.topic === topicFilter;
    const matchesInstructor = instructorFilter === 'all-instructors' || course.instructor === instructorFilter;

    return matchesType && matchesSearch && matchesTopic && matchesInstructor;
  });

  // Sort courses
  const sortedCourses = [...filteredCourses].sort((a, b) => {
    switch (sortBy) {
      case 'progress':
        return b.progress - a.progress;
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
            <h1 className="text-3xl font-bold mb-2">Catálogo de Cursos</h1>
            <p className="text-foreground-muted mb-6">
              Explore todos os cursos disponíveis e acompanhe seu progresso.
            </p>

            {/* Segmented Filter Buttons */}
            <div className="flex bg-background-secondary rounded-lg p-1 w-fit">
              <Button
                variant={activeFilter === 'online' ? 'default' : 'ghost'}
                onClick={() => setActiveFilter('online')}
                className={`px-6 py-2 rounded-md transition-all ${
                  activeFilter === 'online' 
                    ? 'bg-primary text-primary-foreground shadow-sm' 
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                Cursos Online
              </Button>
              <Button
                variant={activeFilter === 'presencial' ? 'default' : 'ghost'}
                onClick={() => setActiveFilter('presencial')}
                className={`px-6 py-2 rounded-md transition-all ${
                  activeFilter === 'presencial' 
                    ? 'bg-primary text-primary-foreground shadow-sm' 
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                Workshops Presenciais
              </Button>
            </div>
          </div>

          {/* Search and Filter Card */}
          <Card className="mb-8 shadow-sm border-0">
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
                      <SelectValue placeholder="Progresso" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-lg z-50">
                      <SelectItem value="progress">Progresso</SelectItem>
                      <SelectItem value="title">Título</SelectItem>
                      <SelectItem value="instructor">Professor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Course Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedCourses.map((course) => (
              <CourseCard 
                key={course.id} 
                course={course} 
                type={activeFilter === 'online' ? 'lesson' : 'lecture'}
              />
            ))}
          </div>

          {/* Empty State */}
          {sortedCourses.length === 0 && (
            <Card className="p-12 text-center border-0 shadow-sm">
              <div className="text-foreground-muted">
                <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Nenhum curso encontrado</h3>
                <p>Tente ajustar os filtros ou termo de busca.</p>
              </div>
            </Card>
          )}
        </div>
    </MainLayout>
  );
};

export default MyCoursesPage;