import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Pause, Play, Square, Settings, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import MainLayout from '@/components/MainLayout';
import { BackgroundRippleEffect } from '@/components/ui/background-ripple-effect';

const LiveLecture = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [selectedMicrophone, setSelectedMicrophone] = useState('default');

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

  const handleStartRecording = () => {
    setIsRecording(true);
    setIsPaused(false);
  };

  const handlePauseRecording = () => {
    setIsPaused(!isPaused);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);
    // Navigate to transcription page
    window.location.href = '/lecturetranscription';
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
      <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <BackgroundRippleEffect className="opacity-30" />
        
        <div className="relative z-10 container mx-auto px-4 py-8">
          {/* Header with status indicator */}
          <div className="text-center mb-8 space-y-2">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Radio className="h-8 w-8 text-purple-400" />
              <h1 className="text-4xl font-bold text-white">
                Gravação de Aula ao Vivo
              </h1>
            </div>
            
            {isRecording && (
              <div className="inline-flex items-center gap-2 bg-red-500/20 border border-red-500/30 rounded-full px-6 py-2 backdrop-blur-sm">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                <span className="text-red-400 font-mono font-semibold text-lg">
                  {formatTime(recordingTime)}
                </span>
              </div>
            )}
          </div>

          {/* Main Control Panel */}
          <div className="max-w-4xl mx-auto">
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-lg border border-slate-700 shadow-2xl p-8 md:p-12 space-y-10">
              
              {/* Central Microphone Orb */}
              <div className="flex flex-col items-center space-y-6">
                <div className="relative flex items-center justify-center">
                  {/* Animated rings */}
                  {isRecording && !isPaused && (
                    <>
                      <div className="absolute w-64 h-64 rounded-full border-2 border-purple-500/20 animate-ping" style={{ animationDuration: '3s' }} />
                      <div className="absolute w-48 h-48 rounded-full border-2 border-purple-400/30 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
                      <div className="absolute w-32 h-32 rounded-full border-2 border-pink-500/40 animate-ping" style={{ animationDuration: '1.5s', animationDelay: '1s' }} />
                    </>
                  )}
                  
                  {/* Central orb */}
                  <div className={`relative w-40 h-40 rounded-full flex items-center justify-center transition-all duration-500 ${
                    isRecording && !isPaused
                      ? 'bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 shadow-2xl shadow-purple-500/50'
                      : 'bg-gradient-to-br from-slate-700 to-slate-600 shadow-lg'
                  }`}>
                    {/* Glow effect when recording */}
                    {isRecording && !isPaused && (
                      <>
                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-spin" style={{ animationDuration: '2s' }} />
                        <div className="absolute -inset-3 rounded-full bg-purple-500/20 animate-pulse" />
                        <div className="absolute -inset-6 rounded-full bg-pink-500/10 animate-pulse" style={{ animationDelay: '0.5s' }} />
                      </>
                    )}
                    
                    {/* Icon */}
                    <div className="relative z-10">
                      {isRecording && !isPaused ? (
                        <Mic className="h-16 w-16 text-white animate-pulse" />
                      ) : (
                        <MicOff className="h-16 w-16 text-slate-300" />
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Status text */}
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {isRecording 
                      ? (isPaused ? 'Gravação Pausada' : 'Gravando Agora')
                      : 'Pronto para Gravar'
                    }
                  </h2>
                  <p className="text-slate-400">
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
              <div className="bg-slate-900/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700">
                <AudioWaveform />
                <div className="flex items-center justify-center gap-2 mt-4">
                  <div className={`w-2 h-2 rounded-full ${isRecording && !isPaused ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`}></div>
                  <p className="text-sm text-slate-400">
                    {isRecording && !isPaused ? 'Monitorando entrada de áudio' : 'Aguardando entrada de áudio'}
                  </p>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                {!isRecording ? (
                  <Button
                    onClick={handleStartRecording}
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 px-12 py-6 text-xl font-semibold shadow-lg shadow-green-500/20 transition-all duration-300 hover:scale-105"
                    size="lg"
                  >
                    <Play className="mr-3 h-6 w-6" />
                    Iniciar Gravação
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={handlePauseRecording}
                      variant="outline"
                      className="px-8 py-6 text-lg bg-slate-700/50 border-slate-600 text-white hover:bg-slate-700 hover:border-slate-500 shadow-lg transition-all duration-300 hover:scale-105"
                      size="lg"
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
                      className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 px-8 py-6 text-lg font-semibold shadow-lg shadow-red-500/20 transition-all duration-300 hover:scale-105"
                      size="lg"
                    >
                      <Square className="mr-2 h-5 w-5" />
                      Finalizar Gravação
                    </Button>
                  </>
                )}

                {/* Settings */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon"
                      className="bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500 shadow-lg h-14 w-14 transition-all duration-300 hover:scale-105"
                    >
                      <Settings className="h-6 w-6" />
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
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 text-center">
                <p className="text-sm text-purple-300">
                  💡 <strong>Dica:</strong> Fale claramente e mantenha-se próximo ao microfone para melhor qualidade de transcrição.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default LiveLecture;