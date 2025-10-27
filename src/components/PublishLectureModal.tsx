import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PublishLectureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lectureId: string;
  initialTitle?: string;
  initialTurmaId?: string;
  initialDisciplinaId?: string;
}

export const PublishLectureModal = ({
  open,
  onOpenChange,
  lectureId,
  initialTitle = '',
  initialTurmaId = '',
  initialDisciplinaId = ''
}: PublishLectureModalProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [publishing, setPublishing] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [selectedTurma, setSelectedTurma] = useState(initialTurmaId);
  const [selectedDisciplina, setSelectedDisciplina] = useState(initialDisciplinaId);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [disciplinas, setDisciplinas] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      setTitle(initialTitle);
      setSelectedTurma(initialTurmaId);
      setSelectedDisciplina(initialDisciplinaId);
      loadTurmas();
    }
  }, [open, initialTitle, initialTurmaId, initialDisciplinaId]);

  useEffect(() => {
    if (selectedTurma) {
      loadDisciplinas(selectedTurma);
    } else {
      setDisciplinas([]);
    }
  }, [selectedTurma]);

  const loadTurmas = async () => {
    try {
      const { data, error } = await supabase
        .from('teacher_turma_access')
        .select(`
          turma_id,
          turmas (
            id,
            nome_turma,
            periodo,
            curso
          )
        `);

      if (error) throw error;
      
      const turmasData = data?.map(item => item.turmas).filter(Boolean) || [];
      setTurmas(turmasData);
    } catch (error) {
      console.error('Error loading turmas:', error);
    }
  };

  const loadDisciplinas = async (turmaId: string) => {
    try {
      const { data, error } = await supabase
        .from('disciplinas')
        .select('*')
        .eq('turma_id', turmaId);

      if (error) throw error;
      setDisciplinas(data || []);
    } catch (error) {
      console.error('Error loading disciplinas:', error);
    }
  };

  const handlePublish = async () => {
    // Validação mais rigorosa
    if (!title.trim()) {
      toast({
        title: '⚠️ Título obrigatório',
        description: 'Digite um título para a aula',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedTurma) {
      toast({
        title: '⚠️ Turma obrigatória',
        description: 'Selecione uma turma para publicar',
        variant: 'destructive',
      });
      return;
    }

    // DEBUG: Log completo antes de tentar publicar
    console.log('[Publish] 📋 Attempting publication with:', {
      lectureId,
      title: title.trim(),
      selectedTurma,
      selectedDisciplina: selectedDisciplina || 'none',
      timestamp: new Date().toISOString()
    });

    setPublishing(true);

    try {
      const { error } = await supabase
        .from('lectures')
        .update({
          title: title.trim(),
          class_id: selectedTurma,
          turma_id: selectedTurma,
          disciplina_id: selectedDisciplina || null,
          status: 'published',
          updated_at: new Date().toISOString()
        })
        .eq('id', lectureId);

      if (error) {
        console.error('[Publish] ❌ Database error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        
        toast({
          title: '❌ Erro ao publicar',
          description: error.message || 'Verifique se você tem permissão para publicar nesta turma',
          variant: 'destructive',
        });
        
        setPublishing(false);
        return;
      }

      // Verificar se publicação foi bem-sucedida
      const { data: verifyData, error: verifyError } = await supabase
        .from('lectures')
        .select('status, class_id, turma_id, disciplina_id')
        .eq('id', lectureId)
        .single();

      if (verifyError) {
        console.error('[Publish] ❌ Verification failed:', verifyError);
        toast({
          title: '❌ Erro de verificação',
          description: 'Não foi possível confirmar a publicação',
          variant: 'destructive',
        });
        setPublishing(false);
        return;
      }

      if (verifyData?.status !== 'published') {
        console.error('[Publish] ❌ Status mismatch:', verifyData);
        toast({
          title: '❌ Status não atualizado',
          description: 'A aula não foi marcada como publicada',
          variant: 'destructive',
        });
        setPublishing(false);
        return;
      }

      console.log('[Publish] ✅ Publication verified:', verifyData);

      toast({
        title: 'Sucesso! 🎉',
        description: 'Aula publicada e disponível para os alunos',
      });

      onOpenChange(false);

      // Aguardar 1 segundo para garantir propagação no banco
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Redirecionar para dashboard
      navigate('/teacher-dashboard', { replace: true });
    } catch (error) {
      console.error('Error publishing lecture:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao publicar aula',
        variant: 'destructive',
      });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Publicar Aula
          </DialogTitle>
          <DialogDescription>
            Revise as informações antes de disponibilizar para os alunos
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label>Título da Aula *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Introdução à Termodinâmica"
            />
          </div>

          {/* Turma */}
          <div className="space-y-2">
            <Label>Turma *</Label>
            <Select value={selectedTurma} onValueChange={setSelectedTurma}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma turma" />
              </SelectTrigger>
              <SelectContent>
                {turmas.map((turma) => (
                  <SelectItem key={turma.id} value={turma.id}>
                    {turma.nome_turma} - {turma.periodo} ({turma.curso})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Disciplina */}
          <div className="space-y-2">
            <Label>Disciplina (opcional)</Label>
            <Select 
              value={selectedDisciplina} 
              onValueChange={setSelectedDisciplina}
              disabled={!selectedTurma}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma disciplina" />
              </SelectTrigger>
              <SelectContent>
                {disciplinas.map((disciplina) => (
                  <SelectItem key={disciplina.id} value={disciplina.id}>
                    {disciplina.nome}
                  </SelectItem>
                ))}
                {disciplinas.length === 0 && selectedTurma && (
                  <SelectItem value="none" disabled>
                    Nenhuma disciplina disponível
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Atenção:</strong> Ao publicar, a aula ficará imediatamente disponível 
              para todos os alunos matriculados na turma selecionada.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={publishing}>
              Cancelar
            </Button>
            <Button onClick={handlePublish} disabled={publishing || !title || !selectedTurma}>
              {publishing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Publicando...
                </>
              ) : (
                'Confirmar e Publicar'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};