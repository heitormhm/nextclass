import React, { useEffect, useRef } from 'react';
import { format, addDays, startOfWeek, isSameDay, isToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, X, Trash2, Video, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  startTime: string;
  endTime: string;
  type: 'online' | 'presencial';
  status?: 'pending' | 'completed' | 'cancelled';
  location?: string;
  description?: string;
  color?: string;
  category?: string;
}

interface WeekCalendarViewProps {
  events: CalendarEvent[];
  selectedDate: Date;
  onEventUpdate: (eventId: string, action: 'complete' | 'cancel') => void;
  onEventClick?: (event: CalendarEvent) => void;
}

export const WeekCalendarView: React.FC<WeekCalendarViewProps> = ({
  events,
  selectedDate,
  onEventUpdate,
  onEventClick
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const getCategoryLabel = (category?: string) => {
    const categoryLabels: Record<string, string> = {
      'aula_presencial': 'Aula Presencial',
      'aula_online': 'Aula Online',
      'atividade_avaliativa': 'Avaliação',
      'trabalho': 'Trabalho',
      'prova': 'Prova',
      'seminario': 'Seminário',
      'outro': 'Outro'
    };
    
    if (!category) return 'Evento';
    return categoryLabels[category] || category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getEventColorClasses = (color: string = 'azul') => {
    const colorMap: Record<string, { bg: string; text: string; badge: string; border: string }> = {
      'azul': { bg: 'from-blue-500 to-blue-600', text: 'text-blue-700', badge: 'bg-blue-50', border: 'border-blue-200' },
      'vermelho': { bg: 'from-red-500 to-red-600', text: 'text-red-700', badge: 'bg-red-50', border: 'border-red-200' },
      'verde': { bg: 'from-green-500 to-green-600', text: 'text-green-700', badge: 'bg-green-50', border: 'border-green-200' },
      'amarelo': { bg: 'from-yellow-500 to-yellow-600', text: 'text-yellow-700', badge: 'bg-yellow-50', border: 'border-yellow-200' },
      'roxo': { bg: 'from-purple-500 to-purple-600', text: 'text-purple-700', badge: 'bg-purple-50', border: 'border-purple-200' },
      'rosa': { bg: 'from-pink-500 to-pink-600', text: 'text-pink-700', badge: 'bg-pink-50', border: 'border-pink-200' },
      'laranja': { bg: 'from-orange-500 to-orange-600', text: 'text-orange-700', badge: 'bg-orange-50', border: 'border-orange-200' },
    };
    return colorMap[color] || colorMap['azul'];
  };

  // Generate week days starting from Sunday
  const weekStart = startOfWeek(selectedDate, { locale: ptBR });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Time slots (24 hours, each hour = 2 slots of 30min)
  const timeSlots = Array.from({ length: 24 }, (_, i) => i);

  // Calculate position and height for events
  const getEventPosition = (startTime: string, endTime: string) => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const duration = endMinutes - startMinutes;
    
    // Each hour = 60px, so 1 minute = 1px
    const top = startMinutes;
    const height = Math.max(duration, 40); // Minimum 40px height
    
    return { top, height };
  };

  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    return events.filter(event => isSameDay(event.date, day));
  };

  // Auto-scroll to current time on mount
  useEffect(() => {
    if (containerRef.current) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const scrollPosition = currentMinutes - 120; // Center current time in view
      
      containerRef.current.scrollTo({ top: Math.max(0, scrollPosition), behavior: 'smooth' });
    }
  }, []);

  // Get current time position for "now" indicator
  const getCurrentTimePosition = () => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  };

  const nowPosition = getCurrentTimePosition();
  const showNowIndicator = weekDays.some(day => isToday(day));

  return (
    <div className="bg-white/60 backdrop-blur-xl rounded-lg border border-pink-100 overflow-hidden">
      {/* Week header */}
      <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-border sticky top-0 bg-white/90 backdrop-blur-xl z-20">
        <div className="p-4 border-r border-border"></div>
        {weekDays.map((day, idx) => {
          const isCurrentDay = isToday(day);
          return (
              <div
                key={idx}
                className={cn(
                  "p-4 text-center border-r border-border last:border-r-0 flex flex-col items-center justify-center",
                  isCurrentDay && "bg-gradient-to-b from-pink-50 to-purple-50"
                )}
              >
                <div className={cn(
                  "text-sm font-medium",
                  isCurrentDay ? "text-pink-600" : "text-foreground-muted"
                )}>
                  {format(day, 'EEE', { locale: ptBR })}
                </div>
                <div className={cn(
                  "text-2xl font-bold mt-1",
                  isCurrentDay && "text-pink-600"
                )}>
                  {format(day, 'd')}
                </div>
              </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div
        ref={containerRef}
        className="relative overflow-y-auto custom-scrollbar"
        style={{ height: '600px' }}
      >
        <div className="relative" style={{ height: `${24 * 60}px` }}>
          {/* Time labels and grid lines */}
          {timeSlots.map((hour) => (
            <div
              key={hour}
              className="absolute left-0 right-0 border-t border-border"
              style={{ top: `${hour * 60}px` }}
            >
              <div className="absolute top-0 left-2 -translate-y-1/2 text-xs text-foreground-muted bg-white px-1.5 py-0.5">
                {format(new Date(2024, 0, 1, hour), 'HH:mm')}
              </div>
            </div>
          ))}

          {/* Now indicator */}
          {showNowIndicator && (
            <div
              className="absolute left-0 right-0 border-t-2 border-pink-500 z-10"
              style={{ top: `${nowPosition}px` }}
            >
              <div className="absolute -top-1.5 -left-1.5 w-3 h-3 rounded-full bg-pink-500" />
              <div className="absolute -top-2.5 left-2 text-xs font-medium text-pink-600 bg-pink-50 px-2 py-0.5 rounded">
                Agora
              </div>
            </div>
          )}

          {/* Day columns with events */}
          <div className="absolute inset-0 grid grid-cols-[80px_repeat(7,1fr)]">
            <div className="border-r border-border"></div>
            {weekDays.map((day, dayIdx) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentDay = isToday(day);
              
              return (
                <div
                  key={dayIdx}
                  className={cn(
                    "relative border-r border-border last:border-r-0",
                    isCurrentDay && "bg-pink-50/30"
                  )}
                >
                  {dayEvents.map((event) => {
                    const { top, height } = getEventPosition(event.startTime, event.endTime);
                    const isCompleted = event.status === 'completed';
                    const isCancelled = event.status === 'cancelled';
                    const colorClasses = getEventColorClasses(event.color);
                    
                    return (
                      <div
                        key={event.id}
                        className={cn(
                          "absolute left-1 right-1 rounded-lg p-2 cursor-pointer transition-all duration-300",
                          "hover:scale-[1.03] hover:shadow-xl group",
                          isCompleted && "opacity-60",
                          isCancelled && "opacity-50 grayscale",
                          !isCancelled && `bg-gradient-to-br ${colorClasses.bg} text-white shadow-md`
                        )}
                        style={{ top: `${top}px`, height: `${height}px`, minHeight: '40px' }}
                        onClick={() => onEventClick?.(event)}
                      >
                        <div className={cn(
                          "flex flex-col h-full justify-between relative z-20",
                          height > 60 && event.category && "pb-6"
                        )}>
                          <div>
                            <div className={cn(
                              "text-xs font-semibold truncate",
                              isCompleted && "line-through"
                            )}>
                              {event.title}
                            </div>
                            <div className="text-[10px] opacity-90 mt-0.5">
                              {event.startTime} - {event.endTime}
                            </div>
                            {event.location && height > 50 && (
                              <div className="text-[10px] opacity-80 truncate mt-1">
                                {event.location}
                              </div>
                            )}
                          </div>

                          {/* Action buttons - show on hover */}
                          <div className={cn(
                            "flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-50 relative",
                            height < 60 && "absolute -right-1 -top-1 bg-white rounded-lg shadow-lg p-1"
                          )}>
                            {!isCompleted && (
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Concluir evento"
                                className="h-6 w-6 bg-white/90 hover:bg-green-100 hover:scale-110 text-green-600 transition-all"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEventUpdate(event.id, 'complete');
                                }}
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            )}
                            {!isCancelled && (
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Cancelar evento"
                                className="h-6 w-6 bg-white/90 hover:bg-orange-100 hover:scale-110 text-orange-600 transition-all"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEventUpdate(event.id, 'cancel');
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Category badge */}
            {height > 60 && event.category && (
              <Badge
                variant="outline"
                className={cn(
                  "absolute bottom-1 left-1 h-5 text-[9px] px-1.5 z-10",
                  `${colorClasses.badge} ${colorClasses.text} ${colorClasses.border} border`
                )}
              >
                {getCategoryLabel(event.category)}
              </Badge>
            )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
