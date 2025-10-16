import { useState, useEffect } from "react";
import { Bell, X, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Notification {
  id: string;
  title: string;
  message: string;
  event_id?: string;
  event_type?: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationsPopupProps {
  mobile?: boolean;
}

const NotificationsPopup = ({ mobile = false }: NotificationsPopupProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();

    // Subscribe to new notifications
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      setNotifications(data);
    }
  };

  const markAsRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', id);

    setNotifications(notifications.filter(notif => notif.id !== id));
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.event_id) {
      navigate('/calendar');
    }
    markAsRead(notification.id);
  };

  if (mobile) {
    return (
      <Button
        variant="ghost"
        className="w-full justify-start"
      >
        <Bell className="h-5 w-5" />
        <span className="ml-3">Notificações</span>
        {notifications.length > 0 && (
          <span className="ml-auto w-2 h-2 bg-primary rounded-full"></span>
        )}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-accent"
        >
          <Bell className="h-5 w-5" />
          {notifications.length > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"></span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0" sideOffset={5}>
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Notificações</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-foreground-muted">
                Nenhuma notificação pendente
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="p-4 border-b border-border last:border-b-0 hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex gap-3 flex-1">
                        {notification.event_id && (
                          <div className="w-8 h-8 bg-gradient-to-br from-pink-500/10 to-purple-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <CalendarIcon className="h-4 w-4 text-pink-600" />
                          </div>
                        )}
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-semibold leading-snug">
                            {notification.title}
                          </p>
                          <p className="text-xs text-foreground-muted leading-snug">
                            {notification.message}
                          </p>
                          <p className="text-xs text-foreground-muted">
                            {formatDistanceToNow(new Date(notification.created_at), { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationsPopup;