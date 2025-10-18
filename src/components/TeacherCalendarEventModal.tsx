import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Clock, MapPin, Video, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Class {
  id: string;
  name: string;
  course: string;
  period: string;
  university?: string;
  city?: string;
}

interface TeacherCalendarEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate?: Date;
  classes: Class[];
  onEventCreated?: () => void;
}

const TEACHER_CATEGORIES = [
  { value: 'aula_presencial', label: 'Aula Presencial', icon: '🏫' },
  { value: 'aula_online', label: 'Aula Online', icon: '💻' },
  { value: 'prova', label: 'Prova', icon: '📝' },
  { value: 'seminario', label: 'Seminário', icon: '🎤' },
  { value: 'prazo', label: 'Prazo de Entrega', icon: '⏰' },
  { value: 'reuniao', label: 'Reunião', icon: '👥' },
  { value: 'outro', label: 'Outro', icon: '📌' },
];

const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push(time);
    }
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

const TEACHER_COLORS = [
  { value: 'azul', label: 'Azul', color: 'bg-blue-600' },
  { value: 'roxo', label: 'Roxo', color: 'bg-purple-600' },
  { value: 'verde', label: 'Verde', color: 'bg-green-600' },
  { value: 'laranja', label: 'Laranja', color: 'bg-orange-600' },
  { value: 'vermelho', label: 'Vermelho', color: 'bg-red-600' },
  { value: 'amarelo', label: 'Amarelo', color: 'bg-yellow-600' },
  { value: 'rosa', label: 'Rosa', color: 'bg-pink-600' },
];

