import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Users, Search, CheckSquare } from 'lucide-react';

interface Student {
  id: string;
  name: string;
  hasAccess: boolean;
}

interface StudentsAccessControlProps {
  students: Student[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectAll: boolean;
  onSelectAllToggle: () => void;
  onStudentToggle: (studentId: string) => void;
}

export const StudentsAccessControl: React.FC<StudentsAccessControlProps> = ({
  students,
  searchQuery,
  onSearchChange,
  selectAll,
  onSelectAllToggle,
  onStudentToggle,
}) => {
  const filteredStudents = students.filter((student) =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <CardTitle>Controle de Acesso</CardTitle>
        </div>
        <CardDescription>
          {students.length} aluno(s) matriculado(s)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar aluno..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Select All */}
          <div className="flex items-center gap-2 pb-2 border-b">
            <Checkbox
              id="select-all"
              checked={selectAll}
              onCheckedChange={onSelectAllToggle}
            />
            <label
              htmlFor="select-all"
              className="text-sm font-medium cursor-pointer flex-1"
            >
              Selecionar todos
            </label>
          </div>

          {/* Students List */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filteredStudents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum aluno encontrado
              </p>
            ) : (
              filteredStudents.map((student) => (
                <div key={student.id} className="flex items-center gap-2 py-1">
                  <Checkbox
                    id={`student-${student.id}`}
                    checked={student.hasAccess}
                    onCheckedChange={() => onStudentToggle(student.id)}
                  />
                  <label
                    htmlFor={`student-${student.id}`}
                    className="text-sm cursor-pointer flex-1"
                  >
                    {student.name}
                  </label>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
