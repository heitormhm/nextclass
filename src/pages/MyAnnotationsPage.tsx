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
  source: 'Lecture' | 'Lesson' | 'Internship';
  createdAt?: string;
  preview?: string;
}

const mockAnnotations: Annotation[] = [
  { 
    id: '101', 
    title: 'Notas da Aula de Cardiologia', 
    source: 'Lecture', 
    createdAt: '2024-03-15',
    preview: 'Conceitos fundamentais sobre anatomia e fisiologia cardíaca. Principais patologias cardiovasculares...'
  },
  { 
    id: '102', 
    title: 'Resumo do Caso de Dor Torácica', 
    source: 'Internship', 
    createdAt: '2024-03-14',
    preview: 'Paciente masculino, 45 anos, com dor precordial há 2 horas. Investigação diagnóstica realizada...'
  },
  { 
    id: '103', 
    title: 'Dúvidas sobre Fisiologia Renal', 
    source: 'Lesson', 
    createdAt: '2024-03-13',
    preview: 'Mecanismo de filtração glomerular e regulação da pressão arterial. Questões sobre homeostase...'
  },
  { 
    id: '104', 
    title: 'Protocolo de Emergência Cardíaca', 
    source: 'Lecture', 
    createdAt: '2024-03-12',
    preview: 'Sequência de atendimento em parada cardiorrespiratória. Medicações e dosagens de emergência...'
  },
  { 
    id: '105', 
    title: 'Caso Clínico - Hipertensão', 
    source: 'Internship', 
    createdAt: '2024-03-11',
    preview: 'Abordagem terapêutica da hipertensão arterial sistêmica. Critérios diagnósticos e classificação...'
  },
  { 
    id: '106', 
    title: 'Farmacologia Cardiovascular', 
    source: 'Lesson', 
    createdAt: '2024-03-10',
    preview: 'Principais classes de medicamentos cardiovasculares. Mecanismo de ação dos beta-bloqueadores...'
  },
  { 
    id: '107', 
    title: 'Exame Físico do Coração', 
    source: 'Lecture', 
    createdAt: '2024-03-09',
    preview: 'Técnicas de ausculta cardíaca e identificação de sopros. Propedêutica cardiovascular básica...'
  },
  { 
    id: '108', 
    title: 'Interpretação de ECG', 
    source: 'Lesson', 
    createdAt: '2024-03-08',
    preview: 'Análise sistematizada do eletrocardiograma. Reconhecimento de arritmias e alterações isquêmicas...'
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
      case 'Lecture':
        return 'Aula Presencial';
      case 'Lesson':
        return 'Aula Online';
      case 'Internship':
        return 'Cenário Clínico';
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
              <SelectItem value="Lecture">Aulas Presenciais</SelectItem>
              <SelectItem value="Lesson">Aulas Online</SelectItem>
              <SelectItem value="Internship">Cenários Clínicos</SelectItem>
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