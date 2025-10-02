import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, Pause, Play, Square, Settings, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import MainLayout from '@/components/MainLayout';
import { BackgroundRippleEffect } from '@/components/ui/background-ripple-effect';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const LiveLecture = () => {
  const navigate = useNavigate();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [selectedMicrophone, setSelectedMicrophone] = useState('default');
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Simulate recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, isPaused]);

  // Simulate audio level visualization
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setAudioLevel(Math.random() * 100);
      }, 100);
    } else {
      setAudioLevel(0);
    }
    return () => clearInterval(interval);
  }, [isRecording, isPaused]);

  // Auto-scroll to bottom of transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      // Collect audio chunks every 5 seconds for transcription
      let chunkCount = 0;
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          chunkCount++;
          
          // Process every 5 seconds of audio
          if (chunkCount >= 5) {
            await processAudioChunks();
            chunkCount = 0;
          }
        }
      };
      
      mediaRecorder.onstop = async () => {
        // Process remaining chunks
        if (audioChunksRef.current.length > 0) {
          await processAudioChunks();
        }
        stream.getTracks().forEach(track => track.stop());
      };
      
      // Start recording with 1 second intervals
      mediaRecorder.start(1000);
      setIsRecording(true);
      setIsPaused(false);
      setTranscript('');
      
      toast({
        title: "Gravação iniciada",
        description: "A transcrição aparecerá em tempo real",
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

  const processAudioChunks = async () => {
    if (audioChunksRef.current.length === 0 || isProcessing) return;
    
    setIsProcessing(true);
    const chunks = [...audioChunksRef.current];
    audioChunksRef.current = [];
    
    try {
      const audioBlob = new Blob(chunks, { type: 'audio/webm' });
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        
        const { data, error } = await supabase.functions.invoke('transcribe-audio', {
          body: { audio: base64Audio }
        });
        
        if (error) throw error;
        
        if (data?.text) {
          setTranscript(prev => prev + ' ' + data.text);
        }
      };
      
      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error('Error processing audio:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePauseRecording = () => {
    if (!mediaRecorderRef.current) return;
    
    if (isPaused) {
      mediaRecorderRef.current.resume();
    } else {
      mediaRecorderRef.current.pause();
    }
    setIsPaused(!isPaused);
  };

  const handleStopRecording = async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setIsPaused(false);
    
    // Save lecture and redirect
    try {
      setIsSaving(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: lectureData, error: lectureError } = await (supabase as any)
        .from('lectures')
        .insert({
          teacher_id: user.id,
          raw_transcript: transcript,
          duration: recordingTime,
          status: 'processing'
        })
        .select()
        .single();

      if (lectureError) throw lectureError;

      toast({
        title: "Gravação finalizada",
        description: "Redirecionando para publicação...",
      });

      // Redirect to transcription page
      setTimeout(() => {
        navigate(`/lecturetranscription/${lectureData.id}`);
      }, 1000);
      
    } catch (error) {
      console.error('Error saving lecture:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar a gravação',
      });
      setRecordingTime(0);
    } finally {
      setIsSaving(false);
    }
  };

  const AudioWaveform = () => {
    const numBars = 40;
    const bars = Array.from({ length: numBars }, (_, i) => {
      const distanceFromCenter = Math.abs(i - numBars / 2 + 0.5);
      const normalizedDistance = distanceFromCenter / (numBars / 2);
      
      const baseHeight = isRecording && !isPaused ? 50 : 15;
      const falloffMultiplier = 1 - (normalizedDistance * 0.4);
      
      const dynamicHeight = isRecording && !isPaused 
        ? baseHeight * falloffMultiplier * (0.4 + (audioLevel / 100) * 0.6) * (0.8 + Math.sin(Date.now() * 0.01 + i * 0.4) * 0.2)
        : baseHeight * falloffMultiplier * 0.3;
      
      return {
        height: Math.max(3, dynamicHeight),
        opacity: isRecording && !isPaused 
          ? 0.7 + (Math.sin(Date.now() * 0.008 + i * 0.3) * 0.3)
          : 0.3
      };
    });

    return (
      <div className="flex justify-center items-end h-20 gap-0.5">
        {bars.map((bar, index) => (
          <div
            key={index}
            className={`rounded-t transition-all duration-100 ease-out w-1 ${
              isRecording && !isPaused 
                ? 'bg-gradient-to-t from-purple-500 to-pink-500' 
                : 'bg-slate-600'
            }`}
            style={{
              height: `${bar.height}px`,
              opacity: bar.opacity,
              boxShadow: isRecording && !isPaused 
                ? '0 0 10px rgba(168, 85, 247, 0.5)' 
                : 'none'
            }}
          />
        ))}
      </div>
    );
  };

  return (
    <MainLayout>
      <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        {/* Background effect with absolute positioning */}
        <div className="absolute inset-0 z-0">
          <BackgroundRippleEffect className="opacity-30" />
        </div>
        
        <div className="relative z-10 w-full max-w-5xl">
          {/* Header with status indicator */}
          <div className="text-center mb-4 space-y-2">
            <div className="flex items-center justify-center gap-3">
              <Radio className="h-6 w-6 text-purple-400" />
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                Gravação de Aula ao Vivo
              </h1>
            </div>
            
            {isRecording && (
              <div className="inline-flex items-center gap-2 bg-red-500/20 border border-red-500/30 rounded-full px-4 py-1 backdrop-blur-sm">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                <span className="text-red-400 font-mono font-semibold">
                  {formatTime(recordingTime)}
                </span>
              </div>
            )}
          </div>

          {/* Main Control Panel - Optimized height */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-lg border border-slate-700 shadow-2xl p-6 md:p-8 space-y-6 max-h-[calc(100vh-12rem)] overflow-y-auto">
            
            {/* Central Microphone Orb - Reduced size */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative flex items-center justify-center">
                {/* Animated rings */}
                {isRecording && !isPaused && (
                  <>
                    <div className="absolute w-48 h-48 rounded-full border-2 border-purple-500/20 animate-ping" style={{ animationDuration: '3s' }} />
                    <div className="absolute w-36 h-36 rounded-full border-2 border-purple-400/30 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
                    <div className="absolute w-24 h-24 rounded-full border-2 border-pink-500/40 animate-ping" style={{ animationDuration: '1.5s', animationDelay: '1s' }} />
                  </>
                )}
                
                {/* Central orb */}
                <div className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 ${
                  isRecording && !isPaused
                    ? 'bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 shadow-2xl shadow-purple-500/50'
                    : 'bg-gradient-to-br from-slate-700 to-slate-600 shadow-lg'
                }`}>
                  {/* Glow effect when recording */}
                  {isRecording && !isPaused && (
                    <>
                      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-spin" style={{ animationDuration: '2s' }} />
                      <div className="absolute -inset-2 rounded-full bg-purple-500/20 animate-pulse" />
                      <div className="absolute -inset-4 rounded-full bg-pink-500/10 animate-pulse" style={{ animationDelay: '0.5s' }} />
                    </>
                  )}
                  
                  {/* Icon */}
                  <div className="relative z-10">
                    {isRecording && !isPaused ? (
                      <Mic className="h-12 w-12 text-white animate-pulse" />
                    ) : (
                      <MicOff className="h-12 w-12 text-slate-300" />
                    )}
                  </div>
                </div>
              </div>
              
              {/* Status text */}
              <div className="text-center">
                <h2 className="text-xl font-bold text-white mb-1">
                  {isRecording 
                    ? (isPaused ? 'Gravação Pausada' : 'Gravando Agora')
                    : 'Pronto para Gravar'
                  }
                </h2>
                <p className="text-sm text-slate-400">
                  {isRecording && !isPaused 
                    ? 'Sistema capturando áudio em tempo real' 
                    : isPaused 
                    ? 'Clique em "Continuar" para retomar'
                    : 'Clique em "Iniciar" para começar a gravação'
                  }
                </p>
              </div>
            </div>

            {/* Audio Waveform Visualization */}
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-lg p-4 border border-slate-700">
              <AudioWaveform />
              <div className="flex items-center justify-center gap-2 mt-3">
                <div className={`w-2 h-2 rounded-full ${isRecording && !isPaused ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`}></div>
                <p className="text-xs text-slate-400">
                  {isRecording && !isPaused ? 'Monitorando entrada de áudio' : 'Aguardando entrada de áudio'}
                </p>
              </div>
            </div>

            {/* Transcription Area */}
            {isRecording && (
              <div className="bg-slate-900/50 backdrop-blur-sm rounded-lg border border-slate-700 p-4">
                <h3 className="text-sm font-semibold text-purple-400 mb-3 flex items-center gap-2">
                  <Radio className="h-4 w-4 animate-pulse" />
                  Transcrição ao Vivo
                  {isProcessing && <span className="text-xs text-slate-500">(processando...)</span>}
                </h3>
                <ScrollArea className="h-32 w-full">
                  <div className="text-sm text-slate-300 whitespace-pre-wrap pr-4">
                    {transcript || 'Aguardando fala...'}
                    <div ref={transcriptEndRef} />
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Control Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {!isRecording ? (
                <Button
                  onClick={handleStartRecording}
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 px-8 py-4 text-lg font-semibold shadow-lg shadow-green-500/20 transition-all duration-300 hover:scale-105"
                  size="lg"
                >
                  <Play className="mr-2 h-5 w-5" />
                  Iniciar Gravação
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handlePauseRecording}
                    variant="outline"
                    className="px-6 py-4 text-base bg-slate-700/50 border-slate-600 text-white hover:bg-slate-700 hover:border-slate-500 shadow-lg transition-all duration-300 hover:scale-105"
                  >
                    {isPaused ? (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Continuar
                      </>
                    ) : (
                      <>
                        <Pause className="mr-2 h-4 w-4" />
                        Pausar
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={handleStopRecording}
                    disabled={isSaving}
                    className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 px-6 py-4 text-base font-semibold shadow-lg shadow-red-500/20 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Square className="mr-2 h-4 w-4" />
                    {isSaving ? 'Salvando...' : 'Finalizar'}
                  </Button>
                </>
              )}

              {/* Settings */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon"
                    className="bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500 shadow-lg h-10 w-10 transition-all duration-300 hover:scale-105"
                  >
                    <Settings className="h-5 w-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-800 border-slate-700 text-white">
                  <DialogHeader>
                    <DialogTitle className="text-white">Configurações de Áudio</DialogTitle>
                    <DialogDescription className="text-slate-400">
                      Selecione o dispositivo de entrada de áudio
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="microphone" className="text-white">Microfone</Label>
                      <Select value={selectedMicrophone} onValueChange={setSelectedMicrophone}>
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
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

            {/* Tip */}
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 text-center">
              <p className="text-xs text-purple-300">
                💡 <strong>Dica:</strong> Fale claramente e próximo ao microfone para melhor transcrição.
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default LiveLecture;
