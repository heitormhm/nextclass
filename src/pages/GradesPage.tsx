import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MainLayout from "@/components/MainLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

const GradesPage = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("Todas as Disciplinas");
  const [selectedTeacher, setSelectedTeacher] = useState("Todos os Professores");

  // Fetch grades from database
  const { data: grades, isLoading } = useQuery({
    queryKey: ['student-grades', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('grades')
        .select(`
          *,
          class:classes(id, name, course, period),
          teacher:users!grades_teacher_id_fkey(id, full_name)
        `)
        .eq('student_id', user!.id)
        .order('assessment_date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  // Extract unique subjects and teachers
  const subjects = useMemo(() => {
    const unique = [...new Set(grades?.map(g => g.subject) || [])];
    return ['Todas as Disciplinas', ...unique];
  }, [grades]);

  const teachers = useMemo(() => {
    const unique = [...new Set(grades?.map(g => g.teacher?.full_name).filter(Boolean) || [])];
    return ['Todos os Professores', ...unique];
  }, [grades]);

  // Filter grades
  const filteredGrades = useMemo(() => {
    if (!grades) return [];
    
    return grades.filter((grade) => {
      const teacherName = grade.teacher?.full_name || '';
      const matchesSearch = grade.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           teacherName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSubject = selectedSubject === "Todas as Disciplinas" || grade.subject === selectedSubject;
      const matchesTeacher = selectedTeacher === "Todos os Professores" || teacherName === selectedTeacher;
      
      return matchesSearch && matchesSubject && matchesTeacher;
    });
  }, [grades, searchQuery, selectedSubject, selectedTeacher]);

  // Calculate statistics
  const averageGrade = useMemo(() => {
    if (!filteredGrades?.length) return '0.0';
    const sum = filteredGrades.reduce((acc, g) => acc + Number(g.grade), 0);
    return (sum / filteredGrades.length).toFixed(1);
  }, [filteredGrades]);

  const bestGrade = useMemo(() => {
    if (!filteredGrades?.length) return '0.0';
    return Math.max(...filteredGrades.map(g => Number(g.grade))).toFixed(1);
  }, [filteredGrades]);

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Minhas Notas</h1>
            <p className="text-foreground-muted">Acompanhe seu desempenho acadêmico</p>
          </div>

          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo de Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="text-center space-y-2">
                      <Skeleton className="h-8 w-16 mx-auto" />
                      <Skeleton className="h-4 w-24 mx-auto" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{averageGrade}</div>
                    <div className="text-sm text-foreground-muted">Média Geral</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{filteredGrades.length}</div>
                    <div className="text-sm text-foreground-muted">Avaliações</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{bestGrade}</div>
                    <div className="text-sm text-foreground-muted">Melhor Nota</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-foreground-muted" />
                  <Input
                    placeholder="Buscar por disciplina ou professor..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="Filtrar por Disciplina" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject} value={subject}>
                        {subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="Filtrar por Professor" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map((teacher) => (
                      <SelectItem key={teacher} value={teacher}>
                        {teacher}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Grades Table */}
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Notas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Disciplina</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Nota</TableHead>
                      <TableHead>Professor</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        </TableRow>
                      ))
                    ) : filteredGrades.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-foreground-muted py-8">
                          {grades?.length === 0 
                            ? 'Nenhuma nota lançada ainda. As notas aparecerão aqui quando os professores lançarem.'
                            : 'Nenhuma nota encontrada com os filtros aplicados.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredGrades.map((grade) => (
                        <TableRow key={grade.id}>
                          <TableCell className="font-medium">{grade.subject}</TableCell>
                          <TableCell>{grade.assessment_type}</TableCell>
                          <TableCell>
                            <span className={`font-semibold ${
                              Number(grade.grade) >= 8 ? 'text-green-600' : 
                              Number(grade.grade) >= 6 ? 'text-yellow-600' : 
                              'text-red-600'
                            }`}>
                              {Number(grade.grade).toFixed(1)}/{Number(grade.max_grade).toFixed(1)}
                            </span>
                          </TableCell>
                          <TableCell>{grade.teacher?.full_name || 'Professor não identificado'}</TableCell>
                          <TableCell>{new Date(grade.assessment_date).toLocaleDateString('pt-BR')}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default GradesPage;