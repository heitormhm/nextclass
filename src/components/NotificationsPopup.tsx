import { useState } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const mockNotifications = [
  { id: 1, text: 'Suas notas de Cardiologia foram publicadas.', time: '2h atrás' },
  { id: 2, text: 'A aula ao vivo de Neurologia começa em 1 hora.', time: '3h atrás' },
  { id: 3, text: 'Não se esqueça: a entrega do projeto de Farmacologia é em 3 dias.', time: '1d atrás' }
];

interface NotificationsPopupProps {
  mobile?: boolean;
}

const NotificationsPopup = ({ mobile = false }: NotificationsPopupProps) => {
  const [notifications, setNotifications] = useState(mockNotifications);

  const clearNotification = (id: number) => {
    setNotifications(notifications.filter(notif => notif.id !== id));
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
                    className="p-4 border-b border-border last:border-b-0 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-snug">
                          {notification.text}
                        </p>
                        <p className="text-xs text-foreground-muted">
                          {notification.time}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => clearNotification(notification.id)}
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