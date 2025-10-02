import React, { useState, useEffect, useRef } from 'react';
import { Pause, Square, Edit3, Mic, Clock, User, CheckCircle, AlertCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import MainLayout from '@/components/MainLayout';

interface TranscriptEntry {
  id: string;
  timestamp: string;
  speaker: 'Estagiário' | 'Supervisor';
  text: string;
  isEditing?: boolean;
}

interface ConsultationSummary {
  chiefComplaint: string[];
  historyOfPresentIllness: string[];
  physicalExamination: string[];
  assessmentAndPlan: string[];
}

const RecordScenario = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get context data from the setup page
  const contextData = location.state as { internshipType?: string; location?: string };
  const internshipType = contextData?.internshipType || 'Estágio';
  const internshipLocation = contextData?.location || 'Local não especificado';
  
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Session info for context
  const sessionTitle = `${internshipType} - ${internshipLocation}`;
  
  // Generate session case description
  const sessionCase = `Sessão de ${internshipType} em ${internshipLocation}`;

  // Static transcript data for demonstration
  const staticTranscript: TranscriptEntry[] = [
    {
      id: '1',
      timestamp: '00:32',
      speaker: 'Supervisor',
      text: 'Bom dia! Vamos analisar a estrutura deste projeto?'
    },
    {
      id: '2', 
      timestamp: '00:45',
      speaker: 'Estagiário',
      text: 'Bom dia, engenheiro. Identifiquei algumas tensões elevadas nas vigas principais, principalmente quando consideramos a carga móvel.'
    },
    {
      id: '3',
      timestamp: '01:15',
      speaker: 'Supervisor',
      text: 'Entendo. Quais são os valores das tensões? E a deflexão está dentro do limite?'
    },
    {
      id: '4',
      timestamp: '01:32',
      speaker: 'Estagiário',
      text: 'A tensão máxima está em 280 MPa, próximo ao limite de escoamento. A deflexão está em L/350, dentro do aceitável.'
    },
    {
      id: '5',
      timestamp: '02:10',
      speaker: 'Supervisor',
      text: 'Vou revisar os cálculos agora. Precisamos verificar também a fadiga para essa estrutura.'
    },
    {
      id: '6',
      timestamp: '03:45',
      speaker: 'Supervisor',
      text: 'Os valores estão próximos do limite. Vamos precisar considerar um reforço estrutural ou redimensionar as vigas.'
    }
  ];

  // Static AI summary data
  const aiSummary: ConsultationSummary = {
    chiefComplaint: [
      'Tensões elevadas nas vigas principais',
      'Análise iniciada há 1 semana',
      'Característica: tensão próxima ao limite de escoamento'
    ],
    historyOfPresentIllness: [
      'Estrutura em análise há 1 semana',
      'Tensões tipo tração/compressão nas vigas',
      'Provocada por cargas móveis',
      'Deflexão dentro dos limites (L/350)',
      'Sem sinais de falha estrutural prévia'
    ],
    physicalExamination: [
      'Tensão máxima: 280 MPa',
      'Análise estrutural: momento fletor elevado no meio do vão',
      'Verificação de soldas: integridade mantida',
      'Estrutura estável, sem deformações visíveis'
    ],
    assessmentAndPlan: [
      'Hipótese técnica: Necessidade de reforço estrutural',
      'Análises adicionais: Estudo de fadiga, análise não-linear',
      'Intervenção: Reforço com chapas de aço ou redimensionamento',
      'Recomendações: Monitoramento contínuo, inspeção periódica',
      'Revisão em 15 dias com resultados das análises'
    ]
  };

  // Timer effect
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording, isPaused]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Simulate live transcription
  useEffect(() => {
    if (isRecording && !isPaused) {
      const interval = setInterval(() => {
        const currentIndex = transcript.length;
        if (currentIndex < staticTranscript.length) {
          setTranscript(prev => [...prev, staticTranscript[currentIndex]]);
        }
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [isRecording, isPaused, transcript.length]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = () => {
    setIsRecording(true);
    setIsPaused(false);
    setElapsedTime(0);
    setTranscript([]);
    setShowSummary(false);
  };

  const handlePauseResume = () => {
    setIsPaused(!isPaused);
  };

  const handleEndConsultation = () => {
    setIsRecording(false);
    setIsPaused(false);
    // Generate a unique consultation ID and navigate to review page
    const consultationId = Date.now();
    navigate(`/consultation-review/${consultationId}`);
  };

  const startEditing = (entry: TranscriptEntry) => {
    setEditingEntry(entry.id);
    setEditText(entry.text);
  };

  const saveEdit = () => {
    if (editingEntry) {
      setTranscript(prev => 
        prev.map(entry => 
          entry.id === editingEntry 
            ? { ...entry, text: editText }
            : entry
        )
      );
      setEditingEntry(null);
      setEditText('');
    }
  };

  const cancelEdit = () => {
    setEditingEntry(null);
    setEditText('');
  };

  // Waveform animation component
  const WaveformAnimation = () => (
    <div className="flex items-center justify-center gap-1 h-12">
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className={`bg-primary rounded-full animate-pulse ${
            isRecording && !isPaused ? 'opacity-100' : 'opacity-30'
          }`}
          style={{
            width: '4px',
            height: `${Math.random() * 40 + 10}px`,
            animationDelay: `${i * 0.1}s`,
            animationDuration: `${0.5 + Math.random() * 0.5}s`
          }}
        />
      ))}
    </div>
  );

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Modo Estágio</h1>
            <p className="text-foreground-muted">{sessionCase}</p>
          </div>

          {/* Context Information Card */}
          <Card className="border-0 shadow-lg mb-6 bg-white/60 backdrop-blur-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-center">Contexto da Sessão</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                <div className="flex justify-between sm:justify-start sm:gap-2">
                  <span className="font-medium text-foreground-muted">Estágio:</span>
                  <span className="text-foreground">{internshipType}</span>
                </div>
                
                <div className="flex justify-between sm:justify-start sm:gap-2 sm:col-span-2">
                  <span className="font-medium text-foreground-muted">Local:</span>
                  <span className="text-foreground text-right sm:text-left">{internshipLocation}</span>
                </div>
              </div>
            </CardContent>
          </Card>

            {/* Recording Status Card */}
            <Card className="border-0 shadow-lg bg-white/60 backdrop-blur-xl">
              <CardContent className="p-8">
                <div className="text-center space-y-6">
                  {/* Recording Status */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-3">
                      {isRecording && !isPaused ? (
                        <Badge className="bg-red-500 text-white px-4 py-2 text-lg animate-pulse">
                          <Mic className="h-5 w-5 mr-2" />
                          Gravando...
                        </Badge>
                      ) : isPaused ? (
                        <Badge className="bg-yellow-500 text-white px-4 py-2 text-lg">
                          <Pause className="h-5 w-5 mr-2" />
                          Pausado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="px-4 py-2 text-lg">
                          <Mic className="h-5 w-5 mr-2" />
                          Pronto para gravar
                        </Badge>
                      )}
                    </div>

                    {/* Timer */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-2 text-2xl font-mono font-bold">
                        <Clock className="h-6 w-6 text-primary" />
                        <span>{formatTime(elapsedTime)}</span>
                      </div>
                    </div>

                    {/* Waveform Animation */}
                    <div className="py-4">
                      <WaveformAnimation />
                    </div>

                    {/* Control Buttons - Mobile optimized */}
                    <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
                      {!isRecording ? (
                        <Button 
                          onClick={handleStartRecording}
                          className="bg-primary hover:bg-primary-light px-6 sm:px-8 py-3 min-h-[48px]"
                        >
                          <Mic className="h-5 w-5 mr-2" />
                          Iniciar Gravação
                        </Button>
                      ) : (
                        <>
                          <Button 
                            variant="outline"
                            onClick={handlePauseResume}
                            className="px-4 sm:px-6 py-3 min-h-[48px]"
                          >
                            <Pause className="h-5 w-5 mr-2" />
                            {isPaused ? 'Retomar' : 'Pausar'}
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="destructive"
                                className="px-4 sm:px-6 py-3 min-h-[48px]"
                              >
                                <Square className="h-5 w-5 mr-2" />
                                Encerrar Sessão
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="max-w-[95vw] sm:max-w-lg w-full mx-2 sm:mx-0">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar Encerramento</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja encerrar a sessão? Esta ação irá parar a gravação e gerar o resumo com IA.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
                                <AlertDialogCancel className="min-h-[44px]">Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={handleEndConsultation}
                                  className="bg-destructive hover:bg-destructive/90 min-h-[44px]"
                                >
                                  Sim, Encerrar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Live Transcript */}
            {transcript.length > 0 && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mic className="h-5 w-5 text-primary" />
                    Transcrição em Tempo Real
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-80 sm:max-h-96 overflow-y-auto space-y-4 p-3 sm:p-4 bg-background-secondary rounded-lg">
                    {transcript.map((entry) => (
                      <div key={entry.id} className="group">
                        <div className="flex items-start gap-3 sm:gap-4">
                          <Badge 
                            variant={entry.speaker === 'Supervisor' ? 'default' : 'secondary'}
                            className="min-w-fit text-xs px-2 py-1"
                          >
                            {entry.speaker}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-foreground-muted">
                                {entry.timestamp}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => startEditing(entry)}
                              >
                                <Edit3 className="h-3 w-3" />
                              </Button>
                            </div>
                            {editingEntry === entry.id ? (
                              <div className="space-y-2">
                                <Input
                                  value={editText}
                                  onChange={(e) => setEditText(e.target.value)}
                                  className="text-sm min-h-[40px]"
                                />
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={saveEdit} className="min-h-[36px]">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Salvar
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={cancelEdit} className="min-h-[36px]">
                                    Cancelar
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm sm:text-base text-foreground break-words">{entry.text}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={transcriptEndRef} />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI Summary */}
            {showSummary && (
              <Card className="border-0 shadow-lg animate-fade-in">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-primary">
                    <AlertCircle className="h-6 w-6" />
                    Resumo com IA
                  </CardTitle>
                  <p className="text-foreground-muted">
                    Resumo estruturado gerado automaticamente pela inteligência artificial
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Problem Identification */}
                  <div>
                    <h3 className="text-lg font-bold mb-3 text-foreground">
                      Problema Identificado
                    </h3>
                    <ul className="space-y-2">
                      {aiSummary.chiefComplaint.map((item, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                          <span className="text-foreground-muted">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Separator />

                  {/* Project Context */}
                  <div>
                    <h3 className="text-lg font-bold mb-3 text-foreground">
                      Contexto do Projeto
                    </h3>
                    <ul className="space-y-2">
                      {aiSummary.historyOfPresentIllness.map((item, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                          <span className="text-foreground-muted">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Separator />

                  {/* Technical Analysis */}
                  <div>
                    <h3 className="text-lg font-bold mb-3 text-foreground">
                      Análise Técnica
                    </h3>
                    <ul className="space-y-2">
                      {aiSummary.physicalExamination.map((item, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                          <span className="text-foreground-muted">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Separator />

                  {/* Recommendations and Plan */}
                  <div>
                    <h3 className="text-lg font-bold mb-3 text-foreground">
                      Recomendações e Plano
                    </h3>
                    <ul className="space-y-2">
                      {aiSummary.assessmentAndPlan.map((item, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                          <span className="text-foreground-muted">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4 pt-4 border-t">
                    <Button className="bg-primary hover:bg-primary-light">
                      Salvar Resumo
                    </Button>
                    <Button variant="outline">
                      Exportar PDF
                    </Button>
                    <Button variant="outline">
                      Compartilhar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
    </MainLayout>
  );
};

export default RecordScenario;