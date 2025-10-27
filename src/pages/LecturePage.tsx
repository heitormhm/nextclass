import React, { useState, useRef, useEffect } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Play, Pause, Volume2, Search, Share, PenTool, VolumeX, Settings, Clock, User, Calendar, BookOpen, Brain, Download, FolderOpen, FileText, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import MainLayout from '@/components/MainLayout';
import { FlashcardModal } from '@/components/FlashcardModal';
import { sanitizeHTML } from '@/utils/sanitize';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { StudentBackgroundGrid } from '@/components/ui/student-background-grid';

interface TranscriptItem {
  timestamp: string;
  speaker: string;
  text: string;
  seconds: number;
}

const LecturePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const duration = audioDuration || 3600; // Use actual audio duration or fallback
  const [volume, setVolume] = useState([80]);
  const [isMuted, setIsMuted] = useState(false);
  const [activeTab, setActiveTab] = useState('material');
  const [highlightedTranscript, setHighlightedTranscript] = useState(0);
  const [isReferencesOpen, setIsReferencesOpen] = useState(false);
  const [isFlashcardModalOpen, setIsFlashcardModalOpen] = useState(false);
  const { id } = useParams(); // Get the current lecture ID from the URL
  const transcriptRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [lectureData, setLectureData] = useState<any>(null);
  const [isLoadingLecture, setIsLoadingLecture] = useState(true);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);

  // Load lecture from database
  useEffect(() => {
    const loadLectureFromDB = async () => {
      if (!id) return;
      
      setIsLoadingLecture(true);
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          toast.error('Você precisa estar logado');
          navigate('/auth');
          return;
        }
        
        // ✅ FASE 2: Load lecture with detailed debugging
        console.log('[LecturePage] 🔍 Starting lecture load:', {
          lectureId: id,
          userId: user.id,
          timestamp: new Date().toISOString()
        });

        const { data: lecture, error: lectureError } = await supabase
          .from('lectures')
          .select(`
            id,
            title,
            structured_content,
            created_at,
            audio_url,
            duration,
            raw_transcript,
            turma_id,
            teacher_id,
            disciplina_id,
            status
          `)
          .eq('id', id)
          .maybeSingle();
        
        console.log('[LecturePage] 📊 Lecture query result:', {
          lecture,
          error: lectureError,
          hasLecture: !!lecture
        });

        if (lectureError) {
          console.error('[LecturePage] ❌ Error loading lecture:', {
            error: lectureError,
            message: lectureError.message,
            details: lectureError.details,
            hint: lectureError.hint
          });
          toast.error('Erro ao carregar aula');
          navigate('/courses');
          return;
        }

        if (!lecture) {
          console.error('[LecturePage] ❌ Lecture not found in database:', { lectureId: id });
          toast.error('Aula não encontrada no banco de dados');
          navigate('/courses');
          return;
        }

        // Verificar se está publicada APÓS buscar a aula
        if (lecture.status !== 'published') {
          console.error('[LecturePage] ❌ Lecture not published:', {
            lectureId: id,
            status: lecture.status
          });
          toast.error('Esta aula ainda não foi publicada pelo professor');
          navigate('/courses');
          return;
        }

        console.log('[LecturePage] ✅ Lecture loaded:', {
          id: lecture.id,
          title: lecture.title,
          turmaId: lecture.turma_id,
          teacherId: lecture.teacher_id,
          hasThumbnail: !!(lecture.structured_content as any)?.thumbnail
        });

        // ✅ Fetch teacher info separately
        const { data: teacher, error: teacherError } = await supabase
          .from('users')
          .select('full_name')
          .eq('id', lecture.teacher_id)
          .single();

        console.log('[LecturePage] 👨‍🏫 Teacher query:', {
          teacher,
          error: teacherError
        });

        // ✅ Fetch turma info separately
        const { data: turma, error: turmaError } = await supabase
          .from('turmas')
          .select('nome_turma, periodo, curso')
          .eq('id', lecture.turma_id)
          .single();

        console.log('[LecturePage] 🏫 Turma query:', {
          turma,
          error: turmaError
        });

        // ✅ Check enrollment FIRST
        console.log('[LecturePage] 🎓 Checking enrollment:', {
          alunoId: user.id,
          turmaId: lecture.turma_id
        });

        const { data: enrollment, error: enrollmentError } = await supabase
          .from('turma_enrollments')
          .select('id')
          .eq('aluno_id', user.id)
          .eq('turma_id', lecture.turma_id)
          .maybeSingle();
      
        console.log('[LecturePage] 📋 Enrollment check result:', {
          enrollment,
          error: enrollmentError,
          hasEnrollment: !!enrollment
        });

        if (enrollmentError) {
          console.error('[LecturePage] ❌ Error checking enrollment:', enrollmentError);
        }
        
        if (!enrollment) {
          console.error('[LecturePage] ❌ No enrollment found for user');
          toast.error('Você não tem acesso a esta aula. Verifique sua matrícula.');
          navigate('/courses');
          return;
        }

        console.log('[LecturePage] ✅ Access granted - Loading lecture data');

        // ✅ Merge data
        const lectureWithRelations = {
          ...lecture,
          users: teacher ? { full_name: teacher.full_name } : null,
          turmas: turma
        };
        
        console.log('[LecturePage] 🎉 Final lecture data:', lectureWithRelations);
      
        setLectureData(lectureWithRelations);

        // ✅ FASE 2: Process transcript from database
        if (lectureWithRelations.raw_transcript) {
          const transcriptText = lectureWithRelations.raw_transcript;
          const teacherName = teacher?.full_name || 'Professor';
          
          // Create transcript item(s) from raw_transcript
          const transcriptItems: TranscriptItem[] = [{
            timestamp: '00:00',
            speaker: teacherName,
            text: transcriptText,
            seconds: 0
          }];
          
          setTranscript(transcriptItems);
          console.log('[LecturePage] ✅ Transcript loaded:', transcriptItems.length, 'items');
        }
      
      // Register view
      const { error: viewError } = await supabase
        .from('lecture_views')
        .insert({
          lecture_id: id,
          user_id: user.id,
          viewed_at: new Date().toISOString()
        })
        .select()
        .maybeSingle();
      
      if (viewError) {
        console.log('[LecturePage] View already registered or insert failed:', viewError);
      } else {
        console.log('[LecturePage] ✅ View registered successfully');
      }
        
      } catch (error) {
        console.error('Error:', error);
        toast.error('Erro ao carregar aula');
      } finally {
        setIsLoadingLecture(false);
      }
    };
    
    loadLectureFromDB();
  }, [id, navigate]);

  // Convert timestamp string (MM:SS) to seconds
  const timestampToSeconds = (timestamp: string): number => {
    const parts = timestamp.split(':');
    if (parts.length === 2) {
      const minutes = parseInt(parts[0], 10);
      const seconds = parseInt(parts[1], 10);
      return minutes * 60 + seconds;
    }
    return 0;
  };

  // Handle timestamp navigation from quiz remediation
  useEffect(() => {
    const timestamp = searchParams.get('timestamp');
    if (timestamp) {
      const seconds = timestampToSeconds(timestamp);
      
      // Switch to transcript tab
      setActiveTab('transcricao');
      
      // Set video time and highlight transcript
      setCurrentTime(seconds);
      setHighlightedTranscript(seconds);
      
      // Scroll to transcript after a short delay to ensure tab switch
      setTimeout(() => {
        if (transcriptRef.current) {
          transcriptRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
      
      // Show toast notification
      toast.success(`Retomando a aula em ${timestamp}`);
    }
  }, [searchParams]);

  // Mock content for Material Aprimorado
  const materialAprimoradoContent = `
    <div class="space-y-6">
      <div>
        <h2 class="text-lg font-semibold text-gray-800 mb-3">🔬 Conceitos Fundamentais</h2>
        <ul class="list-disc pl-6 space-y-2">
          <li class="text-gray-700">O sistema cardiovascular é composto por coração, vasos sanguíneos e sangue</li>
          <li class="text-gray-700">O coração possui quatro câmaras: dois átrios e dois ventrículos</li>
          <li class="text-gray-700">A circulação pulmonar e sistêmica trabalham de forma integrada</li>
        </ul>
      </div>
      
      <div>
        <h2 class="text-lg font-semibold text-gray-800 mb-3">⚡ Fisiopatologia Cardíaca</h2>
        <p class="text-gray-700 mb-4">
          As principais patologias cardiovasculares incluem:
        </p>
        <ol class="list-decimal pl-6 space-y-2">
          <li class="text-gray-700">Insuficiência cardíaca congestiva</li>
          <li class="text-gray-700">Doença arterial coronariana</li>
          <li class="text-gray-700">Arritmias cardíacas</li>
          <li class="text-gray-700">Valvulopatias</li>
        </ol>
      </div>
      
      <div>
        <h2 class="text-lg font-semibold text-gray-800 mb-3">🩺 Métodos Diagnósticos</h2>
        <p class="text-gray-700">
          O diagnóstico em cardiologia utiliza múltiplas ferramentas: 
          <span class="bg-yellow-200 px-1">exame físico detalhado</span>, 
          eletrocardiograma (ECG), ecocardiograma, e exames laboratoriais específicos.
        </p>
      </div>
    </div>
  `;

  const handleAnnotate = () => {
    // Navigate to annotation page with pre-populated content
    navigate(`/annotation/${id}`, {
      state: {
        prePopulatedContent: `
          <div class="space-y-6">
            <div>
              <h2 class="text-lg font-semibold text-primary mb-4">## Anotações sobre o Material Aprimorado</h2>
            </div>
            ${materialAprimoradoContent}
            <div>
              <h2 class="text-lg font-semibold text-gray-800 mb-3">📝 Minhas Anotações</h2>
              <p class="text-gray-700" style="color: #9ca3af; font-style: italic;">
                Adicione suas anotações pessoais aqui...
              </p>
            </div>
          </div>
        `
      }
    });
  };

  const handleAddToAnnotations = () => {
    const materialContent = lectureData?.structured_content?.material_didatico || '';
    navigate(`/annotation/${id}`, {
      state: {
        prePopulatedContent: materialContent,
        lectureTitle: lectureData?.title || 'Material da Aula'
      }
    });
    toast.success('Redirecionando para anotações...');
  };

  // Display lecture data from database or fallback to mock
  const displayLectureData = lectureData ? {
    title: lectureData.title || 'Sem título',
    professor: lectureData.users?.full_name || 'Professor',
    date: new Date(lectureData.created_at).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }),
    duration: lectureData.duration ? `${Math.round(lectureData.duration / 60)} min` : '60 min',
    summary: lectureData.structured_content?.resumo || 'Resumo não disponível',
    topics: lectureData.structured_content?.topicos_principais?.map((t: any) => t.conceito) || []
  } : {
    title: 'Carregando...',
    professor: '',
    date: '',
    duration: '',
    summary: '',
    topics: []
  };

  // Transcript is now loaded from database via useState hook (line 43)

  // Mock bibliography data
  const bibliography = [
    {
      type: 'Livro',
      title: 'Braunwald\'s Heart Disease: A Textbook of Cardiovascular Medicine',
      authors: 'Douglas L. Mann, Douglas P. Zipes, Peter Libby',
      edition: '12ª Edição',
      publisher: 'Elsevier',
      year: '2021'
    },
    {
      type: 'Artigo',
      title: 'Fisiopatologia da insuficiência cardíaca: conceitos atuais',
      authors: 'Santos, M.A.; Silva, J.P.; Costa, R.F.',
      journal: 'Revista Brasileira de Cardiologia',
      volume: 'Vol. 45, n. 3',
      year: '2023'
    },
    {
      type: 'Livro',
      title: 'Fisiologia Cardiovascular',
      authors: 'David E. Mohrman, Lois Jane Heller',
      edition: '8ª Edição',
      publisher: 'McGraw-Hill',
      year: '2018'
    },
    {
      type: 'Link',
      title: 'Guidelines ESC/ESH para o tratamento da hipertensão arterial',
      url: 'https://www.escardio.org/Guidelines',
      organization: 'European Society of Cardiology',
      year: '2023'
    }
  ];

  const enhancedMaterial = `
# Fisiopatologia do Sistema Cardiovascular

## Introdução

O sistema cardiovascular é responsável pelo transporte de sangue, nutrientes e oxigênio por todo o corpo. Compreender sua fisiopatologia é fundamental para o diagnóstico e tratamento de doenças cardíacas.

## Anatomia Cardíaca

### Estrutura do Coração

O coração é um órgão muscular oco localizado no mediastino. Possui quatro câmaras:

- **Átrios**: Câmaras superiores (direito e esquerdo)
- **Ventrículos**: Câmaras inferiores (direito e esquerdo)

### Válvulas Cardíacas

1. **Válvula Tricúspide**: Entre átrio e ventrículo direitos
2. **Válvula Pulmonar**: Saída do ventrículo direito
3. **Válvula Mitral**: Entre átrio e ventrículo esquerdos  
4. **Válvula Aórtica**: Saída do ventrículo esquerdo

## Fisiologia Cardíaca

### Ciclo Cardíaco

O ciclo cardíaco compreende:

- **Sístole**: Contração ventricular (pressão ~120 mmHg)
- **Diástole**: Relaxamento ventricular (pressão ~80 mmHg)

### Condução Elétrica

O sistema de condução inclui:
- Nó sinoatrial (marca-passo natural)
- Nó atrioventricular
- Feixe de His
- Fibras de Purkinje

## Patologias Principais

### Insuficiência Cardíaca

Condição na qual o coração não consegue bombear sangue adequadamente [1].

### Arritmias

Distúrbios do ritmo cardíaco que podem ser:
- Bradicardias (< 60 bpm)
- Taquicardias (> 100 bpm)

---

*[1] Referência: Braunwald's Heart Disease: A Textbook of Cardiovascular Medicine*
  `;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleAudioTimeUpdate = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    setCurrentTime(Math.floor(e.currentTarget.currentTime));
  };

  const handleAudioLoadedMetadata = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    setAudioDuration(Math.floor(e.currentTarget.duration));
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value);
    if (audioRef.current) {
      audioRef.current.volume = value[0] / 100;
    }
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
    }
  };

  const handleTimeJump = (seconds: number) => {
    setCurrentTime(seconds);
    setHighlightedTranscript(seconds);
  };

  const handleProgressChange = (value: number[]) => {
    setCurrentTime(value[0]);
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
    }
  };

  const handleDownload = () => {
    toast.success("Download iniciado! (funcionalidade simulada)");
  };

  // Loading state
  if (isLoadingLecture) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-6">
          <Card className="p-8">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
              <span className="ml-3 text-lg">Carregando aula...</span>
            </div>
          </Card>
        </div>
      </MainLayout>
    );
  }

  // No access state
  if (!lectureData) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-6">
          <Card className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-2">Aula não encontrada</h2>
            <p className="text-slate-600 mb-4">Você pode não ter acesso a esta aula.</p>
            <Button onClick={() => navigate('/dashboard')}>
              Voltar ao Dashboard
            </Button>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-pink-50/30 to-purple-50/30">
        {/* Grid (z-0) */}
        <StudentBackgroundGrid />
        
        {/* Blobs (z-10) */}
        <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-br from-pink-100/40 to-purple-100/40 rounded-full filter blur-3xl opacity-40 z-10" />
        <div className="absolute bottom-40 right-20 w-80 h-80 bg-gradient-to-br from-purple-100/40 to-teal-100/40 rounded-full filter blur-3xl opacity-40 z-10" />
        
        {/* Content (z-20) */}
        <div className="relative z-20 container mx-auto px-4 py-6">
        {/* Two-Panel Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* Left Panel - Audio Player */}
          <div className="xl:col-span-3 space-y-4">
            {/* Audio Player Moderno */}
            <Card className="border-0 shadow-sm overflow-hidden bg-white/60 backdrop-blur-xl">
              <CardContent className="p-6">
                {/* Waveform Visual */}
                <div className="relative h-32 mb-6 rounded-lg bg-gradient-to-r from-purple-100/50 via-pink-100/50 to-purple-100/50 overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex gap-1 items-end h-20">
                      {[...Array(50)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-1 bg-gradient-to-t from-purple-500 to-pink-500 rounded-full transition-all ${
                            isPlaying ? 'animate-pulse' : ''
                          }`}
                          style={{
                            height: `${Math.random() * 60 + 20}%`,
                            animationDelay: `${i * 0.05}s`
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  
                  {/* Play Button Centralizado */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handlePlayPause}
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-16 w-16 rounded-full bg-white/90 hover:bg-white shadow-lg z-10"
                  >
                    {isPlaying ? (
                      <Pause className="h-8 w-8 text-purple-600" />
                    ) : (
                      <Play className="h-8 w-8 text-purple-600 ml-1" />
                    )}
                  </Button>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <Slider
                    value={[currentTime]}
                    max={duration}
                    step={1}
                    className="w-full"
                    onValueChange={handleProgressChange}
                  />
                  
                  <div className="flex items-center justify-between text-xs text-foreground-muted">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Controles do Player */}
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handlePlayPause}
                      className="h-10 w-10"
                    >
                      {isPlaying ? (
                        <Pause className="h-5 w-5" />
                      ) : (
                        <Play className="h-5 w-5" />
                      )}
                    </Button>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleMuteToggle}
                        className="h-8 w-8"
                      >
                        {isMuted ? (
                          <VolumeX className="h-4 w-4" />
                        ) : (
                          <Volume2 className="h-4 w-4" />
                        )}
                      </Button>
                      <Slider
                        value={volume}
                        max={100}
                        step={1}
                        className="w-20 sm:w-28"
                        onValueChange={handleVolumeChange}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {displayLectureData.duration}
                    </Badge>
                  </div>
                </div>

                {/* HTML5 Audio Element (hidden) */}
                <audio
                  ref={audioRef}
                  src={lectureData?.audio_url}
                  onTimeUpdate={handleAudioTimeUpdate}
                  onLoadedMetadata={handleAudioLoadedMetadata}
                />
              </CardContent>
            </Card>

            {/* Lecture Info */}
            <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-xl">
              <CardContent className="p-4">
                <h1 className="text-2xl font-bold mb-2">{displayLectureData.title}</h1>
                <div className="flex flex-wrap items-center gap-4 text-sm text-foreground-muted">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>{displayLectureData.professor}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{displayLectureData.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{displayLectureData.duration}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Tabs */}
          <div className="xl:col-span-2">
            <div className="xl:sticky xl:top-20">
              <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-xl">
                <CardContent className="p-0">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                    <div className="border-b">
                      <TabsList className="grid w-full grid-cols-3 bg-transparent h-auto p-0">
                        <TabsTrigger 
                          value="transcript"
                          className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary transition-all"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          <span className="text-sm">Transcrição</span>
                        </TabsTrigger>
                        <TabsTrigger 
                          value="summary"
                          className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary transition-all"
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          <span className="text-sm">Resumo</span>
                        </TabsTrigger>
                        <TabsTrigger 
                          value="anexos" 
                          className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary transition-all"
                        >
                          <FolderOpen className="h-4 w-4 mr-2" />
                          <span className="text-sm">Anexos</span>
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    {/* Transcript Tab */}
                    <TabsContent value="transcript" className="flex-1 p-0 m-0">
                      <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
                        {transcript.map((item, index) => {
                          const isHighlighted = currentTime >= item.seconds && 
                            (index === transcript.length - 1 || currentTime < transcript[index + 1].seconds);
                          
                          return (
                            <div
                              key={index}
                              ref={isHighlighted ? transcriptRef : null}
                              className={`p-3 rounded-lg transition-all cursor-pointer hover:bg-accent/50 ${
                                isHighlighted
                                  ? 'bg-primary/10 border-l-4 border-primary'
                                  : 'bg-background/50'
                              }`}
                              onClick={() => handleTimeJump(item.seconds)}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs">
                                  {item.timestamp}
                                </Badge>
                                <span className="text-xs font-medium text-foreground-muted">
                                  {item.speaker}
                                </span>
                              </div>
                              <p className="text-sm leading-relaxed">{item.text}</p>
                            </div>
                          );
                        })}
                      </div>
                    </TabsContent>

                    {/* Summary Tab - FASE 6: Dados Reais */}
                    <TabsContent value="summary" className="flex-1 p-0 m-0">
                      <div className="p-4 max-h-[600px] overflow-y-auto">
                        <div className="prose prose-sm max-w-none">
                          <h3 className="text-lg font-semibold mb-3">Resumo da Aula</h3>
                          
                          {/* Resumo Principal */}
                          {lectureData?.structured_content?.resumo && (
                            <div className="bg-primary/5 border-l-4 border-primary p-4 rounded-r-lg mb-4">
                              <p className="text-foreground-muted leading-relaxed">
                                {lectureData.structured_content.resumo}
                              </p>
                            </div>
                          )}
                          
                          {/* Tópicos Principais */}
                          {lectureData?.structured_content?.topicos_principais && 
                           lectureData.structured_content.topicos_principais.length > 0 && (
                            <div className="mb-4">
                              <h4 className="text-base font-semibold mb-3 flex items-center gap-2">
                                <BookOpen className="h-4 w-4 text-primary" />
                                Tópicos Principais
                              </h4>
                              <ul className="space-y-3">
                                {lectureData.structured_content.topicos_principais.map((topico: any, index: number) => (
                                  <li key={index} className="bg-white/80 border border-primary/10 rounded-lg p-3">
                                    <div className="flex items-start gap-2">
                                      <Badge variant="secondary" className="mt-0.5">
                                        {index + 1}
                                      </Badge>
                                      <div className="flex-1">
                                        <div className="font-medium text-sm mb-1">
                                          {topico.conceito || topico}
                                        </div>
                                        {topico.descricao && (
                                          <div className="text-xs text-foreground-muted">
                                            {topico.descricao}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Conceitos-Chave */}
                          {lectureData?.structured_content?.conceitos_chave && 
                           lectureData.structured_content.conceitos_chave.length > 0 && (
                            <div className="mt-6 p-4 bg-purple-50/50 rounded-lg border border-purple-200/50">
                              <h4 className="text-base font-semibold mb-3 flex items-center gap-2">
                                <Brain className="h-4 w-4 text-purple-600" />
                                Conceitos-Chave
                              </h4>
                              <div className="grid grid-cols-1 gap-2">
                                {lectureData.structured_content.conceitos_chave.map((conceito: string, index: number) => (
                                  <div key={index} className="flex items-start gap-2 text-sm">
                                    <span className="text-purple-600 mt-1">•</span>
                                    <span>{conceito}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </TabsContent>

                    {/* Anexos Tab - FASE 3: Material Didático Real */}
                    <TabsContent value="anexos" className="flex-1 p-0 m-0">
                      <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
                        {/* Material Didático Gerado */}
                        {lectureData?.structured_content?.material_didatico && (
                          <div className="mb-6">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-base font-semibold flex items-center gap-2">
                                <BookOpen className="h-5 w-5 text-primary" />
                                Material Didático
                              </h3>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleAddToAnnotations}
                                className="text-xs"
                              >
                                <PenTool className="h-3 w-3 mr-1" />
                                Adicionar às Anotações
                              </Button>
                            </div>
                            
                            <Card className="border-primary/20 bg-white/80">
                              <CardContent className="p-4">
                                <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed">
                                  {lectureData.structured_content.material_didatico}
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        )}

                        {/* Flashcards Gerados */}
                        {lectureData?.structured_content?.flashcards && 
                         lectureData.structured_content.flashcards.length > 0 && (
                          <div className="mb-6">
                            <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                              <Sparkles className="h-5 w-5 text-primary" />
                              Flashcards ({lectureData.structured_content.flashcards.length})
                            </h3>
                            
                            <div className="grid grid-cols-1 gap-3">
                              {lectureData.structured_content.flashcards.slice(0, 3).map((card: any, index: number) => (
                                <Card key={index} className="border-primary/10 hover:border-primary/30 transition-colors">
                                  <CardContent className="p-3">
                                    <div className="font-medium text-sm mb-1 text-primary">
                                      {card.termo || card.front}
                                    </div>
                                    <div className="text-xs text-foreground-muted line-clamp-2">
                                      {card.definicao || card.back}
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                            
                            {lectureData.structured_content.flashcards.length > 3 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/review?lectureId=${id}`)}
                                className="w-full mt-3"
                              >
                                Ver todos os {lectureData.structured_content.flashcards.length} flashcards
                              </Button>
                            )}
                          </div>
                        )}
                        
                        <h3 className="text-base font-semibold mb-3">Recursos Adicionais</h3>
                        
                        <div className="space-y-3">
                          <Card 
                            className="hover:shadow-md transition-all cursor-pointer border border-primary/20 hover:border-primary" 
                            onClick={handleDownload}
                          >
                            <CardContent className="p-3 flex items-center gap-3">
                              <Download className="h-5 w-5 text-primary shrink-0" />
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-sm mb-0.5 truncate">Slides da Aula</h4>
                                <p className="text-xs text-foreground-muted">PDF • 12.5 MB</p>
                              </div>
                            </CardContent>
                          </Card>

                          <Card 
                            className="hover:shadow-md transition-all cursor-pointer border border-primary/20 hover:border-primary" 
                            onClick={handleDownload}
                          >
                            <CardContent className="p-3 flex items-center gap-3">
                              <Download className="h-5 w-5 text-primary shrink-0" />
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-sm mb-0.5 truncate">Notas de Aula</h4>
                                <p className="text-xs text-foreground-muted">PDF • 2.3 MB</p>
                              </div>
                            </CardContent>
                          </Card>

                          <Card 
                            className="hover:shadow-md transition-all cursor-pointer border border-primary/20 hover:border-primary" 
                            onClick={handleDownload}
                          >
                            <CardContent className="p-3 flex items-center gap-3">
                              <Download className="h-5 w-5 text-primary shrink-0" />
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-sm mb-0.5 truncate">Artigos Científicos</h4>
                                <p className="text-xs text-foreground-muted">ZIP • 8.7 MB</p>
                              </div>
                            </CardContent>
                          </Card>

                          <Card 
                            className="hover:shadow-md transition-all cursor-pointer border border-primary/20 hover:border-primary" 
                            onClick={handleDownload}
                          >
                            <CardContent className="p-3 flex items-center gap-3">
                              <Download className="h-5 w-5 text-primary shrink-0" />
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-sm mb-0.5 truncate">Exercícios Práticos</h4>
                                <p className="text-xs text-foreground-muted">PDF • 1.8 MB</p>
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        <div className="mt-6">
                          <h3 className="text-base font-semibold mb-3">Bibliografia Recomendada</h3>
                          <div className="space-y-3">
                            {bibliography.map((ref, index) => (
                              <Card key={index} className="border-primary/10">
                                <CardContent className="p-3">
                                  <Badge variant="secondary" className="text-xs mb-2">
                                    {ref.type}
                                  </Badge>
                                  <h4 className="font-semibold text-sm mb-1">{ref.title}</h4>
                                  <p className="text-xs text-foreground-muted">
                                    {ref.authors || ref.organization}
                                  </p>
                                  <p className="text-xs text-foreground-muted">
                                    {ref.publisher && `${ref.publisher} • `}
                                    {ref.journal && `${ref.journal} • `}
                                    {ref.year}
                                  </p>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    {/* Action Bar - FASE 5: Responsivo */}
                    <div className="border-t p-4 bg-background/50">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Button 
                          className="bg-primary hover:bg-primary/90 transition-all w-full"
                          asChild
                        >
                          <Link to={`/quiz/${id}`}>
                            <Brain className="h-4 w-4 mr-2" />
                            Fazer Quiz
                          </Link>
                        </Button>
                        <Button 
                          variant="outline"
                          className="hover:bg-accent transition-all w-full"
                          onClick={() => navigate(`/review?lectureId=${id}`)}
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          Ver Flashcards
                        </Button>
                      </div>
                    </div>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
        
        {/* Flashcard Modal */}
        <FlashcardModal
          open={isFlashcardModalOpen}
          onOpenChange={setIsFlashcardModalOpen}
        />
      </div>
      </div>
    </MainLayout>
  );
};

export default LecturePage;