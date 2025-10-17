import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useAudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const transcriptionCallbackRef = useRef<((text: string) => void) | null>(null);
  const isProcessingRef = useRef(false);

  const processAudioChunk = async (audioBlob: Blob) => {
    if (isProcessingRef.current) {
      console.log('Already processing a chunk, skipping...');
      return;
    }

    try {
      isProcessingRef.current = true;
      console.log('Processing audio chunk:', audioBlob.size, 'bytes');
      
      // Converter Blob para base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        
        // Enviar para edge function
        const { data, error } = await supabase.functions.invoke('transcribe-audio', {
          body: { audio: base64Audio }
        });

        isProcessingRef.current = false;

        if (error) {
          console.error('Transcription error:', error);
          setError('Erro na transcrição');
          return;
        }

        if (data?.text && transcriptionCallbackRef.current) {
          console.log('Transcription received:', data.text);
          transcriptionCallbackRef.current(data.text);
        }
      };
      
      reader.onerror = () => {
        console.error('Error reading audio blob');
        setError('Erro ao processar áudio');
        isProcessingRef.current = false;
      };
    } catch (err) {
      console.error('Error processing audio chunk:', err);
      setError('Erro ao processar áudio');
      isProcessingRef.current = false;
    }
  };

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      
      // Solicitar permissão do microfone
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      streamRef.current = stream;

      // Configurar MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000
      });

      mediaRecorderRef.current = mediaRecorder;

      // Handler para chunks de áudio
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && isRecording) {
          processAudioChunk(event.data);
        }
      };

      // Iniciar gravação com chunks de 5 segundos
      mediaRecorder.start(5000);
      setIsRecording(true);
      
      console.log('Recording started with chunks every 5 seconds');
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Erro ao iniciar gravação');
      throw err;
    }
  }, [isRecording]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    console.log('Recording stopped');
  }, []);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      console.log('Recording paused');
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      console.log('Recording resumed');
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
