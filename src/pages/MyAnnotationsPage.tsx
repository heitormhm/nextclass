import { useState } from "react";
import { Search } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AnnotationCard from "@/components/AnnotationCard";

interface Annotation {
  id: string;
  title: string;
  source: 'Workshop' | 'OnlineCourse' | 'CaseStudy';
  createdAt?: string;
  preview?: string;
}

const mockAnnotations: Annotation[] = [
  { 
    id: '101', 
    title: 'Anotações sobre Análise de Circuitos', 
    source: 'Workshop', 
    createdAt: '2024-03-14',
    preview: 'Cálculos da Lei de Ohm e aplicação das Leis de Kirchhoff em circuitos mistos...'
  },
  { 
    id: '102', 
    title: 'Resumo do Estudo de Falha Estrutural', 
    source: 'CaseStudy', 
    createdAt: '2024-03-13',
    preview: 'Análise da fadiga de material em viga de aço sob carga cíclica. Fatores contribuintes...'
  },
  { 
    id: '103', 
    title: 'Dúvidas sobre Termodinâmica', 
    source: 'OnlineCourse', 
    createdAt: '2024-03-12',
    preview: 'Diferença entre ciclo de Rankine e ciclo de Carnot. Eficiência e transferência de calor...'
  },
  { 
    id: '104', 
    title: 'Notas de Laboratório de Materiais', 
    source: 'Workshop', 
    createdAt: '2024-03-11',
    preview: 'Resultados do ensaio de tração para o corpo de prova de alumínio. Módulo de Young e limite de escoamento...'
  },
  { 
    id: '105', 
    title: 'Interpretação de Diagramas de Fase', 
    source: 'OnlineCourse', 
    createdAt: '2024-03-10',
    preview: 'Análise do diagrama de fases Ferro-Carbono. Ponto eutetoide e suas implicações na microestrutura...'
  },
];

const MyAnnotationsPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [annotations, setAnnotations] = useState<Annotation[]>(mockAnnotations);

  const filteredAnnotations = annotations.filter(annotation => {
    const matchesSearch = annotation.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterSource === 'all' || annotation.source === filterSource;
    return matchesSearch && matchesFilter;
  });

  const handleDelete = (id: string) => {
    setAnnotations(prev => prev.filter(annotation => annotation.id !== id));
  };

  const handleShare = (id: string) => {
    // Placeholder for share functionality
    console.log('Sharing annotation:', id);
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'Workshop':
        return 'Workshop Prático';
      case 'OnlineCourse':
        return 'Curso Online';
      case 'CaseStudy':
        return 'Estudo de Caso';
      default:
        return source;
    }
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

        {/* Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Pesquisar anotações..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={filterSource} onValueChange={setFilterSource}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filtrar por origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as origens</SelectItem>
              <SelectItem value="Workshop">Workshops Práticos</SelectItem>
              <SelectItem value="OnlineCourse">Cursos Online</SelectItem>
              <SelectItem value="CaseStudy">Estudos de Caso</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">
            {filteredAnnotations.length} anotaç{filteredAnnotations.length === 1 ? 'ão' : 'ões'} encontrada{filteredAnnotations.length === 1 ? '' : 's'}
          </p>
        </div>

        {/* Annotations Grid */}
        {filteredAnnotations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAnnotations.map((annotation) => (
              <AnnotationCard
                key={annotation.id}
                id={annotation.id}
                title={annotation.title}
                source={getSourceLabel(annotation.source)}
                createdAt={annotation.createdAt}
                preview={annotation.preview}
                onDelete={handleDelete}
                onShare={handleShare}
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
            {searchQuery || filterSource !== 'all' ? (
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchQuery('');
                  setFilterSource('all');
                }}
                className="mt-4"
              >
                Limpar filtros
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default MyAnnotationsPage;