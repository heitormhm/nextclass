import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Key, Users, Shield, Copy, Download, Loader2, GraduationCap, Clock, Search, CheckCircle, XCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';

const AdminDashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [quantity, setQuantity] = useState('5');
  const [expiresInDays, setExpiresInDays] = useState('30');
  const [notes, setNotes] = useState('');
  const [teacherFilter, setTeacherFilter] = useState<'all' | 'validated' | 'pending'>('all');
  const [studentSearch, setStudentSearch] = useState('');

  // Buscar códigos gerados
  const { data: codes, isLoading: isLoadingCodes, refetch: refetchCodes } = useQuery({
    queryKey: ['teacher-codes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teacher_access_codes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Buscar alunos
  const { data: students, isLoading: isLoadingStudents } = useQuery({
    queryKey: ['admin-students'],
    queryFn: async () => {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, email, university, course, period, created_at')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Buscar roles dos usuários
      const userIds = usersData?.map(u => u.id) || [];
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds)
        .eq('role', 'student');

      if (rolesError) throw rolesError;

      const studentIds = new Set(rolesData?.map(r => r.user_id) || []);
      return usersData?.filter(u => studentIds.has(u.id)) || [];
    },
  });

  // Buscar professores
  const { data: teachers, isLoading: isLoadingTeachers } = useQuery({
    queryKey: ['admin-teachers'],
    queryFn: async () => {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, email, university, course, created_at')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Buscar roles e status de validação dos professores
      const userIds = usersData?.map(u => u.id) || [];
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role, is_validated, validated_at')
        .in('user_id', userIds)
        .eq('role', 'teacher');

      if (rolesError) throw rolesError;

      const teacherRoles = new Map(rolesData?.map(r => [r.user_id, r]) || []);
      
      return usersData
        ?.filter(u => teacherRoles.has(u.id))
        .map(u => ({
          ...u,
          is_validated: teacherRoles.get(u.id)?.is_validated || false,
          validated_at: teacherRoles.get(u.id)?.validated_at || null
        })) || [];
    },
  });

  // Buscar estatísticas
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const totalCodes = codes?.length || 0;
      const usedCodes = codes?.filter(c => c.is_used).length || 0;
      const availableCodes = totalCodes - usedCodes;
      
      return {
        total: totalCodes,
        used: usedCodes,
        available: availableCodes
      };
    },
    enabled: !!codes
  });

  // Estatísticas de usuários
  const userStats = {
    totalStudents: students?.length || 0,
    totalTeachers: teachers?.length || 0,
    validatedTeachers: teachers?.filter(t => t.is_validated).length || 0,
    pendingTeachers: teachers?.filter(t => !t.is_validated).length || 0,
  };

  // Filtrar professores
  const filteredTeachers = teachers?.filter(t => {
    if (teacherFilter === 'validated') return t.is_validated;
    if (teacherFilter === 'pending') return !t.is_validated;
    return true;
  });

  // Filtrar alunos
  const filteredStudents = students?.filter(s =>
    s.full_name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.email?.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.university?.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const handleGenerateCodes = async () => {
    if (!quantity || parseInt(quantity) < 1) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Quantidade deve ser pelo menos 1'
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-teacher-codes`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({
            quantity: parseInt(quantity),
            expiresInDays: expiresInDays ? parseInt(expiresInDays) : null,
            notes: notes || null
          })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao gerar códigos');
      }

      toast({
        title: '✅ Códigos Gerados!',
        description: `${result.codes.length} códigos criados com sucesso.`
      });

      // Limpar formulário
      setQuantity('5');
      setExpiresInDays('30');
      setNotes('');
      
      // Recarregar lista de códigos
      refetchCodes();
    } catch (error: any) {
      console.error('Erro ao gerar códigos:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message || 'Falha ao gerar códigos'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copiado!',
      description: 'Código copiado para a área de transferência'
    });
  };

  const exportToCSV = () => {
    if (!codes || codes.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Nenhum código para exportar'
      });
      return;
    }

    const headers = ['Código', 'Status', 'Criado em', 'Expira em', 'Notas'];
    const rows = codes.map(code => [
      code.code,
      code.is_used ? 'Usado' : 'Disponível',
      new Date(code.created_at).toLocaleDateString('pt-BR'),
      code.expires_at ? new Date(code.expires_at).toLocaleDateString('pt-BR') : 'Nunca',
      code.notes || ''
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `teacher-codes-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Exportado!',
      description: 'Códigos exportados para CSV'
    });
  };

  const exportStudentsToCSV = () => {
    if (!students || students.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Nenhum aluno para exportar'
      });
      return;
    }

    const headers = ['Nome', 'Email', 'Universidade', 'Curso', 'Período', 'Data de Cadastro'];
    const rows = students.map(student => [
      student.full_name || '-',
      student.email || '-',
      student.university || '-',
      student.course || '-',
      student.period || '-',
      new Date(student.created_at).toLocaleDateString('pt-BR')
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alunos-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Exportado!',
      description: 'Lista de alunos exportada'
    });
  };

  const exportTeachersToCSV = () => {
    if (!teachers || teachers.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Nenhum professor para exportar'
      });
      return;
    }

    const headers = ['Nome', 'Email', 'Universidade', 'Status', 'Data de Cadastro', 'Data de Validação'];
    const rows = teachers.map(teacher => [
      teacher.full_name || '-',
      teacher.email || '-',
      teacher.university || '-',
      teacher.is_validated ? 'Validado' : 'Pendente',
      new Date(teacher.created_at).toLocaleDateString('pt-BR'),
      teacher.validated_at ? new Date(teacher.validated_at).toLocaleDateString('pt-BR') : '-'
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `professores-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Exportado!',
      description: 'Lista de professores exportada'
    });
  };

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Painel de Administração</h1>
          <p className="text-muted-foreground">Gerenciar códigos de acesso e usuários cadastrados</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total de Códigos</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Códigos Usados</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.used || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Disponíveis</CardTitle>
              <XCircle className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.available || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total de Alunos</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.totalStudents}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total de Professores</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.totalTeachers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Prof. Validados</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {userStats.validatedTeachers}/{userStats.totalTeachers}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Section */}
        <Tabs defaultValue="codes" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="codes">Códigos de Acesso</TabsTrigger>
            <TabsTrigger value="users">Usuários Cadastrados</TabsTrigger>
          </TabsList>

          {/* Codes Tab */}
          <TabsContent value="codes" className="space-y-6">
            {/* Gerador de Códigos */}
            <Card>
          <CardHeader>
            <CardTitle>Gerar Códigos de Acesso</CardTitle>
            <CardDescription>
              Crie novos códigos para professores acessarem o sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantidade</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Quantos códigos gerar?"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="expires">Expira em (dias)</Label>
                <Input
                  id="expires"
                  type="number"
                  min="1"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(e.target.value)}
                  placeholder="Deixe vazio para nunca expirar"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Lote para novos professores de Medicina"
                rows={3}
              />
            </div>

            <Button 
              onClick={handleGenerateCodes}
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Key className="mr-2 h-4 w-4" />
                  Gerar Códigos
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Tabela de Códigos */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Códigos Gerados</CardTitle>
                <CardDescription>Lista de todos os códigos de acesso</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={exportToCSV}
                disabled={!codes || codes.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingCodes ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : codes && codes.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead>Expira em</TableHead>
                      <TableHead>Notas</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {codes.map((code) => (
                      <TableRow key={code.id}>
                        <TableCell className="font-mono">{code.code}</TableCell>
                        <TableCell>
                          {code.is_used ? (
                            <Badge variant="secondary">Usado</Badge>
                          ) : (
                            <Badge>Disponível</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(code.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          {code.expires_at 
                            ? new Date(code.expires_at).toLocaleDateString('pt-BR')
                            : 'Nunca'
                          }
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {code.notes || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(code.code)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum código gerado ainda. Use o formulário acima para criar.
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            {/* Students Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5" />
                      Alunos Cadastrados
                    </CardTitle>
                    <CardDescription>
                      Lista de todos os alunos registrados na plataforma
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={exportStudentsToCSV}
                    disabled={!students || students.length === 0}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Exportar CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, email ou universidade..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
                {isLoadingStudents ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredStudents && filteredStudents.length > 0 ? (
                  <ScrollArea className="h-[400px]">
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Universidade</TableHead>
                            <TableHead>Curso</TableHead>
                            <TableHead>Período</TableHead>
                            <TableHead>Data de Cadastro</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredStudents.map((student) => (
                            <TableRow key={student.id}>
                              <TableCell className="font-medium">{student.full_name || '-'}</TableCell>
                              <TableCell>{student.email}</TableCell>
                              <TableCell>{student.university || '-'}</TableCell>
                              <TableCell>{student.course || '-'}</TableCell>
                              <TableCell>{student.period || '-'}</TableCell>
                              <TableCell>
                                {new Date(student.created_at).toLocaleDateString('pt-BR')}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {studentSearch ? 'Nenhum aluno encontrado com esses critérios' : 'Nenhum aluno cadastrado ainda'}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Teachers Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Professores Cadastrados
                    </CardTitle>
                    <CardDescription>
                      Lista de todos os professores e seu status de validação
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={exportTeachersToCSV}
                    disabled={!teachers || teachers.length === 0}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Exportar CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant={teacherFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTeacherFilter('all')}
                  >
                    Todos ({teachers?.length || 0})
                  </Button>
                  <Button
                    variant={teacherFilter === 'validated' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTeacherFilter('validated')}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Validados ({userStats.validatedTeachers})
                  </Button>
                  <Button
                    variant={teacherFilter === 'pending' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTeacherFilter('pending')}
                  >
                    <Clock className="h-4 w-4 mr-1" />
                    Pendentes ({userStats.pendingTeachers})
                  </Button>
                </div>
                {isLoadingTeachers ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredTeachers && filteredTeachers.length > 0 ? (
                  <ScrollArea className="h-[400px]">
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Universidade</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Data de Cadastro</TableHead>
                            <TableHead>Data de Validação</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredTeachers.map((teacher) => (
                            <TableRow key={teacher.id}>
                              <TableCell className="font-medium">{teacher.full_name || '-'}</TableCell>
                              <TableCell>{teacher.email}</TableCell>
                              <TableCell>{teacher.university || '-'}</TableCell>
                              <TableCell>
                                {teacher.is_validated ? (
                                  <Badge className="bg-green-100 text-green-800">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Validado
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Pendente
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {new Date(teacher.created_at).toLocaleDateString('pt-BR')}
                              </TableCell>
                              <TableCell>
                                {teacher.validated_at 
                                  ? new Date(teacher.validated_at).toLocaleDateString('pt-BR')
                                  : '-'
                                }
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {teacherFilter === 'validated' && 'Nenhum professor validado ainda'}
                    {teacherFilter === 'pending' && 'Nenhum professor pendente de validação'}
                    {teacherFilter === 'all' && 'Nenhum professor cadastrado ainda'}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default AdminDashboard;
