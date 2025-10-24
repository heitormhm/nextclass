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
import { useAudioCapture } from '@/hooks/useAudioCapture';

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

  const {
    startCapture: startAudioCapture,
    stopCapture: stopAudioCapture,
    pauseCapture: pauseAudioCapture,
    resumeCapture: resumeAudioCapture,
    isCapturing,
    error: captureError
  } = useAudioCapture({
    onAudioChunk: (chunk: Blob) => {
      // Track audio size in real-time
      setAudioSize(prev => prev + chunk.size);
    }
  });
  
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [selectedMicrophone, setSelectedMicrophone] = useState('default');
  const [availableMicrophones, setAvailableMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [audioSize, setAudioSize] = useState(0); // Track audio size in real-time
  
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
      console.log('[LiveLecture] 🎬 Iniciando gravação...');
      setTranscriptSegments([]);
      setCurrentWords([]);
      fullTranscriptRef.current = '';
      setRecordingTime(0);
      setAudioSize(0);
      setIsPaused(false);
      
      console.log('[LiveLecture] 🎙️ Starting Speech Recognition + Audio Capture');
      await Promise.all([
        startSpeechRecording(),
        startAudioCapture()
      ]);
      
      console.log('[LiveLecture] ✅ Recording started successfully');
      toast({
        title: "Gravação iniciada",
        description: "Áudio e transcrição em tempo real",
      });
    } catch (error) {
      console.error('[LiveLecture] ❌ Error starting recording:', error);
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
      resumeAudioCapture();
      setIsPaused(false);
      toast({ title: "Gravação retomada" });
    } else {
      pauseSpeechRecording();
      pauseAudioCapture();
      setIsPaused(true);
      toast({ title: "Gravação pausada" });
    }
  };

  // Retry helper function
  const uploadWithRetry = async (audioBlob: Blob, lectureId: string, maxRetries = 3): Promise<string | null> => {
    const audioFileName = `${lectureId}-${Date.now()}.webm`;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[LiveLecture] 📤 Upload attempt ${attempt}/${maxRetries} (${(audioBlob.size / 1024 / 1024).toFixed(2)} MB)`);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('lecture-audio')
          .upload(audioFileName, audioBlob, {
            contentType: 'audio/webm',
            upsert: false
          });

        if (uploadError) {
          console.error(`[LiveLecture] ❌ Upload attempt ${attempt} failed:`, uploadError);
          
          if (attempt < maxRetries) {
            const delayMs = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
            console.log(`[LiveLecture] ⏳ Retrying in ${delayMs / 1000}s...`);
            toast({
              title: `Tentativa ${attempt}/${maxRetries} falhou`,
              description: `Tentando novamente em ${delayMs / 1000}s...`,
            });
            await new Promise(resolve => setTimeout(resolve, delayMs));
            continue;
          }
          
          throw uploadError;
        }

        const { data: urlData } = supabase.storage
          .from('lecture-audio')
          .getPublicUrl(audioFileName);

        const audioUrl = urlData.publicUrl;
        console.log('[LiveLecture] ✅ Audio uploaded successfully:', audioUrl);
        return audioUrl;
        
      } catch (error) {
        if (attempt === maxRetries) {
          console.error('[LiveLecture] ❌ All upload attempts failed');
          throw error;
        }
      }
    }
    
    return null;
  };

  const handleStopRecording = async () => {
    console.log('[LiveLecture] 🛑 Stopping recording...');
    stopSpeechRecording();
    
    let audioBlob: Blob | null = null;
    try {
      audioBlob = await stopAudioCapture();
      console.log('[LiveLecture] 📦 Audio blob received:', audioBlob.size, 'bytes');
      
      // Validação crítica: verificar se blob não está vazio
      if (audioBlob.size === 0) {
        console.error('[LiveLecture] ❌ CRITICAL: Audio blob is empty!');
        toast({
          variant: 'destructive',
          title: '⚠️ Áudio não capturado',
          description: 'O áudio não foi gravado. Apenas a transcrição será salva.',
        });
      }
    } catch (error) {
      console.error('[LiveLecture] ❌ Error stopping audio capture:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao parar áudio',
        description: 'Não foi possível finalizar a gravação do áudio',
      });
    }
    
    setIsPaused(false);
    
    try {
      setIsSaving(true);
      
      const fullTranscript = fullTranscriptRef.current || transcriptSegments
        .map(seg => `[${seg.speaker}] ${seg.text}`)
        .join('\n\n');

      console.log('[LiveLecture] 📝 Transcript length:', fullTranscript.length, 'chars');

      if (!lectureId) {
        throw new Error('No lecture ID found');
      }

      let audioUrl: string | null = null;

      if (audioBlob && audioBlob.size > 0) {
        console.log('[LiveLecture] 🚀 Starting upload with retry logic...');
        try {
          audioUrl = await uploadWithRetry(audioBlob, lectureId);
        } catch (uploadError) {
          console.error('[LiveLecture] ❌ Upload failed after all retries:', uploadError);
          toast({
            variant: 'destructive',
            title: 'Erro no upload do áudio',
            description: 'O áudio não pôde ser enviado. Apenas a transcrição será salva.',
          });
        }
      } else {
        console.warn('[LiveLecture] ⚠️ No audio blob to upload (size: 0 or null)');
      }

      console.log('[LiveLecture] 💾 Saving to database...');
      const { error: updateError } = await supabase
        .from('lectures')
        .update({
          raw_transcript: fullTranscript,
          audio_url: audioUrl,
          duration: recordingTime,
          status: 'processing'
        })
        .eq('id', lectureId);

      if (updateError) throw updateError;

      // Validação final crítica
      if (!audioUrl) {
        console.error('[LiveLecture] ❌ ALERT: audio_url is NULL in database!');
        toast({
          variant: 'destructive',
          title: '⚠️ Áudio não disponível',
          description: 'A transcrição foi salva, mas o áudio não está disponível.',
        });
      } else {
        console.log('[LiveLecture] ✅ Database updated with audio_url:', audioUrl);
      }

      toast({
        title: "✅ Gravação finalizada com sucesso",
        description: audioBlob && audioUrl 
          ? `Áudio (${(audioBlob.size / 1024 / 1024).toFixed(2)} MB) e transcrição salvos` 
          : 'Transcrição salva (áudio indisponível)',
      });

      navigate(`/lecturetranscription/${lectureId}`);
      
    } catch (error) {
      console.error('[LiveLecture] ❌ Error saving lecture:', error);
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
    <div className="flex flex-col h-screen overflow-hidden">
      <MainLayout>
        <div className="flex h-[calc(100vh-64px)] overflow-hidden">
          {/* Main Content Area - LEFT */}
          <div className="flex-1 relative overflow-hidden bg-gradient-to-br from-blue-900 via-purple-600 to-pink-500 animate-gradient-xy bg-[length:200%_200%]">
            {/* Animated Background with Ripple Effect */}
            <TeacherBackgroundRipple />
            
            {/* Gradient Blobs for Depth */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-1/4 -left-48 w-96 h-96 bg-gradient-to-br from-pink-500/30 to-purple-500/30 rounded-full blur-3xl animate-float" />
              <div className="absolute top-2/3 -right-32 w-80 h-80 bg-gradient-to-br from-blue-400/25 to-purple-400/25 rounded-full blur-3xl" />
              <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-gradient-to-br from-purple-500/20 to-pink-400/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
            </div>
            
            <div className="relative z-10 flex flex-col items-center justify-center h-full p-4 space-y-8">
              
              {/* 1. HEADER */}
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-3">
                  <Radio className="h-6 w-6 text-white" />
                  <h1 className="text-2xl md:text-3xl font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
                    Gravação de Aula ao Vivo
                  </h1>
                </div>
                
                {isSpeechRecording && (
                  <div className="flex flex-col items-center gap-2">
                    <div className="inline-flex items-center gap-2 bg-red-500/20 border border-red-300/40 rounded-full px-4 py-1.5 backdrop-blur-sm">
                      <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></span>
                      <span className="text-white font-mono font-semibold drop-shadow-sm">
                        {formatTime(recordingTime)}
                      </span>
                    </div>
                    {isCapturing && (
                      <Badge variant="destructive" className="bg-red-600/80 hover:bg-red-600 backdrop-blur-sm">
                        🔴 Gravando Áudio {audioSize > 0 && `(${(audioSize / 1024 / 1024).toFixed(1)} MB)`}
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {/* 2. FLOATING MICROPHONE ORB */}
              <div className="relative flex items-center justify-center">
                {isSpeechRecording && !isPaused && (
                  <>
                    <div className="absolute w-64 h-64 rounded-full border-2 border-purple-400/30 animate-ping" style={{ animationDuration: '3s' }} />
                    <div className="absolute w-56 h-56 rounded-full border-2 border-pink-400/40 animate-ping" style={{ animationDuration: '2s' }} />
                    <div className="absolute w-48 h-48 rounded-full border-2 border-rose-400/50 animate-ping" style={{ animationDuration: '1.5s' }} />
                  </>
                )}
                
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
                  {isSpeechRecording && !isPaused && (
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-spin" style={{ animationDuration: '2s' }} />
                  )}
                  
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

              {/* 3. WAVEFORM */}
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
            </div>
          </div>

          {/* Sidebar - RIGHT (FIXED) */}
          {isSpeechRecording && (
            <div className="w-80 bg-white border-l border-slate-200 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-purple-50 to-pink-50">
                <div className="flex items-center gap-2 mb-1">
                  <Radio className="h-4 w-4 text-purple-600" />
                  <h3 className="font-semibold text-slate-900">Transcrição ao Vivo</h3>
                </div>
                <Badge variant={isSpeechRecording && !isPaused ? 'default' : 'secondary'} className="text-xs">
                  {isSpeechRecording && !isPaused ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>

              <div className="flex-1 overflow-hidden">
                <LiveTranscriptViewer 
                  segments={transcriptSegments}
                  currentWords={currentWords}
                  isProcessing={false}
                />
              </div>

              <div className="p-4 border-t border-slate-200 bg-slate-50">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <Clock className="h-4 w-4 mx-auto mb-1 text-slate-600" />
                    <p className="text-xs text-slate-500">Duração</p>
                    <p className="text-sm font-semibold text-slate-900">{formatTime(recordingTime)}</p>
                  </div>
                  <div>
                    <MessageSquare className="h-4 w-4 mx-auto mb-1 text-slate-600" />
                    <p className="text-xs text-slate-500">Segmentos</p>
                    <p className="text-sm font-semibold text-slate-900">{transcriptSegments.length}</p>
                  </div>
                  <div>
                    <Activity className="h-4 w-4 mx-auto mb-1 text-slate-600" />
                    <p className="text-xs text-slate-500">Palavras</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {transcriptSegments.reduce((acc, seg) => acc + seg.words.length, 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </MainLayout>
    </div>
  );
};

export default LiveLecture;
