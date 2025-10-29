import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MaterialGenerationJob } from '../types/materialGeneration.types';

interface RealtimeHookProps {
  jobId: string | null;
  onJobUpdate: (job: MaterialGenerationJob) => void;
  enabled: boolean;
}

/**
 * Hook for subscribing to realtime job updates with polling fallback
 */
export const useMaterialGenerationRealtime = ({
  jobId,
  onJobUpdate,
  enabled
}: RealtimeHookProps) => {
  const pollInterval = useRef<NodeJS.Timeout | null>(null);
  const abortPolling = useRef(false);
  const isMounted = useRef(true);

  // Stop polling helper
  const stopPolling = () => {
    abortPolling.current = true;
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
      pollInterval.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
      stopPolling();
    };
  }, []);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!jobId || !enabled) return;

    console.log('🔔 [Realtime] Subscribing to job:', jobId);
    abortPolling.current = false;

    const handleUpdate = (job: any) => {
      if (!isMounted.current || abortPolling.current) return;
      console.log(`🔄 [Update] ${job.status} ${(job.progress * 100).toFixed(0)}% - ${job.progress_message || ''}`);
      onJobUpdate(job);
    };

    const channel = supabase
      .channel(`teacher-jobs-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'teacher_jobs',
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          console.log('📬 [Realtime] Update received:', payload.new);
          handleUpdate(payload.new);
        }
      )
      .subscribe((status) => {
        console.log('🔌 [Realtime] Subscription status:', status);
        
        // SEMPRE iniciar polling como fallback garantido
        if (!pollInterval.current) {
          console.log('🔄 [Realtime] Starting polling fallback...');
          
          pollInterval.current = setInterval(async () => {
            if (abortPolling.current) return;
            
            const { data: job } = await supabase
              .from('teacher_jobs')
              .select('*')
              .eq('id', jobId)
              .single();
              
            if (job) {
              handleUpdate(job);
              
              // Parar polling se job terminou
              if (job.status === 'COMPLETED' || job.status === 'FAILED') {
                console.log('✅ [Poll] Job finished:', job.status);
                stopPolling();
              }
            }
          }, 1500); // ✅ 1.5 segundos - equilibrado entre responsividade e performance
        }
      });

    return () => {
      console.log('🔌 [Realtime] Unsubscribing from job');
      stopPolling();
      supabase.removeChannel(channel);
    };
  }, [jobId, enabled, onJobUpdate]);

  return { stopPolling };
};
