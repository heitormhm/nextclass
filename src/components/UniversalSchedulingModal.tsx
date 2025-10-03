import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface UniversalSchedulingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEventType?: 'aula' | 'reuniao' | 'prazo';
}

const UniversalSchedulingModal = ({ 
  open, 
  onOpenChange, 
  defaultEventType = 'aula' 
}: UniversalSchedulingModalProps) => {
  const [eventType, setEventType] = useState(defaultEventType);
  const [eventTitle, setEventTitle] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  const handleSave = () => {
    // Here you would save the event
    console.log('Saving event:', {
      type: eventType,
      title: eventTitle,
      date: selectedDate,
      time: selectedTime,
      class: selectedClass
    });
    
    // Reset form
    setEventTitle('');
    setSelectedDate(undefined);
    setSelectedTime('');
    setSelectedClass('');
    
    onOpenChange(false);
  };

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case 'aula':
        return 'Aula';
      case 'reuniao':
        return 'Reunião';
      case 'prazo':
        return 'Prazo';
      default:
        return 'Evento';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-slate-800/95 backdrop-blur-xl border-slate-700 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-300">
        <DialogHeader>
          <DialogTitle className="text-xl text-slate-100">Agendar Novo Evento</DialogTitle>
          <DialogDescription className="text-slate-400">
            Configure os detalhes do seu evento acadêmico
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Event Type Selector */}
          <div className="space-y-2">
            <Label className="text-slate-200">Tipo de Evento</Label>
            <Tabs value={eventType} onValueChange={(value: any) => setEventType(value)}>
              <TabsList className="grid w-full grid-cols-3 bg-slate-900/50 border border-slate-700">
                <TabsTrigger value="aula" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">Aula</TabsTrigger>
                <TabsTrigger value="reuniao" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">Reunião</TabsTrigger>
                <TabsTrigger value="prazo" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">Prazo</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Event Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-slate-200">Título do Evento</Label>
            <Input
              id="title"
              placeholder={`Digite o título da ${eventType}`}
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              className="bg-slate-900 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          {/* Date Picker */}
          <div className="space-y-2">
            <Label className="text-slate-200">Data do Evento</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-slate-900 border-slate-600 text-slate-100 hover:bg-slate-800 hover:text-slate-100",
                    !selectedDate && "text-slate-500"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "dd/MM/yyyy") : "Selecione uma data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-slate-800 border-slate-700" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                  className="pointer-events-auto bg-slate-800 text-slate-100"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Picker */}
          <div className="space-y-2">
            <Label htmlFor="time" className="text-slate-200">Horário</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 h-4 w-4" />
              <Input
                id="time"
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="pl-10 bg-slate-900 border-slate-600 text-slate-100 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>

          {/* Class Selector */}
          {eventType !== 'reuniao' && (
            <div className="space-y-2">
              <Label className="text-slate-200">Turma Associada</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="bg-slate-900 border-slate-600 text-slate-100 hover:bg-slate-800">
                  <SelectValue placeholder="Selecione a turma" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-slate-100">
                  <SelectItem value="cardiologia-2025-2" className="hover:bg-slate-700 focus:bg-slate-700">Cardiologia - 2025/2</SelectItem>
                  <SelectItem value="nefrologia-2025-2" className="hover:bg-slate-700 focus:bg-slate-700">Nefrologia - 2025/2</SelectItem>
                  <SelectItem value="pneumologia-2025-2" className="hover:bg-slate-700 focus:bg-slate-700">Pneumologia - 2025/2</SelectItem>
                  <SelectItem value="cardiologia-2025-1" className="hover:bg-slate-700 focus:bg-slate-700">Cardiologia - 2025/1</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="bg-transparent border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-slate-100"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!eventTitle || !selectedDate || !selectedTime || (eventType !== 'reuniao' && !selectedClass)}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
          >
            Salvar Evento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UniversalSchedulingModal;