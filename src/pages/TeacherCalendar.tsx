import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock, Users, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import MainLayout from '@/components/MainLayout';
import UniversalSchedulingModal from '@/components/UniversalSchedulingModal';

interface CalendarEvent {
  id: string;
  title: string;
  type: 'deadline' | 'meeting' | 'lecture';
  date: string;
  time: string;
  description?: string;
}

const TeacherCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isSchedulingModalOpen, setIsSchedulingModalOpen] = useState(false);

  const events: CalendarEvent[] = [
    {
      id: '1',
      title: 'Lançamento de Notas - Prova Parcial de Cardiologia',
      type: 'deadline',
      date: '2024-01-15',
      time: '23:59',
      description: 'Prazo final para lançar as notas da prova parcial de cardiologia no sistema.'
    },
    {
      id: '2',
      title: 'Reunião do Comitê Curricular',
      type: 'meeting',
      date: '2024-01-18',
      time: '14:00',
      description: 'Reunião mensal para discussão de ajustes no currículo do curso de medicina.'
    },
    {
      id: '3',
      title: 'Aula Agendada: Fisiopatologia Renal',
      type: 'lecture',
      date: '2024-01-22',
      time: '08:00',
      description: 'Aula prática sobre fisiopatologia renal com casos clínicos.'
    },
    {
      id: '4',
      title: 'Entrega de Relatórios - Estágio Supervisionado',
      type: 'deadline',
      date: '2024-01-25',
      time: '18:00',
      description: 'Prazo para entrega dos relatórios de avaliação do estágio supervisionado.'
    },
    {
      id: '5',
      title: 'Seminário: Avanços em Cardiologia Intervencionista',
      type: 'lecture',
      date: '2024-01-28',
      time: '16:00',
      description: 'Seminário especial com especialista convidado sobre cardiologia intervencionista.'
    }
  ];

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDateKey = (day: number) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  };

  const getEventsForDate = (dateKey: string) => {
    return events.filter(event => event.date === dateKey);
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'deadline':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'meeting':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'lecture':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'deadline':
        return <Clock className="h-4 w-4" />;
      case 'meeting':
        return <Users className="h-4 w-4" />;
      case 'lecture':
        return <FileText className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const getEventTypeName = (type: string) => {
    switch (type) {
      case 'deadline':
        return 'Prazo';
      case 'meeting':
        return 'Reunião';
      case 'lecture':
        return 'Aula';
      default:
        return 'Evento';
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
    setSelectedDate(null);
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDayOfMonth = getFirstDayOfMonth(currentDate);
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-600">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">
              Calendário Acadêmico
            </h1>
            <p className="text-white/80 text-lg">
              Gerencie suas aulas, prazos e compromissos acadêmicos
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Calendar */}
            <div className="lg:col-span-2">
              <Card className="bg-white shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-2xl">
                      {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => navigateMonth('prev')}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => navigateMonth('next')}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1 mb-4">
                    {/* Day headers */}
                    {dayNames.map((day) => (
                      <div
                        key={day}
                        className="p-2 text-center font-semibold text-gray-600 text-sm"
                      >
                        {day}
                      </div>
                    ))}
                    
                    {/* Empty cells for days before month start */}
                    {Array.from({ length: firstDayOfMonth }, (_, index) => (
                      <div key={`empty-${index}`} className="p-2 h-24" />
                    ))}
                    
                    {/* Days of the month */}
                    {Array.from({ length: daysInMonth }, (_, index) => {
                      const day = index + 1;
                      const dateKey = formatDateKey(day);
                      const dayEvents = getEventsForDate(dateKey);
                      const isSelected = selectedDate === dateKey;
                      const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
                      
                      return (
                        <div
                          key={day}
                          className={`p-2 h-24 border border-gray-200 cursor-pointer transition-colors relative overflow-hidden ${
                            isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-gray-50'
                          } ${isToday ? 'bg-blue-50 border-blue-300' : ''}`}
                          onClick={() => setSelectedDate(selectedDate === dateKey ? null : dateKey)}
                        >
                          <div className={`text-sm font-medium ${isToday ? 'text-blue-600' : ''}`}>
                            {day}
                          </div>
                          {dayEvents.length > 0 && (
                            <div className="mt-1 space-y-1">
                              {dayEvents.slice(0, 2).map((event) => (
                                <div
                                  key={event.id}
                                  className={`text-xs p-1 rounded truncate ${getEventTypeColor(event.type)}`}
                                >
                                  {event.title}
                                </div>
                              ))}
                              {dayEvents.length > 2 && (
                                <div className="text-xs text-gray-600">
                                  +{dayEvents.length - 2} mais
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Events Sidebar */}
            <div className="space-y-6">
              {/* Today's Events or Selected Date Events */}
              <Card className="bg-white shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">
                    {selectedDate ? 'Eventos do Dia Selecionado' : 'Próximos Eventos'}
                  </CardTitle>
                  <CardDescription>
                    {selectedDate 
                      ? `Eventos para ${new Date(selectedDate).toLocaleDateString('pt-BR')}`
                      : 'Seus compromissos mais próximos'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(() => {
                    const displayEvents = selectedDate 
                      ? getEventsForDate(selectedDate)
                      : events.slice(0, 3);
                    
                    if (displayEvents.length === 0) {
                      return (
                        <p className="text-sm text-gray-500 text-center py-4">
                          {selectedDate ? 'Nenhum evento neste dia' : 'Nenhum evento próximo'}
                        </p>
                      );
                    }
                    
                    return displayEvents.map((event) => (
                      <div key={event.id} className="border-l-4 border-primary pl-4 pb-4">
                        <div className="flex items-start gap-2 mb-2">
                          <Badge className={getEventTypeColor(event.type)}>
                            {getEventTypeIcon(event.type)}
                            <span className="ml-1">{getEventTypeName(event.type)}</span>
                          </Badge>
                        </div>
                        <h4 className="font-semibold text-sm mb-1">{event.title}</h4>
                        <p className="text-xs text-gray-600 mb-2">
                          {new Date(event.date).toLocaleDateString('pt-BR')} às {event.time}
                        </p>
                        {event.description && (
                          <p className="text-xs text-gray-500">{event.description}</p>
                        )}
                      </div>
                    ));
                  })()}
                </CardContent>
              </Card>

              {/* Calendar Legend */}
              <Card className="bg-white shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">Legenda</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-100 border border-red-200 rounded"></div>
                    <span className="text-sm">Prazos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-100 border border-blue-200 rounded"></div>
                    <span className="text-sm">Reuniões</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-100 border border-green-200 rounded"></div>
                    <span className="text-sm">Aulas</span>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions - Unified Button */}
              <Card className="bg-white shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">Ações Rápidas</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => setIsSchedulingModalOpen(true)}
                    className="w-full justify-start"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    + Agendar Novo Evento
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Universal Scheduling Modal */}
          <UniversalSchedulingModal
            open={isSchedulingModalOpen}
            onOpenChange={setIsSchedulingModalOpen}
          />
        </div>
      </div>
    </MainLayout>
  );
};

export default TeacherCalendar;