import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import LibraryCard from '@/components/LibraryCard';
import MainLayout from '@/components/MainLayout';

const mockLibraryMaterials: LibraryMaterial[] = [
  { id: 'lib-01', title: 'Manual de Fórmulas de Estruturas', description: 'Um guia completo para cálculo de vigas, treliças e pórticos.', type: 'PDF', category: 'Engenharia Civil', teacher: 'Prof. Emily Carter' },
  { id: 'lib-02', title: 'Podcast: Fundamentos de Sinais e Sistemas', description: 'Série de áudios sobre a Transformada de Laplace e suas aplicações.', type: 'Áudio', category: 'Engenharia Elétrica', teacher: 'Prof. David Lee' },
  { id: 'lib-03', title: 'Simulação de Fluidos em CFD', description: 'Vídeo demonstrativo de uma simulação de escoamento em software CFD.', type: 'Vídeo', category: 'Engenharia Mecânica', teacher: 'Prof. Ana Santos' },
  { id: 'lib-04', title: 'Diagrama de Circuitos Lógicos', description: 'Infográfico detalhado com as principais portas lógicas e suas tabelas-verdade.', type: 'Imagem', category: 'Engenharia da Computação', teacher: 'Prof. Sarah Chen' },
  { id: 'lib-05', title: 'Normas Técnicas de Materiais', description: 'Material complementar sobre as propriedades de aços-carbono.', type: 'PDF', category: 'Engenharia de Materiais', teacher: 'Prof. Michael Johnson' },
  { id: 'lib-06', title: 'Tutorial de Programação em Python', description: 'Vídeo tutorial sobre estruturas de dados e algoritmos básicos.', type: 'Vídeo', category: 'Engenharia de Software', teacher: 'Prof. Sarah Chen' },
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
            Acesse manuais técnicos, projetos, vídeos e diagramas dos seus professores
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