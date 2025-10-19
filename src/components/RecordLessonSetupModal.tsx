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
import { Mic, FileText, Sparkles, Loader2, GraduationCap, BookOpen, X, CheckCircle2, Plus, ArrowRight } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
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
  const [theme, setTheme] = useState('');
  const [generatedTitle, setGeneratedTitle] = useState('');
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


  const handleGenerateTagsAndTitle = async () => {
    if (!theme || !selectedDisciplina || theme.length < 20) return;

    setGeneratingTags(true);
    try {
      const disciplinaData = disciplinas.find(d => d.id === selectedDisciplina);
      
      const { data, error } = await supabase.functions.invoke('generate-lecture-tags', {
        body: {
          theme,
          discipline: disciplinaData?.nome,
        }
      });

      if (error) throw error;
      
      setTags(data.tags || []);
      setGeneratedTitle(data.title || theme);
      
      toast({
        title: '✨ Tags e título gerados!',
        description: 'Conteúdo gerado com sucesso pela IA',
      });
    } catch (error) {
      console.error('Error generating tags:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível gerar tags e título',
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
          title: generatedTitle || theme,
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
      navigate(`/livelecture?lectureId=${lecture.id}`);
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
              {/* Hero Section - Theme Input with Integrated Audio - Glassmorphism */}
              <div className="space-y-3 backdrop-blur-md bg-white/8 dark:bg-white/5 border border-white/12 shadow-[0_4px_6px_rgba(0,0,0,0.05),0_10px_15px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.1)] rounded-xl p-6">
                <Label className="text-base font-semibold flex items-center gap-2">
                  🎯 Tema da Aula <span className="text-destructive">*</span>
                </Label>

                <div className="relative">
                  <Textarea
                    placeholder={
                      isRecording 
                        ? "🔴 Gravando... Fale o tema da aula" 
                        : "Ex: Leis de Newton - Aplicações em Sistemas Mecânicos Complexos"
                    }
                    value={theme}
                    onChange={(e) => setTheme(e.target.value.slice(0, 200))}
                    className={cn(
                      "min-h-[120px] text-base resize-none pr-20 transition-all duration-300",
                      isRecording && "ring-2 ring-red-500/30 animate-pulse-border-subtle"
                    )}
                    maxLength={200}
                  />
                  
                  {/* Integrated Microphone Button */}
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className={cn(
                      "absolute bottom-3 right-12 h-10 w-10 rounded-full transition-all",
                      isRecording 
                        ? "bg-red-500 hover:bg-red-600 text-white animate-pulse" 
                        : "hover:bg-accent"
                    )}
                    onClick={() => {
                      if (isRecording) {
                        stopRecording();
                      } else {
                        startRecording();
                      }
                    }}
                  >
                    <Mic className={cn(
                      "h-5 w-5",
                      isRecording && "animate-pulse"
                    )} />
                  </Button>
                  
                  {/* Character Counter & Validation */}
                  <div className="absolute bottom-3 right-2 flex items-center gap-2">
                    {theme.length >= 20 && !isRecording && (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                    <span className={`text-xs ${theme.length >= 180 ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {theme.length}/200
                    </span>
                  </div>
                  
                  {/* Wave Animation when recording */}
                  {isRecording && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
                      <div className="wave-animation" />
                    </div>
                  )}
                </div>
              </div>

              {/* AI Generate Button - Inspired by Teacher AI Chat */}
              <Button
                onClick={handleGenerateTagsAndTitle}
                disabled={!theme || theme.length < 20 || !selectedDisciplina || generatingTags}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generatingTags ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="animate-pulse">Gerando Tags e Título...</span>
                  </div>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    Salvar Tema e Gerar Tags
                  </>
                )}
              </Button>

              {/* Tags Display */}
              {tags.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Tags Geradas pela IA
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag, idx) => (
                      <Badge 
                        key={idx} 
                        variant="secondary" 
                        className="text-xs animate-fade-in opacity-0"
                        style={{
                          animationDelay: `${idx * 100}ms`,
                          animationFillMode: 'forwards'
                        }}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

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
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
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

        {/* Sticky Footer with Action Buttons */}
        {step === 'input' && (
          <div className="sticky bottom-0 left-0 right-0 mt-4 pt-6 border-t backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 -mx-6 -mb-6 px-6 pb-6">
            <div className="flex flex-col-reverse sm:flex-row gap-3 items-stretch sm:items-center sm:justify-end">
              {/* Cancelar - Subtle, pushed left on desktop */}
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  if (theme || selectedTurma || selectedDisciplina) {
                    if (!confirm('Descartar alterações e sair?')) return;
                  }
                  onOpenChange(false);
                }}
                className="sm:mr-auto text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </Button>
              
              {/* Iniciar Gravação - Hero Button, right side on desktop, top on mobile */}
              <Button
                onClick={handleStartRecording}
                disabled={!isFormValid || generatingTags || tags.length === 0}
                className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-500 hover:from-purple-700 hover:via-pink-700 hover:to-red-600 text-white font-bold py-4 px-8 rounded-xl shadow-2xl hover:shadow-3xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Mic className="h-6 w-6 mr-3" />
                <span className="text-lg">Iniciar Gravação</span>
              </Button>
            </div>
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