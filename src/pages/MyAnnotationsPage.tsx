import { useState } from "react";
import { Search, Filter } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import AnnotationCard from "@/components/AnnotationCard";

interface Annotation {
  id: string;
  title: string;
  course: string;
  lectureId: string;
  lectureTitle: string;
  timestamp: string;
  tags: string[];
  createdAt: string;
  preview: string;
}

const mockAnnotations: Annotation[] = [
  { 
    id: '101', 
    title: 'Anotações sobre Análise de Circuitos', 
    course: 'Engenharia Elétrica',
    lectureId: '1',
    lectureTitle: 'Análise de Circuitos',
    timestamp: '12:45',
    tags: ['Circuitos', 'Lei de Ohm', 'Kirchhoff'],
    createdAt: '2024-03-14',
    preview: 'Cálculos da Lei de Ohm e aplicação das Leis de Kirchhoff em circuitos mistos. A análise começa pela identificação dos nós principais...'
  },
  { 
    id: '102', 
    title: 'Resumo do Estudo de Falha Estrutural', 
    course: 'Engenharia Civil',
    lectureId: '1',
    lectureTitle: 'Análise Estrutural',
    timestamp: '08:32',
    tags: ['Estruturas', 'Fadiga', 'Materiais'],
    createdAt: '2024-03-13',
    preview: 'Análise da fadiga de material em viga de aço sob carga cíclica. Fatores contribuintes incluem amplitude de tensão e número de ciclos...'
  },
  { 
    id: '103', 
    title: 'Dúvidas sobre Termodinâmica', 
    course: 'Engenharia Mecânica',
    lectureId: '1',
    lectureTitle: 'Termodinâmica Aplicada',
    timestamp: '15:20',
    tags: ['Termodinâmica', 'Ciclos', 'Eficiência'],
    createdAt: '2024-03-12',
    preview: 'Diferença entre ciclo de Rankine e ciclo de Carnot. Eficiência teórica versus eficiência real, considerando perdas por atrito e transferência de calor...'
  },
  { 
    id: '104', 
    title: 'Notas de Laboratório de Materiais', 
    course: 'Ciência dos Materiais',
    lectureId: '1',
    lectureTitle: 'Propriedades Mecânicas',
    timestamp: '22:10',
    tags: ['Laboratório', 'Ensaios', 'Alumínio'],
    createdAt: '2024-03-11',
    preview: 'Resultados do ensaio de tração para o corpo de prova de alumínio. Módulo de Young calculado: 70 GPa. Limite de escoamento: 250 MPa...'
  },
  { 
    id: '105', 
    title: 'Interpretação de Diagramas de Fase', 
    course: 'Ciência dos Materiais',
    lectureId: '1',
    lectureTitle: 'Transformações de Fase',
    timestamp: '18:45',
    tags: ['Diagramas', 'Fases', 'Microestrutura'],
    createdAt: '2024-03-10',
    preview: 'Análise do diagrama de fases Ferro-Carbono. Ponto eutetoide (0.76% C, 723°C) e suas implicações na formação de perlita...'
  },
  { 
    id: '106', 
    title: 'Conceitos de Controle Automático', 
    course: 'Engenharia Mecânica',
    lectureId: '1',
    lectureTitle: 'Sistemas de Controle',
    timestamp: '10:15',
    tags: ['Controle', 'PID', 'Automação'],
    createdAt: '2024-03-09',
    preview: 'Fundamentos do controlador PID. Ajuste de ganhos proporcional, integral e derivativo para otimização de resposta do sistema...'
  },
];

const MyAnnotationsPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [annotations] = useState<Annotation[]>(mockAnnotations);

  // Extract unique courses and tags
  const allCourses = Array.from(new Set(annotations.map(a => a.course)));
  const allTags = Array.from(new Set(annotations.flatMap(a => a.tags)));

  const filteredAnnotations = annotations.filter(annotation => {
    const matchesSearch = annotation.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         annotation.preview.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCourse = selectedCourses.length === 0 || selectedCourses.includes(annotation.course);
    const matchesTags = selectedTags.length === 0 || selectedTags.some(tag => annotation.tags.includes(tag));
    return matchesSearch && matchesCourse && matchesTags;
  });

  const handleCourseToggle = (course: string) => {
    setSelectedCourses(prev => 
      prev.includes(course) ? prev.filter(c => c !== course) : [...prev, course]
    );
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSelectedCourses([]);
    setSelectedTags([]);
    setSearchQuery('');
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Minhas Anotações
          </h1>
          <p className="text-muted-foreground">
            Todas as suas anotações em um só lugar. Organize e acesse facilmente seu material de estudo.
          </p>
        </div>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar - Filters */}
          <div className="lg:col-span-1 space-y-6">
            {/* Search */}
            <Card className="bg-white/60 backdrop-blur-xl border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Buscar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  placeholder="Pesquisar anotações..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </CardContent>
            </Card>

            {/* Course Filter */}
            <Card className="bg-white/60 backdrop-blur-xl border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Por Curso
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {allCourses.map(course => (
                  <div key={course} className="flex items-center space-x-2">
                    <Checkbox
                      id={`course-${course}`}
                      checked={selectedCourses.includes(course)}
                      onCheckedChange={() => handleCourseToggle(course)}
                    />
                    <Label
                      htmlFor={`course-${course}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {course}
                    </Label>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Tag Filter */}
            <Card className="bg-white/60 backdrop-blur-xl border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Por Tag</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {allTags.map(tag => (
                  <div key={tag} className="flex items-center space-x-2">
                    <Checkbox
                      id={`tag-${tag}`}
                      checked={selectedTags.includes(tag)}
                      onCheckedChange={() => handleTagToggle(tag)}
                    />
                    <Label
                      htmlFor={`tag-${tag}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {tag}
                    </Label>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Clear Filters Button */}
            {(selectedCourses.length > 0 || selectedTags.length > 0 || searchQuery) && (
              <Button 
                variant="outline" 
                onClick={clearFilters}
                className="w-full"
              >
                Limpar Filtros
              </Button>
            )}
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            {/* Results Count */}
            <div className="mb-6">
              <p className="text-sm text-muted-foreground">
                {filteredAnnotations.length} anotaç{filteredAnnotations.length === 1 ? 'ão' : 'ões'} encontrada{filteredAnnotations.length === 1 ? '' : 's'}
              </p>
            </div>

            {/* Annotations Grid */}
            {filteredAnnotations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredAnnotations.map((annotation) => (
                  <AnnotationCard
                    key={annotation.id}
                    id={annotation.id}
                    title={annotation.title}
                    course={annotation.course}
                    lectureId={annotation.lectureId}
                    lectureTitle={annotation.lectureTitle}
                    timestamp={annotation.timestamp}
                    tags={annotation.tags}
                    createdAt={annotation.createdAt}
                    preview={annotation.preview}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-muted-foreground mb-4">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Nenhuma anotação encontrada</p>
                  <p className="text-sm">Tente ajustar os filtros de pesquisa</p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={clearFilters}
                  className="mt-4"
                >
                  Limpar filtros
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default MyAnnotationsPage;