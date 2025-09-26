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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar - Sticky */}
            <div className="lg:col-span-1">
              <div className="sticky top-20 space-y-6">
                {/* Class Information */}
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-semibold text-foreground">
                      Informações da Aula
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <BookOpen className="h-4 w-4 text-primary mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-foreground-muted">Nome da Aula</p>
                          <p className="text-sm font-semibold">{lectureData.title}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <User className="h-4 w-4 text-primary mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-foreground-muted">Professor</p>
                          <p className="text-sm font-semibold">{lectureData.professor}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <Calendar className="h-4 w-4 text-primary mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-foreground-muted">Data</p>
                          <p className="text-sm font-semibold">{lectureData.date}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <Clock className="h-4 w-4 text-primary mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-foreground-muted">Duração</p>
                          <p className="text-sm font-semibold">{lectureData.duration}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Transcription Summary */}
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-semibold">Resumo da Transcrição</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground-muted leading-relaxed">
                      {lectureData.summary}
                    </p>
                  </CardContent>
                </Card>

                {/* Discussed Topics */}
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-semibold">Tópicos Discutidos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {lectureData.topics.map((topic, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Audio Player */}
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-semibold">Gravação da Aula</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Play Controls */}
                    <div className="flex items-center gap-4">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handlePlayPause}
                        className="h-10 w-10"
                      >
                        {isPlaying ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      
                      <div className="flex-1">
                        <div className="text-xs text-foreground-muted mb-1">
                          {formatTime(currentTime)} / {formatTime(duration)}
                        </div>
                        <Slider
                          value={[currentTime]}
                          max={duration}
                          step={1}
                          className="w-full"
                          onValueChange={handleProgressChange}
                        />
                      </div>
                    </div>

                    {/* Volume Control */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsMuted(!isMuted)}
                        className="h-8 w-8"
                      >
                        {isMuted ? (
                          <VolumeX className="h-3 w-3" />
                        ) : (
                          <Volume2 className="h-3 w-3" />
                        )}
                      </Button>
                      <Slider
                        value={volume}
                        max={100}
                        step={1}
                        className="flex-1"
                        onValueChange={setVolume}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Test Knowledge Button */}
                <Button className="w-full bg-primary hover:bg-primary-light" asChild>
                  <Link to={`/quiz/${id}`}>
                    <Brain className="h-4 w-4 mr-2" />
                    Iniciar Teste
                  </Link>
                </Button>
              </div>
            </div>

            {/* Right Content Area */}
            <div className="lg:col-span-3 pb-20 md:pb-6">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-0">
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <div className="border-b">
                      <TabsList className="grid w-full grid-cols-3 bg-transparent h-auto p-0">
                        <TabsTrigger 
                          value="material" 
                          className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-4 rounded-none border-b-2 border-transparent data-[state=active]:border-primary flex flex-col md:flex-row items-center justify-center gap-2"
                        >
                          <FolderOpen className="h-4 w-4" />
                          <span className="md:inline text-xs md:text-sm">
                            {activeTab === 'material' ? 'Material Didático' : <span className="sr-only">Material Didático</span>}
                          </span>
                        </TabsTrigger>
                        <TabsTrigger 
                          value="transcript"
                          className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-4 rounded-none border-b-2 border-transparent data-[state=active]:border-primary flex flex-col md:flex-row items-center justify-center gap-2"
                        >
                          <FileText className="h-4 w-4" />
                          <span className="md:inline text-xs md:text-sm">
                            {activeTab === 'transcript' ? 'Transcrição da Aula' : <span className="sr-only">Transcrição da Aula</span>}
                          </span>
                        </TabsTrigger>
                        <TabsTrigger 
                          value="enhanced"
                          className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-4 rounded-none border-b-2 border-transparent data-[state=active]:border-primary flex flex-col md:flex-row items-center justify-center gap-2"
                        >
                          <Sparkles className="h-4 w-4" />
                          <span className="md:inline text-xs md:text-sm">
                            {activeTab === 'enhanced' ? 'Material Aprimorado' : <span className="sr-only">Material Aprimorado</span>}
                          </span>
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    <div className="p-8">
                      <TabsContent value="material" className="mt-0">
                        <div className="space-y-6">
                          <div>
                            <h2 className="text-xl md:text-2xl font-bold mb-4">Material Didático</h2>
                            <p className="text-sm md:text-base text-foreground-muted mb-6">
                              Slides e recursos utilizados durante a aula sobre fisiopatologia cardiovascular.
                            </p>
                          </div>
                          
                           <div className="grid gap-4">
                             <Card className="p-4 md:p-4 hover:shadow-md transition-shadow cursor-pointer">
                               <div className="flex items-center justify-between">
                                 <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                                   <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                     <BookOpen className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                                   </div>
                                   <div className="min-w-0 flex-1">
                                     <h3 className="font-semibold text-base md:text-lg leading-tight">Slides da Apresentação</h3>
                                     <p className="text-sm md:text-sm text-foreground-muted">45 slides • PDF</p>
                                   </div>
                                 </div>
                                 <Button 
                                   variant="outline" 
                                   size="sm"
                                   onClick={handleDownload}
                                   className="flex items-center gap-2 ml-3 flex-shrink-0"
                                 >
                                   <Download className="h-4 w-4" />
                                   <span className="hidden sm:inline">Download</span>
                                 </Button>
                               </div>
                             </Card>
                             
                              <Dialog open={isReferencesOpen} onOpenChange={setIsReferencesOpen}>
                                <DialogTrigger asChild>
                                  <Card className="p-4 md:p-4 hover:shadow-md transition-shadow cursor-pointer">
                                    <div className="flex items-center gap-3 md:gap-4">
                                      <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <BookOpen className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <h3 className="font-semibold text-base md:text-lg leading-tight">Bibliografia Recomendada</h3>
                                        <p className="text-sm md:text-sm text-foreground-muted">Lista de referências • PDF</p>
                                      </div>
                                    </div>
                                  </Card>
                                </DialogTrigger>
                               <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                                 <DialogHeader>
                                   <DialogTitle className="text-xl font-semibold">Referências Bibliográficas</DialogTitle>
                                 </DialogHeader>
                                 <div className="space-y-4 mt-4">
                                   {bibliography.map((item, index) => (
                                     <Card key={index} className="p-4 border-l-4 border-primary">
                                       <div className="space-y-2">
                                         <div className="flex items-center gap-2">
                                           <Badge variant="secondary" className="text-xs">
                                             {item.type}
                                           </Badge>
                                           <span className="text-xs text-foreground-muted">
                                             {item.year}
                                           </span>
                                         </div>
                                         <h4 className="font-semibold text-base leading-tight">
                                           {item.title}
                                         </h4>
                                         <p className="text-sm text-foreground-muted">
                                           {item.type === 'Link' ? (
                                             <>
                                               <span className="font-medium">{item.organization}</span>
                                               <br />
                                               <a 
                                                 href={item.url} 
                                                 target="_blank" 
                                                 rel="noopener noreferrer"
                                                 className="text-primary hover:underline"
                                               >
                                                 {item.url}
                                               </a>
                                             </>
                                           ) : (
                                             <>
                                               <span className="font-medium">{item.authors}</span>
                                               <br />
                                               {item.edition && <span>{item.edition} • </span>}
                                               {item.publisher && <span>{item.publisher}</span>}
                                               {item.journal && <span>{item.journal}</span>}
                                               {item.volume && <span> • {item.volume}</span>}
                                             </>
                                           )}
                                         </p>
                                       </div>
                                     </Card>
                                   ))}
                                 </div>
                               </DialogContent>
                              </Dialog>

                               <Card className="p-4 md:p-4 hover:shadow-md transition-shadow cursor-pointer">
                                 <button 
                                   onClick={() => setIsFlashcardModalOpen(true)}
                                   className="flex items-center gap-3 md:gap-4 w-full text-left"
                                 >
                                   <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                     <Brain className="h-5 w-5 md:h-6 md:w-6 text-purple-600" />
                                   </div>
                                   <div className="min-w-0 flex-1">
                                     <h3 className="font-semibold text-base md:text-lg leading-tight">Flashcards Interativos</h3>
                                     <p className="text-sm md:text-sm text-foreground-muted">Cartões de revisão • Interativo</p>
                                   </div>
                                 </button>
                               </Card>
                            </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="transcript" className="mt-0">
                        <div className="space-y-6">
                          <div>
                            <h2 className="text-xl md:text-2xl font-bold mb-4">Transcrição da Aula</h2>
                            <p className="text-sm md:text-base text-foreground-muted mb-6">
                              Transcrição completa com timestamps clicáveis para navegação no áudio.
                            </p>
                          </div>

                          <div className="space-y-4">
                            {transcript.map((item, index) => (
                              <div
                                key={index}
                                className={`p-4 rounded-lg border-l-4 transition-all ${
                                  highlightedTranscript === item.seconds
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border bg-background-secondary'
                                }`}
                              >
                                <div className="flex items-start gap-4">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleTimeJump(item.seconds)}
                                    className="text-primary hover:bg-primary/10"
                                  >
                                    {item.timestamp}
                                  </Button>
                                  <div className="flex-1">
                                    <p className="font-medium text-sm text-foreground-muted mb-1">
                                      {item.speaker}
                                    </p>
                                    <p className="text-foreground">{item.text}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="enhanced" className="mt-0">
                        <div className="space-y-4">
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100">
                            <h3 className="text-lg font-semibold text-blue-900 mb-2">Material Aprimorado por IA</h3>
                            <p className="text-blue-700 text-sm">
                              Conteúdo otimizado e expandido para melhor compreensão dos conceitos apresentados na aula.
                            </p>
                          </div>
                          
                          <div 
                            className="prose prose-gray max-w-none bg-white p-6 rounded-lg shadow-sm"
                            dangerouslySetInnerHTML={{ __html: materialAprimoradoContent }}
                          />
                        </div>
                      </TabsContent>
                    </div>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Floating Annotation Toolbar */}
              <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
                <Card className="border-0 shadow-lg bg-background/95 backdrop-blur">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-9">
                            <Search className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Buscar</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-9">
                            <Share className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Compartilhar</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="default" 
                            size="icon" 
                            className="h-9 w-9 bg-primary hover:bg-primary-light"
                            onClick={handleAnnotate}
                          >
                            <PenTool className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Anotar</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-9">
                            <Volume2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Text-to-Speech</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-9">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Configurações</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>

      {/* Flashcard Modal */}
      <FlashcardModal 
        open={isFlashcardModalOpen} 
        onOpenChange={setIsFlashcardModalOpen} 
      />
    </MainLayout>
  );
};

export default LecturePage;