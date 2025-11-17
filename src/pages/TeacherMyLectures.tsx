import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Plus, Trash2, GraduationCap, Users, FileEdit, Loader2, Search, Clock, Eye } from 'lucide-react';
import MainLayout from '@/components/MainLayout';
import { TeacherBackgroundRipple } from '@/components/ui/teacher-background-ripple';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useIsMobile, useIsTablet } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface Lecture {
  id: string;
  title: string;
  created_at: string;
  status?: string;
  disciplina_id: string;
  turma_id: string;
  tags?: string[];
  duration?: number;
  disciplinas?: { nome: string };
  turmas?: { periodo: string; curso: string };
  view_count?: number;
}

interface Disciplina {
  id: string;
  nome: string;
  turma_id: string;
  turmas?: { periodo: string; curso: string };
}

interface Turma {
  id: string;
  periodo: string;
  curso: string;
  faculdade: string;
}

const TeacherMyLectures = () => {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [drafts, setDrafts] = useState<Lecture[]>([]);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newDisciplineName, setNewDisciplineName] = useState('');
  const [selectedTurmaId, setSelectedTurmaId] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'recent' | 'alphabetical' | 'oldest'>('recent');
  const [selectedDisciplinaFilter, setSelectedDisciplinaFilter] = useState<string>('all');
  const [dateOrder, setDateOrder] = useState<'desc' | 'asc'>('desc');
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load published lectures with view counts
      const { data: lecturesData, error: lecturesError } = await supabase
        .from('lectures')
        .select(`
          id,
          title,
          created_at,
          disciplina_id,
          turma_id,
          tags,
          duration,
          disciplinas(nome),
          turmas(periodo, curso)
        `)
        .eq('status', 'published')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (lecturesError) {
        console.error('Error loading published lectures:', lecturesError);
        setLectures([]);
      } else {
        // Fetch view counts for each lecture
        const lecturesWithViews = await Promise.all(
          (lecturesData || []).map(async (lecture) => {
            const { count } = await supabase
              .from('lecture_views')
              .select('*', { count: 'exact', head: true })
              .eq('lecture_id', lecture.id);
            
            return {
              ...lecture,
              view_count: count || 0
            };
          })
        );
        setLectures(lecturesWithViews);
      }

      // Load draft lectures (processing + ready)
      const { data: draftsData, error: draftsError } = await supabase
        .from('lectures')
        .select(`
          id,
          title,
          created_at,
          status,
          disciplina_id,
          turma_id,
          tags,
          duration,
          disciplinas(nome),
          turmas(periodo, curso)
        `)
        .in('status', ['processing', 'ready'])
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (draftsError) throw draftsError;
      setDrafts(draftsData || []);

      // Load disciplinas
      const { data: disciplinasData, error: disciplinasError } = await supabase
        .from('disciplinas')
        .select(`
          id,
          nome,
          turma_id,
          turmas(periodo, curso)
        `)
        .eq('teacher_id', user.id)
        .order('nome');

      if (disciplinasError) throw disciplinasError;
      setDisciplinas(disciplinasData || []);

      // Load turmas accessible to teacher
      const { data: turmasData, error: turmasError } = await supabase
        .from('teacher_turma_access')
        .select(`
          turmas(
            id,
            periodo,
            curso,
            faculdade
          )
        `)
        .eq('teacher_id', user.id);

      if (turmasError) throw turmasError;
      const turmasList = turmasData?.map(item => item.turmas).filter(Boolean) as Turma[] || [];
      setTurmas(turmasList);

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDisciplina = async () => {
    if (!newDisciplineName.trim() || !selectedTurmaId) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o nome da disciplina e selecione uma turma',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('disciplinas')
        .insert({
          nome: newDisciplineName.trim(),
          turma_id: selectedTurmaId,
          teacher_id: user.id,
        });

      if (error) throw error;

      toast({
        title: 'Sucesso! 🎉',
        description: 'Disciplina criada com sucesso',
      });

      setNewDisciplineName('');
      setSelectedTurmaId('');
      setIsDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Error creating disciplina:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar a disciplina',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteAllDrafts = async () => {
    try {
      const draftIds = filteredDrafts.map(d => d.id);
      
      const { error } = await supabase
        .from('lectures')
        .delete()
        .in('id', draftIds);
      
      if (error) throw error;
      
      toast({
        title: 'Rascunhos deletados',
        description: `${draftIds.length} rascunho(s) foram removidos com sucesso`,
      });
      
      loadData();
      
    } catch (error) {
      console.error('Error deleting drafts:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao deletar',
        description: 'Não foi possível deletar os rascunhos',
      });
    }
  };

  const handleDeleteDisciplina = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta disciplina?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('disciplinas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Disciplina excluída',
      });

      loadData();
    } catch (error) {
      console.error('Error deleting disciplina:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a disciplina',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteDraft = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!window.confirm('Tem certeza que deseja excluir este rascunho?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('lectures')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Rascunho excluído! 🗑️',
        description: 'O rascunho foi removido com sucesso',
      });

      loadData();
    } catch (error) {
      console.error('Error deleting draft:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o rascunho',
        variant: 'destructive',
      });
    }
  };

  const DraftCardSkeleton = () => (
    <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200">
      <CardContent className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4 bg-yellow-200" />
        <Skeleton className="h-3 w-1/2 bg-yellow-200" />
        <div className="flex justify-between">
          <Skeleton className="h-6 w-24 bg-yellow-200" />
          <Skeleton className="h-3 w-20 bg-yellow-200" />
        </div>
      </CardContent>
    </Card>
  );

  // Filter and sort function
  const filterAndSortLectures = (lectureList: Lecture[]) => {
    let filtered = lectureList;

    // 1. FILTER BY SEARCH (title OR tags)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(lecture => {
        const matchesTitle = lecture.title.toLowerCase().includes(query);
        const matchesTags = lecture.tags?.some(tag => tag.toLowerCase().includes(query)) || false;
        return matchesTitle || matchesTags;
      });
    }

    // 2. FILTER BY DISCIPLINA
    if (selectedDisciplinaFilter !== 'all') {
      filtered = filtered.filter(lecture => lecture.disciplina_id === selectedDisciplinaFilter);
    }

    // 3. SORT
    filtered.sort((a, b) => {
      if (sortOrder === 'alphabetical') {
        return a.title.localeCompare(b.title);
      }
      
      // By date
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      
      if (dateOrder === 'desc') {
        return dateB - dateA; // Most recent first
      } else {
        return dateA - dateB; // Oldest first
      }
    });

    return filtered;
  };

  // Apply filters
  const filteredDrafts = filterAndSortLectures(drafts);
  const filteredLectures = filterAndSortLectures(lectures);

  // Group lectures by turma and disciplina
  const groupedLectures = lectures.reduce((acc, lecture) => {
    const turmaKey = lecture.turmas?.periodo || 'Sem Turma';
    const disciplinaKey = lecture.disciplinas?.nome || 'Sem Disciplina';
    
    if (!acc[turmaKey]) acc[turmaKey] = {};
    if (!acc[turmaKey][disciplinaKey]) acc[turmaKey][disciplinaKey] = [];
    
    acc[turmaKey][disciplinaKey].push(lecture);
    return acc;
  }, {} as Record<string, Record<string, Lecture[]>>);

  return (
    <MainLayout>
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-900 via-purple-600 to-pink-500 animate-gradient-xy bg-[length:200%_200%]">
        <TeacherBackgroundRipple />
        
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-48 w-96 h-96 bg-gradient-to-br from-pink-500/30 to-purple-500/30 rounded-full blur-3xl animate-float" />
          <div className="absolute top-2/3 -right-32 w-80 h-80 bg-gradient-to-br from-blue-400/25 to-purple-400/25 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-gradient-to-br from-purple-500/20 to-pink-400/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-3 md:px-6 pt-20 md:pt-24 pb-4 md:pb-8 pb-safe">
          {/* Mobile Title - Appears above search on mobile only */}
          {isMobile && (
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-white flex items-center gap-2 drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
                <BookOpen className="h-7 w-7" />
                Minhas Aulas
              </h1>
              <p className="text-white/80 text-sm mt-1 drop-shadow-[0_1px_4px_rgba(0,0,0,0.2)]">
                Gerencie suas aulas publicadas e disciplinas
              </p>
            </div>
          )}

          <div className="mb-6 md:mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 md:gap-4">
            <div className="hidden md:block">
              <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2 flex items-center gap-3 drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
                <BookOpen className="h-8 w-8 lg:h-10 lg:w-10" />
                Minhas Aulas
              </h1>
              <p className="text-white/80 text-sm lg:text-base drop-shadow-[0_1px_4px_rgba(0,0,0,0.2)]">
                Gerencie suas aulas publicadas e disciplinas
              </p>
            </div>
            
            <div className="flex flex-col gap-3 w-full lg:w-auto">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
                <Input
                  placeholder="Buscar por título ou tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 min-h-[44px] bg-white/10 backdrop-blur-lg border-white/20 text-white placeholder:text-white/50 text-base md:h-10 md:text-sm"
                />
              </div>
              
              <div className="flex gap-2">
                <Select value={selectedDisciplinaFilter} onValueChange={setSelectedDisciplinaFilter}>
                  <SelectTrigger className="flex-1 h-11 min-h-[44px] md:h-10 bg-white/10 backdrop-blur-lg border-white/20 text-white">
                    <SelectValue placeholder="Disciplina" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {disciplinas.map(disc => (
                      <SelectItem key={disc.id} value={disc.id}>{disc.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={sortOrder} onValueChange={(value: 'recent' | 'alphabetical' | 'oldest') => {
                  setSortOrder(value);
                  if (value === 'recent') setDateOrder('desc');
                  if (value === 'oldest') setDateOrder('asc');
                }}>
                  <SelectTrigger className="flex-1 h-11 min-h-[44px] md:h-10 bg-white/10 backdrop-blur-lg border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Recentes</SelectItem>
                    <SelectItem value="oldest">Antigas</SelectItem>
                    <SelectItem value="alphabetical">A-Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Section 1: Draft Lectures */}
          <Card className="mb-8 bg-white/90 backdrop-blur-sm">
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                {/* Title and description */}
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                    <FileEdit className="h-5 w-5 text-yellow-600" />
                    Meus Rascunhos
                    {filteredDrafts.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {filteredDrafts.length}
                      </Badge>
                    )}
                  </CardTitle>
                  <p className="text-xs md:text-sm text-slate-600 mt-1">
                    Aulas em andamento que ainda não foram publicadas
                  </p>
                </div>
                
                {/* Delete All button - full width on mobile */}
                {filteredDrafts.length > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        className={cn(
                          "gap-2 whitespace-nowrap",
                          isMobile && "w-full h-11 min-h-[44px]"
                        )}
                      >
                        <Trash2 className="h-4 w-4" />
                        Deletar Todos
                      </Button>
                    </AlertDialogTrigger>
                    
                    <AlertDialogContent className={cn(
                      isMobile && "max-w-[90vw] rounded-2xl"
                    )}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                          Você está prestes a deletar {filteredDrafts.length} rascunho(s). 
                          Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className={cn(
                        isMobile && "flex-col gap-2"
                      )}>
                        <AlertDialogCancel className={cn(
                          isMobile && "w-full h-11 min-h-[44px]"
                        )}>
                          Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={handleDeleteAllDrafts}
                          className={cn(
                            "bg-destructive hover:bg-destructive/90",
                            isMobile && "w-full h-11 min-h-[44px]"
                          )}
                        >
                          Deletar Todos
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => <DraftCardSkeleton key={i} />)}
                </div>
              ) : drafts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <div className="mb-4 p-6 bg-yellow-100 rounded-full">
                    <FileEdit className="h-12 w-12 text-yellow-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    Nenhum rascunho no momento
                  </h3>
                  <p className="text-sm text-slate-500 text-center max-w-md mb-4">
                    Comece gravando uma nova aula ou faça upload de material para criar conteúdo
                  </p>
                  <Button 
                    className="bg-gradient-to-r from-purple-600 to-pink-600"
                    onClick={() => navigate('/teacherdashboard')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Começar Agora
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredDrafts.map((draft) => (
                    <Card
                      key={draft.id}
                      className="group relative cursor-pointer hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200"
                      onClick={() => navigate(`/lecturetranscription/${draft.id}`)}
                    >
                      <CardContent className="p-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={(e) => handleDeleteDraft(draft.id, e)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>

                        <div className="flex items-start justify-between mb-2">
                          <h5 className="font-semibold text-slate-900 line-clamp-2 flex-1 pr-8">
                            {draft.title || 'Sem título'}
                          </h5>
                          {draft.status === 'processing' && (
                            <Loader2 className="h-4 w-4 text-yellow-600 animate-spin ml-2 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-slate-600 mb-2">
                          {new Date(draft.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-yellow-300/30">
                          <div className="flex gap-2 flex-wrap">
                            <Badge 
                              className={`text-xs ${
                                draft.status === 'processing' 
                                  ? 'bg-yellow-100 text-yellow-800 border-yellow-300' 
                                  : 'bg-blue-100 text-blue-800 border-blue-300'
                              }`}
                            >
                              {draft.status === 'processing' ? '⏳ Processando' : '✏️ Pronto'}
                            </Badge>
                            {draft.duration && (
                              <Badge variant="outline" className="text-xs border-yellow-300 text-yellow-800">
                                ⏱️ {Math.round(draft.duration / 60)} min
                              </Badge>
                            )}
                          </div>
                          {draft.disciplinas && (
                            <span className="text-xs text-slate-500 font-medium">
                              📚 {draft.disciplinas.nome}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 2: Manage Disciplines */}
          <Card className="mb-8 bg-white/90 backdrop-blur-sm">
            <CardHeader>
              <div className={cn(
                "flex gap-4",
                isMobile ? "flex-col items-start" : "flex-row items-center justify-between"
              )}>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-green-600" />
                  Gerenciar Disciplinas
                  {disciplinas.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {disciplinas.length}
                    </Badge>
                  )}
                </CardTitle>
                
                {/* Button - Full width on mobile, inline on desktop/tablet */}
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      className={cn(
                        "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700",
                        isMobile && "w-full h-12 text-base"
                      )}
                      size={isMobile ? "lg" : "default"}
                    >
                      <Plus className={cn(isMobile ? "h-5 w-5 mr-2" : "h-4 w-4 mr-2")} />
                      Nova Disciplina
                    </Button>
                  </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Nova Disciplina</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="nome">Nome da Disciplina</Label>
                    <Input
                      id="nome"
                      placeholder="Ex: Termodinâmica Aplicada"
                      value={newDisciplineName}
                      onChange={(e) => setNewDisciplineName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="turma">Turma Associada</Label>
                    <Select value={selectedTurmaId} onValueChange={setSelectedTurmaId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma turma" />
                      </SelectTrigger>
                      <SelectContent>
                        {turmas.map((turma) => (
                          <SelectItem key={turma.id} value={turma.id}>
                            {turma.curso} - {turma.periodo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={handleCreateDisciplina}
                    disabled={isCreating}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600"
                  >
                    {isCreating ? 'Criando...' : 'Criar Disciplina'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
              </div>
          </CardHeader>
          <CardContent>
            {disciplinas.length === 0 ? (
              <p className="text-center text-slate-500 py-8 italic">
                Nenhuma disciplina cadastrada
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Disciplina</TableHead>
                    <TableHead>Turma</TableHead>
                    <TableHead>Aulas</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {disciplinas.map((disciplina) => {
                    // Count published lectures for this discipline
                    const aulaCount = lectures.filter(l => l.disciplina_id === disciplina.id).length;
                    
                    return (
                      <TableRow key={disciplina.id} className="hover:bg-slate-50">
                        <TableCell className="font-medium">{disciplina.nome}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm">{disciplina.turmas?.periodo || '-'}</span>
                            <span className="text-xs text-slate-500">{disciplina.turmas?.curso || '-'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {aulaCount} {aulaCount === 1 ? 'aula' : 'aulas'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteDisciplina(disciplina.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Section 3: Published Lectures */}
        <Card className="mb-8 bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <div className={cn(
              "flex gap-4",
              isMobile ? "flex-col" : "flex-row items-center justify-between"
            )}>
              {/* Left Side: Title */}
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-purple-600" />
                Aulas Publicadas
              </CardTitle>
              
              {/* Right Side: Stats */}
              <div className={cn(
                "flex gap-3",
                isMobile ? "grid grid-cols-2" : "flex-row"
              )}>
                {/* Lecture Count Button */}
                {filteredLectures.length > 0 && (
                  <Button 
                    variant="outline" 
                    size={isMobile ? "default" : "sm"}
                    className={cn(
                      "gap-2 justify-start",
                      isMobile ? "h-10 w-full" : "h-8"
                    )}
                    disabled
                  >
                    <GraduationCap className="h-4 w-4 shrink-0" />
                    <span className="font-semibold">
                      {filteredLectures.length}
                    </span>
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {filteredLectures.length === 1 ? 'aula' : 'aulas'}
                    </span>
                  </Button>
                )}
                
                {/* Total Views Button */}
                <Button 
                  variant="outline" 
                  size={isMobile ? "default" : "sm"}
                  className={cn(
                    "gap-2 justify-start",
                    isMobile ? "h-10 w-full" : "h-8"
                  )}
                  disabled
                >
                  <Eye className="h-4 w-4 shrink-0" />
                  <span className="font-semibold">
                    {lectures.reduce((total, lecture) => total + (lecture.view_count || 0), 0)}
                  </span>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    visualizações
                  </span>
                </Button>
              </div>
            </div>
            
            <p className="text-sm text-slate-600 mt-2">
              Aulas já disponibilizadas para os alunos
            </p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : filteredLectures.length === 0 ? (
              <div className="text-center py-12">
                <GraduationCap className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-sm text-gray-500">
                  {searchQuery || selectedDisciplinaFilter !== 'all' 
                    ? 'Nenhuma aula encontrada com esses filtros' 
                    : 'Nenhuma aula publicada ainda'}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Group filtered lectures by turma -> disciplina */}
                {Object.entries(
                  filteredLectures.reduce((acc, lecture) => {
                    const turmaKey = lecture.turmas?.periodo || 'Sem Turma';
                    const disciplinaKey = lecture.disciplinas?.nome || 'Sem Disciplina';
                    
                    if (!acc[turmaKey]) acc[turmaKey] = {};
                    if (!acc[turmaKey][disciplinaKey]) acc[turmaKey][disciplinaKey] = [];
                    
                    acc[turmaKey][disciplinaKey].push(lecture);
                    return acc;
                  }, {} as Record<string, Record<string, Lecture[]>>)
                ).map(([turma, disciplinasGroup]) => (
                  <div key={turma}>
                    <h3 className="text-lg font-semibold text-slate-900 mb-3">
                      {turma}
                    </h3>
                    {Object.entries(disciplinasGroup).map(([disciplina, lecturesList]) => (
                      <div key={disciplina} className="mb-6 last:mb-0">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-purple-100 text-purple-700 border-purple-300">
                              {disciplina}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {lecturesList.map((lecture) => (
                            <Card
                              key={lecture.id}
                              className="group cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all duration-300 bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200"
                              onClick={() => navigate(`/lecturetranscription/${lecture.id}`)}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1 pr-2">
                                    <h5 className="font-semibold text-slate-900 line-clamp-2 mb-1">
                                      {lecture.title}
                                    </h5>
                                    <p className="text-xs text-slate-600">
                                      Publicada em {new Date(lecture.created_at).toLocaleDateString('pt-BR', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric'
                                      })}
                                    </p>
                                  </div>
                                  <Badge className="bg-green-100 text-green-700 border-green-300 text-xs whitespace-nowrap">
                                    Publicada
                                  </Badge>
                                </div>
                                
                                {/* Tags */}
                                {lecture.tags && lecture.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mb-3">
                                    {lecture.tags.slice(0, 2).map((tag, idx) => (
                                      <Badge key={idx} variant="outline" className="text-xs border-purple-300 text-purple-700">
                                        #{tag}
                                      </Badge>
                                    ))}
                                    {lecture.tags.length > 2 && (
                                      <Badge variant="outline" className="text-xs border-purple-300 text-purple-700">
                                        +{lecture.tags.length - 2}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                                
                            {/* Footer com duração e visualizações */}
                            <div className="flex items-center justify-between pt-3 border-t border-purple-200">
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                {lecture.duration && (
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    <span>{Math.round(lecture.duration / 60)} min</span>
                                  </div>
                                )}
                              </div>
                              
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/lecturetranscription/${lecture.id}`);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Ver Aula
                              </Button>
                            </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default TeacherMyLectures;
