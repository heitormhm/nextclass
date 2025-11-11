import { useState, useEffect } from "react";
import { Search, Filter, Plus, Trash2, StickyNote } from "lucide-react";
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
import { TeacherBackgroundRipple } from '@/components/ui/teacher-background-ripple';
import { PublishMaterialModal } from "@/components/PublishMaterialModal";
import { QuickActionsCard } from "@/components/QuickActionsCard";
import { formatContentPreview } from "@/utils/contentPreviewFormatter";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

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

const TeacherAnnotationsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'title'>('recent');
  const [showFilters, setShowFilters] = useState(false);
  const [filterBySource, setFilterBySource] = useState<'all' | 'lecture' | 'lesson_plan' | 'personal'>('all');
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  

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
      
      // Filter by source type for teachers
      const matchesSource = filterBySource === 'all' ? true :
                           filterBySource === 'lecture' ? annotation.source_type === 'lecture' :
                           filterBySource === 'lesson_plan' ? annotation.source_type === 'lesson_plan' :
                           filterBySource === 'personal' ? !annotation.source_type || annotation.source_type === 'personal' : true;
      
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

  const handlePublishMaterial = () => {
    setSelectedAnnotation(null);
    setShowPublishModal(true);
  };

  const handleQuickActionNavigate = (actionType: string) => {
    navigate('/teacher/ai-chat', {
      state: {
        actionType: actionType,
        autoActivate: true
      }
    });
  };

  return (
    <MainLayout>
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-900 via-purple-600 to-pink-500 animate-gradient-xy bg-[length:200%_200%]">
        {/* Animated Background with Ripple Effect */}
        <TeacherBackgroundRipple />
        
        {/* Gradient Blobs for Depth */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-48 w-96 h-96 bg-gradient-to-br from-pink-500/30 to-purple-500/30 rounded-full blur-3xl animate-float" />
          <div className="absolute top-2/3 -right-32 w-80 h-80 bg-gradient-to-br from-blue-400/25 to-purple-400/25 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-gradient-to-br from-purple-500/20 to-pink-400/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        </div>

        {/* Main Content */}
        <div className="relative z-10 container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto">
            {/* Compact Header with Controls */}
            <div className="mb-6">
              {/* Title */}
              <div className="mb-4">
                <h1 className="text-3xl md:text-4xl font-bold text-white uppercase mb-2 drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
                  Minhas Anotações
                </h1>
                <p className="text-white/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.2)]">
                  {annotations.length} {annotations.length === 1 ? 'anotação' : 'anotações'}
                </p>
              </div>
              
              {/* Filter tabs - horizontal scroll on mobile COM FROSTED GLASS */}
              <div className="mb-4 overflow-x-auto pb-2">
                <div className={cn(
                  "inline-flex items-center gap-2 p-1.5 rounded-xl backdrop-blur-xl bg-white/20 border border-white/30 shadow-lg",
                  isMobile && "min-w-max"
                )}>
                  <Button
                    size="sm"
                    variant={filterBySource === 'all' ? 'default' : 'ghost'}
                    onClick={() => setFilterBySource('all')}
                    className={cn(
                      "whitespace-nowrap rounded-lg transition-all",
                      isMobile ? "h-10 min-h-[40px] px-4" : "h-8 px-3",
                      filterBySource === 'all' 
                        ? "bg-white text-purple-700 shadow-md font-semibold" 
                        : "text-white hover:bg-white/20"
                    )}
                  >
                    Todas
                  </Button>
                  <Button
                    size="sm"
                    variant={filterBySource === 'lecture' ? 'default' : 'ghost'}
                    onClick={() => setFilterBySource('lecture')}
                    className={cn(
                      "whitespace-nowrap rounded-lg transition-all",
                      isMobile ? "h-10 min-h-[40px] px-4" : "h-8 px-3",
                      filterBySource === 'lecture' 
                        ? "bg-white text-purple-700 shadow-md font-semibold" 
                        : "text-white hover:bg-white/20"
                    )}
                  >
                    Aulas
                  </Button>
                  <Button
                    size="sm"
                    variant={filterBySource === 'lesson_plan' ? 'default' : 'ghost'}
                    onClick={() => setFilterBySource('lesson_plan')}
                    className={cn(
                      "whitespace-nowrap rounded-lg transition-all",
                      isMobile ? "h-10 min-h-[40px] px-4" : "h-8 px-3",
                      filterBySource === 'lesson_plan' 
                        ? "bg-white text-purple-700 shadow-md font-semibold" 
                        : "text-white hover:bg-white/20"
                    )}
                  >
                    Planos
                  </Button>
                  <Button
                    size="sm"
                    variant={filterBySource === 'personal' ? 'default' : 'ghost'}
                    onClick={() => setFilterBySource('personal')}
                    className={cn(
                      "whitespace-nowrap rounded-lg transition-all",
                      isMobile ? "h-10 min-h-[40px] px-4" : "h-8 px-3",
                      filterBySource === 'personal' 
                        ? "bg-white text-purple-700 shadow-md font-semibold" 
                        : "text-white hover:bg-white/20"
                    )}
                  >
                    Pessoais
                  </Button>
                </div>
              </div>
              
              {/* Controls (Sort + Search) - stack vertical on mobile */}
              <div className="flex flex-col md:flex-row gap-3 md:items-center">
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
                  <SelectTrigger className={cn(
                    "md:w-40",
                    isMobile ? "h-11 min-h-[44px]" : "h-9"
                  )}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Mais recentes</SelectItem>
                    <SelectItem value="oldest">Mais antigas</SelectItem>
                    <SelectItem value="title">Por título</SelectItem>
                  </SelectContent>
                </Select>
                
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Pesquisar anotações..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={cn(
                      "pl-9",
                      isMobile ? "h-11 min-h-[44px]" : "h-9"
                    )}
                  />
                </div>
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
                <Card className="mt-3 p-4 animate-in slide-in-from-top-2 duration-200 bg-white/75 bg-blend-overlay backdrop-blur-xl border-blue-100/30 shadow-[0_8px_30px_rgb(59,130,246,0.08)]">
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

          {/* Quick Actions Card - Centralizado */}
          <QuickActionsCard
            onPublish={handlePublishMaterial}
            onNavigateToAIChat={handleQuickActionNavigate}
          />

        {/* Annotations Grid */}
        <div className="flex-1">
        {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Card key={i} className="p-4 bg-white/75 bg-blend-overlay backdrop-blur-xl border-blue-100/30">
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 px-2 md:px-0
              [&::-webkit-scrollbar]:w-2 
              [&::-webkit-scrollbar-track]:bg-transparent 
              [&::-webkit-scrollbar-thumb]:bg-purple-200/50 
              [&::-webkit-scrollbar-thumb]:rounded-full 
              [&::-webkit-scrollbar-thumb]:hover:bg-purple-300/70">
              {filteredAnnotations.map((annotation) => (
                <Card 
                  key={annotation.id} 
                  className="group p-3 hover:shadow-2xl hover:shadow-purple-500/20 hover:border-purple-300/50 transition-all duration-200 cursor-pointer relative overflow-hidden bg-white/75 bg-blend-overlay backdrop-blur-xl border-blue-100/30 max-w-full"
                  onClick={() => navigate(`/teacher/annotation/${annotation.id}`)}
                >
                  {/* Linha decorativa azul/roxa */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500" />
                  
              {/* Badge de tipo de anotação */}
              {annotation.source_type === 'lecture' && (
                <Badge variant="outline" className="absolute top-3 left-3 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                  🎓 Aula
                </Badge>
              )}
              {annotation.source_type === 'lesson_plan' && (
                <Badge variant="outline" className="absolute top-3 left-3 bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800">
                  📚 Plano
                </Badge>
              )}
              
              {/* Relative Date Badge */}
              <div className="absolute top-4 right-3 text-xs text-muted-foreground">
                {formatRelativeDate(annotation.updated_at)}
              </div>
              
              {/* Title - adicionar mais padding-top quando há badge */}
              <h3 className={`text-base font-semibold text-foreground mb-2 pr-16 line-clamp-2 ${
                annotation.source_type ? 'pt-10' : 'pt-2'
              }`}>
                {annotation.title}
              </h3>
                  
                  {/* Preview */}
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-5 leading-snug">
                    {formatContentPreview(annotation.content)}
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
              <div className="bg-white/75 bg-blend-overlay backdrop-blur-xl border-blue-100/30 shadow-[0_8px_30px_rgb(59,130,246,0.08)] rounded-xl p-8 max-w-md mx-auto">
                <div className="text-white mb-4">
                  <StickyNote className="h-12 w-12 mx-auto mb-4 opacity-90" />
                  <p className="text-lg font-semibold">Nenhuma anotação encontrada</p>
                  <p className="text-sm text-white/80">
                    {annotations.length === 0 
                      ? 'Crie sua primeira anotação clicando no botão abaixo' 
                      : 'Tente ajustar o termo de pesquisa ou os filtros'}
                  </p>
                </div>
            </div>
          </div>
        )}
        </div>

        {/* Floating Action Button - Teacher Theme */}
        <Button
          onClick={() => navigate('/teacher/annotation/new')}
          className="fixed bottom-8 right-8 px-6 py-6 rounded-2xl shadow-2xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 z-50 flex items-center gap-3"
        >
          <div className="bg-white/20 rounded-full p-2">
            <Plus className="h-6 w-6 text-white" />
          </div>
          <span className="text-white font-semibold text-base">
            Criar Nova Anotação
          </span>
        </Button>

        {/* Publish Material Modal */}
        {showPublishModal && (
          <PublishMaterialModal
            isOpen={showPublishModal}
            onClose={() => {
              setShowPublishModal(false);
              setSelectedAnnotation(null);
            }}
            annotation={selectedAnnotation}
            onPublishSuccess={() => {
              toast.success('Material publicado com sucesso!');
              setShowPublishModal(false);
              setSelectedAnnotation(null);
            }}
          />
        )}
      </div>
    </MainLayout>
  );
};

export default TeacherAnnotationsPage;
