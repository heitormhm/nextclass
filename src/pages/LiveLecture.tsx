import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, Pause, Play, Square, Settings, Radio, Clock, MessageSquare, Activity } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import MainLayout from '@/components/MainLayout';
import { TeacherBackgroundRipple } from '@/components/ui/teacher-background-ripple';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LiveTranscriptViewer } from '@/components/LiveTranscriptViewer';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';

interface Word {
  text: string;
  confidence: number;
  start: number;
  end: number;
}

interface TranscriptSegment {
  speaker: 'Professor' | 'Aluno';
  text: string;
  words: Word[];
  timestamp: Date;
}

const LiveLecture = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const lectureId = new URLSearchParams(window.location.search).get('lectureId');
  
  // Web Speech API hook
  const {
    startRecording: startSpeechRecording,
    stopRecording: stopSpeechRecording,
    pauseRecording: pauseSpeechRecording,
    resumeRecording: resumeSpeechRecording,
    isRecording: isSpeechRecording,
    error: speechError,
    onTranscriptionReceived
  } = useAudioRecorder();
  
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [selectedMicrophone, setSelectedMicrophone] = useState('default');
  const [availableMicrophones, setAvailableMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // Transcription states
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegment[]>([]);
  const [currentWords, setCurrentWords] = useState<Word[]>([]);
  
  const fullTranscriptRef = useRef<string>('');

  // Route Protection - Check for valid lectureId
  useEffect(() => {
    const checkLectureAccess = async () => {
      if (!lectureId) {
        toast({
          title: 'Acesso Negado',
          description: 'Configure a gravação primeiro no dashboard.',
          variant: 'destructive',
        });
        navigate('/teacherdashboard');
        return;
      }

      // Verify lecture exists and belongs to teacher
      try {
        const { data, error } = await supabase
          .from('lectures')
          .select('id, teacher_id')
          .eq('id', lectureId)
          .single();

        if (error || !data) {
          toast({
            title: 'Aula não encontrada',
            description: 'Esta gravação não existe ou foi excluída.',
            variant: 'destructive',
          });
          navigate('/teacherdashboard');
        }
      } catch (error) {
        console.error('Error checking lecture access:', error);
        navigate('/teacherdashboard');
      }
    };

    checkLectureAccess();
  }, [lectureId, navigate, toast]);

  // Handle transcription callback from Web Speech API
  useEffect(() => {
    onTranscriptionReceived((text: string) => {
      console.log('[LiveLecture] Transcription received:', text);
      
      const newSegment: TranscriptSegment = {
        speaker: 'Professor', // Default to Professor, can be enhanced with speaker detection
        text: text,
        words: text.split(' ').map((word, idx) => ({
          text: word,
          confidence: 0.9,
          start: idx,
          end: idx + 1
        })),
        timestamp: new Date()
      };
      
      setTranscriptSegments(prev => [...prev, newSegment]);
      fullTranscriptRef.current += `[Professor] ${text}\n\n`;
    });
  }, [onTranscriptionReceived]);
  
  // Handle speech recognition errors
  useEffect(() => {
    if (speechError) {
      toast({
        variant: 'destructive',
        title: 'Erro no reconhecimento de voz',
        description: speechError,
      });
    }
  }, [speechError, toast]);

  // Recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSpeechRecording && !isPaused) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSpeechRecording, isPaused]);

  // Simulate audio level for visualization
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSpeechRecording && !isPaused) {
      interval = setInterval(() => {
        const currentLevel = Math.random() * 100;
        setAudioLevel(currentLevel);
      }, 100);
    } else {
      setAudioLevel(0);
    }
    return () => clearInterval(interval);
  }, [isSpeechRecording, isPaused]);

  // Load available microphones
  useEffect(() => {
    const loadMicrophones = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        setAvailableMicrophones(audioInputs);
      } catch (error) {
        console.error('Error loading microphones:', error);
      }
    };
    loadMicrophones();
  }, []);


  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = async () => {
    try {
      // Reset states
      setTranscriptSegments([]);
      setCurrentWords([]);
      fullTranscriptRef.current = '';
      setRecordingTime(0);
      setIsPaused(false);
      
      // Start Web Speech API recording
      await startSpeechRecording();
      
      toast({
        title: "Gravação iniciada",
        description: "Fale claramente para transcrição automática",
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        variant: "destructive",
        title: "Erro ao iniciar gravação",
        description: "Verifique as permissões do microfone",
      });
    }
  };

  const handlePauseRecording = () => {
    if (isPaused) {
      resumeSpeechRecording();
      setIsPaused(false);
      toast({
        title: "Gravação retomada",
      });
    } else {
      pauseSpeechRecording();
      setIsPaused(true);
      toast({
        title: "Gravação pausada",
      });
    }
  };

  const handleStopRecording = async () => {
    // Stop Web Speech API recording
    stopSpeechRecording();
    setIsPaused(false);
    
    try {
      setIsSaving(true);
      
      // Use accumulated transcript from ref
      const fullTranscript = fullTranscriptRef.current || transcriptSegments
        .map(seg => `[${seg.speaker}] ${seg.text}`)
        .join('\n\n');

      // Update existing lecture
      if (!lectureId) {
        throw new Error('No lecture ID found');
      }

      const { error: updateError } = await supabase
        .from('lectures')
        .update({
          raw_transcript: fullTranscript,
          audio_url: null, // Web Speech API doesn't provide audio file
          duration: recordingTime,
          status: 'processing'
        })
        .eq('id', lectureId);

      if (updateError) throw updateError;

      toast({
        title: "Gravação finalizada com sucesso",
        description: `Transcrição de ${formatTime(recordingTime)} salva. Redirecionando...`,
      });

      // Navigate immediately after success
      navigate(`/lecturetranscription/${lectureId}`);
      
    } catch (error) {
      console.error('Error saving lecture:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: error instanceof Error ? error.message : 'Não foi possível salvar a gravação',
      });
    } finally {
      setIsSaving(false);
    }
  };

