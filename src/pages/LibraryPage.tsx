import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import LibraryCard from '@/components/LibraryCard';
import MainLayout from '@/components/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { StudentBackgroundGrid } from '@/components/ui/student-background-grid';

interface LibraryMaterial {
  id: string;
  title: string;
  file_type: string;
  file_url: string;
  turma_id: string;
  teacher_id: string;
  created_at: string;
  description?: string;
  tags?: string[];
  turmas?: {
    nome_turma: string;
    periodo: string;
    curso: string;
  };
  disciplinas?: {
    nome: string;
    codigo?: string;
  };
}

const LibraryPage = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [materials, setMaterials] = useState<LibraryMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  useEffect(() => {
    const fetchMaterials = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        // 1. Buscar turmas do aluno
        const { data: enrollments, error: enrollError } = await supabase
          .from('turma_enrollments')
          .select('turma_id')
          .eq('aluno_id', user.id);
        
        if (enrollError) throw enrollError;
        
        if (!enrollments || enrollments.length === 0) {
          setMaterials([]);
          setIsLoading(false);
          return;
        }
        
        const turmaIds = enrollments.map(e => e.turma_id);
        
        // 2. Buscar materiais das turmas (usando turma_id após migration)
        const { data: libraryData, error: libraryError } = await supabase
          .from('library_materials')
          .select(`
            id,
            title,
            file_type,
            file_url,
            turma_id,
            disciplina_id,
            teacher_id,
            created_at,
            description,
            tags,
            turmas(nome_turma, periodo, curso),
            disciplinas(nome, codigo)
          `)
          .in('turma_id', turmaIds)
          .order('created_at', { ascending: false });
        
        if (libraryError) throw libraryError;
        
        setMaterials(libraryData || []);
        
      } catch (error) {
        console.error('Error fetching materials:', error);
        toast.error('Erro ao carregar materiais');
        setMaterials([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMaterials();
  }, [user]);

  // Filter materials based on search
  const filteredMaterials = materials.filter(material => {
    const matchesSearch = material.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSubject = selectedSubjects.length === 0 || 
                          selectedSubjects.includes(material.disciplinas?.nome || '');
    
    const matchesType = selectedTypes.length === 0 || 
                       selectedTypes.includes(material.file_type);
    
    return matchesSearch && matchesSubject && matchesType;
  });

  return (
    <MainLayout>
      <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-pink-50/30 to-purple-50/30">
        <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-br from-pink-100/40 to-purple-100/40 rounded-full filter blur-3xl opacity-40" />
        <div className="absolute bottom-40 right-20 w-80 h-80 bg-gradient-to-br from-purple-100/40 to-teal-100/40 rounded-full filter blur-3xl opacity-40" />
        <StudentBackgroundGrid />
        
        <div className="relative z-10 container mx-auto px-4 py-8">
      <div className="container mx-auto px-6 py-8">
        {/* Header Section - ALINHADO */}
        <div className="mb-8 max-w-xl">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-2">
            Biblioteca de Recursos
          </h1>
          <p className="text-sm sm:text-base lg:text-lg text-foreground-muted">
            Acesse manuais técnicos, projetos, vídeos e diagramas dos seus professores
          </p>
        </div>

        {/* Search Bar - MESMO ALINHAMENTO */}
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

        {/* Filters Panel - APENAS QUANDO HOUVER MATERIAIS */}
        {materials.length > 0 && (
          <div className="mb-6 max-w-4xl">
            <Card className="p-4 bg-white/60 backdrop-blur-xl border-0 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Filtro por Matéria */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Disciplina</Label>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(new Set(materials.map(m => m.disciplinas?.nome).filter(Boolean))).map(subject => (
                      <Badge
                        key={subject}
                        variant={selectedSubjects.includes(subject!) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => {
                          setSelectedSubjects(prev => 
                            prev.includes(subject!) 
                              ? prev.filter(s => s !== subject) 
                              : [...prev, subject!]
                          );
                        }}
                      >
                        {subject}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Filtro por Tipo */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Tipo de Conteúdo</Label>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(new Set(materials.map(m => m.file_type))).map(type => (
                      <Badge
                        key={type}
                        variant={selectedTypes.includes(type) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => {
                          setSelectedTypes(prev => 
                            prev.includes(type) 
                              ? prev.filter(t => t !== type) 
                              : [...prev, type]
                          );
                        }}
                      >
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Botão Limpar */}
                <div className="flex items-end">
                  {(selectedSubjects.length > 0 || selectedTypes.length > 0) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedSubjects([]);
                        setSelectedTypes([]);
                      }}
                      className="w-full"
                    >
                      Limpar filtros
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}

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
                    description: material.disciplinas?.nome || material.turmas?.nome_turma || 'Material da turma',
                    type: material.file_type as any,
                    category: material.disciplinas?.nome || '',
                    teacher: material.turmas?.curso || '',
                    file_url: material.file_url,
                    tags: material.tags as string[] || [],
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
      </div>
    </MainLayout>
  );
};

export default LibraryPage;