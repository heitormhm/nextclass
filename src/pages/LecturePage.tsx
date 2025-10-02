import React, { useState, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Play, Pause, Volume2, Search, Share, PenTool, VolumeX, Settings, Clock, User, Calendar, BookOpen, Brain, Download, FolderOpen, FileText, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import MainLayout from '@/components/MainLayout';
import { FlashcardModal } from '@/components/FlashcardModal';
import { toast } from 'sonner';

interface TranscriptItem {
  timestamp: string;
  speaker: string;
  text: string;
  seconds: number;
}

const LecturePage = () => {
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration] = useState(3600); // 60 minutes in seconds
  const [volume, setVolume] = useState([80]);
  const [isMuted, setIsMuted] = useState(false);
  const [activeTab, setActiveTab] = useState('material');
  const [highlightedTranscript, setHighlightedTranscript] = useState(0);
  const [isReferencesOpen, setIsReferencesOpen] = useState(false);
  const [isFlashcardModalOpen, setIsFlashcardModalOpen] = useState(false);
  const { id } = useParams(); // Get the current lecture ID from the URL

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

  // Static lecture data
  const lectureData = {
    title: 'Fisiopatologia do Sistema Cardiovascular',
    professor: 'Dr. Maria Santos',
    date: '15 de Março, 2024',
    duration: '60 min',
    summary: 'Esta aula aborda os mecanismos fundamentais da fisiopatologia cardiovascular, incluindo a anatomia do coração, os processos de contração cardíaca, e as principais patologias que afetam o sistema circulatório.',
    topics: [
      'Anatomia Cardíaca',
      'Fisiologia Cardíaca', 
      'Ciclo Cardíaco',
      'Pressão Arterial',
      'Insuficiência Cardíaca',
      'Arritmias'
    ]
  };

  const transcript: TranscriptItem[] = [
    {
      timestamp: '00:00',
      speaker: 'Dr. Maria Santos',
      text: 'Bem-vindos à nossa aula sobre fisiopatologia do sistema cardiovascular. Hoje vamos abordar os conceitos fundamentais que regem o funcionamento do coração.',
      seconds: 0
    },
    {
      timestamp: '00:45',
      speaker: 'Dr. Maria Santos', 
      text: 'Vamos começar revisando a anatomia cardíaca básica. O coração é um órgão muscular oco, dividido em quatro câmaras principais.',
      seconds: 45
    },
    {
      timestamp: '01:30',
      speaker: 'Dr. Maria Santos',
      text: 'As duas câmaras superiores são os átrios - átrio direito e átrio esquerdo. As duas câmaras inferiores são os ventrículos.',
      seconds: 90
    },
    {
      timestamp: '02:15',
      speaker: 'Dr. Maria Santos',
      text: 'O ciclo cardíaco consiste em duas fases principais: sístole e diástole. Durante a sístole, o coração se contrai e bombeia sangue.',
      seconds: 135
    }
  ];

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
    setIsPlaying(!isPlaying);
  };

  const handleTimeJump = (seconds: number) => {
    setCurrentTime(seconds);
    setHighlightedTranscript(seconds);
  };

  const handleProgressChange = (value: number[]) => {
    setCurrentTime(value[0]);
  };

  const handleDownload = () => {
    toast.success("Download iniciado! (funcionalidade simulada)");
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6">
        {/* Two-Panel Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* Left Panel - Video Player */}
          <div className="xl:col-span-3 space-y-4">
            {/* Video Container */}
            <Card className="border-0 shadow-sm overflow-hidden bg-white/60 backdrop-blur-xl">
              <div className="aspect-video bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center relative">
                <div className="absolute inset-0 bg-black/20"></div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePlayPause}
                  className="h-20 w-20 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm z-10"
                >
                  {isPlaying ? (
                    <Pause className="h-10 w-10 text-white" />
                  ) : (
                    <Play className="h-10 w-10 text-white ml-1" />
                  )}
                </Button>
              </div>
              
              {/* Video Controls */}
              <CardContent className="p-4 space-y-3">
                <Slider
                  value={[currentTime]}
                  max={duration}
                  step={1}
                  className="w-full"
                  onValueChange={handleProgressChange}
                />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handlePlayPause}
                      className="h-8 w-8"
                    >
                      {isPlaying ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsMuted(!isMuted)}
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
                        className="w-24"
                        onValueChange={setVolume}
                      />
                    </div>
                    
                    <span className="text-sm text-foreground-muted ml-2">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lecture Info */}
            <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-xl">
              <CardContent className="p-4">
                <h1 className="text-2xl font-bold mb-2">{lectureData.title}</h1>
                <div className="flex flex-wrap items-center gap-4 text-sm text-foreground-muted">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>{lectureData.professor}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{lectureData.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{lectureData.duration}</span>
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
                          value="material" 
                          className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary transition-all"
                        >
                          <FolderOpen className="h-4 w-4 mr-2" />
                          <span className="text-sm">Material</span>
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    {/* Transcript Tab */}
                    <TabsContent value="transcript" className="flex-1 p-0 m-0">
                      <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
                        {transcript.map((item, index) => (
                          <div
                            key={index}
                            className={`p-3 rounded-lg transition-all cursor-pointer hover:bg-accent/50 ${
                              currentTime >= item.seconds && 
                              (index === transcript.length - 1 || currentTime < transcript[index + 1].seconds)
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
                        ))}
                      </div>
                    </TabsContent>

                    {/* Summary Tab */}
                    <TabsContent value="summary" className="flex-1 p-0 m-0">
                      <div className="p-4 max-h-[600px] overflow-y-auto">
                        <div className="prose prose-sm max-w-none">
                          <h3 className="text-lg font-semibold mb-3">Resumo Estruturado</h3>
                          <p className="text-foreground-muted mb-4">{lectureData.summary}</p>
                          
                          <h4 className="text-base font-semibold mb-2">Tópicos Principais</h4>
                          <ul className="space-y-2">
                            {lectureData.topics.map((topic, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="text-primary mt-1">•</span>
                                <span>{topic}</span>
                              </li>
                            ))}
                          </ul>

                          <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/10">
                            <h4 className="text-base font-semibold mb-2 flex items-center gap-2">
                              <Brain className="h-4 w-4 text-primary" />
                              Conceitos-Chave
                            </h4>
                            <div 
                              className="text-sm"
                              dangerouslySetInnerHTML={{ __html: materialAprimoradoContent }}
                            />
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    {/* Material Tab */}
                    <TabsContent value="material" className="flex-1 p-0 m-0">
                      <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
                        <h3 className="text-base font-semibold mb-3">Recursos para Download</h3>
                        
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

                    {/* Action Bar */}
                    <div className="border-t p-4 bg-background/50">
                      <div className="grid grid-cols-2 gap-3">
                        <Button 
                          className="bg-primary hover:bg-primary/90 transition-all"
                          asChild
                        >
                          <Link to={`/quiz/${id}`}>
                            <Brain className="h-4 w-4 mr-2" />
                            Fazer Quiz
                          </Link>
                        </Button>
                        <Button 
                          variant="outline"
                          className="hover:bg-accent transition-all"
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
    </MainLayout>
  );
};

export default LecturePage;