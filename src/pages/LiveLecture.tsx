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

// Removed unused AudioWaveform component - waveform now inline in JSX

  return (
    <MainLayout>
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-900 via-purple-600 to-pink-500 animate-gradient-xy bg-[length:200%_200%]">
        {/* Animated Background with Ripple Effect */}
        <BackgroundRippleEffect className="opacity-30" />
        
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
            
            {isRecording && (
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
            {isRecording && !isPaused && (
              <>
                <div className="absolute w-64 h-64 rounded-full border-2 border-purple-400/30 animate-ping" style={{ animationDuration: '3s' }} />
                <div className="absolute w-56 h-56 rounded-full border-2 border-pink-400/40 animate-ping" style={{ animationDuration: '2s' }} />
                <div className="absolute w-48 h-48 rounded-full border-2 border-rose-400/50 animate-ping" style={{ animationDuration: '1.5s' }} />
              </>
            )}
            
            {/* Frosted Glass Container */}
            <div 
              className={`
                relative w-40 h-40 md:w-48 md:h-48 rounded-full 
                backdrop-blur-2xl 
                border-2 
                transition-all duration-500
                ${isRecording && !isPaused 
                  ? 'bg-white/15 border-purple-300/40 shadow-2xl shadow-purple-500/50' 
                  : 'bg-white/10 border-white/20 shadow-xl hover:shadow-2xl hover:scale-105 cursor-pointer'
                }
              `}
              onClick={!isRecording ? handleStartRecording : undefined}
            >
              {/* Rotating Shimmer Effect (quando gravando) */}
              {isRecording && !isPaused && (
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-spin" style={{ animationDuration: '2s' }} />
              )}
              
              {/* Inner Gradient Circle */}
              <div className="absolute inset-8 rounded-full flex items-center justify-center">
                <div className={`
                  w-28 h-28 md:w-32 md:h-32 rounded-full 
                  flex items-center justify-center
                  transition-all duration-500
                  ${isRecording && !isPaused
                    ? 'bg-gradient-to-br from-purple-600 via-pink-500 to-rose-500 shadow-2xl shadow-pink-500/50'
                    : isPaused
                    ? 'bg-gradient-to-br from-yellow-500 to-orange-500 opacity-70'
                    : 'bg-gradient-to-br from-gray-300 to-gray-400'
                  }
                `}>
                  {/* Icon */}
                  {isRecording && !isPaused ? (
                    <Mic className="h-12 w-12 md:h-14 md:w-14 text-white animate-pulse" />
                  ) : isPaused ? (
                    <Pause className="h-12 w-12 md:h-14 md:w-14 text-white" />
                  ) : (
                    <Mic className="h-12 w-12 md:h-14 md:w-14 text-gray-600" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 3. WAVEFORM (standalone) */}
          <div className="w-full max-w-2xl px-4">
            <div className="flex justify-center items-end h-24 md:h-32 gap-0.5 mb-2">
              {Array.from({ length: 40 }, (_, i) => {
                const distanceFromCenter = Math.abs(i - 20);
                const normalizedDistance = distanceFromCenter / 20;
                
                const baseHeight = isRecording && !isPaused ? 64 : 15;
                const falloffMultiplier = 1 - (normalizedDistance * 0.4);
                
                const dynamicHeight = isRecording && !isPaused 
                  ? baseHeight * falloffMultiplier * (0.4 + (audioLevel / 100) * 0.6) * (0.8 + Math.sin(Date.now() * 0.01 + i * 0.4) * 0.2)
                  : baseHeight * falloffMultiplier * 0.3;
                
                return (
                  <div
                    key={i}
                    className={`rounded-t transition-all duration-100 ease-out w-1 ${
                      isRecording && !isPaused 
                        ? 'bg-gradient-to-t from-purple-500 to-pink-400' 
                        : 'bg-white/40'
                    }`}
                    style={{
                      height: `${Math.max(3, dynamicHeight)}px`,
                      opacity: isRecording && !isPaused 
                        ? 0.7 + (Math.sin(Date.now() * 0.008 + i * 0.3) * 0.3)
                        : 0.5,
                      boxShadow: isRecording && !isPaused 
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
                isRecording && !isPaused 
                  ? 'bg-green-400 animate-pulse shadow-lg shadow-green-400/50' 
                  : 'bg-white/40'
              }`} />
              <p className="text-xs text-white/90 font-medium">
                {isRecording && !isPaused ? 'Monitorando entrada de áudio' : 'Aguardando entrada de áudio'}
              </p>
            </div>
          </div>

          {/* 4. CONTROL BUTTONS */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            {!isRecording ? (
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

          {/* 5. WHITE PANEL (apenas quando gravando) - Slide-in Bottom */}
          {isRecording && (
            <div className="fixed bottom-0 left-0 right-0 z-20 animate-slide-in-up">
              <div className="
                bg-white/95 backdrop-blur-xl 
                rounded-t-3xl 
                border-t-4 border-purple-500/20
                shadow-[0_-10px_40px_rgba(168,85,247,0.15)]
                p-6
                max-h-[40vh] md:max-h-[35vh]
                overflow-hidden
              ">
                {/* Header com drag handle */}
                <div className="flex items-center justify-center mb-4">
                  <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
                </div>
                
                {/* Live Transcription */}
                <div className="overflow-y-auto max-h-[20vh] md:max-h-[18vh] mb-4">
                  <LiveTranscriptViewer
                    segments={transcriptSegments}
                    currentWords={currentWords}
                    isProcessing={isProcessing}
                  />
                </div>
                
                {/* Quick Metrics Footer */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-gray-500">Duração</p>
                      <p className="text-sm font-semibold text-gray-800">{formatTime(recordingTime)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Segmentos</p>
                      <p className="text-sm font-semibold text-gray-800">{transcriptSegments.length}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Status</p>
                      <p className={`text-sm font-semibold ${isProcessing ? 'text-yellow-600' : 'text-green-600'}`}>
                        {isProcessing ? 'Processando...' : 'Ativo'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default LiveLecture;