export const TeacherCalendarEventModal = ({
  open,
  onOpenChange,
  selectedDate = new Date(),
  classes,
  onEventCreated
}: TeacherCalendarEventModalProps) => {
  const [title, setTitle] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [date, setDate] = useState<Date>(selectedDate);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [eventType, setEventType] = useState<'online' | 'presencial'>('presencial');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('aula_presencial');
  const [color, setColor] = useState('azul');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Por favor, insira um título para o evento');
      return;
    }

    if (!selectedClassId) {
      toast.error('Por favor, selecione uma turma');
      return;
    }

    if (eventType === 'presencial' && !location.trim()) {
      toast.error('Por favor, informe o local do evento presencial');
      return;
    }

    setIsSubmitting(true);

    console.log('[TeacherCalendarEventModal] Submitting event:', {
      title,
      selectedClassId,
      date: format(date, 'yyyy-MM-dd'),
      eventType,
      location
    });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Você precisa estar logado para criar eventos');
        setIsSubmitting(false);
        return;
      }

      // Buscar turma selecionada para obter dados
      const selectedClass = classes.find(c => c.id === selectedClassId);
      if (!selectedClass) {
        toast.error('Turma não encontrada');
        setIsSubmitting(false);
        return;
      }

      // Verificar se existe uma 'class' correspondente na tabela classes
      let actualClassId = selectedClassId;
      
      const { data: existingClass } = await supabase
        .from('classes')
        .select('id')
        .eq('course', selectedClass.course)
        .eq('period', selectedClass.period)
        .maybeSingle();
      
      if (!existingClass) {
        console.log('[TeacherCalendarEventModal] Creating class entry for event...');
        // Criar class temporária para este evento
        const { data: newClass, error: classError } = await supabase
          .from('classes')
          .insert({
            name: selectedClass.name,
            course: selectedClass.course,
            period: selectedClass.period,
            teacher_id: user.id
          })
          .select('id')
          .single();
        
        if (classError) throw classError;
        actualClassId = newClass.id;
        console.log('[TeacherCalendarEventModal] Class created with id:', actualClassId);
      } else {
        actualClassId = existingClass.id;
        console.log('[TeacherCalendarEventModal] Using existing class id:', actualClassId);
      }

      // Criar o evento com class_id válido
      const { error } = await supabase
        .from('class_events')
        .insert({
          title: title.trim(),
          class_id: actualClassId,
          event_date: format(date, 'yyyy-MM-dd') + 'T00:00:00.000Z',
          start_time: startTime,
          end_time: endTime,
          event_type: eventType,
          location: eventType === 'presencial' ? location.trim() : null,
          category: category as any,
          color: color as any,
          description: description.trim() || null,
          notes: notes.trim() || null,
          status: 'pending'
        } as any);

      if (error) throw error;

      toast.success('✓ Evento criado com sucesso!', {
        description: 'Alunos matriculados serão notificados automaticamente'
      });

      // Reset form
      setTitle('');
      setSelectedClassId('');
      setDate(selectedDate);
      setStartTime('09:00');
      setEndTime('10:00');
      setEventType('presencial');
      setLocation('');
      setCategory('aula_presencial');
      setColor('azul');
      setDescription('');
      setNotes('');
      
      onOpenChange(false);
      // Aguardar 100ms para garantir que o modal fechou
      setTimeout(() => {
        onEventCreated?.();
      }, 100);
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Erro ao criar evento. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-blue-100/30 shadow-2xl
            [&::-webkit-scrollbar]:w-2
            [&::-webkit-scrollbar-track]:bg-gray-100
            [&::-webkit-scrollbar-track]:rounded-full
            [&::-webkit-scrollbar-thumb]:bg-gray-300
            [&::-webkit-scrollbar-thumb]:rounded-full
            [&::-webkit-scrollbar-thumb:hover]:bg-gray-400" 
          style={{ zIndex: 9999 }}
        >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl flex items-center justify-center">
              <CalendarIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">Criar Evento da Turma</DialogTitle>
              <p className="text-sm text-gray-400 mt-0.5">
                Adicione um compromisso ao calendário da turma
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              📝 Título do Evento *
            </Label>
            <Input
              id="title"
              placeholder="Ex: Aula - Termodinâmica Aplicada"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-white/20 backdrop-blur-xl border-blue-200 focus:border-blue-400"
            />
          </div>

          {/* Turma */}
          <div className="space-y-2">
            <Label htmlFor="class" className="text-sm font-medium">
              👥 Turma *
            </Label>
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger className="bg-white/20 backdrop-blur-xl border-blue-200">
                <SelectValue placeholder="Selecione uma turma" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name} - {cls.period}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {classes.length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-800">
                ⚠️ Você ainda não criou nenhuma turma. 
                <a href="/teacherconfigurations" className="underline ml-1">
                  Criar turma agora
                </a>
              </div>
            )}
          </div>

          {/* Data e Horários */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">📅 Data *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-white/20 backdrop-blur-xl border-blue-200",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP", { locale: ptBR }) : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(newDate) => newDate && setDate(newDate)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startTime" className="text-sm font-medium">
                ⏰ Início *
              </Label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger className="bg-white/20 backdrop-blur-xl border-blue-200">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {TIME_SLOTS.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endTime" className="text-sm font-medium">
                ⏰ Fim *
              </Label>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger className="bg-white/20 backdrop-blur-xl border-blue-200">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {TIME_SLOTS.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tipo do Evento */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">🎯 Tipo do Evento *</Label>
            <RadioGroup value={eventType} onValueChange={(value: 'online' | 'presencial') => setEventType(value)}>
              <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-xl border border-blue-200 rounded-md p-3">
                <RadioGroupItem value="online" id="online" />
                <label htmlFor="online" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Video className="h-4 w-4 text-blue-600" />
                  <span>Online</span>
                </label>
              </div>
              <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-xl border border-blue-200 rounded-md p-3">
                <RadioGroupItem value="presencial" id="presencial" />
                <label htmlFor="presencial" className="flex items-center gap-2 cursor-pointer flex-1">
                  <MapPin className="h-4 w-4 text-green-600" />
                  <span>Presencial</span>
                </label>
              </div>
            </RadioGroup>
          </div>

          {/* Local (apenas para presencial) */}
          {eventType === 'presencial' && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <Label htmlFor="location" className="text-sm font-medium">
                📍 Local *
              </Label>
              <Input
                id="location"
                placeholder="Ex: Laboratório 3 - Bloco A"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="bg-white/20 backdrop-blur-xl border-blue-200 focus:border-blue-400"
              />
            </div>
          )}

          {/* Categoria */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">🏷️ Categoria *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-white/20 backdrop-blur-xl border-blue-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEACHER_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    <span className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cor do Evento */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">🎨 Cor do Evento</Label>
            <div className="flex gap-2 flex-wrap">
              {TEACHER_COLORS.map((colorOption) => (
                <button
                  key={colorOption.value}
                  type="button"
                  onClick={() => setColor(colorOption.value)}
                  className={cn(
                    "w-10 h-10 rounded-lg transition-all",
                    colorOption.color,
                    color === colorOption.value
                      ? "ring-2 ring-offset-2 ring-blue-500 scale-110"
                      : "hover:scale-105 opacity-70 hover:opacity-100"
                  )}
                  title={colorOption.label}
                />
              ))}
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              📄 Descrição
            </Label>
            <Textarea
              id="description"
              placeholder="Conteúdo da aula, material necessário, etc."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-white/20 backdrop-blur-xl border-blue-200 focus:border-blue-400 min-h-[80px] resize-none"
            />
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              📋 Observações Internas
            </Label>
            <Textarea
              id="notes"
              placeholder="Notas pessoais (não visíveis para alunos)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-white/20 backdrop-blur-xl border-blue-200 focus:border-blue-400 min-h-[60px] resize-none"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            disabled={isSubmitting || !title.trim() || !selectedClassId || classes.length === 0 || (eventType === 'presencial' && !location.trim())}
          >
            {isSubmitting ? 'Criando...' : 'Criar Evento'}
          </Button>
        </div>
        </DialogContent>
    </Dialog>
  );
};
