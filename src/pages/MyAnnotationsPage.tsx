import { useState, useEffect } from "react";
import { Search, Filter, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import AnnotationCard from "@/components/AnnotationCard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Annotation {
  id: string;
  title: string;
  content: string;
  source_type?: string;
  source_id?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

const MyAnnotationsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnnotations = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('annotations')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Error fetching annotations:', error);
          toast.error('Erro ao carregar anotações');
        } else {
          setAnnotations(data || []);
        }
      } catch (error) {
        console.error('Unexpected error:', error);
        toast.error('Erro ao carregar anotações');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAnnotations();
  }, [user]);

  const filteredAnnotations = annotations.filter(annotation => {
    const matchesSearch = annotation.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         annotation.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTags = selectedTags.length === 0 || 
                       (annotation.tags && selectedTags.some(tag => annotation.tags?.includes(tag)));
    
    return matchesSearch && matchesTags;
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
        <div className="max-w-7xl mx-auto">
          {/* Page Header e Search Bar - ALINHADOS */}
          <div className="mb-8 max-w-xl">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Minhas Anotações
            </h1>
            <p className="text-muted-foreground mb-6">
              Todas as suas anotações em um só lugar. Organize e acesse facilmente seu material de estudo.
            </p>
            
            {/* Search Bar - MESMO NÍVEL */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input
                placeholder="Pesquisar anotações..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Filters Panel - APENAS QUANDO HOUVER ANOTAÇÕES */}
          {annotations.length > 0 && (
            <div className="mb-6 max-w-xl">
              <Card className="p-4 bg-white/60 backdrop-blur-xl border-0 shadow-sm">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Filtrar por Tags</Label>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(new Set(annotations.flatMap(a => a.tags || []))).map(tag => (
                        <Badge
                          key={tag}
                          variant={selectedTags.includes(tag) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => handleTagToggle(tag)}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {selectedTags.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="text-xs"
                    >
                      Limpar filtros
                    </Button>
                  )}
                </div>
              </Card>
            </div>
          )}

          <div>
            {/* Results Count */}
            <div className="mb-6">
              <p className="text-sm text-muted-foreground">
                {filteredAnnotations.length} anotaç{filteredAnnotations.length === 1 ? 'ão' : 'ões'} encontrada{filteredAnnotations.length === 1 ? '' : 's'}
              </p>
            </div>

            {/* Annotations Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <Card key={i} className="p-6">
                    <Skeleton className="h-6 w-3/4 mb-3" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3 mb-4" />
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : filteredAnnotations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAnnotations.map((annotation) => (
                  <Card 
                    key={annotation.id} 
                    className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => navigate(`/annotation/${annotation.id}`)}
                  >
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {annotation.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                      {annotation.content.replace(/<[^>]*>/g, '').substring(0, 150)}...
                    </p>
                    <div className="text-xs text-muted-foreground">
                      {new Date(annotation.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-muted-foreground mb-4">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Nenhuma anotação encontrada</p>
                  <p className="text-sm">
                    {annotations.length === 0 
                      ? 'Crie sua primeira anotação clicando no botão abaixo' 
                      : 'Tente ajustar o termo de pesquisa'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Floating Action Button - RETANGULAR ARREDONDADO */}
        <Button
          onClick={() => navigate('/annotation/new')}
          className="fixed bottom-8 right-8 px-6 py-6 rounded-2xl shadow-2xl bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 z-50 flex items-center gap-3"
        >
          <div className="bg-white/20 rounded-full p-2">
            <Plus className="h-6 w-6 text-white" />
          </div>
          <span className="text-white font-semibold text-base">
            Criar Nova Anotação
          </span>
        </Button>
      </div>
    </MainLayout>
  );
};

export default MyAnnotationsPage;