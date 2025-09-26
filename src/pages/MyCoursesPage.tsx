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

// Import medical lecture images
import myocardialInfarctionImg from '@/assets/lecture-myocardial-infarction.jpg';
import bloodGasAnalysisImg from '@/assets/lecture-blood-gas-analysis.jpg';
import pulmonaryAuscultationImg from '@/assets/lecture-pulmonary-auscultation.jpg';
import traumaManagementImg from '@/assets/lecture-trauma-management.jpg';
import antibioticTherapyImg from '@/assets/lecture-antibiotic-therapy.jpg';
import abdominalDiagnosisImg from '@/assets/lecture-abdominal-diagnosis.jpg';

// Static course data with realistic medical lectures
const coursesData = [
  {
    id: 1,
    lessonNumber: "Aula 1",
    title: "Fisiopatologia do Infarto Agudo do Miocárdio",
    instructor: "Dr. Carlos Mendoza",
    duration: "55 min",
    progress: 80,
    thumbnail: myocardialInfarctionImg,
    topic: "Cardiologia",
    type: "online"
  },
  {
    id: 2,
    lessonNumber: "Aula 2", 
    title: "Interpretação de Gasometria Arterial",
    instructor: "Dra. Ana Paula Santos",
    duration: "45 min",
    progress: 65,
    thumbnail: bloodGasAnalysisImg,
    topic: "Pneumologia",
    type: "online"
  },
  {
    id: 3,
    lessonNumber: "Aula 3",
    title: "Fundamentos da Ausculta Pulmonar",
    instructor: "Dr. Ricardo Oliveira",
    duration: "60 min", 
    progress: 30,
    thumbnail: pulmonaryAuscultationImg,
    topic: "Pneumologia",
    type: "presencial"
  },
  {
    id: 4,
    lessonNumber: "Aula 4",
    title: "Manejo Inicial do Paciente Politraumatizado (ATLS)",
    instructor: "Dra. Fernanda Costa",
    duration: "75 min",
    progress: 90,
    thumbnail: traumaManagementImg,
    topic: "Emergência",
    type: "online"
  },
  {
    id: 5,
    lessonNumber: "Aula 5",
    title: "Antibioticoterapia na Prática Clínica", 
    instructor: "Dr. Miguel Rodriguez",
    duration: "50 min",
    progress: 15,
    thumbnail: antibioticTherapyImg,
    topic: "Infectologia",
    type: "presencial"
  },
  {
    id: 6,
    lessonNumber: "Aula 6",
    title: "Diagnóstico Diferencial da Dor Abdominal",
    instructor: "Dra. Júlia Fernandes",
    duration: "65 min",
    progress: 45,
    thumbnail: abdominalDiagnosisImg, 
    topic: "Gastroenterologia",
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
            <h1 className="text-3xl font-bold mb-2">Painel de Aulas</h1>
            <p className="text-foreground-muted mb-6">
              Explore todas as aulas disponíveis e acompanhe seu progresso.
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
                Aulas Online
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
                Aulas Presenciais
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
                    placeholder="Pesquisar aulas por título, professor ou palavra-chave..."
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
                <h3 className="text-lg font-semibold mb-2">Nenhuma aula encontrada</h3>
                <p>Tente ajustar os filtros ou termo de busca.</p>
              </div>
            </Card>
          )}
        </div>
    </MainLayout>
  );
};

export default MyCoursesPage;