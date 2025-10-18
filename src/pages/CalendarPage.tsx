import React, { useState, useEffect } from 'react';
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, isSameDay, isSameMonth, isToday, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Clock, MapPin, Check, X, Trash2, Video, Users, Calendar as CalendarIcon, List, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import MainLayout from '@/components/MainLayout';
import { CalendarEventModal } from '@/components/CalendarEventModal';
import { EventDetailsDialog } from '@/components/EventDetailsDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { WeekCalendarView } from '@/components/WeekCalendarView';

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
  isPersonalEvent?: boolean;
  color?: string;
  category?: string;
  created_by?: string;
  disciplinaId?: string;
  classId?: string;
}

const CalendarPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEventModal, setShowEventModal] = useState(false);
  const [userRole, setUserRole] = useState<'student' | 'teacher'>('student');
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [selectedEventForDetails, setSelectedEventForDetails] = useState<CalendarEvent | null>(null);
  const [showEventDetails, setShowEventDetails] = useState(false);

  // Fetch events from database
  useEffect(() => {
    fetchEvents();
    fetchUserRole();
  }, [currentDate]);

  const fetchUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setUserRole(data.role as 'student' | 'teacher');
    }
  };

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);

      // Fetch personal events
      const { data: personalEvents } = await supabase
        .from('personal_events')
        .select('*')
        .eq('user_id', user.id)
        .gte('event_date', monthStart.toISOString())
        .lte('event_date', monthEnd.toISOString());

      // Fetch class events (if enrolled)
      const { data: enrollments } = await supabase
        .from('turma_enrollments')
        .select('turma_id')
        .eq('aluno_id', user.id);

      const enrolledClassIds = enrollments?.map(e => e.turma_id) || [];

      const { data: classEvents } = await supabase
        .from('class_events')
        .select('*')
        .in('class_id', enrolledClassIds)
        .gte('event_date', monthStart.toISOString())
        .lte('event_date', monthEnd.toISOString());

      // Merge and format events
      const allEvents: CalendarEvent[] = [
        ...(personalEvents || []).map(event => ({
          id: event.id,
          title: event.title,
          date: parseISO(event.event_date.split('T')[0]),
          startTime: event.start_time,
          endTime: event.end_time,
          type: (event.event_type || 'event') as 'online' | 'presencial',
          status: (event.status || 'pending') as 'pending' | 'completed' | 'cancelled',
          description: event.notes || event.description,
          isPersonalEvent: true,
          color: event.color || 'azul',
          category: (event as any).category || 'outro',
          created_by: event.user_id,
        })),
        ...(classEvents || []).map(event => ({
          id: event.id,
          title: event.title,
          date: parseISO(event.event_date.split('T')[0]),
          startTime: event.start_time,
          endTime: event.end_time,
          type: event.event_type as 'online' | 'presencial',
          status: (event.status || 'pending') as 'pending' | 'completed' | 'cancelled',
          location: event.location,
          description: event.description || event.notes,
          isPersonalEvent: false,
          color: event.color || 'azul',
          category: event.category as any,
          created_by: undefined,
          disciplinaId: event.disciplina_id,
          classId: event.class_id,
        }))
      ];

      setEvents(allEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Erro ao carregar eventos');
    } finally {
      setIsLoading(false);
    }
  };

  // Legacy static event data as fallback
  const staticEvents: CalendarEvent[] = [
    {
      id: '1',
      title: 'Análise Termodinâmica',
      date: new Date(2024, 2, 15), // March 15, 2024
      startTime: '09:00',
      endTime: '10:30',
      type: 'online',
      description: 'Aula teórica sobre mecanismos cardiovasculares'
    },
    {
      id: '2',
      title: 'Seminário de Estruturas',
      date: new Date(2024, 2, 15),
      startTime: '14:00',
      endTime: '16:00',
      type: 'presencial',
      location: 'Auditório A - Campus Engenharia',
      description: 'Apresentação de casos clínicos'
    },
    {
      id: '3',
      title: 'Prática Clínica - Estágio',
      date: new Date(2024, 2, 18),
      startTime: '08:00',
      endTime: '12:00',
      type: 'presencial',
      location: 'Hospital Universitário',
      description: 'Acompanhamento de consultas'
    },
    {
      id: '4',
      title: 'Webinar: Novidades em Circuitos',
      date: new Date(2024, 2, 20),
      startTime: '19:00',
      endTime: '20:30',
      type: 'online',
      description: 'Palestra com especialistas internacionais'
    },
    {
      id: '5',
      title: 'Simulação Clínica',
      date: new Date(2024, 2, 22),
      startTime: '10:00',
      endTime: '12:00',
      type: 'presencial',
      location: 'Laboratório de Simulação',
      description: 'Cenário de emergência cardiovascular'
    },
    {
      id: '6',
      title: 'Revisão para Prova',
      date: new Date(2024, 2, 25),
      startTime: '15:00',
      endTime: '17:00',
      type: 'online',
      description: 'Revisão dos principais tópicos'
    },
    {
      id: '7',
      title: 'Aula Prática - ECG',
      date: new Date(2024, 2, 27),
      startTime: '09:00',
      endTime: '11:00',
      type: 'presencial',
      location: 'Laboratório de Eletrônica',
      description: 'Análise de circuitos integrados'
    }
  ];

  const getEventsForDate = (date: Date) => {
    return events.filter(event => isSameDay(event.date, date));
  };

  const hasEventsOnDate = (date: Date) => {
    return getEventsForDate(date).length > 0;
  };

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

  const getEventTypeColor = (type: 'online' | 'presencial') => {
    return type === 'online' ? 'bg-blue-500' : 'bg-green-500';
  };

  const getEventDotColor = (color: string = 'azul') => {
    const colorMap: Record<string, string> = {
      'azul': 'bg-blue-500',
      'vermelho': 'bg-red-500',
      'verde': 'bg-green-500',
      'amarelo': 'bg-yellow-500',
      'roxo': 'bg-purple-500',
      'rosa': 'bg-pink-500',
      'laranja': 'bg-orange-500',
    };
    return colorMap[color] || 'bg-blue-500';
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => 
      direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
    );
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => 
      direction === 'prev' ? addDays(prev, -5) : addDays(prev, 5)
    );
    setSelectedDate(prev => 
      direction === 'prev' ? addDays(prev, -5) : addDays(prev, 5)
    );
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    
    // Se o dia clicado for hoje E tiver eventos, mudar automaticamente para modo semana
    const hasEventsOnThisDate = getEventsForDate(date).length > 0;
    if (isToday(date) && hasEventsOnThisDate) {
      setViewMode('week');
      setCurrentDate(date);
    }
  };

  const handleEventClick = (event: CalendarEvent) => {
    if (!event.isPersonalEvent) {
      setSelectedEventForDetails(event);
      setShowEventDetails(true);
    }
  };

  const handleEventDelete = async (eventId: string) => {
    try {
      const event = events.find(e => e.id === eventId);
      if (!event) return;

      if (!event.isPersonalEvent) {
        toast.error('Você não pode deletar eventos da turma');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (event.created_by !== user.id) {
        toast.error('Você só pode deletar seus próprios eventos');
        return;
      }

      const { error } = await supabase
        .from('personal_events')
        .delete()
        .eq('id', eventId)
        .eq('user_id', user.id);

      if (error) throw error;
      
      toast.success('🗑️ Evento deletado', { duration: 2000 });
      await fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Erro ao deletar evento');
    }
  };

  const handleEventUpdate = async (eventId: string, action: 'complete' | 'cancel') => {
    try {
      // Se for cancelar, deleta ao invés de atualizar status
      if (action === 'cancel') {
        await handleEventDelete(eventId);
        return;
      }

      // Apenas 'complete' atualiza status
      const event = events.find(e => e.id === eventId);
      if (!event) return;

      // Apenas eventos pessoais podem ser marcados como completos
      if (!event.isPersonalEvent) {
        toast.error('Você não pode alterar eventos da turma');
        return;
      }

      const newStatus = 'completed';
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('personal_events')
        .update({ status: newStatus })
        .eq('id', eventId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('✓ Evento concluído', { duration: 2000 });
      await fetchEvents();
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error('Erro ao atualizar evento');
    }
  };

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Start from Sunday of the week containing the first day
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    // Generate 42 days (6 weeks)
    const days = [];
    const currentCalendarDate = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentCalendarDate));
      currentCalendarDate.setDate(currentCalendarDate.getDate() + 1);
    }
    
    return days;
  };

  const calendarDays = generateCalendarDays();
  const selectedDateEvents = getEventsForDate(selectedDate);

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8 lg:items-start">
          {/* Main Calendar View */}
          <div className="lg:col-span-3 space-y-6 order-2 lg:order-1">
                   {isLoading ? (
                    <Card className="border-0 shadow-sm">
                      <CardContent className="p-6 space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <div className="grid grid-cols-7 gap-2">
                          {Array.from({ length: 42 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <>
                      <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-xl min-h-[600px]">
                        <CardContent className="p-6">
                          {/* Unified Navigation Bar */}
                          <div className="flex items-center justify-between mb-6">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => viewMode === 'month' ? navigateMonth('prev') : navigateWeek('prev')}
                              className="hover:bg-pink-100 transition-colors"
                              title={viewMode === 'month' ? 'Mês anterior' : 'Semana anterior'}
                            >
                              <ChevronLeft className="h-5 w-5" />
                            </Button>

                            <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent capitalize">
                              {viewMode === 'month' 
                                ? format(currentDate, 'MMMM yyyy', { locale: ptBR })
                                : format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                              }
                            </h2>

                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => viewMode === 'month' ? navigateMonth('next') : navigateWeek('next')}
                                className="hover:bg-pink-100 transition-colors"
                                title={viewMode === 'month' ? 'Próximo mês' : 'Próxima semana'}
                              >
                                <ChevronRight className="h-5 w-5" />
                              </Button>

                              <div className="h-6 w-px bg-gray-300 mx-2" />

                              <Button
                                variant={viewMode === 'month' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setViewMode('month')}
                                className={cn(
                                  viewMode === 'month' && "bg-gradient-to-r from-pink-500 to-purple-500"
                                )}
                              >
                                <CalendarIcon className="h-4 w-4 mr-1" />
                                Mês
                              </Button>
                              <Button
                                variant={viewMode === 'week' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setViewMode('week')}
                                className={cn(
                                  viewMode === 'week' && "bg-gradient-to-r from-pink-500 to-purple-500"
                                )}
                              >
                                <List className="h-4 w-4 mr-1" />
                                Semana
                              </Button>
                            </div>
                          </div>

                      {viewMode === 'month' ? (
                        <>
                          <div className="grid grid-cols-7 gap-2">
                        {/* Days of week header */}
                        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                          <div key={day} className="p-2 text-center text-sm font-medium text-foreground-muted">
                            {day}
                          </div>
                        ))}
                        
                        {/* Calendar days */}
                        {calendarDays.map((date, index) => {
                          const isCurrentMonth = isSameMonth(date, currentDate);
                          const isSelected = isSameDay(date, selectedDate);
                          const isTodayDate = isToday(date);
                          const hasEvents = hasEventsOnDate(date);
                          const dayEvents = getEventsForDate(date);
                          
                          const DayButton = (
                            <button
                              key={index}
                              onClick={() => handleDateClick(date)}
                              className={cn(
                                "relative p-2 h-14 text-sm rounded-xl transition-all duration-200 w-full",
                                !isSelected && "hover:bg-gradient-to-br hover:from-pink-500 hover:to-purple-500 hover:text-white hover:font-bold hover:scale-[1.02]",
                                !isCurrentMonth && "text-gray-400 opacity-50",
                                isSelected && "bg-white font-extrabold text-gray-900 scale-105 shadow-2xl",
                                isTodayDate && !isSelected && "bg-pink-50 font-bold text-pink-600 ring-2 ring-pink-200",
                                hasEvents && "font-semibold"
                              )}
                            >
                              <span className="relative z-10">{format(date, 'd')}</span>
                              
                              {/* Event indicators - Vertical stacked dots */}
                              {hasEvents && (
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 items-center justify-center z-10">
                                  {dayEvents.slice(0, 3).map((event, idx) => (
                                    <div
                                      key={idx}
                                      className={cn(
                                        "w-1.5 h-1.5 rounded-full shadow-sm transition-all",
                                        getEventDotColor(event.color),
                                        isSelected && "ring-1 ring-white scale-110"
                                      )}
                                    />
                                  ))}
                                  {dayEvents.length > 3 && (
                                    <MoreHorizontal 
                                      className={cn(
                                        "h-2 w-2 transition-all",
                                        isSelected ? "text-gray-700" : "text-pink-600"
                                      )}
                                    />
                                  )}
                                </div>
                              )}
                            </button>
                          );
                          
                          // Wrapper com borda gradiente apenas para dia selecionado
                          if (isSelected) {
                            return (
                              <div key={index} className="relative p-[2px] rounded-xl bg-gradient-to-br from-pink-500 via-purple-500 to-pink-500 shadow-lg">
                                {DayButton}
                              </div>
                            );
                          }
                          
                          return DayButton;
                        })}
                        </div>

                      </>
                      ) : (
                  <WeekCalendarView
                    events={events}
                    selectedDate={selectedDate}
                    onEventUpdate={handleEventUpdate}
                    onEventDelete={handleEventDelete}
                    onEventClick={handleEventClick}
                  />
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
          </div>

            {/* Agenda Sidebar - Above calendar on mobile */}
            <div className="lg:col-span-1 order-1 lg:order-2">
              <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-xl lg:sticky lg:top-24 flex flex-col max-h-[600px]">
                <CardHeader className="pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="absolute -inset-2 bg-gradient-to-br from-pink-500/10 to-purple-500/10 rounded-2xl blur-md" />
                      <div className="relative w-14 h-14 bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-xl flex items-center justify-center shadow-sm">
                        <Clock className="h-7 w-7 text-pink-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-xl font-bold leading-tight bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                        {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1.5 font-medium">
                        {selectedDateEvents.length === 0 
                          ? 'Nenhum compromisso agendado'
                          : `${selectedDateEvents.length} ${selectedDateEvents.length === 1 ? 'compromisso' : 'compromissos'}`
                        }
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 overflow-y-auto flex-1">
                  {selectedDateEvents.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-background-secondary flex items-center justify-center">
                        <Clock className="h-8 w-8 text-foreground-muted" />
                      </div>
                      <p className="text-foreground-muted">
                        Nenhum evento agendado para este dia.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedDateEvents.map((event) => {
              const isCompleted = event.status === 'completed';
                        const colorClasses = getEventColorClasses(event.color);
                        
                        return (
                          <Card 
                            key={event.id} 
                            className={cn(
                              "group relative p-4 bg-white/80 backdrop-blur-xl border-2 transition-all duration-300",
                              "hover:shadow-xl hover:scale-[1.02] hover:border-pink-300",
                              colorClasses.border,
                              isCompleted && "opacity-60",
                              !event.isPersonalEvent && "cursor-pointer"
                            )}
                            onClick={() => handleEventClick(event)}
                          >
                            <div className="space-y-3">
                              {/* Indicador de cor lateral */}
                              <div className={cn(
                                "w-1 h-full absolute left-0 top-0 bottom-0 rounded-l-lg",
                                `bg-gradient-to-b ${colorClasses.bg}`
                              )} />
                              
                              <div className="flex items-start justify-between gap-3">
                                <h3 className="font-bold text-gray-900 line-clamp-2 flex-1 pl-1">
                                  {event.title}
                                </h3>
                                {!isCompleted && (
                                  <Badge 
                                    variant="outline"
                                    className={cn(
                                      "shrink-0 font-semibold h-6 text-[10px] px-2.5 shadow-sm",
                                      `${colorClasses.badge} ${colorClasses.text} ${colorClasses.border} border-2`
                                    )}
                                  >
                                    {getCategoryLabel(event.category)}
                                  </Badge>
                                )}
                              </div>
                              
                              {/* Status Badge */}
                              {isCompleted && (
                                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                  ✓ Concluído
                                </Badge>
                              )}
                              
                              <div className="space-y-2 text-sm text-gray-600">
                                <div className="flex items-center gap-2 font-medium">
                                  <Clock className="h-4 w-4 text-pink-500" />
                                  <span>{event.startTime} - {event.endTime}</span>
                                </div>
                                
                                {event.location && (
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-pink-500" />
                                    <span>{event.location}</span>
                                  </div>
                                )}
                                
                                {event.description && (
                                  <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                                    {event.description}
                                  </p>
                                )}
                              </div>

                              {/* Action Buttons - Apenas para eventos pessoais */}
                              {event.isPersonalEvent && (
                                <div className="flex gap-2 pt-2 border-t border-gray-100">
                                  {!isCompleted && (
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      title="Concluir evento"
                                      className="w-9 h-9 hover:bg-green-50 hover:text-green-700 hover:border-green-200 transition-all"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEventUpdate(event.id, 'complete');
                                      }}
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                  )}
                                  
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    title="Cancelar/Deletar evento"
                                    className="w-9 h-9 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-all"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEventUpdate(event.id, 'cancel');
                                    }}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Add to Calendar Button */}
                  <div className="pt-4 border-t">
                    <Button 
                      onClick={() => setShowEventModal(true)}
                      className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white" 
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Criar novo evento
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Event Creation Modal */}
          <CalendarEventModal
            open={showEventModal}
            onOpenChange={setShowEventModal}
            selectedDate={selectedDate}
            userRole={userRole}
            onEventCreated={fetchEvents}
          />

          {/* Event Details Dialog */}
          <EventDetailsDialog
            event={selectedEventForDetails}
            open={showEventDetails}
            onOpenChange={setShowEventDetails}
          />
        </div>
      </MainLayout>
    );
  };

  export default CalendarPage;