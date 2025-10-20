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
import { Mic, FileText, Sparkles, Loader2, GraduationCap, BookOpen, X, CheckCircle2, Plus, ArrowRight, Paperclip, Trash2, CheckCircle, FileUp } from 'lucide-react';
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
  
  const [isDragging, setIsDragging] = useState(false);
  const [lessonPlanAnalysis, setLessonPlanAnalysis] = useState<any | null>(null);
  const [analyzingPlan, setAnalyzingPlan] = useState(false);

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

  // Auto-generate disciplina code based on name
  useEffect(() => {
    if (newDisciplinaNome && showCreateDisciplina) {
      const existingCodes = disciplinas.map(d => d.codigo || '');
      const generatedCode = generateDisciplinaCode(newDisciplinaNome, existingCodes);
      setNewDisciplinaCodigo(generatedCode);
    }
  }, [newDisciplinaNome, disciplinas, showCreateDisciplina]);

  // Helper function to generate disciplina code
  const generateDisciplinaCode = (nome: string, existingCodes: string[]): string => {
    const prefix = nome
      .trim()
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .substring(0, 3)
      .padEnd(3, 'X');
    
    let number = 1;
    let code = `${prefix}${String(number).padStart(3, '0')}`;
    
    while (existingCodes.includes(code)) {
      number++;
      code = `${prefix}${String(number).padStart(3, '0')}`;
    }
    
    return code;
  };

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

  const analyzeLessonPlan = async (file: File) => {
    setAnalyzingPlan(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tema', theme);
      
      const { data, error } = await supabase.functions.invoke('analyze-lesson-plan', {
        body: formData,
      });

      if (error) throw error;

      setLessonPlanAnalysis(data);
      
      if (data.aligned) {
        toast({
          title: "✅ Plano de Aula Analisado",
          description: `Alinhamento: ${data.completeness_score}%. O plano está adequado ao tema.`,
        });
      } else {
        toast({
          title: "⚠️ Plano Analisado com Ressalvas",
          description: "O plano pode não estar totalmente alinhado ao tema. Veja sugestões abaixo.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error analyzing lesson plan:', error);
      toast({
        title: "Erro na Análise",
        description: "Não foi possível analisar o plano. Ele será salvo normalmente.",
        variant: "destructive",
      });
    } finally {
      setAnalyzingPlan(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setLessonPlanFile(file);
      await analyzeLessonPlan(file);
    } else {
      toast({
        variant: "destructive",
        title: "Formato inválido",
        description: "Por favor, selecione um arquivo PDF.",
      });
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.type === 'application/pdf') {
      setLessonPlanFile(file);
      await analyzeLessonPlan(file);
    } else {
      toast({
        variant: "destructive",
        title: "Formato inválido",
        description: "Por favor, arraste um arquivo PDF.",
      });
    }
  };

  const handleRemoveFile = () => {
    setLessonPlanFile(null);
    setLessonPlanAnalysis(null);
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
          class_id: null,
          disciplina_id: selectedDisciplina || null,
          status: 'processing',
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
                    
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Código (gerado automaticamente)</Label>
                      <div className="px-3 py-2 bg-muted/50 border border-border rounded-md text-sm font-mono text-foreground/80">
                        {newDisciplinaCodigo || 'XXX000'}
                      </div>
                    </div>
                    
                    
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

              {/* Advanced Resources - Premium Glassmorphism Card */}
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="resources" className="border-border/50 backdrop-blur-sm bg-white/5 rounded-xl overflow-hidden">
                  <AccordionTrigger className="text-sm font-medium hover:no-underline px-4 py-3 hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-2">
                      <Paperclip className="h-4 w-4 text-purple-500" />
                      <span>Recursos Adicionais</span>
                      <Badge variant="secondary" className="ml-2 text-xs">Opcional</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 pb-6 px-4">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="lesson-plan" className="text-sm font-medium flex items-center gap-2 mb-3">
                          <FileUp className="h-4 w-4" />
                          Anexar Plano de Aula (PDF)
                        </Label>
                        
                        {/* Drag & Drop Zone */}
                        <div
                          onDragEnter={handleDragEnter}
                          onDragLeave={handleDragLeave}
                          onDragOver={handleDragOver}
                          onDrop={handleDrop}
                          className={cn(
                            "relative mt-2 border-2 border-dashed rounded-xl p-6 transition-all duration-300",
                            isDragging 
                              ? 'border-purple-500 bg-purple-500/10 scale-[1.02]' 
                              : 'border-border/50 bg-background/30 hover:border-border hover:bg-background/50'
                          )}
                        >
                          {analyzingPlan ? (
                            <div className="flex flex-col items-center gap-3 py-4">
                              <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                              <p className="text-sm text-muted-foreground animate-pulse">Analisando plano de aula com IA...</p>
                            </div>
                          ) : lessonPlanFile ? (
                            <div className="space-y-3">
                              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                                <FileText className="h-5 w-5 text-purple-500 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{lessonPlanFile.name}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {(lessonPlanFile.size / 1024).toFixed(1)} KB
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                    <CheckCircle className="h-3 w-3" />
                                    Pronto
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleRemoveFile}
                                    className="h-7 w-7 p-0 hover:bg-destructive/20 hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              
                              {lessonPlanAnalysis && (
                                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-purple-500" />
                                    <p className="text-xs font-medium">Análise da IA</p>
                                  </div>
                                  <div className="text-xs text-muted-foreground space-y-1">
                                    <p>• Alinhamento: {lessonPlanAnalysis.completeness_score}%</p>
                                    {lessonPlanAnalysis.key_concepts?.length > 0 && (
                                      <p>• Conceitos: {lessonPlanAnalysis.key_concepts.join(', ')}</p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <label htmlFor="lesson-plan-input" className="cursor-pointer block">
                              <div className="flex flex-col items-center gap-3 py-2">
                                <div className="relative">
                                  <Paperclip className="h-8 w-8 text-muted-foreground" />
                                  <Sparkles className="h-4 w-4 text-purple-500 absolute -top-1 -right-1" />
                                </div>
                                <div className="text-center">
                                  <p className="text-sm font-medium">Arraste seu plano aqui ou clique para selecionar</p>
                                  <p className="text-xs text-muted-foreground mt-1">PDF (máx. 10MB)</p>
                                </div>
                                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                  <Sparkles className="h-3 w-3" />
                                  Será analisado pela IA
                                </Badge>
                              </div>
                              <Input
                                id="lesson-plan-input"
                                type="file"
                                accept=".pdf"
                                onChange={handleFileChange}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>
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
          <div className="sticky bottom-0 left-0 right-0 mt-4 pt-6 border-t border-border/50 bg-gradient-to-t from-white/95 via-white/90 to-white/80 dark:from-gray-900/95 dark:via-gray-900/90 dark:to-gray-900/80 backdrop-blur-md shadow-[0_-10px_30px_-10px_rgba(0,0,0,0.1)] rounded-t-2xl rounded-b-2xl">
            <div className="px-6 pb-6">
            <div className="flex flex-col-reverse sm:flex-row gap-3 items-stretch sm:items-center sm:justify-end">
                {/* Cancelar - Ghost with solid background */}
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    if (theme || selectedTurma || selectedDisciplina) {
                      if (!confirm('Descartar alterações e sair?')) return;
                    }
                    onOpenChange(false);
                  }}
                  className="sm:mr-auto bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm hover:shadow transition-all duration-200 px-6 py-3 flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </Button>
              
                {/* Iniciar Gravação - Optimized Hero Button */}
                <Button
                  onClick={handleStartRecording}
                  disabled={!isFormValid || generatingTags || tags.length === 0}
                  className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-pink-600 to-red-500 hover:from-purple-700 hover:via-pink-700 hover:to-red-600 text-white font-bold py-4 px-8 rounded-xl shadow-2xl hover:shadow-[0_20px_50px_-15px_rgba(168,85,247,0.5)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-2xl group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000 skew-x-12"></div>
                  <div className="relative flex items-center gap-2">
                    <Mic className="h-4 w-4" />
                    <span className="text-base font-semibold">Iniciar Gravação</span>
                  </div>
                </Button>
              </div>
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