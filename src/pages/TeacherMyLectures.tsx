import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Plus, Trash2, GraduationCap, Users, Eye } from 'lucide-react';
import MainLayout from '@/components/MainLayout';
import { TeacherBackgroundRipple } from '@/components/ui/teacher-background-ripple';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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

interface Lecture {
  id: string;
  title: string;
  created_at: string;
  disciplina_id: string;
  turma_id: string;
  disciplinas?: { nome: string };
  turmas?: { periodo: string; curso: string };
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
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newDisciplineName, setNewDisciplineName] = useState('');
  const [selectedTurmaId, setSelectedTurmaId] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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

      // Load published lectures
      const { data: lecturesData, error: lecturesError } = await supabase
        .from('lectures')
        .select(`
          id,
          title,
          created_at,
          disciplina_id,
          turma_id,
          disciplinas(nome),
          turmas(periodo, curso)
        `)
        .eq('status', 'published')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (lecturesError) throw lecturesError;
      setLectures(lecturesData || []);

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
      <TeacherBackgroundRipple />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <BookOpen className="h-10 w-10" />
            Minhas Aulas
          </h1>
          <p className="text-white/80">Gerencie suas aulas publicadas e disciplinas</p>
        </div>

        {/* Section 1: Published Lectures */}
        <Card className="mb-8 bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-purple-600" />
              Aulas Publicadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center text-slate-500 py-8">Carregando...</p>
            ) : Object.keys(groupedLectures).length === 0 ? (
              <p className="text-center text-slate-500 py-8 italic">
                Nenhuma aula publicada ainda
              </p>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedLectures).map(([turma, disciplinas]) => (
                  <div key={turma}>
                    <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-600" />
                      {turma}
                    </h3>
                    {Object.entries(disciplinas).map(([disciplina, lecturesList]) => (
                      <div key={disciplina} className="mb-4 ml-6">
                        <h4 className="text-md font-medium text-slate-700 mb-2">
                          📚 {disciplina}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {lecturesList.map((lecture) => (
                            <Card
                              key={lecture.id}
                              className="cursor-pointer hover:shadow-lg transition-shadow bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200"
                              onClick={() => navigate(`/lecturetranscription/${lecture.id}`)}
                            >
                              <CardContent className="p-4">
                                <h5 className="font-semibold text-slate-900 mb-2 truncate">
                                  {lecture.title}
                                </h5>
                                <p className="text-xs text-slate-600">
                                  {new Date(lecture.created_at).toLocaleDateString('pt-BR')}
                                </p>
                                <Badge className="mt-2 bg-purple-100 text-purple-700">
                                  Publicada
                                </Badge>
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

        {/* Section 2: Disciplinas Management */}
        <Card className="bg-white/90 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-green-600" />
              Gerenciar Disciplinas
            </CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-purple-600 to-pink-600">
                  <Plus className="h-4 w-4 mr-2" />
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
                    <TableHead>Curso</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {disciplinas.map((disciplina) => (
                    <TableRow key={disciplina.id}>
                      <TableCell className="font-medium">{disciplina.nome}</TableCell>
                      <TableCell>{disciplina.turmas?.periodo || '-'}</TableCell>
                      <TableCell>{disciplina.turmas?.curso || '-'}</TableCell>
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
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default TeacherMyLectures;
