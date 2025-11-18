/**
 * useVoiceInput Hook - Voice-to-text integration
 * Handles Web Speech API integration with Tiptap editor
 */

import { useState, useRef, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import { toast } from 'sonner';

export const useVoiceInput = (editor: Editor | null) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Speech Recognition
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'pt-BR';

        recognitionRef.current.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0])
            .map((result: any) => result.transcript)
            .join('');

          if (editor && transcript) {
            editor.commands.insertContent(transcript);
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          
          if (event.error === 'not-allowed') {
            toast.error('Permissão de microfone negada');
          } else {
            toast.error('Erro no reconhecimento de voz');
          }
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [editor]);

  const startListening = () => {
    if (!recognitionRef.current) {
      toast.error('Reconhecimento de voz não suportado');
      return;
    }

    if (!editor) {
      toast.error('Editor não está pronto');
      return;
    }

    try {
      recognitionRef.current.start();
      setIsListening(true);
      toast.success('Gravação de voz iniciada');
    } catch (error) {
      console.error('Error starting voice input:', error);
      toast.error('Erro ao iniciar gravação');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      toast.success('Gravação de voz parada');
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return {
    isListening,
    startListening,
    stopListening,
    toggleListening,
  };
};
