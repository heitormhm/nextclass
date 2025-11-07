import { useEffect, useRef, useState } from 'react';
import { useToast } from './use-toast';

export const useWakeLock = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setIsSupported('wakeLock' in navigator);
  }, []);

  const requestWakeLock = async () => {
    if (!isSupported) {
      console.warn('[WakeLock] ❌ API não suportada neste navegador');
      toast({
        title: '⚠️ Wake Lock não suportado',
        description: 'Mantenha a tela ligada manualmente durante a gravação',
        variant: 'default',
      });
      return false;
    }

    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen');
      setIsActive(true);
      
      wakeLockRef.current.addEventListener('release', () => {
        console.log('[WakeLock] 🔓 Wake lock liberado');
        setIsActive(false);
      });

      console.log('[WakeLock] ✅ Wake lock adquirido - tela permanecerá ligada');
      toast({
        title: '🔒 Tela protegida',
        description: 'A tela permanecerá ligada durante a gravação',
      });
      return true;
    } catch (err: any) {
      console.error('[WakeLock] ❌ Erro ao adquirir wake lock:', err.message);
      
      if (err.name === 'NotAllowedError') {
        toast({
          title: '⚠️ Permissão negada',
          description: 'Não foi possível manter a tela ligada. Mantenha o dispositivo desbloqueado.',
          variant: 'default',
        });
      }
      return false;
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        setIsActive(false);
        console.log('[WakeLock] 🔓 Wake lock liberado manualmente');
      } catch (err) {
        console.error('[WakeLock] ❌ Erro ao liberar wake lock:', err);
      }
    }
  };

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (wakeLockRef.current !== null && document.visibilityState === 'visible') {
        console.log('[WakeLock] 🔄 Página visível novamente - re-adquirindo wake lock...');
        await requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return {
    isSupported,
    isActive,
    requestWakeLock,
    releaseWakeLock,
  };
};
