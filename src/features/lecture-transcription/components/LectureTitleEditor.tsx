import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { BookOpen } from 'lucide-react';

interface LectureTitleEditorProps {
  title: string;
  onTitleChange: (title: string) => void;
}

export const LectureTitleEditor: React.FC<LectureTitleEditorProps> = ({
  title,
  onTitleChange
}) => {
  return (
    <Card className="bg-white/75 backdrop-blur-xl border-white/40 shadow-xl">
      <CardHeader>
        <CardTitle className="text-xl text-slate-900 font-bold flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-purple-600" />
          Título da Aula
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="bg-white border-slate-300 text-slate-900"
          placeholder="Digite o título da aula"
        />
      </CardContent>
    </Card>
  );
};
