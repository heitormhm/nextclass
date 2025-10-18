import React, { useState, useEffect } from 'react';
import { format, parseISO, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, MapPin, User, BookOpen, Users, Edit2, Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

interface EventDetails {
  teacherName: string;
  teacherEmail: string;
  disciplinaName: string;
  className: string;
  curso: string;
  periodo: string;
}

interface TeacherEventDetailsDialogProps {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventUpdated?: () => void;
  isEditMode?: boolean;
}

const categoryOptions = [
  { value: 'aula', label: 'Aula' },
  { value: 'prova', label: 'Prova' },
  { value: 'trabalho_grupo', label: 'Trabalho em Grupo' },
  { value: 'seminario', label: 'Seminário' },
  { value: 'atividade_avaliativa', label: 'Atividade Avaliativa' },
  { value: 'atividade_pesquisa', label: 'Atividade de Pesquisa' },
  { value: 'reuniao', label: 'Reunião' },
  { value: 'estagio', label: 'Estágio' },
  { value: 'outro', label: 'Outro' },
];

const colorOptions = [
  { value: 'azul', label: 'Azul', class: 'bg-gradient-to-br from-blue-500 to-indigo-600' },
  { value: 'verde', label: 'Verde', class: 'bg-gradient-to-br from-green-500 to-emerald-600' },
  { value: 'roxo', label: 'Roxo', class: 'bg-gradient-to-br from-purple-500 to-violet-600' },
  { value: 'laranja', label: 'Laranja', class: 'bg-gradient-to-br from-orange-500 to-amber-600' },
  { value: 'rosa', label: 'Rosa', class: 'bg-gradient-to-br from-pink-500 to-rose-600' },
  { value: 'vermelho', label: 'Vermelho', class: 'bg-gradient-to-br from-red-500 to-rose-600' },
  { value: 'amarelo', label: 'Amarelo', class: 'bg-gradient-to-br from-yellow-500 to-amber-600' },
  { value: 'cinza', label: 'Cinza', class: 'bg-gradient-to-br from-gray-500 to-slate-600' },
];

const getColorAccents = (color: string = 'azul') => {
  const accentMap: Record<string, {
    border: string;
    buttonBg: string;
    buttonHover: string;
    inputFocus: string;
  }> = {
    'azul': {
      border: 'border-blue-300',
      buttonBg: 'bg-blue-600',
      buttonHover: 'hover:bg-blue-700',
      inputFocus: 'focus:border-blue-500 focus:ring-blue-500',
    },
    'verde': {
      border: 'border-green-300',
      buttonBg: 'bg-green-600',
      buttonHover: 'hover:bg-green-700',
      inputFocus: 'focus:border-green-500 focus:ring-green-500',
    },
    'roxo': {
      border: 'border-purple-300',
      buttonBg: 'bg-purple-600',
      buttonHover: 'hover:bg-purple-700',
      inputFocus: 'focus:border-purple-500 focus:ring-purple-500',
    },
    'laranja': {
      border: 'border-orange-300',
      buttonBg: 'bg-orange-600',
      buttonHover: 'hover:bg-orange-700',
      inputFocus: 'focus:border-orange-500 focus:ring-orange-500',
    },
    'rosa': {
      border: 'border-pink-300',
      buttonBg: 'bg-pink-600',
      buttonHover: 'hover:bg-pink-700',
      inputFocus: 'focus:border-pink-500 focus:ring-pink-500',
    },
    'vermelho': {
      border: 'border-red-300',
      buttonBg: 'bg-red-600',
      buttonHover: 'hover:bg-red-700',
      inputFocus: 'focus:border-red-500 focus:ring-red-500',
    },
    'amarelo': {
      border: 'border-yellow-300',
      buttonBg: 'bg-yellow-600',
      buttonHover: 'hover:bg-yellow-700',
      inputFocus: 'focus:border-yellow-500 focus:ring-yellow-500',
    },
    'cinza': {
      border: 'border-gray-300',
      buttonBg: 'bg-gray-600',
      buttonHover: 'hover:bg-gray-700',
      inputFocus: 'focus:border-gray-500 focus:ring-gray-500',
    },
  };
  return accentMap[color] || accentMap['azul'];
};

// Custom DialogContent with flex layout for proper modal structure
const FlexDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 -translate-x-1/2 -translate-y-1/2",
        "flex flex-col",
        "w-[90vw] max-w-3xl max-h-[90vh]",
        "frost-white shadow-lg duration-200",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        "sm:rounded-lg",
        className
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
FlexDialogContent.displayName = "FlexDialogContent";

export const TeacherEventDetailsDialog = ({
  event,
  open,
  onOpenChange,
  onEventUpdated,
  isEditMode: initialEditMode = false
}: TeacherEventDetailsDialogProps) => {
  const [isEditMode, setIsEditMode] = useState(initialEditMode);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [details, setDetails] = useState<EventDetails | null>(null);
  
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDate, setEditedDate] = useState<Date | undefined>();
  const [editedStartTime, setEditedStartTime] = useState("");
  const [editedEndTime, setEditedEndTime] = useState("");
  const [editedLocation, setEditedLocation] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [editedCategory, setEditedCategory] = useState("");
  const [editedColor, setEditedColor] = useState("");
  const [editedStatus, setEditedStatus] = useState("");

  useEffect(() => {
    if (event && open) {
      fetchEventDetails();
      setEditedTitle(event.title);
      setEditedDate(event.date);
      setEditedStartTime(event.startTime);
      setEditedEndTime(event.endTime);
      setEditedLocation(event.location || "");
      setEditedDescription(event.description || "");
      setEditedCategory(event.category || "aula");
      setEditedColor(event.color || "azul");
      setEditedStatus(event.status || "pending");
      setIsEditMode(initialEditMode);
    }
  }, [event, open, initialEditMode]);

  const fetchEventDetails = async () => {
    if (!event?.classId) return;
    
    setIsLoading(true);
    try {
      const { data: eventData, error } = await supabase
        .from('turmas')
        .select(`
          nome_turma,
          curso,
          periodo,
          teacher_id,
          users!turmas_teacher_id_fkey (
            full_name,
            email
          )
        `)
        .eq('id', event.classId)
        .single();

      if (error) {
        console.error('Error fetching turma data:', error);
      }

      const teacherData = eventData?.users as any;
      const teacherName = teacherData?.full_name || 'Professor não identificado';
      const teacherEmail = teacherData?.email || '';

      let disciplinaName = 'Disciplina não especificada';
      if (event.disciplinaId) {
        const { data: disciplinaData } = await supabase
          .from('disciplinas')
          .select('nome')
          .eq('id', event.disciplinaId)
          .single();
        
        if (disciplinaData) {
          disciplinaName = disciplinaData.nome;
        }
      }

      setDetails({
        teacherName,
        teacherEmail,
        disciplinaName,
        className: eventData?.nome_turma || '',
        curso: eventData?.curso || '',
        periodo: eventData?.periodo || '',
      });
    } catch (error) {
      console.error('Error fetching event details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!event) return;
    setIsSaving(true);
    
    try {
      // Detectar tipo de mudança
      const isDateChanged = editedDate && !isSameDay(editedDate, event.date);
      const isCancelled = editedStatus === 'cancelled';
      
      const { error } = await supabase
        .from('class_events')
        .update({
          title: editedTitle,
          event_date: editedDate ? format(editedDate, 'yyyy-MM-dd') + 'T00:00:00.000Z' : format(event.date, 'yyyy-MM-dd') + 'T00:00:00.000Z',
          start_time: editedStartTime,
          end_time: editedEndTime,
          location: editedLocation || null,
          description: editedDescription || null,
          category: editedCategory as any,
          color: editedColor as any,
          status: editedStatus,
        })
        .eq('id', event.id);
      
      if (error) throw error;
      
      // Enviar notificação personalizada com base no tipo de mudança
      if (isCancelled) {
        await supabase.functions.invoke('send-class-event-cancellation-notification', {
          body: {
            eventId: event.id,
            classId: event.classId,
            title: editedTitle,
            originalDate: format(event.date, 'yyyy-MM-dd'),
          }
        });
        toast.success('✓ Evento cancelado!', {
          description: 'Alunos foram notificados sobre o cancelamento'
        });
      } else if (isDateChanged) {
        await supabase.functions.invoke('send-class-event-date-change-notification', {
          body: {
            eventId: event.id,
            classId: event.classId,
            title: editedTitle,
            oldDate: format(event.date, 'yyyy-MM-dd'),
            newDate: format(editedDate!, 'yyyy-MM-dd'),
          }
        });
        toast.success('✓ Data do evento atualizada!', {
          description: 'Alunos foram notificados sobre a nova data'
        });
      } else {
        const changes: string[] = [];
        if (editedTitle !== event.title) changes.push('título');
        if (editedStartTime !== event.startTime) changes.push('horário');
        if (editedLocation !== (event.location || '')) changes.push('local');
        
        await supabase.functions.invoke('send-class-event-update-notification', {
          body: {
            eventId: event.id,
            classId: event.classId,
            changes,
            title: editedTitle,
          }
        });
        toast.success('✓ Evento atualizado!', {
          description: 'Alunos foram notificados sobre a alteração'
        });
      }
      
      onEventUpdated?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error('Erro ao atualizar evento');
    } finally {
      setIsSaving(false);
    }
  };

  if (!event) return null;

  const colorClasses = colorOptions.find(c => c.value === (isEditMode ? editedColor : event.color))?.class || colorOptions[0].class;
  const categoryLabel = categoryOptions.find(c => c.value === (isEditMode ? editedCategory : event.category))?.label || 'Aula';
  const colorAccents = getColorAccents(isEditMode ? editedColor : event.color);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FlexDialogContent className="p-0 relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-3 top-3 z-[60] h-10 w-10 rounded-full bg-white hover:bg-gray-100 shadow-2xl transition-all duration-200 hover:scale-110 border-2 border-gray-200"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-5 w-5 text-gray-800 font-bold" />
        </Button>

        {/* Scrollable Content Wrapper */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pt-6 pb-4">
          <div className={cn(
          "rounded-lg p-4 pr-14 bg-gradient-to-br mb-4 text-white",
          colorClasses
        )}>
          <div className="flex items-center justify-between mb-2">
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              {categoryLabel}
            </Badge>
            {!isEditMode && (
              <Button
                variant="secondary"
                size="default"
                onClick={() => setIsEditMode(true)}
                className="bg-white/30 hover:bg-white/40 text-white font-semibold backdrop-blur-sm border border-white/50 shadow-lg hover:shadow-xl transition-all hover:scale-105"
              >
                <Edit2 className="h-5 w-5 mr-2" />
                Editar
              </Button>
            )}
          </div>
          {isEditMode ? (
          <Input
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            className={cn(
              "text-2xl font-bold bg-white/20 border-white/30 text-white placeholder:text-white/70",
              colorAccents.inputFocus
            )}
            placeholder="Título do evento"
          />
          ) : (
            <h2 className="text-2xl font-bold">{event.title}</h2>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <div className="h-24 bg-gray-100 animate-pulse rounded-lg" />
            <div className="h-24 bg-gray-100 animate-pulse rounded-lg" />
          </div>
        ) : (
          <div className="space-y-4 transition-all duration-300 ease-in-out">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Data com edição */}
            <div className="rounded-lg p-4 border bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
              <div className="flex items-center gap-2 mb-2 text-blue-700">
                <Calendar className="h-5 w-5" />
                <span className="font-semibold text-sm">Data</span>
              </div>
              <div className="ml-7">
                {isEditMode ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        className={cn(
                          "w-full justify-start bg-white hover:bg-blue-50 border-blue-300",
                          colorAccents.inputFocus
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {editedDate ? format(editedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Selecione uma data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={editedDate}
                        onSelect={setEditedDate}
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                ) : (
                  <>
                    <p className="text-base font-medium text-gray-900">
                      {format(event.date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {format(event.date, "EEEE", { locale: ptBR })}
                    </p>
                  </>
                )}
              </div>
            </div>

              <div className="rounded-lg p-4 border bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
                <div className="flex items-center gap-2 mb-2 text-amber-700">
                  <Clock className="h-5 w-5" />
                  <span className="font-semibold text-sm">Horário</span>
                </div>
                <div className="ml-7 space-y-2">
                  {isEditMode ? (
                    <>
                      <Input
                        type="time"
                        value={editedStartTime}
                        onChange={(e) => setEditedStartTime(e.target.value)}
                        className={cn("text-sm bg-white hover:bg-amber-50 border-amber-300", colorAccents.inputFocus)}
                      />
                      <Input
                        type="time"
                        value={editedEndTime}
                        onChange={(e) => setEditedEndTime(e.target.value)}
                        className={cn("text-sm bg-white hover:bg-amber-50 border-amber-300", colorAccents.inputFocus)}
                      />
                    </>
                  ) : (
                    <p className="text-base font-medium text-gray-900">
                      {event.startTime.substring(0, 5)} - {event.endTime.substring(0, 5)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {details && (
              <>
                <div className="rounded-lg p-4 border bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                  <div className="flex items-center gap-2 mb-2 text-purple-700">
                    <User className="h-5 w-5" />
                    <span className="font-semibold text-sm">Professor(a)</span>
                  </div>
                  <div className="ml-7">
                    <p className="text-base font-medium text-gray-900">
                      {details.teacherName}
                    </p>
                    {details.teacherEmail && (
                      <p className="text-xs text-gray-600 mt-1">
                        {details.teacherEmail}
                      </p>
                    )}
                  </div>
                </div>

                {details.disciplinaName !== 'Disciplina não especificada' && (
                  <div className="rounded-lg p-4 border bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                    <div className="flex items-center gap-2 mb-2 text-green-700">
                      <BookOpen className="h-5 w-5" />
                      <span className="font-semibold text-sm">Disciplina</span>
                    </div>
                    <div className="ml-7">
                      <p className="text-base font-medium text-gray-900">
                        {details.disciplinaName}
                      </p>
                    </div>
                  </div>
                )}

                <div className="rounded-lg p-4 border bg-gradient-to-br from-slate-50 to-gray-50 border-slate-200">
                  <div className="flex items-center gap-2 mb-2 text-slate-700">
                    <Users className="h-5 w-5" />
                    <span className="font-semibold text-sm">Turma</span>
                  </div>
                  <div className="ml-7 space-y-2">
                    <p className="text-base font-medium text-gray-900">
                      {details.className}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs">
                        {details.curso}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {details.periodo}
                      </Badge>
                    </div>
                  </div>
                </div>
              </>
            )}

            {isEditMode && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="rounded-lg p-4 border bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                    <label className="text-sm font-medium mb-2 block text-blue-700 flex items-center gap-2">
                      <span>📂</span> Categoria
                    </label>
                    <Select value={editedCategory} onValueChange={setEditedCategory}>
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryOptions.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="rounded-lg p-4 border bg-gradient-to-br from-cyan-50 to-teal-50 border-cyan-200">
                    <Label className="text-sm font-medium text-cyan-700 flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4" />
                      📍 Local
                    </Label>
                    <Input
                      value={editedLocation}
                      onChange={(e) => setEditedLocation(e.target.value)}
                      placeholder="Ex: Sala 201 ou Link da reunião"
                      className={cn("bg-white", colorAccents.inputFocus)}
                    />
                  </div>

                  <div className="rounded-lg p-4 border bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200">
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">📝 Descrição</Label>
                    <Textarea
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      placeholder="Adicione detalhes sobre o evento..."
                      rows={3}
                      className={cn("bg-white", colorAccents.inputFocus)}
                    />
                  </div>

                  <div className="rounded-lg p-4 border bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                    <label className="text-sm font-medium mb-3 block text-purple-700">🎨 Cor do Evento</label>
                    <RadioGroup value={editedColor} onValueChange={setEditedColor} className="grid grid-cols-4 gap-2">
                      {colorOptions.map(color => (
                        <label
                          key={color.value}
                          className={cn(
                            "relative flex items-center justify-center rounded-lg p-3 cursor-pointer transition-all border-2",
                            editedColor === color.value ? "border-purple-500 scale-105 shadow-lg" : "border-gray-200 hover:border-purple-300"
                          )}
                        >
                          <RadioGroupItem value={color.value} className="sr-only" />
                          <div className={cn("w-8 h-8 rounded-full bg-gradient-to-br shadow-md", color.class)} />
                        </label>
                      ))}
                    </RadioGroup>
                  </div>
                </div>
              </>
            )}
            
            {!isEditMode && (
              <>
                {(event.location || event.description) && <Separator />}
                
                {event.location && (
                  <div className="rounded-lg p-4 border bg-gradient-to-br from-cyan-50 to-teal-50 border-cyan-200">
                    <div className="flex items-center gap-2 mb-2 text-cyan-700">
                      <MapPin className="h-5 w-5" />
                      <span className="font-semibold text-sm">Local</span>
                    </div>
                    <div className="ml-7">
                      <p className="text-base font-medium text-gray-900">
                        {event.location}
                      </p>
                    </div>
                  </div>
                )}

                {event.description && (
                  <div className="rounded-lg p-4 border bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200">
                    <div className="flex items-center gap-2 mb-2 text-gray-700">
                      <span className="font-semibold text-sm">Descrição</span>
                    </div>
                    <div className="ml-2">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {event.description}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
        </div> {/* Close scrollable wrapper */}

        {/* Footer - Sticky at Bottom */}
        {isEditMode && (
          <div className="flex-shrink-0 bg-gradient-to-t from-white via-white/95 to-transparent p-4 border-t shadow-2xl backdrop-blur-sm z-[70] flex gap-3">
            <Button
              onClick={() => setIsEditMode(false)}
              variant="outline"
              size="lg"
              className="flex-1 h-12 border-2 border-gray-300 hover:bg-gray-50 hover:scale-105 transition-all"
              disabled={isSaving}
            >
              <X className="h-5 w-5 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={handleSaveChanges}
              size="lg"
              className={cn(
                "flex-1 h-12 font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105 text-white",
                colorAccents.buttonBg,
                colorAccents.buttonHover
              )}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </div>
        )}
      </FlexDialogContent>
    </Dialog>
  );
};
