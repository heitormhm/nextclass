import { useState, useRef, useCallback } from 'react';

export const useAudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptionCallbackRef = useRef<((text: string) => void) | null>(null);
  const accumulatedTextRef = useRef<string>('');

  const startRecording = useCallback(async () => {
    // Verificar suporte do navegador
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError('Navegador não suporta reconhecimento de voz. Use Chrome, Edge ou Safari.');
      throw new Error('Speech recognition not supported');
    }

    try {
      setError(null);
      
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'pt-PT';
      recognitionRef.current.maxAlternatives = 1;

      recognitionRef.current.onstart = () => {
        console.log('Speech recognition started');
        setIsRecording(true);
        accumulatedTextRef.current = '';
      };

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        // Resetar timer de silêncio quando há fala
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }

        // Se há transcrição final, acumular
        if (finalTranscript.trim()) {
          accumulatedTextRef.current += finalTranscript;
          
          // Aguardar 1.5 segundos de silêncio para enviar
          silenceTimerRef.current = setTimeout(() => {
            if (accumulatedTextRef.current.trim() && transcriptionCallbackRef.current) {
              console.log('Transcription:', accumulatedTextRef.current.trim());
              transcriptionCallbackRef.current(accumulatedTextRef.current.trim());
              accumulatedTextRef.current = '';
            }
          }, 1500);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        
        if (event.error === 'not-allowed') {
          setError('Permissão do microfone negada');
        } else if (event.error === 'network') {
          setError('Erro de rede. Verifique sua conexão com a internet.');
        } else if (event.error === 'no-speech') {
          console.log('No speech detected, continuing...');
          return;
        } else {
          setError('Erro no reconhecimento de voz');
        }
        
        if (event.error !== 'no-speech') {
          setIsRecording(false);
        }
      };

      recognitionRef.current.onend = () => {
        console.log('Speech recognition ended');
        
        // Se ainda há texto acumulado, enviar antes de parar
        if (accumulatedTextRef.current.trim() && transcriptionCallbackRef.current) {
          transcriptionCallbackRef.current(accumulatedTextRef.current.trim());
          accumulatedTextRef.current = '';
        }
        
        // Reiniciar automaticamente se ainda estiver no modo de gravação
        if (isRecording && recognitionRef.current) {
          try {
            recognitionRef.current.start();
            console.log('Speech recognition restarted');
          } catch (err) {
            console.error('Error restarting recognition:', err);
          }
        }
      };

      recognitionRef.current.start();
      
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Erro ao iniciar gravação');
      throw err;
    }
  }, [isRecording]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    // Enviar qualquer texto acumulado antes de parar
    if (accumulatedTextRef.current.trim() && transcriptionCallbackRef.current) {
      transcriptionCallbackRef.current(accumulatedTextRef.current.trim());
      accumulatedTextRef.current = '';
    }

    setIsRecording(false);
    console.log('Recording stopped');
  }, []);

  const pauseRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      
      // Enviar texto acumulado ao pausar
      if (accumulatedTextRef.current.trim() && transcriptionCallbackRef.current) {
        transcriptionCallbackRef.current(accumulatedTextRef.current.trim());
        accumulatedTextRef.current = '';
      }
      
      console.log('Recording paused');
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        console.log('Recording resumed');
      } catch (err) {
        console.error('Error resuming recognition:', err);
      }
    }
  }, []);

  const onTranscriptionReceived = useCallback((callback: (text: string) => void) => {
    transcriptionCallbackRef.current = callback;
  }, []);

  return {
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    isRecording,
    error,
    onTranscriptionReceived
  };
};
