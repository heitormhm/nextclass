import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Clock, Mail, Bell, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CalendarEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate?: Date;
  userRole?: 'student' | 'teacher';
  classId?: string;
  onEventCreated?: () => void;
}

const CATEGORIES = [
  { value: 'sessao_estudo', label: 'Sessão de Estudo', icon: '📚' },
  { value: 'revisao_prova', label: 'Revisão para Prova', icon: '📝' },
  { value: 'remarcacao_aula', label: 'Remarcação de Aula', icon: '🔄' },
  { value: 'estagio', label: 'Estágio', icon: '🏥' },
  { value: 'atividade_avaliativa', label: 'Atividade Avaliativa', icon: '✅' },
  { value: 'aula_online', label: 'Aula Online', icon: '💻' },
  { value: 'aula_presencial', label: 'Aula Presencial', icon: '🏫' },
  { value: 'reuniao', label: 'Reunião', icon: '👥' },
  { value: 'prazo', label: 'Prazo', icon: '⏰' },
  { value: 'outro', label: 'Outro', icon: '📌' },
  { value: 'custom', label: '+ Adicionar nova categoria...', icon: '✨' },
];

// Time slots for better UX
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

const COLORS = [
  { value: 'rosa', label: 'Rosa', color: 'bg-pink-500' },
  { value: 'roxo', label: 'Roxo', color: 'bg-purple-500' },
  { value: 'azul', label: 'Azul', color: 'bg-blue-500' },
  { value: 'verde', label: 'Verde', color: 'bg-green-500' },
  { value: 'amarelo', label: 'Amarelo', color: 'bg-yellow-500' },
  { value: 'laranja', label: 'Laranja', color: 'bg-orange-500' },
  { value: 'vermelho', label: 'Vermelho', color: 'bg-red-500' },
  { value: 'cinza', label: 'Cinza', color: 'bg-gray-500' },
];

