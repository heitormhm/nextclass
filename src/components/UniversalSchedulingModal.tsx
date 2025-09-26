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
      <DialogContent className="sm:max-w-[500px] bg-white/95 backdrop-blur-xl shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">Agendar Novo Evento</DialogTitle>
          <DialogDescription>
            Configure os detalhes do seu evento acadêmico
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Event Type Selector */}
          <div className="space-y-2">
            <Label>Tipo de Evento</Label>
            <Tabs value={eventType} onValueChange={(value: any) => setEventType(value)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="aula">Aula</TabsTrigger>
                <TabsTrigger value="reuniao">Reunião</TabsTrigger>
                <TabsTrigger value="prazo">Prazo</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Event Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Título do Evento</Label>
            <Input
              id="title"
              placeholder={`Digite o título da ${eventType}`}
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
            />
          </div>

          {/* Date Picker */}
          <div className="space-y-2">
            <Label>Data do Evento</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "dd/MM/yyyy") : "Selecione uma data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Picker */}
          <div className="space-y-2">
            <Label htmlFor="time">Horário</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                id="time"
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Class Selector */}
          {eventType !== 'reuniao' && (
            <div className="space-y-2">
              <Label>Turma Associada</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a turma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cardiologia-2025-2">Cardiologia - 2025/2</SelectItem>
                  <SelectItem value="nefrologia-2025-2">Nefrologia - 2025/2</SelectItem>
                  <SelectItem value="pneumologia-2025-2">Pneumologia - 2025/2</SelectItem>
                  <SelectItem value="cardiologia-2025-1">Cardiologia - 2025/1</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!eventTitle || !selectedDate || !selectedTime || (eventType !== 'reuniao' && !selectedClass)}
          >
            Salvar Evento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UniversalSchedulingModal;