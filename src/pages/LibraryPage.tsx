import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import LibraryCard from '@/components/LibraryCard';
import MainLayout from '@/components/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LibraryMaterial {
  id: string;
  title: string;
  file_type: string;
  file_url: string;
  class_id: string;
  teacher_id: string;
  created_at: string;
  classes?: {
    name: string;
  };
}

const LibraryPage = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [materials, setMaterials] = useState<LibraryMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMaterials = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        // 1. Buscar turmas do aluno
        const { data: enrollments } = await supabase
          .from('turma_enrollments')
          .select('turma_id')
          .eq('aluno_id', user.id);
        
        if (!enrollments || enrollments.length === 0) {
          setMaterials([]);
          setIsLoading(false);
          return;
        }
        
        const turmaIds = enrollments.map(e => e.turma_id);
        
        // 2. Buscar classes das turmas (usando o campo correto)
        const { data: classes } = await supabase
          .from('classes')
          .select('id')
          .in('id', turmaIds);
        
        if (!classes || classes.length === 0) {
          setMaterials([]);
          setIsLoading(false);
          return;
        }
        
        const classIds = classes.map(c => c.id);
        
        // 3. Buscar materiais das classes
        const { data: libraryData, error } = await supabase
          .from('library_materials')
          .select('*, classes(name)')
          .in('class_id', classIds)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Error fetching library materials:', error);
          toast.error('Erro ao carregar materiais');
        } else {
          setMaterials(libraryData || []);
        }
      } catch (error) {
        console.error('Unexpected error:', error);
        toast.error('Erro ao carregar materiais');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMaterials();
  }, [user]);

  // Filter materials based on search
  const filteredMaterials = materials.filter(material => {
    const matchesSearch = material.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
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

          {/* Search Bar */}
          <div className="mb-8">
            <div className="relative max-w-xl">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground-muted w-5 h-5" />
              <Input
                type="text"
                placeholder="Buscar materiais..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Results Count */}
          <div className="mb-6">
            <p className="text-sm text-foreground-muted">
              {filteredMaterials.length} {filteredMaterials.length === 1 ? 'material encontrado' : 'materiais encontrados'}
            </p>
          </div>

          {/* Library Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Card key={i} className="p-6">
                  <Skeleton className="h-32 w-full mb-4" />
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </Card>
              ))}
            </div>
          ) : filteredMaterials.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredMaterials.map((material) => (
                <LibraryCard 
                  key={material.id} 
                  material={{
                    id: material.id,
                    title: material.title,
                    description: material.classes?.name || 'Material da turma',
                    type: material.file_type as any,
                    category: material.classes?.name || '',
                    teacher: ''
                  }} 
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="text-6xl mb-4 text-foreground-muted">📚</div>
              <h3 className="text-xl font-medium text-foreground mb-2">Nenhum material encontrado</h3>
              <p className="text-foreground-muted">
                {materials.length === 0 
                  ? 'Seus professores ainda não compartilharam materiais' 
                  : 'Tente ajustar o termo de pesquisa'}
              </p>
            </div>
          )}
        </div>
    </MainLayout>
  );
};

export default LibraryPage;