export const CalendarEventModal = ({
  open,
  onOpenChange,
  selectedDate = new Date(),
  userRole = 'student',
  classId,
  onEventCreated
}: CalendarEventModalProps) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState<Date>(selectedDate);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [category, setCategory] = useState('outro');
  const [color, setColor] = useState('azul');
  const [notes, setNotes] = useState('');
  const [notificationEmail, setNotificationEmail] = useState(false);
  const [notificationPlatform, setNotificationPlatform] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [showCustomCategory, setShowCustomCategory] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Por favor, insira um título para o evento');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Você precisa estar logado para criar eventos');
        return;
      }

      // Handle custom category
      const finalCategory = category === 'custom' && customCategory.trim() 
        ? `custom_${customCategory.trim().toLowerCase().replace(/\s+/g, '_')}`
        : category;

      const eventData = {
        title: title.trim(),
        event_date: format(date, 'yyyy-MM-dd') + 'T00:00:00',
        start_time: startTime,
        end_time: endTime,
        category: finalCategory,
        color,
        notes: notes.trim() || null,
      };

      if (userRole === 'teacher' && classId) {
        // Professor criando evento para turma
        const { error } = await supabase
          .from('class_events')
          .insert({
            ...eventData,
            class_id: classId,
            event_type: category === 'aula_online' ? 'online' : 'presencial',
          } as any);

        if (error) throw error;
        toast.success('Evento criado para a turma com sucesso!');
      } else {
        // Aluno criando evento pessoal
        const { error } = await supabase
          .from('personal_events')
          .insert({
            ...eventData,
            user_id: user.id,
            notification_email: notificationEmail,
            notification_platform: notificationPlatform,
            event_type: 'event',
          } as any);

        if (error) throw error;
        toast.success('Evento criado no seu calendário!');
      }

      // Reset form
      setTitle('');
      setDate(selectedDate);
      setStartTime('09:00');
      setEndTime('10:00');
      setCategory('outro');
      setColor('azul');
      setNotes('');
      setNotificationEmail(false);
      setNotificationPlatform(true);
      setCustomCategory('');
      setShowCustomCategory(false);
      
      onEventCreated?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Erro ao criar evento. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-pink-100 shadow-2xl
        [&::-webkit-scrollbar]:w-2
        [&::-webkit-scrollbar-track]:bg-gray-100
        [&::-webkit-scrollbar-track]:rounded-full
        [&::-webkit-scrollbar-thumb]:bg-gray-300
        [&::-webkit-scrollbar-thumb]:rounded-full
        [&::-webkit-scrollbar-thumb:hover]:bg-gray-400">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-pink-500/10 to-purple-500/10 rounded-xl flex items-center justify-center">
              <CalendarIcon className="h-6 w-6 text-pink-600" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">Criar Novo Evento</DialogTitle>
              <p className="text-sm text-gray-400 mt-0.5">
                Adicione um compromisso acadêmico
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
              placeholder="Ex: Prova de Termodinâmica"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-white/20 backdrop-blur-xl border-pink-200 focus:border-pink-400"
            />
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
                      "w-full justify-start text-left font-normal bg-white/20 backdrop-blur-xl border-pink-200",
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
                <SelectTrigger className="bg-white/20 backdrop-blur-xl border-pink-200">
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
                <SelectTrigger className="bg-white/20 backdrop-blur-xl border-pink-200">
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

          {/* Categoria */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">🏷️ Categoria *</Label>
            <Select 
              value={category} 
              onValueChange={(value) => {
                setCategory(value);
                setShowCustomCategory(value === 'custom');
                if (value !== 'custom') {
                  setCustomCategory('');
                }
              }}
            >
              <SelectTrigger className="bg-white/20 backdrop-blur-xl border-pink-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    <span className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Custom Category Input */}
            {showCustomCategory && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <Label htmlFor="customCategory" className="text-sm font-medium text-pink-600">
                  ✨ Nome da Categoria Personalizada *
                </Label>
                <Input
                  id="customCategory"
                  placeholder="Ex: Projeto de Pesquisa"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="bg-white/20 backdrop-blur-xl border-pink-200 focus:border-pink-400"
                />
              </div>
            )}
          </div>

          {/* Cor do Evento */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">🎨 Cor do Evento</Label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((colorOption) => (
                <button
                  key={colorOption.value}
                  type="button"
                  onClick={() => setColor(colorOption.value)}
                  className={cn(
                    "w-10 h-10 rounded-lg transition-all",
                    colorOption.color,
                    color === colorOption.value
                      ? "ring-2 ring-offset-2 ring-pink-500 scale-110"
                      : "hover:scale-105 opacity-70 hover:opacity-100"
                  )}
                  title={colorOption.label}
                />
              ))}
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              📄 Observações
            </Label>
            <Textarea
              id="notes"
              placeholder="Revisar capítulos 3, 4 e 5. Trazer formulário."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-white/20 backdrop-blur-xl border-pink-200 focus:border-pink-400 min-h-[80px] resize-none"
            />
          </div>

          {/* Notificações - apenas para alunos */}
          {userRole === 'student' && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">🔔 Notificações</Label>
              <div className="space-y-3 pl-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notificationEmail"
                    checked={notificationEmail}
                    onCheckedChange={(checked) => setNotificationEmail(checked === true)}
                  />
                  <label
                    htmlFor="notificationEmail"
                    className="text-sm text-gray-600 cursor-pointer flex items-center gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    Receber notificação por e-mail
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notificationPlatform"
                    checked={notificationPlatform}
                    onCheckedChange={(checked) => setNotificationPlatform(checked === true)}
                  />
                  <label
                    htmlFor="notificationPlatform"
                    className="text-sm text-gray-600 cursor-pointer flex items-center gap-2"
                  >
                    <Bell className="h-4 w-4" />
                    Receber notificação na plataforma
                  </label>
                </div>
              </div>
            </div>
          )}
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
            className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
            disabled={isSubmitting || !title.trim() || (showCustomCategory && !customCategory.trim())}
          >
            {isSubmitting ? 'Criando...' : 'Criar Evento'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
