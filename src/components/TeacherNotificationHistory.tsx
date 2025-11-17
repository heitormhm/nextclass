import { useState, useEffect } from "react";
import { Bell, Trash2, X, Calendar as CalendarIcon, GraduationCap, Settings as SettingsIcon, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow, isToday, isYesterday, isThisWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

interface Notification {
  id: string;
  title: string;
  message: string;
  event_id?: string;
  event_type?: string;
  is_read: boolean;
  created_at: string;
}

interface GroupedNotifications {
  today: Notification[];
  yesterday: Notification[];
  thisWeek: Notification[];
  older: Notification[];
}

export const TeacherNotificationHistory = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isOpen) {
      fetchAllNotifications();
    }
  }, [isOpen]);

  useEffect(() => {
    // Subscribe to realtime changes
    const channel = supabase
      .channel('notification-history')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications'
        },
        () => {
          if (isOpen) {
            fetchAllNotifications();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen]);

  useEffect(() => {
    // Filter notifications based on active filter
    if (activeFilter === "all") {
      setFilteredNotifications(notifications);
    } else {
      setFilteredNotifications(
        notifications.filter(n => n.event_type === activeFilter)
      );
    }
  }, [activeFilter, notifications]);

  const fetchAllNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      setNotifications(data);
    }
  };

  const groupNotificationsByTime = (notifs: Notification[]): GroupedNotifications => {
    const grouped: GroupedNotifications = {
      today: [],
      yesterday: [],
      thisWeek: [],
      older: []
    };

    notifs.forEach(notification => {
      const date = new Date(notification.created_at);
      if (isToday(date)) {
        grouped.today.push(notification);
      } else if (isYesterday(date)) {
        grouped.yesterday.push(notification);
      } else if (isThisWeek(date)) {
        grouped.thisWeek.push(notification);
      } else {
        grouped.older.push(notification);
      }
    });

    return grouped;
  };

  const deleteAllNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      toast.error("Erro ao excluir notificações");
    } else {
      setNotifications([]);
      toast.success("Todas as notificações foram excluídas");
    }
    setShowDeleteDialog(false);
  };

  const deleteNotification = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error("Erro ao excluir notificação");
    } else {
      setNotifications(notifications.filter(n => n.id !== id));
      toast.success("Notificação excluída");
    }
  };

  const toggleReadStatus = async (notification: Notification) => {
    const { error } = await supabase
      .from('notifications')
      .update({ 
        is_read: !notification.is_read,
        read_at: !notification.is_read ? new Date().toISOString() : null
      })
      .eq('id', notification.id);

    if (!error) {
      setNotifications(notifications.map(n => 
        n.id === notification.id 
          ? { ...n, is_read: !n.is_read }
          : n
      ));
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.event_id) {
      navigate('/teachercalendar', { state: { openEventId: notification.event_id } });
      setIsOpen(false);
    }
    if (!notification.is_read) {
      toggleReadStatus(notification);
    }
  };

  const getNotificationIcon = (eventType?: string) => {
    switch (eventType) {
      case 'class_event':
        return <CalendarIcon className="h-5 w-5 text-primary" />;
      case 'class':
        return <GraduationCap className="h-5 w-5 text-primary" />;
      default:
        return <SettingsIcon className="h-5 w-5 text-primary" />;
    }
  };

  const renderNotificationGroup = (title: string, notifs: Notification[]) => {
    if (notifs.length === 0) return null;

    return (
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-4">{title}</h3>
        <div className="space-y-2">
          {notifs.map((notification) => (
            <div
              key={notification.id}
              className={cn(
                "group relative mx-2 rounded-lg border transition-all",
                notification.is_read 
                  ? "bg-background/50 border-border/50" 
                  : "bg-primary/5 border-primary/20",
                "hover:bg-accent/50 cursor-pointer"
              )}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex items-start gap-3 p-4">
                <div className="mt-0.5 flex-shrink-0">
                  {getNotificationIcon(notification.event_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className={cn(
                      "text-sm font-medium leading-tight",
                      !notification.is_read && "font-semibold"
                    )}>
                      {notification.title}
                    </h4>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    >
                      <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatDistanceToNow(new Date(notification.created_at), {
                      addSuffix: true,
                      locale: ptBR
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const grouped = groupNotificationsByTime(filteredNotifications);

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative h-11 w-11 min-h-[44px] min-w-[44px] md:h-10 md:w-10"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent 
          side="right" 
          className={cn(
            "flex flex-col p-0",
            isMobile ? "w-full" : "w-[480px]"
          )}
        >
          <SheetHeader className="border-b px-4 py-4 md:px-6 md:py-5">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="text-xl md:text-2xl">Notificações</SheetTitle>
                <SheetDescription className="text-sm md:text-base mt-1">
                  {unreadCount > 0 
                    ? `${unreadCount} ${unreadCount === 1 ? 'não lida' : 'não lidas'}`
                    : 'Todas as notificações lidas'}
                </SheetDescription>
              </div>
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  className="h-11 min-h-[44px] md:h-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Limpar
                </Button>
              )}
            </div>
          </SheetHeader>

          <Tabs value={activeFilter} onValueChange={setActiveFilter} className="flex-1 flex flex-col">
            <TabsList className="mx-4 my-3 grid w-auto grid-cols-4 h-11 md:h-10">
              <TabsTrigger value="all" className="text-xs md:text-sm">
                Todas
              </TabsTrigger>
              <TabsTrigger value="class_event" className="text-xs md:text-sm">
                Eventos
              </TabsTrigger>
              <TabsTrigger value="class" className="text-xs md:text-sm">
                Aulas
              </TabsTrigger>
              <TabsTrigger value="system" className="text-xs md:text-sm">
                Sistema
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeFilter} className="flex-1 mt-0">
              <ScrollArea className="h-[calc(100vh-200px)]">
                {filteredNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4">
                    <Bell className="h-16 w-16 text-muted-foreground/30 mb-4" />
                    <p className="text-lg font-medium text-muted-foreground">
                      Nenhuma notificação
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Você está em dia com tudo!
                    </p>
                  </div>
                ) : (
                  <div className="pb-4">
                    {renderNotificationGroup("Hoje", grouped.today)}
                    {renderNotificationGroup("Ontem", grouped.yesterday)}
                    {renderNotificationGroup("Esta Semana", grouped.thisWeek)}
                    {renderNotificationGroup("Mais Antigas", grouped.older)}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir todas as notificações?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todas as suas notificações serão permanentemente excluídas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 min-h-[44px] md:h-10">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={deleteAllNotifications}
              className="h-11 min-h-[44px] md:h-10 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir Tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
