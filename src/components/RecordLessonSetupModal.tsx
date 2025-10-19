import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Mic, Type, FileText, Sparkles, Loader2, GraduationCap, BookOpen, X, CheckCircle2, Plus, ArrowRight } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
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
  const [loadingDisciplinas, setLoadingDisciplinas] = useState(false);
  const [generatingTags, setGeneratingTags] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(true);
  const [showCreateDisciplina, setShowCreateDisciplina] = useState(false);
  const [creatingDisciplina, setCreatingDisciplina] = useState(false);
  const [newDisciplinaNome, setNewDisciplinaNome] = useState('');
  const [newDisciplinaCodigo, setNewDisciplinaCodigo] = useState('');
  const [newDisciplinaCargaHoraria, setNewDisciplinaCargaHoraria] = useState('');

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
    setLoadingDisciplinas(true);
    try {
      const { data, error } = await supabase
        .from('disciplinas')
        .select('*')
        .eq('turma_id', turmaId);

      if (error) throw error;
      setDisciplinas(data || []);
      
      // Auto-select if only one disciplina
      if (data && data.length === 1) {
        setSelectedDisciplina(data[0].id);
      }
    } catch (error) {
      console.error('Error loading disciplinas:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as disciplinas',
        variant: 'destructive',
      });
    } finally {
      setLoadingDisciplinas(false);
    }
  };


  // Auto-generate tags with debounce when theme and disciplina are filled
  useEffect(() => {
    if (!theme || !selectedDisciplina || theme.length < 20) {
      return;
    }

    const timeoutId = setTimeout(() => {
      handleGenerateTags();
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [theme, selectedDisciplina, lessonPlanFile]);

  const handleGenerateTags = async () => {
    if (!theme || !selectedDisciplina) return;

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
      setTags(data.tags || []);
    } catch (error) {
      console.error('Error generating tags:', error);
      toast({
        title: 'Aviso',
        description: 'Não foi possível gerar tags automaticamente',
        variant: 'destructive',
      });
      setTags([]);
    } finally {
      setGeneratingTags(false);
    }
  };

  const handleCreateDisciplina = async () => {
    if (!newDisciplinaNome || !selectedTurma) return;
    
    setCreatingDisciplina(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('disciplinas')
        .insert({
          nome: newDisciplinaNome,
          codigo: newDisciplinaCodigo || null,
          carga_horaria: newDisciplinaCargaHoraria ? parseInt(newDisciplinaCargaHoraria) : null,
          teacher_id: user.id,
          turma_id: selectedTurma,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setDisciplinas(prev => [...prev, data]);
      setSelectedDisciplina(data.id);
      setShowCreateDisciplina(false);
      
      setNewDisciplinaNome('');
      setNewDisciplinaCodigo('');
      setNewDisciplinaCargaHoraria('');
      
      toast({
        title: 'Disciplina criada!',
        description: `${data.nome} foi adicionada à turma`,
      });
    } catch (error) {
      console.error('Error creating disciplina:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar a disciplina',
        variant: 'destructive',
      });
    } finally {
      setCreatingDisciplina(false);
    }
  };

  const handleStartRecording = async () => {
    if (!theme || !selectedTurma || !selectedDisciplina) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o tema, selecione uma turma e uma disciplina',
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

  const isFormValid = theme.length >= 20 && selectedTurma && selectedDisciplina;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-2xl font-bold">Nova Gravação de Aula</DialogTitle>
          <DialogDescription>
            Configure os detalhes antes de iniciar
          </DialogDescription>
        </DialogHeader>

        {step === 'input' ? (
          <div className="flex-1 overflow-y-auto px-1 minimal-scrollbar">
            <div className="space-y-6 py-4">
              {/* Hero Section - Theme Input - Glassmorphism */}
              <div className="space-y-3 backdrop-blur-md bg-white/8 dark:bg-white/5 border border-white/12 shadow-[0_4px_6px_rgba(0,0,0,0.05),0_10px_15px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.1)] rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    🎯 Tema da Aula <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex gap-1.5">
                    <Button
                      type="button"
                      variant={inputMode === 'text' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setInputMode('text')}
                      className="h-8"
                    >
                      <Type className="h-3.5 w-3.5 mr-1.5" />
                      Texto
                    </Button>
                    <Button
                      type="button"
                      variant={inputMode === 'audio' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setInputMode('audio')}
                      className="h-8"
                    >
                      <Mic className="h-3.5 w-3.5 mr-1.5" />
                      Áudio
                    </Button>
                  </div>
                </div>

                {inputMode === 'text' ? (
                  <div className="relative">
                    <Textarea
                      placeholder="Ex: Leis de Newton - Aplicações em Sistemas Mecânicos Complexos"
                      value={theme}
                      onChange={(e) => setTheme(e.target.value.slice(0, 200))}
                      className="min-h-[120px] text-base resize-none pr-16"
                      maxLength={200}
                    />
                    <div className="absolute bottom-2 right-2 flex items-center gap-2">
                      {theme.length >= 20 && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                      <span className={`text-xs ${theme.length >= 180 ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {theme.length}/200
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 p-4 border rounded-lg bg-muted/30">
                    <Button
                      type="button"
                      variant={isRecording ? 'destructive' : 'default'}
                      onClick={isRecording ? stopRecording : startRecording}
                      size="lg"
                      className="w-full"
                    >
                      <Mic className={`h-4 w-4 mr-2 ${isRecording ? 'animate-pulse' : ''}`} />
                      {isRecording ? 'Parar Gravação' : 'Gravar Tema'}
                    </Button>
                    {theme && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        <strong>Gravado:</strong> {theme}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Primary Fields - Turma & Disciplina - Glassmorphism */}
              <div className="backdrop-blur-md bg-white/6 dark:bg-white/4 border border-white/10 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-start">
                  {/* Turma */}
                  <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    Turma <span className="text-destructive">*</span>
                  </Label>
                  {loadingTurmas ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Select value={selectedTurma} onValueChange={setSelectedTurma}>
                      <SelectTrigger className={!selectedTurma ? 'border-muted-foreground/30' : ''}>
                        <SelectValue placeholder="Selecione uma turma" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        {turmas.length === 0 ? (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            Nenhuma turma encontrada
                          </div>
                        ) : (
                          turmas.map((turma) => (
                            <SelectItem key={turma.id} value={turma.id}>
                              {turma.nome_turma} - {turma.periodo}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  )}
                  </div>

                  {/* Arrow indicator */}
                  <div className="hidden md:flex items-center justify-center pt-8">
                    <ArrowRight className="h-5 w-5 text-muted-foreground/50" />
                  </div>
                  <div className="md:hidden h-px bg-border/50 my-2" />

                  {/* Disciplina */}
                  <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Disciplina <span className="text-destructive">*</span>
                  </Label>
                  {loadingDisciplinas ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <>
                      <Select 
                        value={selectedDisciplina} 
                        onValueChange={(value) => {
                          if (value === '__create_new__') {
                            setShowCreateDisciplina(true);
                            setSelectedDisciplina('');
                          } else {
                            setSelectedDisciplina(value);
                            setShowCreateDisciplina(false);
                          }
                        }}
                        disabled={!selectedTurma}
                      >
                        <SelectTrigger className={`${!selectedDisciplina ? 'border-muted-foreground/30' : ''} hover:border-primary/50 hover:shadow-[0_0_0_3px_rgba(var(--primary),0.1)] transition-all`}>
                          <SelectValue placeholder={!selectedTurma ? "Selecione uma turma primeiro" : "Selecione uma disciplina"} />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {disciplinas.length === 0 ? (
                            <div className="p-6 text-center space-y-3">
                              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/30" />
                              <p className="text-sm text-muted-foreground">
                                {!selectedTurma ? 'Selecione uma turma primeiro' : 'Nenhuma disciplina cadastrada'}
                              </p>
                              {selectedTurma && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setShowCreateDisciplina(true)}
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Criar Primeira Disciplina
                                </Button>
                              )}
                            </div>
                          ) : (
                            <>
                              {disciplinas.map((disciplina) => (
                                <SelectItem key={disciplina.id} value={disciplina.id}>
                                  {disciplina.nome}
                                </SelectItem>
                              ))}
                              <Separator className="my-1" />
                              <SelectItem value="__create_new__" className="text-primary font-medium">
                                <div className="flex items-center gap-2">
                                  <Plus className="h-4 w-4" />
                                  Criar Nova Disciplina
                                </div>
                              </SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                      {!selectedTurma && (
                        <p className="text-xs text-muted-foreground mt-1">
                          👉 Selecione uma turma primeiro
                        </p>
                      )}
                      {!selectedDisciplina && selectedTurma && !showCreateDisciplina && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                          ⚠️ Disciplina obrigatória para organizar a aula
                        </p>
                      )}
                    </>
                  )}
                  </div>
                </div>

                {/* Inline Create Disciplina Form */}
                {showCreateDisciplina && (
                  <div className="mt-4 p-4 border-2 border-primary/30 rounded-lg bg-primary/5 space-y-3 animate-in slide-in-from-top-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold">Nova Disciplina</Label>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          setShowCreateDisciplina(false);
                          setNewDisciplinaNome('');
                          setNewDisciplinaCodigo('');
                          setNewDisciplinaCargaHoraria('');
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <Input 
                      placeholder="Nome da disciplina *" 
                      value={newDisciplinaNome}
                      onChange={(e) => setNewDisciplinaNome(e.target.value)}
                      disabled={creatingDisciplina}
                    />
                    
                    <Input 
                      placeholder="Código (ex: ENG101)" 
                      value={newDisciplinaCodigo}
                      onChange={(e) => setNewDisciplinaCodigo(e.target.value)}
                      disabled={creatingDisciplina}
                    />
                    
                    <Input 
                      type="number"
                      placeholder="Carga horária (horas)" 
                      value={newDisciplinaCargaHoraria}
                      onChange={(e) => setNewDisciplinaCargaHoraria(e.target.value)}
                      disabled={creatingDisciplina}
                    />
                    
                    <Button 
                      onClick={handleCreateDisciplina} 
                      disabled={!newDisciplinaNome || creatingDisciplina}
                      className="w-full"
                    >
                      {creatingDisciplina ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      Criar Disciplina
                    </Button>
                  </div>
                )}
              </div>

              {/* Advanced Resources - Collapsible - Glassmorphism */}
              <Accordion type="single" collapsible value={showAdvanced ? "advanced" : ""} onValueChange={(val) => setShowAdvanced(val === "advanced")}>
                <AccordionItem value="advanced" className="border-none">
                  <AccordionTrigger className="backdrop-blur-sm bg-white/4 dark:bg-white/3 border border-white/8 hover:bg-white/6 rounded-lg px-4 py-3 hover:no-underline transition-colors">
                    <span className="text-sm font-semibold">📂 Recursos Adicionais</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pt-4 pb-0 space-y-4">
                    {/* Lesson Plan Upload */}
                    <div className="space-y-2">
                      <Label className="text-sm flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Plano de Aula (PDF)
                      </Label>
                      <div className="flex items-center gap-2">
                        {!lessonPlanFile ? (
                          <div className="flex-1">
                            <Input
                              type="file"
                              accept=".pdf"
                              onChange={(e) => setLessonPlanFile(e.target.files?.[0] || null)}
                              className="cursor-pointer file:cursor-pointer"
                            />
                          </div>
                        ) : (
                          <div className="flex-1 flex items-center gap-2 px-3 py-2 border rounded-md bg-muted/50">
                            <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                            <span className="text-sm flex-1 truncate">{lessonPlanFile.name}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setLessonPlanFile(null)}
                              className="h-6 w-6 p-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tags - Auto-generated */}
                    <div className="space-y-2">
                      <Label className="text-sm flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Tags (geradas automaticamente)
                      </Label>
                      {generatingTags ? (
                        <div className="flex gap-2">
                          <Skeleton className="h-7 w-24 rounded-full" />
                          <Skeleton className="h-7 w-28 rounded-full" />
                          <Skeleton className="h-7 w-20 rounded-full" />
                        </div>
                      ) : tags.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {tags.slice(0, 5).map((tag, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {tags.length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{tags.length - 5} mais
                            </Badge>
                          )}
                        </div>
                      ) : theme.length >= 20 && selectedDisciplina ? (
                        <p className="text-xs text-muted-foreground italic">
                          Tags serão geradas automaticamente...
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Preencha o tema (mín. 20 caracteres) e selecione uma disciplina
                        </p>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Action Buttons */}
              <div className="flex justify-between gap-3 pt-2">
                <Button 
                  variant="ghost" 
                  onClick={() => onOpenChange(false)}
                  className="min-w-[100px]"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleStartRecording} 
                  disabled={!isFormValid || generatingTags}
                  size="lg"
                  className="min-w-[180px] bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transition-all"
                >
                  <Mic className="h-4 w-4 mr-2" />
                  Iniciar Gravação
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <p className="text-lg font-semibold">Preparando gravação...</p>
            <p className="text-sm text-muted-foreground">
              Criando registro e configurando sistema
            </p>
          </div>
        )}

        <style>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: hsl(var(--muted));
            border-radius: 3px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: hsl(var(--muted-foreground) / 0.3);
            border-radius: 3px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: hsl(var(--muted-foreground) / 0.5);
          }
          .custom-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: hsl(var(--muted-foreground) / 0.3) hsl(var(--muted));
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
};