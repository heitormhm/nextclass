import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock, Users, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import MainLayout from '@/components/MainLayout';
import UniversalSchedulingModal from '@/components/UniversalSchedulingModal';
import { BackgroundRippleEffect } from '@/components/ui/background-ripple-effect';

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
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'meeting':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'lecture':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
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
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-purple-950 via-gray-950 to-blue-950">
        {/* Animated Background with Ripple Effect */}
        <BackgroundRippleEffect className="opacity-30" />
        
        {/* Gradient Blobs for Depth */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-48 w-96 h-96 bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-full blur-3xl" />
          <div className="absolute top-2/3 -right-32 w-80 h-80 bg-gradient-to-br from-purple-400/15 to-pink-400/15 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 container mx-auto px-4 py-8 animate-in fade-in-0 duration-500">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">
              Calendário Acadêmico
            </h1>
            <p className="text-slate-400 text-lg">
              Gerencie suas aulas, prazos e compromissos acadêmicos
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Calendar */}
            <div className="lg:col-span-2">
              <Card className="bg-slate-800/80 backdrop-blur-sm border-slate-700 shadow-2xl">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-2xl text-slate-100">
                      {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => navigateMonth('prev')}
                        className="bg-slate-900 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-slate-100"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => navigateMonth('next')}
                        className="bg-slate-900 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-slate-100"
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
                        className="p-2 text-center font-semibold text-slate-400 text-sm"
                      >
                        {day}
                      </div>
                    ))}
                    
                    {/* Empty cells for days before month start */}
                    {Array.from({ length: firstDayOfMonth }, (_, index) => (
                      <div key={`empty-${index}`} className="p-2 h-24 bg-slate-900/30" />
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
                          className={`p-2 h-24 border cursor-pointer transition-all duration-200 relative overflow-hidden ${
                            isSelected 
                              ? 'bg-purple-600/30 border-purple-500 shadow-lg shadow-purple-500/20' 
                              : 'bg-slate-900/30 border-slate-700 hover:bg-slate-800/50 hover:border-slate-600'
                          } ${isToday ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-slate-800' : ''}`}
                          onClick={() => setSelectedDate(selectedDate === dateKey ? null : dateKey)}
                        >
                          <div className={`text-sm font-medium ${
                            isToday ? 'text-purple-400 font-bold' : 'text-slate-200'
                          }`}>
                            {day}
                          </div>
                          {dayEvents.length > 0 && (
                            <div className="mt-1 space-y-1">
                              {dayEvents.slice(0, 2).map((event) => (
                                <div
                                  key={event.id}
                                  className={`text-xs p-1 rounded truncate border ${getEventTypeColor(event.type)}`}
                                >
                                  {event.title}
                                </div>
                              ))}
                              {dayEvents.length > 2 && (
                                <div className="text-xs text-slate-400 font-medium">
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
              <Card className="bg-slate-800/80 backdrop-blur-sm border-slate-700 shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-lg text-slate-100">
                    {selectedDate ? 'Eventos do Dia Selecionado' : 'Próximos Eventos'}
                  </CardTitle>
                  <CardDescription className="text-slate-400">
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
                        <p className="text-sm text-slate-500 text-center py-4">
                          {selectedDate ? 'Nenhum evento neste dia' : 'Nenhum evento próximo'}
                        </p>
                      );
                    }
                    
                    return displayEvents.map((event) => (
                      <div key={event.id} className="border-l-4 border-purple-500 pl-4 pb-4 bg-slate-900/30 p-3 rounded-r-lg">
                        <div className="flex items-start gap-2 mb-2">
                          <Badge className={`${getEventTypeColor(event.type)} border`}>
                            {getEventTypeIcon(event.type)}
                            <span className="ml-1">{getEventTypeName(event.type)}</span>
                          </Badge>
                        </div>
                        <h4 className="font-semibold text-sm mb-1 text-slate-200">{event.title}</h4>
                        <p className="text-xs text-slate-400 mb-2">
                          {new Date(event.date).toLocaleDateString('pt-BR')} às {event.time}
                        </p>
                        {event.description && (
                          <p className="text-xs text-slate-500">{event.description}</p>
                        )}
                      </div>
                    ));
                  })()}
                </CardContent>
              </Card>

              {/* Calendar Legend */}
              <Card className="bg-slate-800/80 backdrop-blur-sm border-slate-700 shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-lg text-slate-100">Legenda</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-500/20 border border-red-500/30 rounded"></div>
                    <span className="text-sm text-slate-300">Prazos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-500/20 border border-blue-500/30 rounded"></div>
                    <span className="text-sm text-slate-300">Reuniões</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500/20 border border-green-500/30 rounded"></div>
                    <span className="text-sm text-slate-300">Aulas</span>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions - Unified Button */}
              <Card className="bg-slate-800/80 backdrop-blur-sm border-slate-700 shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-lg text-slate-100">Ações Rápidas</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => setIsSchedulingModalOpen(true)}
                    className="w-full justify-start bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium transition-all duration-200 hover:scale-105"
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