import { useState, useCallback } from 'react';

type Speaker = 'Estagiário' | 'Supervisor';

export const useSpeakerDetection = () => {
  const [currentSpeaker, setCurrentSpeaker] = useState<Speaker>('Estagiário');

  const toggleSpeaker = useCallback(() => {
    setCurrentSpeaker(prev => prev === 'Estagiário' ? 'Supervisor' : 'Estagiário');
  }, []);

  const setSpeaker = useCallback((speaker: Speaker) => {
    setCurrentSpeaker(speaker);
  }, []);

  return {
    currentSpeaker,
    toggleSpeaker,
    setSpeaker
  };
};
