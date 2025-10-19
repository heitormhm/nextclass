import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mic, Type, Upload, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';

interface RecordLessonSetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RecordLessonSetupModal = ({ open, onOpenChange }: RecordLessonSetupModalProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<'input' | 'generating'>('input');
  const [inputMode, setInputMode] = useState<'text' | 'audio'>('text');
  const [theme, setTheme] = useState('');
  const [selectedTurma, setSelectedTurma] = useState('');
  const [selectedDisciplina, setSelectedDisciplina] = useState('');
  const [lessonPlanFile, setLessonPlanFile] = useState<File | null>(null);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [disciplinas, setDisciplinas] = useState<any[]>([]);
  const [loadingTurmas, setLoadingTurmas] = useState(false);
  const [generatingTags, setGeneratingTags] = useState(false);
  const [tags, setTags] = useState<string[]>([]);

  const { isRecording, startRecording, stopRecording, onTranscriptionReceived } = useAudioRecorder();

  useEffect(() => {
    if (open) {
      loadTurmas();
    }
  }, [open]);

  useEffect(() => {
    if (selectedTurma) {
      loadDisciplinas(selectedTurma);
    } else {
      setDisciplinas([]);
      setSelectedDisciplina('');
    }
  }, [selectedTurma]);

  // Set up transcription callback
  useEffect(() => {
    onTranscriptionReceived((text: string) => {
      setTheme(prev => prev ? `${prev} ${text}` : text);
      toast({
        title: 'Sucesso',
        description: 'Tema gravado com sucesso!',
      });
    });
  }, [onTranscriptionReceived, toast]);

  const loadTurmas = async () => {
    setLoadingTurmas(true);
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
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as turmas',
        variant: 'destructive',
      });
    } finally {
      setLoadingTurmas(false);
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


  const handleGenerateTags = async () => {
    if (!theme) return;

    setGeneratingTags(true);
    try {
      const disciplinaData = disciplinas.find(d => d.id === selectedDisciplina);
      
      const { data, error } = await supabase.functions.invoke('generate-lecture-tags', {
        body: {
          theme,
          discipline: disciplinaData?.nome,
          content: lessonPlanFile ? await lessonPlanFile.text() : undefined
        }
      });

      if (error) throw error;
      setTags(data.tags);
    } catch (error) {
      console.error('Error generating tags:', error);
      toast({
        title: 'Aviso',
        description: 'Não foi possível gerar tags automaticamente',
        variant: 'destructive',
      });
    } finally {
      setGeneratingTags(false);
    }
  };

  const handleStartRecording = async () => {
    if (!theme || !selectedTurma) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o tema e selecione uma turma',
        variant: 'destructive',
      });
      return;
    }

    setStep('generating');

    try {
      // Create lecture record
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Upload lesson plan if provided
      let lessonPlanUrl = null;
      if (lessonPlanFile) {
        const fileName = `${Date.now()}_${lessonPlanFile.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('lecture-audio')
          .upload(`lesson-plans/${user.id}/${fileName}`, lessonPlanFile);

        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage
          .from('lecture-audio')
          .getPublicUrl(uploadData.path);
        
        lessonPlanUrl = urlData.publicUrl;
      }

      const { data: lecture, error } = await supabase
        .from('lectures')
        .insert({
          title: theme,
          teacher_id: user.id,
          class_id: selectedTurma,
          disciplina_id: selectedDisciplina || null,
          status: 'recording',
          raw_transcript: '',
          tags: tags,
          lesson_plan_url: lessonPlanUrl
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Iniciando gravação da aula...',
      });

      // Navigate to LiveLecture with lectureId
      navigate(`/live-lecture?lectureId=${lecture.id}`);
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating lecture:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao iniciar gravação',
        variant: 'destructive',
      });
      setStep('input');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Nova Gravação de Aula</DialogTitle>
          <DialogDescription>
            Configure os detalhes da sua aula antes de iniciar a gravação
          </DialogDescription>
        </DialogHeader>

        {step === 'input' ? (
          <div className="space-y-6 py-4">
            {/* Theme Input */}
            <div className="space-y-2">
              <Label>Tema da Aula *</Label>
              <div className="flex gap-2 mb-2">
                <Button
                  type="button"
                  variant={inputMode === 'text' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setInputMode('text')}
                >
                  <Type className="h-4 w-4 mr-2" />
                  Texto
                </Button>
                <Button
                  type="button"
                  variant={inputMode === 'audio' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setInputMode('audio')}
                >
                  <Mic className="h-4 w-4 mr-2" />
                  Áudio
                </Button>
              </div>

              {inputMode === 'text' ? (
                <Textarea
                  placeholder="Ex: Introdução à Termodinâmica - Primeira Lei"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="min-h-20"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={isRecording ? 'destructive' : 'default'}
                    onClick={isRecording ? stopRecording : startRecording}
                  >
                    <Mic className="h-4 w-4 mr-2" />
                    {isRecording ? 'Parar Gravação' : 'Gravar Tema'}
                  </Button>
                  {theme && (
                    <span className="text-sm text-muted-foreground">
                      Tema gravado: {theme.substring(0, 50)}...
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Turma Selection */}
            <div className="space-y-2">
              <Label>Turma *</Label>
              <Select value={selectedTurma} onValueChange={setSelectedTurma}>
                <SelectTrigger disabled={loadingTurmas}>
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

            {/* Disciplina Selection */}
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
                </SelectContent>
              </Select>
            </div>

            {/* Lesson Plan Upload */}
            <div className="space-y-2">
              <Label>Plano de Aula (PDF opcional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setLessonPlanFile(e.target.files?.[0] || null)}
                  className="flex-1"
                />
                {lessonPlanFile && (
                  <span className="text-sm text-muted-foreground">
                    {lessonPlanFile.name}
                  </span>
                )}
              </div>
            </div>

            {/* Generate Tags */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Tags Automáticas</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateTags}
                  disabled={!theme || generatingTags}
                >
                  {generatingTags ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Gerar Tags
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleStartRecording} disabled={!theme || !selectedTurma}>
                Iniciar Gravação
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg">Preparando gravação...</p>
            <p className="text-sm text-muted-foreground">
              Criando registro da aula e configurando sistema
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};