import { useState, useEffect } from "react";
import { Search, Filter, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'title'>('recent');
  const [showFilters, setShowFilters] = useState(false);
  const [filterBySource, setFilterBySource] = useState<'all' | 'internship' | 'personal'>('all');

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

  const filteredAnnotations = annotations
    .filter(annotation => {
      const matchesSearch = annotation.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           annotation.content.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesTags = selectedTags.length === 0 || 
                         (annotation.tags && selectedTags.some(tag => annotation.tags?.includes(tag)));
      
      // Filter by source type
      const matchesSource = filterBySource === 'all' ? true :
                           filterBySource === 'internship' ? annotation.source_type === 'internship_report' :
                           filterBySource === 'personal' ? !annotation.source_type || annotation.source_type !== 'internship_report' : true;
      
      return matchesSearch && matchesTags && matchesSource;
    })
    .sort((a, b) => {
      if (sortBy === 'recent') {
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      } else if (sortBy === 'oldest') {
        return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      } else {
        return a.title.localeCompare(b.title);
      }
    });

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSelectedTags([]);
    setSearchQuery('');
  };

  const handleDeleteAnnotation = async (annotationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Tem certeza que deseja deletar esta anotação?')) return;
    
    try {
      const { error } = await supabase
        .from('annotations')
        .delete()
        .eq('id', annotationId)
        .eq('user_id', user?.id);
      
      if (error) throw error;
      
      setAnnotations(prev => prev.filter(a => a.id !== annotationId));
      toast.success('Anotação deletada com sucesso!');
    } catch (error) {
      console.error('Error deleting annotation:', error);
      toast.error('Erro ao deletar anotação');
    }
  };

  const formatRelativeDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `${diffDays}d atrás`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}sem`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const allTags = Array.from(new Set(annotations.flatMap(a => a.tags || [])));

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Compact Header with Controls */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Minhas Anotações</h1>
                <p className="text-sm text-muted-foreground">
                  {annotations.length} {annotations.length === 1 ? 'anotação' : 'anotações'}
                </p>
              </div>
              
              {/* Controls: Sort + Search + Type Filter */}
              <div className="flex items-center gap-3">
                {/* Filtro por tipo de anotação */}
                <div className="flex items-center gap-2 border rounded-lg p-1 bg-muted/50">
                  <Button
                    size="sm"
                    variant={filterBySource === 'all' ? 'default' : 'ghost'}
                    onClick={() => setFilterBySource('all')}
                    className="h-8"
                  >
                    Todas
                  </Button>
                  <Button
                    size="sm"
                    variant={filterBySource === 'internship' ? 'default' : 'ghost'}
                    onClick={() => setFilterBySource('internship')}
                    className="h-8"
                  >
                    Estágios
                  </Button>
                  <Button
                    size="sm"
                    variant={filterBySource === 'personal' ? 'default' : 'ghost'}
                    onClick={() => setFilterBySource('personal')}
                    className="h-8"
                  >
                    Pessoais
                  </Button>
                </div>
                
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
                  <SelectTrigger className="w-40 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Mais recentes</SelectItem>
                    <SelectItem value="oldest">Mais antigas</SelectItem>
                    <SelectItem value="title">Por título</SelectItem>
                  </SelectContent>
                </Select>
                
                <div className="relative w-80">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Pesquisar anotações..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Collapsible Filters */}
          {annotations.length > 0 && allTags.length > 0 && (
            <div className="mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                <Filter className="h-4 w-4" />
                Filtros
                {selectedTags.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedTags.length}
                  </Badge>
                )}
              </Button>
              
              {showFilters && (
                <Card className="mt-3 p-4 animate-in slide-in-from-top-2 duration-200">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Filtrar por Tags</p>
                      {selectedTags.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearFilters}
                          className="text-xs h-7"
                        >
                          Limpar
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {allTags.map(tag => (
                        <Badge
                          key={tag}
                          variant={selectedTags.includes(tag) ? "default" : "outline"}
                          className="cursor-pointer hover:bg-primary/10 transition-colors"
                          onClick={() => handleTagToggle(tag)}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Annotations Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Card key={i} className="p-4">
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredAnnotations.map((annotation) => (
                <Card 
                  key={annotation.id} 
                  className="group p-3 hover:shadow-lg hover:border-primary/30 transition-all duration-200 cursor-pointer relative overflow-hidden"
                  onClick={() => navigate(`/annotation/${annotation.id}`)}
                >
                  {/* Linha decorativa rosa/roxa */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500" />
                  
              {/* Badge de tipo de anotação */}
              {annotation.source_type === 'internship_report' && (
                <Badge variant="outline" className="absolute top-3 left-3 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                  🎓 Estágio
                </Badge>
              )}
              
              {/* Relative Date Badge */}
              <div className="absolute top-4 right-3 text-xs text-muted-foreground">
                {formatRelativeDate(annotation.updated_at)}
              </div>
              
              {/* Title - adicionar mais padding-top quando há badge */}
              <h3 className={`text-base font-semibold text-foreground mb-2 pr-16 line-clamp-2 ${
                annotation.source_type === 'internship_report' ? 'pt-10' : 'pt-2'
              }`}>
                {annotation.title}
              </h3>
                  
                  {/* Preview */}
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-5 leading-snug">
                    {annotation.content.replace(/<[^>]*>/g, '').substring(0, 200)}...
                  </p>
                  
                  {/* Tags */}
                  {annotation.tags && annotation.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {annotation.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {annotation.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{annotation.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  {/* Footer with Actions */}
                  <div className="flex items-center justify-between pt-3 border-t opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs text-muted-foreground">
                      Criada em {new Date(annotation.created_at).toLocaleDateString('pt-BR')}
                    </span>
                    
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={(e) => handleDeleteAnnotation(annotation.id, e)}
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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
                    : 'Tente ajustar o termo de pesquisa ou os filtros'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Floating Action Button */}
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