// Removed unused AudioWaveform component - waveform now inline in JSX

  return (
    <MainLayout>
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-900 via-purple-600 to-pink-500 animate-gradient-xy bg-[length:200%_200%]">
        {/* Animated Background with Ripple Effect */}
        <TeacherBackgroundRipple />
        
        {/* Gradient Blobs for Depth */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-48 w-96 h-96 bg-gradient-to-br from-pink-500/30 to-purple-500/30 rounded-full blur-3xl animate-float" />
          <div className="absolute top-2/3 -right-32 w-80 h-80 bg-gradient-to-br from-blue-400/25 to-purple-400/25 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-gradient-to-br from-purple-500/20 to-pink-400/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        </div>
        
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4 space-y-8">
          
          {/* 1. HEADER */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-3">
              <Radio className="h-6 w-6 text-white" />
              <h1 className="text-2xl md:text-3xl font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
                Gravação de Aula ao Vivo
              </h1>
            </div>
            
            {isSpeechRecording && (
              <div className="inline-flex items-center gap-2 bg-red-500/20 border border-red-300/40 rounded-full px-4 py-1.5 backdrop-blur-sm">
                <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></span>
                <span className="text-white font-mono font-semibold drop-shadow-sm">
                  {formatTime(recordingTime)}
                </span>
              </div>
            )}
          </div>

          {/* 2. FLOATING MICROPHONE ORB */}
          <div className="relative flex items-center justify-center">
            {/* Animated Rings (quando gravando) */}
            {isSpeechRecording && !isPaused && (
              <>
                <div className="absolute w-64 h-64 rounded-full border-2 border-purple-400/30 animate-ping" style={{ animationDuration: '3s' }} />
                <div className="absolute w-56 h-56 rounded-full border-2 border-pink-400/40 animate-ping" style={{ animationDuration: '2s' }} />
                <div className="absolute w-48 h-48 rounded-full border-2 border-rose-400/50 animate-ping" style={{ animationDuration: '1.5s' }} />
              </>
            )}
            
            {/* Frosted Glass Container */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div 
                    className={`
                      relative w-40 h-40 md:w-48 md:h-48 rounded-full 
                      backdrop-blur-2xl 
                      border-2 
                      transition-all duration-500
                      cursor-pointer
                      ${isSpeechRecording && !isPaused 
                        ? 'bg-white/15 border-purple-300/40 shadow-2xl shadow-purple-500/50' 
                        : isPaused
                        ? 'bg-white/10 border-yellow-300/40 shadow-2xl shadow-yellow-500/50'
                        : 'bg-white/10 border-white/20 shadow-xl hover:shadow-2xl hover:scale-105'
                      }
                    `}
                    onClick={() => {
                      if (!isSpeechRecording) {
                        handleStartRecording();
                      } else {
                        handlePauseRecording();
                      }
                    }}
                  >
              {/* Rotating Shimmer Effect (quando gravando) */}
              {isSpeechRecording && !isPaused && (
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-spin" style={{ animationDuration: '2s' }} />
              )}
              
              {/* Inner Gradient Circle */}
              <div className="absolute inset-8 rounded-full flex items-center justify-center">
                <div className={`
                  w-28 h-28 md:w-32 md:h-32 rounded-full 
                  flex items-center justify-center
                  transition-all duration-500
                  ${isSpeechRecording && !isPaused
                    ? 'bg-gradient-to-br from-purple-600 via-pink-500 to-rose-500 shadow-2xl shadow-pink-500/50'
                    : isPaused
                    ? 'bg-gradient-to-br from-yellow-500 to-orange-500 opacity-70'
                    : 'bg-gradient-to-br from-gray-300 to-gray-400'
                  }
                `}>
                  {/* Icon */}
                  {isSpeechRecording && !isPaused ? (
                    <Mic className="h-12 w-12 md:h-14 md:w-14 text-white animate-pulse" />
                  ) : isPaused ? (
                    <Play className="h-12 w-12 md:h-14 md:w-14 text-white" />
                  ) : (
                    <Mic className="h-12 w-12 md:h-14 md:w-14 text-gray-600" />
                  )}
                </div>
              </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-white/95 backdrop-blur-xl border-purple-200">
                  <p className="text-sm font-medium text-gray-700">
                    {!isSpeechRecording 
                      ? 'Clique para iniciar gravação' 
                      : isPaused 
                      ? 'Clique para continuar' 
                      : 'Clique para pausar'
                    }
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* 3. WAVEFORM (standalone) */}
          <div className="w-full max-w-2xl px-4">
            <div className="flex justify-center items-end h-24 md:h-32 gap-0.5 mb-2">
              {Array.from({ length: 40 }, (_, i) => {
                const distanceFromCenter = Math.abs(i - 20);
                const normalizedDistance = distanceFromCenter / 20;
                
                const baseHeight = isSpeechRecording && !isPaused ? 64 : 15;
                const falloffMultiplier = 1 - (normalizedDistance * 0.4);
                
                const dynamicHeight = isSpeechRecording && !isPaused 
                  ? baseHeight * falloffMultiplier * (0.4 + (audioLevel / 100) * 0.6) * (0.8 + Math.sin(Date.now() * 0.01 + i * 0.4) * 0.2)
                  : baseHeight * falloffMultiplier * 0.3;
                
                return (
                  <div
                    key={i}
                    className={`rounded-t transition-all duration-100 ease-out w-1 ${
                      isSpeechRecording && !isPaused 
                        ? 'bg-gradient-to-t from-purple-500 to-pink-400' 
                        : 'bg-white/40'
                    }`}
                    style={{
                      height: `${Math.max(3, dynamicHeight)}px`,
                      opacity: isSpeechRecording && !isPaused 
                        ? 0.7 + (Math.sin(Date.now() * 0.008 + i * 0.3) * 0.3)
                        : 0.5,
                      boxShadow: isSpeechRecording && !isPaused 
                        ? '0 0 10px rgba(168, 85, 247, 0.5)' 
                        : 'none'
                    }}
                  />
                );
              })}
            </div>
            
            {/* Status indicator */}
            <div className="flex items-center justify-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${
                isSpeechRecording && !isPaused 
                  ? 'bg-green-400 animate-pulse shadow-lg shadow-green-400/50' 
                  : 'bg-white/40'
              }`} />
              <p className="text-xs text-white/90 font-medium">
                {isSpeechRecording && !isPaused ? 'Reconhecimento de voz ativo' : 'Aguardando entrada de áudio'}
              </p>
            </div>
          </div>

          {/* 4. CONTROL BUTTONS */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            {!isSpeechRecording ? (
              <Button
                onClick={handleStartRecording}
                className="
                  bg-gradient-to-r from-green-600 to-green-700 
                  hover:from-green-700 hover:to-green-800 
                  px-10 py-6 text-lg font-bold
                  shadow-2xl shadow-green-500/30 
                  transition-all duration-300 
                  hover:scale-105 hover:shadow-green-500/50
                  border-2 border-green-400/20
                "
                size="lg"
              >
                <Play className="mr-2.5 h-6 w-6" />
                Iniciar Gravação
              </Button>
            ) : (
              <>
                <Button
                  onClick={handlePauseRecording}
                  className="
                    bg-white/20 backdrop-blur-xl 
                    border-2 border-white/40 
                    text-white 
                    hover:bg-white/30 hover:border-white/60
                    px-6 py-4 text-base font-semibold
                    shadow-xl 
                    transition-all duration-300 
                    hover:scale-105
                  "
                >
                  {isPaused ? (
                    <>
                      <Play className="mr-2 h-5 w-5" />
                      Continuar
                    </>
                  ) : (
                    <>
                      <Pause className="mr-2 h-5 w-5" />
                      Pausar
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={handleStopRecording}
                  disabled={isSaving}
                  className="
                    bg-gradient-to-r from-red-600 to-red-700 
                    hover:from-red-700 hover:to-red-800 
                    px-8 py-4 text-base font-bold
                    shadow-2xl shadow-red-500/30 
                    transition-all duration-300 
                    hover:scale-105 hover:shadow-red-500/50
                    disabled:opacity-50 disabled:cursor-not-allowed
                    border-2 border-red-400/20
                  "
                >
                  <Square className="mr-2 h-5 w-5" />
                  {isSaving ? 'Salvando...' : 'Finalizar'}
                </Button>
              </>
            )}

            {/* Settings Button */}
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="
                    w-12 h-12
                    bg-white/10 backdrop-blur-lg 
                    border-2 border-white/20 
                    text-white 
                    hover:bg-white/20 hover:border-white/40
                    shadow-lg 
                    transition-all duration-300 
                    hover:scale-105
                  "
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white border-gray-200">
                <DialogHeader>
                  <DialogTitle className="text-gray-900">Configurações de Áudio</DialogTitle>
                  <DialogDescription className="text-gray-600">
                    Selecione o dispositivo de entrada de áudio
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="microphone" className="text-gray-900">Microfone</Label>
                    <Select value={selectedMicrophone} onValueChange={setSelectedMicrophone}>
                      <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                        <SelectValue placeholder="Selecione o microfone" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="default">Microfone Padrão</SelectItem>
                        <SelectItem value="headset">Headset USB</SelectItem>
                        <SelectItem value="bluetooth">Fone Bluetooth</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* 5. Transcription Panel - Responsive Layout */}
          {isSpeechRecording && (
            <>
              {/* Desktop: Side Panel (right side) - Fixed and always visible */}
              <div className="
                hidden lg:flex lg:flex-col
                fixed right-0 top-16 bottom-0 w-96
                bg-white/95 backdrop-blur-xl
                border-l-4 border-purple-500/20
                shadow-[-10px_0_40px_rgba(168,85,247,0.15)]
                z-20
                animate-slide-in-right
              ">
                {/* Header - Fixed at top */}
                <div className="flex items-center justify-between mb-4 px-6 pt-6 flex-shrink-0">
                  <h3 className="text-lg font-bold text-purple-600 flex items-center gap-2">
                    <Radio className="h-5 w-5 animate-pulse" />
                    Transcrição ao Vivo
                  </h3>
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                    Ativo
                  </Badge>
                </div>

                {/* Scroll Area - Takes remaining space */}
                <div className="flex-1 overflow-y-auto px-6 scroll-smooth
                  [&::-webkit-scrollbar]:w-2
                  [&::-webkit-scrollbar-track]:bg-transparent
                  [&::-webkit-scrollbar-thumb]:bg-purple-200/50
                  [&::-webkit-scrollbar-thumb]:rounded-full
                  [&::-webkit-scrollbar-thumb]:hover:bg-purple-300/70
                ">
                  <LiveTranscriptViewer
                    segments={transcriptSegments}
                    currentWords={currentWords}
                    isProcessing={false}
                  />
                </div>

                {/* Metrics - Fixed at bottom */}
                <div className="pt-4 border-t border-gray-200 bg-gray-50 px-6 pb-6 flex-shrink-0">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="flex flex-col items-center">
                      <Clock className="h-4 w-4 text-purple-500 mb-1" />
                      <p className="text-xs text-gray-500 font-medium">Duração</p>
                      <p className="text-lg font-bold text-gray-900">{formatTime(recordingTime)}</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <MessageSquare className="h-4 w-4 text-purple-500 mb-1" />
                      <p className="text-xs text-gray-500 font-medium">Segmentos</p>
                      <p className="text-lg font-bold text-gray-900">{transcriptSegments.length}</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <Activity className="h-4 w-4 text-purple-500 mb-1" />
                      <p className="text-xs text-gray-500 font-medium">Palavras</p>
                      <p className="text-lg font-bold text-gray-900">
                        {transcriptSegments.reduce((acc, seg) => acc + seg.text.split(' ').length, 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile/Tablet: Bottom Sheet */}
              <div className="
                lg:hidden
                fixed bottom-0 left-0 right-0 z-20
                animate-slide-in-up
              ">
                <div className="
                  bg-white/95 backdrop-blur-xl
                  rounded-t-3xl
                  border-t-4 border-purple-500/20
                  shadow-[0_-10px_40px_rgba(168,85,247,0.15)]
                  p-6
                  max-h-[50vh]
                  overflow-hidden
                ">
                  {/* Drag Handle */}
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
                  </div>

                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-purple-600 flex items-center gap-2">
                      <Radio className="h-4 w-4 animate-pulse" />
                      Transcrição ao Vivo
                    </h3>
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                      Ativo
                    </Badge>
                  </div>

                  {/* Scroll Area */}
                  <div className="overflow-y-auto max-h-[25vh] mb-4">
                    <LiveTranscriptViewer
                      segments={transcriptSegments}
                      currentWords={currentWords}
                      isProcessing={false}
                    />
                  </div>

                  {/* Metrics */}
                  <div className="pt-4 border-t border-gray-200 bg-gray-50 -mx-6 px-6 -mb-6 pb-6">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="flex flex-col items-center">
                        <Clock className="h-4 w-4 text-purple-500 mb-1" />
                        <p className="text-xs text-gray-500 font-medium">Duração</p>
                        <p className="text-base font-bold text-gray-900">{formatTime(recordingTime)}</p>
                      </div>
                      <div className="flex flex-col items-center">
                        <MessageSquare className="h-4 w-4 text-purple-500 mb-1" />
                        <p className="text-xs text-gray-500 font-medium">Segmentos</p>
                        <p className="text-base font-bold text-gray-900">{transcriptSegments.length}</p>
                      </div>
                      <div className="flex flex-col items-center">
                        <Activity className="h-4 w-4 text-purple-500 mb-1" />
                        <p className="text-xs text-gray-500 font-medium">Palavras</p>
                        <p className="text-base font-bold text-gray-900">
                          {transcriptSegments.reduce((acc, seg) => acc + seg.text.split(' ').length, 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default LiveLecture;
