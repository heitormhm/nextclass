import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Pause, Play, Square, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import MainLayout from '@/components/MainLayout';

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
    // Generate 32 bars for a symmetrical waveform (16 on each side)
    const numBars = 32;
    const bars = Array.from({ length: numBars }, (_, i) => {
      const distanceFromCenter = Math.abs(i - numBars / 2 + 0.5);
      const normalizedDistance = distanceFromCenter / (numBars / 2);
      
      // Base height with falloff from center
      const baseHeight = isRecording && !isPaused ? 60 : 20;
      const falloffMultiplier = 1 - (normalizedDistance * 0.3);
      
      // Dynamic height based on audio level and position
      const dynamicHeight = isRecording && !isPaused 
        ? baseHeight * falloffMultiplier * (0.3 + (audioLevel / 100) * 0.7) * (0.7 + Math.sin(Date.now() * 0.01 + i * 0.5) * 0.3)
        : baseHeight * falloffMultiplier * 0.3;
      
      return {
        height: Math.max(4, dynamicHeight),
        opacity: isRecording && !isPaused 
          ? 0.6 + (Math.sin(Date.now() * 0.008 + i * 0.3) * 0.4)
          : 0.4
      };
    });

    return (
      <div className="flex justify-center items-end h-24 gap-1">
        {bars.map((bar, index) => (
          <div
            key={index}
            className="bg-white/80 rounded-t-sm transition-all duration-100 ease-out min-w-[3px] w-1"
            style={{
              height: `${bar.height}px`,
              opacity: bar.opacity,
              boxShadow: isRecording && !isPaused 
                ? '0 0 8px rgba(255, 255, 255, 0.6)' 
                : 'none'
            }}
          />
        ))}
      </div>
    );
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-600">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">
              Gravação de Aula ao Vivo
            </h1>
            <p className="text-white/80 text-lg flex items-center justify-center gap-2">
              {isRecording ? (
                <>
                  <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                  Gravando... {formatTime(recordingTime)}
                </>
              ) : (
                'Clique em "Iniciar" para começar a gravação'
              )}
            </p>
          </div>

          {/* Main Recording Interface */}
          <div className="max-w-4xl mx-auto">
            <Card className="bg-white/20 backdrop-blur-xl shadow-2xl border-white/20">
              <CardContent className="p-12 space-y-12">
                {/* Central Orb Interface */}
                <div className="flex flex-col items-center space-y-8">
                  {/* Main Orb with Concentric Rings */}
                  <div className="relative flex items-center justify-center">
                    {/* Outermost Ring */}
                    <div className={`absolute w-80 h-80 rounded-full border-2 transition-all duration-1000 ${
                      isRecording && !isPaused
                        ? 'border-white/30 animate-ping'
                        : 'border-white/10'
                    }`} style={{ animationDuration: '4s' }} />
                    
                    {/* Middle Ring */}
                    <div className={`absolute w-60 h-60 rounded-full border-2 transition-all duration-1000 ${
                      isRecording && !isPaused
                        ? 'border-white/40 animate-ping'
                        : 'border-white/15'
                    }`} style={{ animationDuration: '3s', animationDelay: '0.5s' }} />
                    
                    {/* Inner Ring */}
                    <div className={`absolute w-40 h-40 rounded-full border-2 transition-all duration-1000 ${
                      isRecording && !isPaused
                        ? 'border-white/50 animate-ping'
                        : 'border-white/20'
                    }`} style={{ animationDuration: '2s', animationDelay: '1s' }} />
                    
                    {/* Central Orb */}
                    <div className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 ${
                      isRecording && !isPaused
                        ? 'bg-gradient-to-br from-red-400 via-red-500 to-red-600 shadow-2xl shadow-red-500/50'
                        : 'bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500 shadow-lg'
                    }`}>
                      {/* Dynamic Glow Effect */}
                      {isRecording && !isPaused && (
                        <>
                          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-spin" style={{ animationDuration: '3s' }} />
                          <div className="absolute -inset-2 rounded-full bg-red-400/30 animate-pulse" />
                          <div className="absolute -inset-4 rounded-full bg-red-300/20 animate-pulse" style={{ animationDelay: '0.5s' }} />
                        </>
                      )}
                      
                      {/* Microphone Icon */}
                      <div className="relative z-10">
                        {isRecording && !isPaused ? (
                          <Mic className="h-12 w-12 text-white animate-pulse" />
                        ) : (
                          <MicOff className="h-12 w-12 text-white/70" />
                        )}
                      </div>
                    </div>
                    
                    {/* Circular Wave Animation */}
                    {isRecording && !isPaused && (
                      <>
                        <div className="absolute w-96 h-96 rounded-full border border-white/20 animate-ping opacity-30" style={{ animationDuration: '5s' }} />
                        <div className="absolute w-[28rem] h-[28rem] rounded-full border border-white/15 animate-ping opacity-20" style={{ animationDuration: '6s', animationDelay: '1s' }} />
                      </>
                    )}
                  </div>
                  
                  {/* Status and Timer */}
                  <div className="text-center space-y-4">
                    <h2 className="text-3xl font-bold text-white">
                      {isRecording 
                        ? (isPaused ? 'Gravação Pausada' : 'Gravando Agora')
                        : 'Pronto para Gravar'
                      }
                    </h2>
                    
                    {/* Recording Timer with Blinking Dot */}
                    {isRecording && (
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                        <div className="text-4xl font-mono font-bold text-white">
                          {formatTime(recordingTime)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Fluid Waveform */}
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-white/20">
                  <AudioWaveform />
                  <p className="text-center text-sm text-white/80 mt-4">
                    {isRecording && !isPaused ? 'Captando áudio...' : 'Aguardando entrada de áudio'}
                  </p>
                </div>

        {/* Control Buttons - Stack vertically on small screens */}
        <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6">
          {!isRecording ? (
            <Button
              onClick={handleStartRecording}
              className="bg-green-600 hover:bg-green-700 px-8 sm:px-12 py-3 sm:py-4 text-lg sm:text-xl font-semibold shadow-xl min-h-[56px]"
              size="lg"
            >
              <Play className="mr-3 h-5 w-5 sm:h-6 sm:w-6" />
              Iniciar Gravação
            </Button>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Button
                onClick={handlePauseRecording}
                variant="outline"
                className="px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg bg-white/20 border-white/30 text-white hover:bg-white/30 hover:text-white shadow-lg backdrop-blur-sm min-h-[48px]"
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
                className="bg-red-600 hover:bg-red-700 px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold shadow-xl min-h-[48px]"
                size="lg"
              >
                <Square className="mr-2 h-5 w-5" />
                Finalizar Gravação
              </Button>
            </div>
          )}

          {/* Settings Button - Larger for mobile */}
          <Dialog>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="icon"
                className="bg-white/20 border-white/30 text-white hover:bg-white/30 hover:text-white shadow-lg backdrop-blur-sm min-h-[56px] min-w-[56px] p-4"
              >
                <Settings className="h-6 w-6" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white max-w-[95vw] sm:max-w-lg w-full mx-2 sm:mx-0">
              <DialogHeader>
                <DialogTitle>Configurações de Áudio</DialogTitle>
                <DialogDescription>
                  Selecione o dispositivo de entrada de áudio
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="microphone">Microfone</Label>
                  <Select value={selectedMicrophone} onValueChange={setSelectedMicrophone}>
                    <SelectTrigger className="min-h-[48px]">
                      <SelectValue placeholder="Selecione o microfone" />
                    </SelectTrigger>
                    <SelectContent>
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

                {/* Status Information */}
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center border border-white/20">
                  <p className="text-sm text-white/90">
                    💡 <strong>Dica:</strong> Fale claramente e mantenha-se próximo ao microfone para melhor qualidade de transcrição.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default LiveLecture;