import { useState, useEffect } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
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

interface Subject {
  id: string;
  nome: string;
  codigo: string | null;
  teacher_id: string;
  turma_id: string;
}

interface TeacherCalendarEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate?: Date;
  classes: Class[];
  onEventCreated?: () => void;
}

const TEACHER_CATEGORIES = [
  { value: 'aula', label: 'Aula', icon: '📚' },
  { value: 'prova', label: 'Prova', icon: '📝' },
  { value: 'atividade_avaliativa', label: 'Atividade Avaliativa', icon: '✅' },
  { value: 'trabalho_grupo', label: 'Trabalho em Grupo', icon: '👥' },
  { value: 'estagio', label: 'Estágio', icon: '🏥' },
  { value: 'atividade_pesquisa', label: 'Atividade de Pesquisa', icon: '🔬' },
  { value: 'seminario', label: 'Seminário', icon: '🎤' },
  { value: 'reuniao', label: 'Reunião', icon: '🤝' },
  { value: 'outro', label: 'Outro', icon: '📌' },
];

const PREDEFINED_LOCATIONS = [
  'Centro Universitário Afya Montes Claros',
  'Campus Cepeage',
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
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [isCreatingNewSubject, setIsCreatingNewSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectCode, setNewSubjectCode] = useState('');
  const [date, setDate] = useState<Date>(selectedDate);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [eventType, setEventType] = useState<'online' | 'presencial'>('presencial');
  const [location, setLocation] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [category, setCategory] = useState('aula');
  const [color, setColor] = useState('azul');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [notifyPlatform, setNotifyPlatform] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch subjects when class changes
  useEffect(() => {
    const fetchSubjects = async () => {
      if (!selectedClassId || selectedClassId === 'ALL_CLASSES') {
        setSubjects([]);
        setSelectedSubjectId('');
        return;
      }

      try {
        const { data: turmaData } = await supabase
          .from('turmas')
          .select('id')
          .eq('id', selectedClassId)
          .single();

        if (!turmaData) return;

        const { data, error } = await supabase
          .from('disciplinas')
          .select('*')
          .eq('turma_id', turmaData.id)
          .order('nome');

        if (error) throw error;
        setSubjects(data || []);
      } catch (error) {
        console.error('Error fetching subjects:', error);
        toast.error('Erro ao carregar disciplinas');
      }
    };

    fetchSubjects();
  }, [selectedClassId]);

  const handleCreateSubject = async () => {
    if (!newSubjectName.trim()) {
      toast.error('Por favor, insira o nome da disciplina');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: turmaData } = await supabase
        .from('turmas')
        .select('id')
        .eq('id', selectedClassId)
        .single();

      if (!turmaData) return;

      const { data, error } = await supabase
        .from('disciplinas')
        .insert({
          nome: newSubjectName.trim(),
          codigo: newSubjectCode.trim() || null,
          teacher_id: user.id,
          turma_id: turmaData.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`✅ Disciplina "${newSubjectName}" criada com sucesso!`);
      setSubjects([...subjects, data]);
      setSelectedSubjectId(data.id);
      setIsCreatingNewSubject(false);
      setNewSubjectName('');
      setNewSubjectCode('');
    } catch (error) {
      console.error('Error creating subject:', error);
      toast.error('Erro ao criar disciplina');
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Por favor, insira um título para o evento');
      return;
    }

    if (!selectedClassId || selectedClassId === 'ALL_CLASSES') {
      toast.error('Por favor, selecione uma turma específica');
      return;
    }

    if (eventType === 'presencial' && location !== 'CUSTOM' && !location) {
      toast.error('Por favor, selecione o local do evento presencial');
      return;
    }

    if (eventType === 'presencial' && location === 'CUSTOM' && !customLocation.trim()) {
      toast.error('Por favor, informe o local personalizado');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Você precisa estar logado para criar eventos');
        setIsSubmitting(false);
        return;
      }

      // Usar diretamente o selectedClassId que já é o ID correto de turmas
      const actualClassId = selectedClassId;

      const finalLocation = eventType === 'presencial' 
        ? (location === 'CUSTOM' ? customLocation.trim() : location)
        : null;

      const { data: insertedEvent, error } = await supabase
        .from('class_events')
        .insert({
          title: title.trim(),
          class_id: actualClassId,
          disciplina_id: selectedSubjectId || null,
          event_date: format(date, 'yyyy-MM-dd') + 'T00:00:00.000Z',
          start_time: startTime,
          end_time: endTime,
          event_type: eventType,
          location: finalLocation,
          category: category as any,
          color: color as any,
          description: description.trim() || null,
          notes: notes.trim() || null,
          status: 'pending',
          notify_platform: notifyPlatform,
          notify_email: notifyEmail,
        } as any)
        .select('id')
        .single();

      if (error) throw error;

      // Send notifications if enabled
      if (notifyPlatform || notifyEmail) {
        try {
          // Get teacher and subject info
          const { data: userData } = await supabase.auth.getUser();
          const teacherName = userData.user?.user_metadata?.full_name || 'Professor';
          
          const selectedSubject = subjects.find(s => s.id === selectedSubjectId);
          const subjectName = selectedSubject 
            ? (selectedSubject.codigo ? `${selectedSubject.codigo} - ${selectedSubject.nome}` : selectedSubject.nome)
            : null;

          const categoryLabel = TEACHER_CATEGORIES.find(c => c.value === category)?.label || category;

          await supabase.functions.invoke('send-class-event-notification', {
            body: {
              eventId: insertedEvent.id,
              classId: selectedClassId,
              title: title.trim(),
              eventDate: format(date, 'yyyy-MM-dd'),
              startTime,
              endTime,
              eventType,
              location: finalLocation,
              category: categoryLabel,
              teacherName,
              subjectName,
              notifyPlatform,
              notifyEmail,
            }
          });
        } catch (notifyError) {
          console.error('Error sending notifications:', notifyError);
          // Don't block event creation if notifications fail
        }
      }

      toast.success('✓ Evento criado com sucesso!', {
        description: notifyPlatform ? 'Alunos matriculados serão notificados' : undefined
      });

      // Reset form
      setTitle('');
      setSelectedClassId('');
      setSelectedSubjectId('');
      setSubjects([]);
      setDate(selectedDate);
      setStartTime('09:00');
      setEndTime('10:00');
      setEventType('presencial');
      setLocation('');
      setCustomLocation('');
      setCategory('aula');
      setColor('azul');
      setDescription('');
      setNotes('');
      setNotifyPlatform(true);
      setNotifyEmail(false);
      
      onOpenChange(false);
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
              <SelectContent className="z-[10000]" sideOffset={5}>
                <SelectItem value="ALL_CLASSES" className="font-semibold text-blue-600">
                  👥 Todas as Turmas
                </SelectItem>
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

          {/* Disciplina */}
          <div className="space-y-2">
            <Label htmlFor="subject" className="text-sm font-medium">
              📖 Disciplina {selectedClassId && selectedClassId !== 'ALL_CLASSES' && <span className="text-gray-400">(opcional)</span>}
            </Label>
            
            {(!selectedClassId || selectedClassId === 'ALL_CLASSES') && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
                ⚠️ Selecione uma turma específica para escolher ou criar uma disciplina
              </p>
            )}
            
            {!isCreatingNewSubject ? (
              <Select 
                value={selectedSubjectId} 
                onValueChange={(value) => {
                  if (value === 'CREATE_NEW') {
                    setIsCreatingNewSubject(true);
                  } else {
                    setSelectedSubjectId(value);
                  }
                }}
                disabled={!selectedClassId || selectedClassId === 'ALL_CLASSES'}
              >
                <SelectTrigger 
                  className={cn(
                    "bg-white/20 backdrop-blur-xl border-blue-200",
                    (!selectedClassId || selectedClassId === 'ALL_CLASSES') && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <SelectValue placeholder="Selecione uma disciplina" />
                </SelectTrigger>
                <SelectContent className="z-[10000]" sideOffset={5}>
                  {subjects.length === 0 && (
                    <SelectItem value="CREATE_NEW" className="text-blue-600 font-medium">
                      ➕ Criar primeira disciplina
                    </SelectItem>
                  )}
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.codigo ? `${subject.codigo} - ${subject.nome}` : subject.nome}
                    </SelectItem>
                  ))}
                  {subjects.length > 0 && (
                    <SelectItem value="CREATE_NEW" className="text-blue-600 font-medium">
                      ➕ Criar nova disciplina
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            ) : (
              <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <div className="space-y-2">
                  <Label htmlFor="newSubjectName" className="text-xs font-medium">
                    Nome da Disciplina *
                  </Label>
                  <Input
                    id="newSubjectName"
                    placeholder="Ex: Termodinâmica Aplicada"
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    className="bg-white border-blue-200"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="newSubjectCode" className="text-xs font-medium">
                    Código (Opcional)
                  </Label>
                  <Input
                    id="newSubjectCode"
                    placeholder="Ex: ENG301"
                    value={newSubjectCode}
                    onChange={(e) => setNewSubjectCode(e.target.value)}
                    className="bg-white border-blue-200"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={handleCreateSubject}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    Criar Disciplina
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCreatingNewSubject(false);
                      setNewSubjectName('');
                      setNewSubjectCode('');
                    }}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
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
            <PopoverContent className="w-auto p-0 z-[10000]" align="start" sideOffset={5}>
              <Calendar
                mode="single"
                selected={date}
                onSelect={(newDate) => newDate && setDate(newDate)}
                initialFocus
                className="pointer-events-auto"
                numberOfMonths={2}
                fromDate={new Date()}
              />
            </PopoverContent>
          </Popover>
          <p className="text-xs text-gray-500">
            💡 Dica: Você pode selecionar qualquer data futura para agendar eventos
          </p>
        </div>

            <div className="space-y-2">
              <Label htmlFor="startTime" className="text-sm font-medium">
                ⏰ Início *
              </Label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger className="bg-white/20 backdrop-blur-xl border-blue-200">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="max-h-60 z-[10000]" sideOffset={5}>
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
                <SelectContent className="max-h-60 z-[10000]" sideOffset={5}>
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
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger className="bg-white/20 backdrop-blur-xl border-blue-200">
                  <SelectValue placeholder="Selecione o local" />
                </SelectTrigger>
                <SelectContent className="z-[10000]" sideOffset={5}>
                  {PREDEFINED_LOCATIONS.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {loc}
                    </SelectItem>
                  ))}
                  <SelectItem value="CUSTOM" className="text-blue-600 font-medium">
                    ✏️ Outro local (personalizado)
                  </SelectItem>
                </SelectContent>
              </Select>
              
              {location === 'CUSTOM' && (
                <Input
                  placeholder="Digite o local personalizado"
                  value={customLocation}
                  onChange={(e) => setCustomLocation(e.target.value)}
                  className="bg-white/20 backdrop-blur-xl border-blue-200 mt-2"
                />
              )}
            </div>
          )}

          {/* Categoria */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">🏷️ Categoria *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-white/20 backdrop-blur-xl border-blue-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[10000]" sideOffset={5}>
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

          {/* Notificações */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">🔔 Notificações</Label>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-xl border border-blue-200 rounded-md p-3">
                <Checkbox
                  id="notifyPlatform"
                  checked={notifyPlatform}
                  onCheckedChange={(checked) => setNotifyPlatform(checked as boolean)}
                />
                <label htmlFor="notifyPlatform" className="text-sm cursor-pointer flex-1">
                  Enviar notificação na plataforma para alunos da turma
                </label>
              </div>
              
              <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-xl border border-blue-200 rounded-md p-3">
                <Checkbox
                  id="notifyEmail"
                  checked={notifyEmail}
                  onCheckedChange={(checked) => setNotifyEmail(checked as boolean)}
                />
                <label htmlFor="notifyEmail" className="text-sm cursor-pointer flex-1">
                  Enviar notificação por e-mail para alunos da turma
                </label>
              </div>
            </div>
            
            <p className="text-xs text-gray-500">
              As notificações serão enviadas para todos os alunos matriculados na turma selecionada.
            </p>
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
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            disabled={isSubmitting || !title.trim() || !selectedClassId}
          >
            {isSubmitting ? (
              <>
                <Clock className="mr-2 h-4 w-4 animate-spin" />
                Criando...
              </>
            ) : (
              '✓ Criar Evento'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
