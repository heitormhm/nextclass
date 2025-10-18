import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useUnreadCalendarEvents = () => {
  const [hasUnreadEvents, setHasUnreadEvents] = useState(false);

  useEffect(() => {
    checkUnreadEvents();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('notifications-calendar')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `event_type=eq.class_event`
        },
        () => {
          checkUnreadEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkUnreadEvents = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
      .eq('event_type', 'class_event');

    setHasUnreadEvents((count || 0) > 0);
  };

  return hasUnreadEvents;
};
