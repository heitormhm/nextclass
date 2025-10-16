import React, { useState, useEffect } from 'react';
import { format, addMonths, subMonths, isSameDay, isSameMonth, isToday, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Clock, MapPin, Video, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import MainLayout from '@/components/MainLayout';
import { CalendarEventModal } from '@/components/CalendarEventModal';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  startTime: string;
  endTime: string;
  type: 'online' | 'presencial';
  location?: string;
  description?: string;
}

const CalendarPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeFilter, setActiveFilter] = useState('todas');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEventModal, setShowEventModal] = useState(false);
  const [userRole, setUserRole] = useState<'student' | 'teacher'>('student');

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
          date: new Date(event.event_date),
          startTime: event.start_time,
          endTime: event.end_time,
          type: (event.event_type || 'event') as 'online' | 'presencial',
          description: event.notes || event.description,
        })),
        ...(classEvents || []).map(event => ({
          id: event.id,
          title: event.title,
          date: new Date(event.event_date),
          startTime: event.start_time,
          endTime: event.end_time,
          type: event.event_type as 'online' | 'presencial',
          location: event.location,
          description: event.description || event.notes,
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

  const filteredEvents = events.filter(event => {
    if (activeFilter === 'todas') return true;
    if (activeFilter === 'online') return event.type === 'online';
    if (activeFilter === 'presencial') return event.type === 'presencial';
    return true;
  });

  const getEventsForDate = (date: Date) => {
    return filteredEvents.filter(event => isSameDay(event.date, date));
  };

  const hasEventsOnDate = (date: Date) => {
    return getEventsForDate(date).length > 0;
  };

  const getEventTypeColor = (type: 'online' | 'presencial') => {
    return type === 'online' ? 'bg-blue-500' : 'bg-green-500';
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => 
      direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
    );
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
          {/* Main Calendar View */}
          <div className="lg:col-span-3 space-y-6 order-2 lg:order-1">
              {/* Header - Mobile optimized */}
              <div className="flex items-center justify-between gap-4">
                <h1 className="text-2xl sm:text-3xl font-bold">Calendário</h1>
              </div>

              {/* Filter Tabs - Centralized */}
              <Tabs value={activeFilter} onValueChange={setActiveFilter}>
                <TabsList className="grid grid-cols-3 w-full max-w-2xl mx-auto h-auto p-1">
                  <TabsTrigger value="todas" className="text-xs sm:text-sm px-2 sm:px-4 py-2">Todas</TabsTrigger>
                  <TabsTrigger value="online" className="text-xs sm:text-sm px-2 sm:px-4 py-2">Online</TabsTrigger>
                  <TabsTrigger value="presencial" className="text-xs sm:text-sm px-2 sm:px-4 py-2">Presencial</TabsTrigger>
                </TabsList>

                <TabsContent value={activeFilter} className="mt-6">
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
                    <Card className="border-0 shadow-sm">
                      <CardContent className="p-6">
                      {/* Calendar Header */}
                      <div className="flex items-center justify-between mb-6">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => navigateMonth('prev')}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        
                        <h2 className="text-2xl font-semibold">
                          {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                        </h2>
                        
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => navigateMonth('next')}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Calendar Grid */}
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
                          
                          return (
                            <button
                              key={index}
                              onClick={() => handleDateClick(date)}
                              className={cn(
                                "relative p-2 h-12 text-sm rounded-lg transition-all duration-200 hover:bg-accent",
                                !isCurrentMonth && "text-foreground-muted opacity-50",
                                isSelected && "bg-primary text-primary-foreground hover:bg-primary/90",
                                isTodayDate && !isSelected && "bg-primary/10 font-semibold text-primary",
                                hasEvents && "font-medium"
                              )}
                            >
                              <span>{format(date, 'd')}</span>
                              
                              {/* Event indicators */}
                              {hasEvents && (
                                <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-0.5">
                                  {dayEvents.slice(0, 3).map((event, eventIndex) => (
                                    <div
                                      key={eventIndex}
                                      className={cn(
                                        "w-1.5 h-1.5 rounded-full",
                                        getEventTypeColor(event.type),
                                        isSelected && "bg-primary-foreground"
                                      )}
                                    />
                                  ))}
                                  {dayEvents.length > 3 && (
                                    <div className={cn(
                                      "text-xs font-bold",
                                      isSelected ? "text-primary-foreground" : "text-foreground-muted"
                                    )}>
                                      +{dayEvents.length - 3}
                                    </div>
                                  )}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Legend */}
                      <div className="flex items-center justify-center gap-6 mt-6 pt-6 border-t">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-blue-500" />
                          <span className="text-sm text-foreground-muted">Aulas Online</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-green-500" />
                          <span className="text-sm text-foreground-muted">Aulas Presenciais</span>
                        </div>
                      </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* Agenda Sidebar - Above calendar on mobile */}
            <div className="lg:col-span-1 order-1 lg:order-2">
              <Card className="border-0 shadow-sm lg:sticky lg:top-20">
                <CardHeader>
                  <CardTitle className="text-lg">
                    Agenda para {format(selectedDate, 'd')} de {format(selectedDate, 'MMMM', { locale: ptBR })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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
                    <div className="space-y-4">
                      {selectedDateEvents.map((event) => (
                        <Card key={event.id} className="p-4 hover:shadow-md transition-shadow">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <h3 className="font-semibold text-foreground line-clamp-2">
                                {event.title}
                              </h3>
                              <Badge 
                                variant={event.type === 'online' ? 'default' : 'secondary'}
                                className={cn(
                                  "ml-2 shrink-0",
                                  event.type === 'online' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-green-100 text-green-700 hover:bg-green-200'
                                )}
                              >
                                {event.type === 'online' ? (
                                  <Video className="h-3 w-3 mr-1" />
                                ) : (
                                  <Users className="h-3 w-3 mr-1" />
                                )}
                                {event.type === 'online' ? 'Online' : 'Presencial'}
                              </Badge>
                            </div>
                            
                            <div className="space-y-2 text-sm text-foreground-muted">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                <span>{event.startTime} - {event.endTime}</span>
                              </div>
                              
                              {event.location && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4" />
                                  <span>{event.location}</span>
                                </div>
                              )}
                            </div>
                            
                            {event.description && (
                              <p className="text-sm text-foreground-muted">
                                {event.description}
                              </p>
                            )}
                          </div>
                        </Card>
                      ))}
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
                      Adicionar ao meu calendário
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
        </div>
      </MainLayout>
    );
  };

  export default CalendarPage;