import { useState, useRef, useCallback } from 'react';

interface AudioCaptureOptions {
  onAudioChunk?: (chunk: Blob) => void;
}

export const useAudioCapture = (options?: AudioCaptureOptions) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startCapture = useCallback(async () => {
    try {
      setError(null);
      audioChunksRef.current = [];

      // Solicitar acesso ao microfone
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 44100,
          channelCount: 2,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      streamRef.current = stream;

      // Criar MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000
      });

      mediaRecorderRef.current = mediaRecorder;

      // Coletar chunks de áudio
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          options?.onAudioChunk?.(event.data);
        }
      };

      mediaRecorder.onerror = (event: any) => {
        console.error('MediaRecorder error:', event.error);
        setError('Erro na gravação de áudio');
      };

      // Iniciar gravação (chunks a cada 1 segundo)
      mediaRecorder.start(1000);
      setIsCapturing(true);

      console.log('[AudioCapture] ✅ Gravação iniciada');

    } catch (err) {
      console.error('[AudioCapture] Error:', err);
      setError('Erro ao acessar microfone');
      throw err;
    }
  }, [options]);

  const stopCapture = useCallback(async (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!mediaRecorderRef.current) {
        console.error('[AudioCapture] ❌ No active MediaRecorder');
        reject(new Error('No active recording'));
        return;
      }

      const currentState = mediaRecorderRef.current.state;
      console.log('[AudioCapture] 🛑 Stopping capture (current state:', currentState, ')');

      // Verificar estado antes de parar
      if (currentState === 'inactive') {
        console.warn('[AudioCapture] ⚠️ MediaRecorder already inactive');
        reject(new Error('Recording already stopped'));
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        console.log('[AudioCapture] 📦 Processing', audioChunksRef.current.length, 'chunks');
        
        // Combinar todos os chunks em um único Blob
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: mediaRecorderRef.current?.mimeType || 'audio/webm'
        });

        // Validar tamanho mínimo (100 KB = ~1 segundo de áudio)
        const minSizeBytes = 100 * 1024;
        if (audioBlob.size < minSizeBytes) {
          console.warn('[AudioCapture] ⚠️ Audio blob too small:', audioBlob.size, 'bytes (min:', minSizeBytes, ')');
        } else {
          console.log('[AudioCapture] ✅ Audio blob size OK:', (audioBlob.size / 1024 / 1024).toFixed(2), 'MB');
        }

        // Limpar stream
        if (streamRef.current) {
          const tracks = streamRef.current.getTracks();
          console.log('[AudioCapture] 🔇 Stopping', tracks.length, 'audio tracks');
          tracks.forEach(track => {
            track.stop();
            console.log('[AudioCapture]   - Stopped track:', track.label);
          });
          streamRef.current = null;
        }

        setIsCapturing(false);
        console.log('[AudioCapture] ✅ Gravação finalizada:', audioBlob.size, 'bytes');
        resolve(audioBlob);
      };

      mediaRecorderRef.current.stop();
    });
  }, []);

  const pauseCapture = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      console.log('[AudioCapture] ⏸️ Pausado');
    }
  }, []);

  const resumeCapture = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      console.log('[AudioCapture] ▶️ Retomado');
    }
  }, []);

  return {
    startCapture,
    stopCapture,
    pauseCapture,
    resumeCapture,
    isCapturing,
    error
  };
};
