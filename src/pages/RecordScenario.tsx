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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TranscriptEntry {
  id: string;
  timestamp: string;
  speaker: 'Estagiário' | 'Supervisor';
  text: string;
  isEditing?: boolean;
}


const RecordScenario = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get context data from the setup page
  const contextData = location.state as { 
    internshipType?: string; 
    location?: string;
    locationDetails?: string;
    previewTags?: string[];
  };
  const internshipType = contextData?.internshipType || 'Estágio';
  const internshipLocation = contextData?.location || 'Local não especificado';
  const locationDetails = contextData?.locationDetails || '';
  const previewTags = contextData?.previewTags || [];
  
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Session info for context
  const sessionTitle = `${internshipType} - ${internshipLocation}`;
  
  // Generate session case description
  const sessionCase = `Sessão de ${internshipType} em ${internshipLocation}`;

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
  };

  const handlePauseResume = () => {
    setIsPaused(!isPaused);
  };

  const handleEndConsultation = async () => {
    setIsRecording(false);
    setIsPaused(false);
    
    try {
      toast.loading('Processando e salvando sessão...');
      
      const { data, error } = await supabase.functions.invoke('save-internship-session', {
        body: {
          internshipType,
          locationName: internshipLocation,
          locationDetails,
          tags: previewTags,
          transcript: transcript,
          duration: elapsedTime
        }
      });

      if (error) throw error;
      
      toast.dismiss();
      toast.success('Sessão salva com sucesso!');
      navigate('/internship');
    } catch (error) {
      console.error('Error saving session:', error);
      toast.dismiss();
      toast.error('Erro ao salvar sessão. Tente novamente.');
    }
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
            {(isRecording || transcript.length > 0) && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mic className="h-5 w-5 text-primary" />
                    Transcrição em Tempo Real
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {transcript.length === 0 && isRecording ? (
                    <div className="p-6 text-center border-2 border-dashed border-yellow-400 bg-yellow-50 rounded-lg">
                      <AlertCircle className="h-8 w-8 mx-auto text-yellow-600 mb-3" />
                      <p className="text-sm font-medium text-yellow-900 mb-2">
                        Transcrição automática não disponível
                      </p>
                      <p className="text-xs text-yellow-700">
                        A transcrição em tempo real será implementada em breve. 
                        Por enquanto, a sessão será salva com os dados básicos.
                      </p>
                    </div>
                  ) : (
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
                  )}
                </CardContent>
              </Card>
            )}

          </div>
        </div>
    </MainLayout>
  );
};

export default RecordScenario;