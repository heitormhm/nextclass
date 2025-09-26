import { useState } from "react";
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

const mockGrades = [
  {
    id: "1",
    subject: "Cardiologia",
    grade: "8.5",
    maxGrade: "10.0",
    teacher: "Dra. Emily Carter",
    date: "2024-03-15",
    type: "Prova"
  },
  {
    id: "2",
    subject: "Neurologia",
    grade: "9.2",
    maxGrade: "10.0",
    teacher: "Dra. Sarah Chen",
    date: "2024-03-10",
    type: "Trabalho"
  },
  {
    id: "3",
    subject: "Cirurgia Geral",
    grade: "7.8",
    maxGrade: "10.0",
    teacher: "Dr. David Lee",
    date: "2024-03-05",
    type: "Prova Prática"
  },
  {
    id: "4",
    subject: "Pediatria",
    grade: "9.0",
    maxGrade: "10.0",
    teacher: "Dr. Michael Brown",
    date: "2024-02-28",
    type: "Seminário"
  },
  {
    id: "5",
    subject: "Ginecologia",
    grade: "8.7",
    maxGrade: "10.0",
    teacher: "Dra. Lisa Wilson",
    date: "2024-02-20",
    type: "Prova"
  }
];

const subjects = ["Todas as Disciplinas", "Cardiologia", "Neurologia", "Cirurgia Geral", "Pediatria", "Ginecologia"];
const teachers = ["Todos os Professores", "Dra. Emily Carter", "Dra. Sarah Chen", "Dr. David Lee", "Dr. Michael Brown", "Dra. Lisa Wilson"];

const GradesPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("Todas as Disciplinas");
  const [selectedTeacher, setSelectedTeacher] = useState("Todos os Professores");

  const filteredGrades = mockGrades.filter((grade) => {
    const matchesSearch = grade.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         grade.teacher.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubject === "Todas as Disciplinas" || grade.subject === selectedSubject;
    const matchesTeacher = selectedTeacher === "Todos os Professores" || grade.teacher === selectedTeacher;
    
    return matchesSearch && matchesSubject && matchesTeacher;
  });

  const averageGrade = filteredGrades.length > 0 
    ? (filteredGrades.reduce((sum, grade) => sum + parseFloat(grade.grade), 0) / filteredGrades.length).toFixed(1)
    : "0.0";

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
                  <div className="text-2xl font-bold text-primary">
                    {Math.max(...filteredGrades.map(g => parseFloat(g.grade))).toFixed(1)}
                  </div>
                  <div className="text-sm text-foreground-muted">Melhor Nota</div>
                </div>
              </div>
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
                    {filteredGrades.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-foreground-muted py-8">
                          Nenhuma nota encontrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredGrades.map((grade) => (
                        <TableRow key={grade.id}>
                          <TableCell className="font-medium">{grade.subject}</TableCell>
                          <TableCell>{grade.type}</TableCell>
                          <TableCell>
                            <span className={`font-semibold ${
                              parseFloat(grade.grade) >= 8 ? 'text-green-600' : 
                              parseFloat(grade.grade) >= 6 ? 'text-yellow-600' : 
                              'text-red-600'
                            }`}>
                              {grade.grade}/{grade.maxGrade}
                            </span>
                          </TableCell>
                          <TableCell>{grade.teacher}</TableCell>
                          <TableCell>{new Date(grade.date).toLocaleDateString('pt-BR')}</TableCell>
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