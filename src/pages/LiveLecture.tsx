import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, Pause, Play, Square, Settings, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import MainLayout from '@/components/MainLayout';
import { BackgroundRippleEffect } from '@/components/ui/background-ripple-effect';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LiveTranscriptViewer } from '@/components/LiveTranscriptViewer';

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
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [selectedMicrophone, setSelectedMicrophone] = useState('default');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // New states for live transcription
  const [fullAudioChunks, setFullAudioChunks] = useState<Blob[]>([]);
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegment[]>([]);
  const [currentWords, setCurrentWords] = useState<Word[]>([]);
  const [contextHistory, setContextHistory] = useState<string[]>([]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
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
          sampleRate: 24000,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
        audioBitsPerSecond: 128000,
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setFullAudioChunks([]);
      setTranscriptSegments([]);
      setCurrentWords([]);
      setContextHistory([]);
      
      // Collect audio chunks for both live transcription and full recording
      let chunkCount = 0;
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          // Store ALL chunks for final audio
          setFullAudioChunks(prev => [...prev, event.data]);
          
          audioChunksRef.current.push(event.data);
          chunkCount++;
          
          // Process every 10 seconds for live transcription
          if (chunkCount >= 10) {
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
        
        // Call new edge function with context
        const { data, error } = await supabase.functions.invoke('transcribe-lecture-live', {
          body: { 
            audio: base64Audio,
            previousContext: contextHistory.slice(-3).join(' ')
          }
        });
        
        if (error) throw error;
        
        if (data?.text) {
          // Add segment with speaker
          const newSegment: TranscriptSegment = {
            speaker: data.speaker || 'Professor',
            text: data.text,
            words: data.words || [],
            timestamp: new Date()
          };
          
          setTranscriptSegments(prev => [...prev, newSegment]);
          setContextHistory(prev => [...prev, data.text].slice(-5));
          
          // Show words live (fade in)
          if (data.words && data.words.length > 0) {
            for (let i = 0; i < data.words.length; i++) {
              setTimeout(() => {
                setCurrentWords(data.words.slice(0, i + 1));
              }, i * 100);
            }
            
            // Clear after showing all
            setTimeout(() => {
              setCurrentWords([]);
            }, data.words.length * 100 + 500);
          }
        }
      };
      
      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error('Error processing audio:', error);
      toast({
        variant: "destructive",
        title: "Erro ao processar áudio",
        description: "Continuando gravação...",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const uploadFullAudio = async (): Promise<string | null> => {
    if (fullAudioChunks.length === 0) return null;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      // Create final audio file
      const fullAudioBlob = new Blob(fullAudioChunks, { type: 'audio/webm' });
      const fileName = `${user.id}/${Date.now()}.webm`;
      
      console.log('Uploading full audio:', {
        size: (fullAudioBlob.size / 1024 / 1024).toFixed(2) + ' MB',
        duration: recordingTime
      });
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('lecture-audio')
        .upload(fileName, fullAudioBlob, {
          contentType: 'audio/webm',
          cacheControl: '3600',
        });
      
      if (uploadError) throw uploadError;
      
      // Get signed URL (1 year)
      const { data: urlData } = await supabase.storage
        .from('lecture-audio')
        .createSignedUrl(fileName, 31536000);
      
      return urlData?.signedUrl || null;
    } catch (error) {
      console.error('Error uploading full audio:', error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar áudio",
        description: "A transcrição foi salva, mas o áudio falhou.",
      });
      return null;
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
    
    try {
      setIsSaving(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Combine all segments into full transcript
      const fullTranscript = transcriptSegments
        .map(seg => `[${seg.speaker}] ${seg.text}`)
        .join('\n\n');

      // Wait a bit for ondataavailable to finish
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Upload full audio
      const audioUrl = await uploadFullAudio();

      const { data: lectureData, error: lectureError } = await supabase
        .from('lectures')
        .insert({
          teacher_id: user.id,
          raw_transcript: fullTranscript,
          audio_url: audioUrl,
          duration: recordingTime,
          status: 'processing'
        })
        .select()
        .single();

      if (lectureError) throw lectureError;

      toast({
        title: "Gravação finalizada com sucesso",
        description: `Áudio de ${formatTime(recordingTime)} salvo e processado.`,
      });

      setTimeout(() => {
        navigate(`/lecturetranscription/${lectureData.id}`);
      }, 1000);
      
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
                : 'bg-gray-400'
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
      <div className="relative min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <BackgroundRippleEffect className="fixed inset-0 -z-10" />
        
        <div className="relative z-10 w-full max-w-5xl">
          {/* Header with status indicator */}
          <div className="text-center mb-4 space-y-2">
            <div className="flex items-center justify-center gap-3">
              <Radio className="h-6 w-6 text-purple-600" />
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Gravação de Aula ao Vivo
              </h1>
            </div>
            
            {isRecording && (
              <div className="inline-flex items-center gap-2 bg-red-50 border border-red-200 rounded-full px-4 py-1">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                <span className="text-red-600 font-mono font-semibold">
                  {formatTime(recordingTime)}
                </span>
              </div>
            )}
          </div>

          {/* Main Control Panel */}
          <div className="bg-white shadow-lg rounded-lg border border-gray-200 p-6 md:p-8 space-y-6 max-h-[calc(100vh-12rem)] overflow-y-auto">
            
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
                    : 'bg-gradient-to-br from-gray-200 to-gray-300 shadow-lg'
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
                      <MicOff className="h-12 w-12 text-gray-500" />
                    )}
                  </div>
                </div>
              </div>
              
              {/* Status text */}
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-900 mb-1">
                  {isRecording 
                    ? (isPaused ? 'Gravação Pausada' : 'Gravando Agora')
                    : 'Pronto para Gravar'
                  }
                </h2>
                <p className="text-sm text-gray-600">
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
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <AudioWaveform />
              <div className="flex items-center justify-center gap-2 mt-3">
                <div className={`w-2 h-2 rounded-full ${isRecording && !isPaused ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                <p className="text-xs text-gray-600">
                  {isRecording && !isPaused ? 'Monitorando entrada de áudio' : 'Aguardando entrada de áudio'}
                </p>
              </div>
            </div>

            {/* Live Transcription */}
            {isRecording && (
              <LiveTranscriptViewer
                segments={transcriptSegments}
                currentWords={currentWords}
                isProcessing={isProcessing}
              />
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
                    className="px-6 py-4 text-base bg-white border-gray-300 text-gray-700 hover:bg-gray-50 shadow-lg transition-all duration-300 hover:scale-105"
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
                    className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50 shadow-lg h-10 w-10 transition-all duration-300 hover:scale-105"
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
