import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, MapPin } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Event {
  id: string;
  title: string;
  description?: string;
  event_date: string;
  start_time: string;
  end_time: string;
  event_type: string;
  location?: string;
  source: 'class' | 'personal';
}

export const UpcomingEventsSection = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchEvents = async () => {
      try {
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

        // Fetch personal events
        const { data: personalEvents } = await supabase
          .from('personal_events')
          .select('*')
          .eq('user_id', user.id)
          .gte('event_date', new Date().toISOString())
          .lte('event_date', sevenDaysFromNow.toISOString())
          .order('event_date', { ascending: true });

        // Fetch class events (if enrolled in any class)
        const { data: enrollments } = await supabase
          .from('turma_enrollments')
          .select('turma_id')
          .eq('aluno_id', user.id);

        let classEvents: any[] = [];
        if (enrollments && enrollments.length > 0) {
          const { data: classesData } = await supabase
            .from('classes')
            .select('id')
            .in('id', enrollments.map(e => e.turma_id));

          if (classesData && classesData.length > 0) {
            const { data: events } = await supabase
              .from('class_events')
              .select('*')
              .in('class_id', classesData.map(c => c.id))
              .gte('event_date', new Date().toISOString())
              .lte('event_date', sevenDaysFromNow.toISOString())
              .order('event_date', { ascending: true });

            classEvents = events || [];
          }
        }

        // Combine and sort events
        const combinedEvents: Event[] = [
          ...(personalEvents || []).map(e => ({ ...e, source: 'personal' as const })),
          ...(classEvents || []).map(e => ({ ...e, source: 'class' as const }))
        ].sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
        .slice(0, 5);

        setEvents(combinedEvents);
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [user]);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'lecture':
        return '📚';
      case 'quiz':
        return '📝';
      case 'deadline':
        return '⏰';
      default:
        return '📅';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Próximos Eventos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Próximos Eventos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-3">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">
              Nenhum evento programado para os próximos 7 dias.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-pink-500/10 to-purple-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Calendar className="h-6 w-6 text-pink-600" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-xl font-semibold">Próximos Eventos</CardTitle>
            <p className="text-sm text-gray-400 mt-0.5">
              Sua agenda dos próximos 7 dias
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {events.map((event) => (
          <div
            key={event.id}
            className="flex gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
          >
            <div className="text-2xl">{getEventIcon(event.event_type)}</div>
            <div className="flex-1 space-y-1">
              <h4 className="font-medium text-sm">{event.title}</h4>
              {event.description && (
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {event.description}
                </p>
              )}
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(event.event_date), "dd 'de' MMM", { locale: ptBR })}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {event.start_time} - {event.end_time}
                </span>
                {event.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {event.location}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
