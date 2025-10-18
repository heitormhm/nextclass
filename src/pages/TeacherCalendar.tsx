import React, { useState, useEffect } from 'react';
import { format, addMonths, subMonths, addDays, isSameDay, isSameMonth, isToday, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, List, MapPin, Video, Trash2, Check, Users, Edit, X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import MainLayout from '@/components/MainLayout';
import { TeacherCalendarEventModal } from '@/components/TeacherCalendarEventModal';
import { TeacherEventDetailsDialog } from '@/components/TeacherEventDetailsDialog';
import { WeekCalendarView } from '@/components/WeekCalendarView';
import { BackgroundRippleEffect } from '@/components/ui/background-ripple-effect';
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
  status?: 'pending' | 'completed' | 'cancelled';
  location?: string;
  description?: string;
  color?: string;
  category?: string;
  className?: string;
  isPersonalEvent?: boolean;
  classId?: string;
  disciplinaId?: string;
}

interface Class {
  id: string;
  name: string;
  course: string;
  period: string;
  university?: string;
  city?: string;
}

const TeacherCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEventForEdit, setSelectedEventForEdit] = useState<CalendarEvent | null>(null);
  const [showEventDetailsDialog, setShowEventDetailsDialog] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  // Debug logs
  useEffect(() => {
    console.log('[TeacherCalendar] Modal state changed:', showEventModal);
  }, [showEventModal]);

  useEffect(() => {
    console.log('[TeacherCalendar] Classes loaded:', classes);
  }, [classes]);

  // Fetch teacher's classes
  useEffect(() => {
    fetchTeacherClasses();
  }, []);

  // Fetch events when month or class filter changes
  useEffect(() => {
    if (classes.length > 0) {
      fetchClassEvents();
    }
  }, [currentDate, selectedClassId, classes]);

  const fetchTeacherClasses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar turmas através da tabela de acesso (many-to-many)
      const { data: accessData, error } = await (supabase as any)
        .from('teacher_turma_access')
        .select('turma_id, turmas(*)')
        .eq('teacher_id', user.id);

      if (error) throw error;

      const transformedClasses = accessData?.map((access: any) => ({
        id: access.turmas.id,
        name: access.turmas.nome_turma,
        course: access.turmas.curso,
        period: access.turmas.periodo,
        university: access.turmas.faculdade,
        city: access.turmas.cidade
      }))
      .sort((a, b) => parseInt(a.period) - parseInt(b.period)) || [];

      setClasses(transformedClasses);
      console.log('[TeacherCalendar] Turmas acessíveis:', transformedClasses);
      console.log('[TeacherCalendar] Total de turmas:', transformedClasses.length);
    } catch (error) {
      console.error('Error fetching turmas:', error);
      toast.error('Erro ao carregar turmas');
    }
  };

  const fetchClassEvents = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);

      // Get class IDs for the teacher
      const classIds = classes.map(c => c.id);

      // Apply class filter if selected
      const filterIds = selectedClassId === 'all' 
        ? classIds 
        : [selectedClassId];

      if (filterIds.length === 0) {
        setEvents([]);
        setIsLoading(false);
        return;
      }

      // Fetch class events with turmas join
      const { data: classEvents, error } = await supabase
        .from('class_events')
        .select(`
          *,
          turmas:class_id (
            nome_turma,
            curso,
            periodo
          )
        `)
        .in('class_id', filterIds)
        .gte('event_date', monthStart.toISOString())
        .lte('event_date', monthEnd.toISOString())
        .order('start_time');

      if (error) throw error;

      // Format events
      const formattedEvents: CalendarEvent[] = classEvents?.map(event => {
        const turma = event.turmas as any;
        
        return {
          id: event.id,
          title: event.title,
          date: parseISO(event.event_date.split('T')[0]),
        startTime: event.start_time,
        endTime: event.end_time,
        type: event.event_type as 'online' | 'presencial',
        status: (event.status || 'pending') as 'pending' | 'completed' | 'cancelled',
        location: event.location,
        description: event.description || event.notes,
        color: event.color || 'azul',
        category: event.category,
        className: turma?.nome_turma || 'Turma não especificada',
        isPersonalEvent: false,
        classId: event.class_id,
        disciplinaId: event.disciplina_id,
        };
      }) || [];

      setEvents(formattedEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Erro ao carregar eventos');
    } finally {
      setIsLoading(false);
    }
  };

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
      'prova': 'Prova',
      'seminario': 'Seminário',
      'prazo': 'Prazo',
      'reuniao': 'Reunião',
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
      'verde': { bg: 'from-green-500 to-green-600', text: 'text-green-700', badge: 'bg-green-50', border: 'border-green-200' },
      'roxo': { bg: 'from-purple-500 to-purple-600', text: 'text-purple-700', badge: 'bg-purple-50', border: 'border-purple-200' },
      'laranja': { bg: 'from-orange-500 to-orange-600', text: 'text-orange-700', badge: 'bg-orange-50', border: 'border-orange-200' },
      'vermelho': { bg: 'from-red-500 to-red-600', text: 'text-red-700', badge: 'bg-red-50', border: 'border-red-200' },
      'amarelo': { bg: 'from-yellow-500 to-yellow-600', text: 'text-yellow-700', badge: 'bg-yellow-50', border: 'border-yellow-200' },
      'rosa': { bg: 'from-pink-500 to-pink-600', text: 'text-pink-700', badge: 'bg-pink-50', border: 'border-pink-200' },
    };
    return colorMap[color] || colorMap['azul'];
  };

  const getEventDotColor = (color: string = 'azul') => {
    const colorMap: Record<string, string> = {
      'azul': 'bg-blue-500',
      'verde': 'bg-green-500',
      'roxo': 'bg-purple-500',
      'laranja': 'bg-orange-500',
      'vermelho': 'bg-red-500',
      'amarelo': 'bg-yellow-500',
      'rosa': 'bg-pink-500',
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
    
    const hasEventsOnThisDate = getEventsForDate(date).length > 0;
    if (isToday(date) && hasEventsOnThisDate) {
      setViewMode('week');
      setCurrentDate(date);
    }
  };

  const formatClassNameToBadges = (className?: string, uniformSize: boolean = false) => {
    if (!className) return null;
    
    const parts = className.split(' - ');
    
    const truncateText = (text: string, maxLength: number = 25) => {
      return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };
    
    return parts.map((part, index) => (
      <Badge 
        key={index} 
        variant="outline" 
        className={cn(
          "bg-blue-50 text-blue-700 border-blue-200",
          uniformSize ? "text-xs py-1 px-2 h-6" : "text-[10px] py-0 px-1.5"
        )}
        title={part}
      >
        {truncateText(part, 25)}
      </Badge>
    ));
  };

  const formatClassNameToFilterBadges = (className: string) => {
    const parts = className.split(' - ');
    
    const truncateUniversity = (text: string) => {
      const maxLength = 30;
      return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };
    
    return (
      <div className="flex flex-wrap gap-1.5">
        {parts.map((part, index) => {
          const isUniversity = index === 2;
          const displayText = isUniversity ? truncateUniversity(part) : part;
          
          return (
            <Badge 
              key={index} 
              variant="outline" 
              className="text-xs py-1 px-2 bg-blue-50 text-blue-700 border-blue-200"
              title={part}
            >
              {displayText}
            </Badge>
          );
        })}
      </div>
    );
  };

  const handleEventDelete = async (eventId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('class_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
      
      toast.success('🗑️ Evento deletado', { duration: 2000 });
      await fetchClassEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Erro ao deletar evento');
    }
  };

  const handleEventUpdate = async (eventId: string, action: 'complete' | 'cancel') => {
    try {
      if (action === 'cancel') {
        await handleEventDelete(eventId);
        return;
      }

      const { error } = await supabase
        .from('class_events')
        .update({ status: 'completed' })
        .eq('id', eventId);

      if (error) throw error;

      toast.success('✓ Evento marcado como concluído', { duration: 2000 });
      await fetchClassEvents();
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error('Erro ao atualizar evento');
    }
  };

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
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
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-900 via-purple-600 to-pink-500 animate-gradient-xy bg-[length:200%_200%]">
        <BackgroundRippleEffect className="opacity-30" />
        
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-48 w-96 h-96 bg-gradient-to-br from-pink-500/30 to-purple-500/30 rounded-full blur-3xl animate-float" />
          <div className="absolute top-2/3 -right-32 w-80 h-80 bg-gradient-to-br from-blue-400/25 to-purple-400/25 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-gradient-to-br from-purple-500/20 to-pink-400/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        </div>

        <div className="relative z-10 container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main Calendar - 3 columns */}
            <div className="lg:col-span-3 space-y-6">
              {isLoading ? (
                <Card className="border-0 shadow-sm bg-white/75 backdrop-blur-xl">
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
                <Card className="border-0 shadow-sm bg-white/75 backdrop-blur-xl border-blue-100/30 min-h-[600px]">
                  <CardContent className="p-6">
                    {/* Navigation bar */}
                    <div className="flex items-center justify-between mb-6">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => viewMode === 'month' ? navigateMonth('prev') : navigateWeek('prev')}
                        className="hover:bg-blue-100 transition-colors"
                        title={viewMode === 'month' ? 'Mês anterior' : 'Semana anterior'}
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </Button>

                      <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent capitalize">
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
                          className="hover:bg-blue-100 transition-colors"
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
                            viewMode === 'month' && "bg-gradient-to-r from-blue-600 to-purple-600"
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
                            viewMode === 'week' && "bg-gradient-to-r from-blue-600 to-purple-600"
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
                          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                            <div key={day} className="p-2 text-center text-sm font-medium text-foreground-muted">
                              {day}
                            </div>
                          ))}
                          
                          {calendarDays.map((date, index) => {
                            const dayEvents = getEventsForDate(date);
                            const isCurrentMonth = isSameMonth(date, currentDate);
                            const isDayToday = isToday(date);
                            const isSelected = isSameDay(date, selectedDate);

                            return (
                              <button
                                key={index}
                                onClick={() => handleDateClick(date)}
                                className={cn(
                                  "min-h-[80px] p-2 rounded-lg border transition-all relative",
                                  "hover:shadow-md hover:scale-[1.02]",
                                  isDayToday && "bg-gradient-to-b from-blue-50 to-purple-50 text-blue-600 font-bold ring-2 ring-blue-500",
                                  isSelected && !isDayToday && "bg-blue-100 ring-2 ring-blue-400",
                                  !isCurrentMonth && "opacity-40",
                                  !isDayToday && !isSelected && "bg-white hover:bg-gray-50"
                                )}
                              >
                                <div className="text-sm mb-1">{format(date, 'd')}</div>
                                <div className="space-y-1">
                                  {dayEvents.slice(0, 2).map(event => (
                                    <div
                                      key={event.id}
                                      className={cn(
                                        "text-xs px-1 py-0.5 rounded truncate",
                                        getEventColorClasses(event.color).badge,
                                        getEventColorClasses(event.color).text
                                      )}
                                      title={event.title}
                                    >
                                      {event.title}
                                    </div>
                                  ))}
                                  {dayEvents.length > 2 && (
                                    <div className="text-xs text-gray-500">
                                      +{dayEvents.length - 2} mais
                                    </div>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    ) : (
              <WeekCalendarView 
                events={events}
                selectedDate={selectedDate}
                onEventUpdate={handleEventUpdate}
                onEventClick={(event) => {
                  setSelectedEventForEdit(event);
                  setIsEditMode(false);
                  setShowEventDetailsDialog(true);
                }}
              />
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar - 1 column */}
            <div className="space-y-6">
              {/* Quick action - PRIORIZADO */}
              <Card className="bg-white/75 backdrop-blur-xl border-blue-100/30 shadow-lg">
                <CardContent className="pt-6">
                  <Button 
                    onClick={() => {
                      console.log('[TeacherCalendar] Button clicked, opening modal');
                      setShowEventModal(true);
                    }}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md"
                  >
                    <Plus className="h-4 w-4 mr-2" /> Criar Evento
                  </Button>
                </CardContent>
              </Card>

              {/* Class filter */}
              <Card className="bg-white/75 backdrop-blur-xl border-blue-100/30">
                <CardHeader>
                  <CardTitle className="text-gray-800">Filtrar por Turma</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                    <SelectTrigger className="bg-white/20 backdrop-blur-xl border-blue-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as Turmas</SelectItem>
                      {classes.map(cls => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </SelectItem>
                      ))}
                      {classes.length === 0 && (
                        <div className="px-4 py-8 text-center">
                          <p className="text-gray-500 text-sm mb-3">
                            Nenhuma turma cadastrada no sistema ainda.
                          </p>
                          <p className="text-xs text-gray-400">
                            As turmas são criadas automaticamente quando alunos se cadastram com um período definido.
                          </p>
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* Selected day events - COM SCROLL */}
              <Card className="bg-white/75 backdrop-blur-xl border-blue-100/30">
                <CardHeader>
                  <CardTitle className="text-gray-800">
                    Eventos do Dia
                  </CardTitle>
                  <p className="text-sm text-gray-500">
                    {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                  </p>
                </CardHeader>
                <CardContent className="min-h-[200px] max-h-[600px]">
                  {selectedDateEvents.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">
                      Nenhum evento neste dia
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-[550px] overflow-y-auto px-6 py-4">
                      {selectedDateEvents.map((event) => {
                        const colorClasses = getEventColorClasses(event.color);
                        
                        // Função para obter gradientes personalizados por cor
                        const getEventGradientClasses = (color: string) => {
                          const gradients: Record<string, {bg: string, hover: string, border: string, badge: string}> = {
                            azul: {
                              bg: 'bg-gradient-to-br from-blue-50 via-blue-100/50 to-blue-50',
                              hover: 'hover:from-blue-100 hover:via-blue-50 hover:to-white',
                              border: 'border-blue-200 hover:border-blue-400',
                              badge: 'bg-blue-100 text-blue-700 border-blue-300'
                            },
                            roxo: {
                              bg: 'bg-gradient-to-br from-purple-50 via-purple-100/50 to-purple-50',
                              hover: 'hover:from-purple-100 hover:via-purple-50 hover:to-white',
                              border: 'border-purple-200 hover:border-purple-400',
                              badge: 'bg-purple-100 text-purple-700 border-purple-300'
                            },
                            verde: {
                              bg: 'bg-gradient-to-br from-green-50 via-green-100/50 to-green-50',
                              hover: 'hover:from-green-100 hover:via-green-50 hover:to-white',
                              border: 'border-green-200 hover:border-green-400',
                              badge: 'bg-green-100 text-green-700 border-green-300'
                            },
                            laranja: {
                              bg: 'bg-gradient-to-br from-orange-50 via-orange-100/50 to-orange-50',
                              hover: 'hover:from-orange-100 hover:via-orange-50 hover:to-white',
                              border: 'border-orange-200 hover:border-orange-400',
                              badge: 'bg-orange-100 text-orange-700 border-orange-300'
                            },
                            vermelho: {
                              bg: 'bg-gradient-to-br from-red-50 via-red-100/50 to-red-50',
                              hover: 'hover:from-red-100 hover:via-red-50 hover:to-white',
                              border: 'border-red-200 hover:border-red-400',
                              badge: 'bg-red-100 text-red-700 border-red-300'
                            },
                            amarelo: {
                              bg: 'bg-gradient-to-br from-yellow-50 via-yellow-100/50 to-yellow-50',
                              hover: 'hover:from-yellow-100 hover:via-yellow-50 hover:to-white',
                              border: 'border-yellow-200 hover:border-yellow-400',
                              badge: 'bg-yellow-100 text-yellow-700 border-yellow-300'
                            },
                            rosa: {
                              bg: 'bg-gradient-to-br from-pink-50 via-pink-100/50 to-pink-50',
                              hover: 'hover:from-pink-100 hover:via-pink-50 hover:to-white',
                              border: 'border-pink-200 hover:border-pink-400',
                              badge: 'bg-pink-100 text-pink-700 border-pink-300'
                            },
                          };
                          
                          return gradients[color] || gradients.azul;
                        };
                        
                        const gradientClasses = getEventGradientClasses(event.color || 'azul');
                        const isCompleted = event.status === 'completed';
                        const isCancelled = event.status === 'cancelled';
                        
                        return (
                          <div
                            key={event.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEventForEdit(event);
                              setIsEditMode(false);
                              setShowEventDetailsDialog(true);
                            }}
                            className={cn(
                              "group rounded-xl p-4 border-2 transition-all duration-200 cursor-pointer",
                              gradientClasses.bg,
                              gradientClasses.hover,
                              gradientClasses.border,
                              "hover:shadow-[0_4px_20px_rgb(0,0,0,0.08)]",
                              "hover:scale-[1.01]",
                              isCompleted && "opacity-50",
                              isCancelled && "opacity-40 line-through"
                            )}
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex-1">
                                <div className="flex gap-2 mb-2">
                                  <Badge 
                                    variant="outline" 
                                    className="text-xs px-2.5 py-1 font-semibold border h-6 bg-slate-100 text-slate-700 border-slate-300"
                                  >
                                    {event.type === 'online' ? 'ONLINE' : 'PRESENCIAL'}
                                  </Badge>
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      "text-xs px-2.5 py-1 font-medium h-6",
                                      gradientClasses.badge
                                    )}
                                  >
                                    {getCategoryLabel(event.category).toUpperCase()}
                                  </Badge>
                                </div>
                                <h3 className="font-bold text-lg text-gray-900 mb-2 drop-shadow-sm leading-tight tracking-tight">{event.title}</h3>
                              </div>
                            </div>

                            <div className="space-y-2.5 mb-4">
                              <div className="flex items-center gap-2 text-sm">
                                <Clock className="h-4 w-4 text-gray-500 shrink-0" />
                                <Badge variant="outline" className="text-xs py-1 px-2.5 bg-gray-100 text-gray-700 border-gray-200 h-6">
                                  {event.startTime.substring(0, 5)} - {event.endTime.substring(0, 5)}
                                </Badge>
                              </div>
                              
                              {event.className && (
                                <div className="flex items-center gap-2 text-sm flex-wrap">
                                  <Users className="h-4 w-4 text-blue-600 shrink-0" />
                                  {formatClassNameToBadges(event.className, true)}
                                </div>
                              )}
                              
                              {event.location && (
                                <div className="flex items-center gap-2 text-sm">
                                  <MapPin className="h-4 w-4 text-gray-500 shrink-0" />
                                  <Badge variant="outline" className="text-xs py-1 px-2.5 bg-gray-100 text-gray-700 border-gray-200 h-6">
                                    {event.location}
                                  </Badge>
                                </div>
                              )}
                            </div>

                            {/* Action buttons com destaque */}
                            <div className="flex gap-2 pt-3 border-t-2 border-gray-200">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEventForEdit(event);
                                  setIsEditMode(true);
                                  setShowEventDetailsDialog(true);
                                }}
                                className="flex-1 h-9 bg-white hover:bg-blue-500 hover:scale-110 hover:shadow-lg transition-all duration-200 border-2 border-blue-300 hover:border-blue-500 group-hover:border-blue-400 [&>svg]:hover:text-white [&>svg]:text-blue-600"
                                title="Editar evento"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              
                              {!isCompleted && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEventUpdate(event.id, 'complete')}
                                  className="flex-1 h-9 bg-white hover:bg-green-500 hover:scale-110 hover:shadow-lg transition-all duration-200 border-2 border-green-300 hover:border-green-500 group-hover:border-green-400 [&>svg]:hover:text-white [&>svg]:text-green-600"
                                  title="Marcar como concluído"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              )}
                              
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEventDelete(event.id)}
                                className="flex-1 h-9 bg-white hover:bg-red-500 hover:scale-110 hover:shadow-lg transition-all duration-200 border-2 border-red-300 hover:border-red-500 group-hover:border-red-400 [&>svg]:hover:text-white [&>svg]:text-red-600"
                                title="Deletar evento"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Modals */}
        <TeacherCalendarEventModal
          open={showEventModal}
          onOpenChange={setShowEventModal}
          selectedDate={selectedDate}
          classes={classes}
          onEventCreated={fetchClassEvents}
        />
        
        <TeacherEventDetailsDialog
          event={selectedEventForEdit}
          open={showEventDetailsDialog}
          onOpenChange={setShowEventDetailsDialog}
          onEventUpdated={() => {
            fetchClassEvents();
            setSelectedEventForEdit(null);
          }}
          isEditMode={isEditMode}
        />
      </div>
    </MainLayout>
  );
};

export default TeacherCalendar;
