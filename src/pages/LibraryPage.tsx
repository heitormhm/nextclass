import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import LibraryCard from '@/components/LibraryCard';
import MainLayout from '@/components/MainLayout';

const mockLibraryMaterials: LibraryMaterial[] = [
  { id: 'lib-01', title: 'Eletrocardiograma: Guia Prático', description: 'Um guia completo para interpretação de ECG.', type: 'PDF', category: 'Cardiologia', teacher: 'Dra. Emily Carter' },
  { id: 'lib-02', title: 'Ausculta Cardíaca (Sons)', description: 'Áudios de bulhas cardíacas normais e patológicas.', type: 'Áudio', category: 'Cardiologia', teacher: 'Dra. Emily Carter' },
  { id: 'lib-03', title: 'Cirurgia de Revascularização', description: 'Vídeo demonstrativo do procedimento cirúrgico.', type: 'Vídeo', category: 'Cirurgia', teacher: 'Dr. David Lee' },
  { id: 'lib-04', title: 'Anatomia do Cérebro', description: 'Infográfico detalhado das estruturas cerebrais.', type: 'Imagem', category: 'Neurologia', teacher: 'Dra. Sarah Chen' },
  { id: 'lib-05', title: 'Fisiologia Cardíaca Avançada', description: 'Material complementar sobre função cardíaca.', type: 'PDF', category: 'Cardiologia', teacher: 'Dr. Michael Johnson' },
  { id: 'lib-06', title: 'Exame Neurológico Básico', description: 'Vídeo tutorial sobre avaliação neurológica.', type: 'Vídeo', category: 'Neurologia', teacher: 'Dra. Sarah Chen' },
  { id: 'lib-07', title: 'Sons Pulmonares Anormais', description: 'Coleção de áudios para treinamento auditivo.', type: 'Áudio', category: 'Pneumologia', teacher: 'Dr. Robert Wilson' },
  { id: 'lib-08', title: 'Atlas de Histologia', description: 'Imagens microscópicas de tecidos humanos.', type: 'Imagem', category: 'Histologia', teacher: 'Dra. Lisa Anderson' },
];

interface LibraryMaterial {
  id: string;
  title: string;
  description: string;
  type: 'PDF' | 'Vídeo' | 'Áudio' | 'Imagem';
  category: string;
  teacher: string;
}

const LibraryPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTeacher, setSelectedTeacher] = useState('all');

  // Get unique categories and teachers from data
  const categories = [...new Set(mockLibraryMaterials.map(item => item.category))];
  const teachers = [...new Set(mockLibraryMaterials.map(item => item.teacher))];

  // Filter materials based on search and filters
  const filteredMaterials = mockLibraryMaterials.filter(material => {
    const matchesSearch = material.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         material.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || material.category === selectedCategory;
    const matchesTeacher = selectedTeacher === 'all' || material.teacher === selectedTeacher;
    
    return matchesSearch && matchesCategory && matchesTeacher;
  });

  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8">
        {/* Header Section - Mobile optimized typography */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-2">Biblioteca de Recursos</h1>
          <p className="text-sm sm:text-base lg:text-lg text-foreground-muted">
            Acesse materiais educacionais, PDFs, vídeos e áudios dos seus professores
          </p>
        </div>

          {/* Search and Filter Controls */}
          <div className="mb-8 space-y-4 sm:space-y-0 sm:flex sm:gap-4 sm:items-center">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground-muted w-4 h-4" />
              <Input
                type="text"
                placeholder="Buscar materiais..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-card border-border focus:border-primary focus:ring-primary"
              />
            </div>

            {/* Category Filter */}
            <div className="min-w-[200px]">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="bg-card border-border">
                  <SelectValue placeholder="Filtrar por Categoria" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="all">Todas as Categorias</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Teacher Filter */}
            <div className="min-w-[200px]">
              <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                <SelectTrigger className="bg-card border-border">
                  <SelectValue placeholder="Filtrar por Professor" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="all">Todos os Professores</SelectItem>
                  {teachers.map(teacher => (
                    <SelectItem key={teacher} value={teacher}>{teacher}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Results Count */}
          <div className="mb-6">
            <p className="text-sm text-foreground-muted">
              {filteredMaterials.length} {filteredMaterials.length === 1 ? 'material encontrado' : 'materiais encontrados'}
            </p>
          </div>

          {/* Library Grid */}
          {filteredMaterials.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredMaterials.map((material) => (
                <LibraryCard key={material.id} material={material} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="text-6xl mb-4 text-foreground-muted">📚</div>
              <h3 className="text-xl font-medium text-foreground mb-2">Nenhum material encontrado</h3>
              <p className="text-foreground-muted">
                Tente ajustar os filtros ou buscar por outros termos
              </p>
            </div>
          )}
        </div>
    </MainLayout>
  );
};

export default LibraryPage;