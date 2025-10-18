import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, MapPin, User, BookOpen, Users, X, Edit2, Save } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

export const TeacherEventDetailsDialog = ({
  event,
  open,
  onOpenChange,
  onEventUpdated
}: TeacherEventDetailsDialogProps) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [details, setDetails] = useState<EventDetails | null>(null);
  
  const [editedTitle, setEditedTitle] = useState("");
  const [editedStartTime, setEditedStartTime] = useState("");
  const [editedEndTime, setEditedEndTime] = useState("");
  const [editedLocation, setEditedLocation] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [editedCategory, setEditedCategory] = useState("");
  const [editedColor, setEditedColor] = useState("");

  useEffect(() => {
    if (event && open) {
      fetchEventDetails();
      setEditedTitle(event.title);
      setEditedStartTime(event.startTime);
      setEditedEndTime(event.endTime);
      setEditedLocation(event.location || "");
      setEditedDescription(event.description || "");
      setEditedCategory(event.category || "aula");
      setEditedColor(event.color || "azul");
      setIsEditMode(false);
    }
  }, [event, open]);

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
      const changes: string[] = [];
      if (editedTitle !== event.title) changes.push('título');
      if (editedStartTime !== event.startTime) changes.push('horário de início');
      if (editedEndTime !== event.endTime) changes.push('horário de término');
      if (editedLocation !== (event.location || '')) changes.push('local');
      if (editedDescription !== (event.description || '')) changes.push('descrição');
      if (editedCategory !== (event.category || 'aula')) changes.push('categoria');
      if (editedColor !== (event.color || 'azul')) changes.push('cor');

      const { error } = await supabase
        .from('class_events')
        .update({
          title: editedTitle,
          start_time: editedStartTime,
          end_time: editedEndTime,
          location: editedLocation || null,
          description: editedDescription || null,
          category: editedCategory as any,
          color: editedColor as any,
        })
        .eq('id', event.id);
      
      if (error) throw error;

      if (changes.length > 0) {
        await supabase.functions.invoke('send-class-event-update-notification', {
          body: {
            eventId: event.id,
            classId: event.classId,
            changes,
            title: editedTitle,
          }
        });
      }
      
      toast.success('✓ Evento atualizado!', {
        description: changes.length > 0 ? 'Alunos foram notificados sobre a alteração' : ''
      });
      
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-3 top-3 z-[60] h-10 w-10 rounded-full bg-white hover:bg-gray-100 shadow-2xl transition-all duration-200 hover:scale-110 border-2 border-gray-200"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-5 w-5 text-gray-800 font-bold" />
        </Button>

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
                variant="ghost"
                size="sm"
                onClick={() => setIsEditMode(true)}
                className="text-white hover:bg-white/20"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Editar
              </Button>
            )}
          </div>
          {isEditMode ? (
            <Input
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="text-2xl font-bold bg-white/20 border-white/30 text-white placeholder:text-white/70"
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
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg p-4 border bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                <div className="flex items-center gap-2 mb-2 text-blue-700">
                  <Calendar className="h-5 w-5" />
                  <span className="font-semibold text-sm">Data</span>
                </div>
                <div className="ml-7">
                  <p className="text-base font-medium text-gray-900">
                    {format(event.date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {format(event.date, "EEEE", { locale: ptBR })}
                  </p>
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
                        className="text-sm"
                      />
                      <Input
                        type="time"
                        value={editedEndTime}
                        onChange={(e) => setEditedEndTime(e.target.value)}
                        className="text-sm"
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

            {isEditMode ? (
              <>
                <Separator />
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Categoria</label>
                    <Select value={editedCategory} onValueChange={setEditedCategory}>
                      <SelectTrigger>
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

                  <div>
                    <label className="text-sm font-medium mb-2 block">Cor</label>
                    <Select value={editedColor} onValueChange={setEditedColor}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {colorOptions.map(color => (
                          <SelectItem key={color.value} value={color.value}>
                            <div className="flex items-center gap-2">
                              <div className={cn("h-4 w-4 rounded", color.class)} />
                              {color.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            ) : null}

            {(event.location || isEditMode) && (
              <>
                <Separator />
                <div className="rounded-lg p-4 border bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-200">
                  <div className="flex items-center gap-2 mb-2 text-indigo-700">
                    <MapPin className="h-5 w-5" />
                    <span className="font-semibold text-sm">Local</span>
                  </div>
                  <div className="ml-7">
                    {isEditMode ? (
                      <Input
                        value={editedLocation}
                        onChange={(e) => setEditedLocation(e.target.value)}
                        placeholder="Local do evento"
                        className="text-sm"
                      />
                    ) : (
                      <p className="text-base text-gray-900">
                        {event.location || 'Não especificado'}
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}

            {(event.description || isEditMode) && (
              <>
                <Separator />
                <div className="rounded-lg p-4 border bg-gray-50 border-gray-200">
                  <h3 className="font-semibold text-sm mb-2 text-gray-700">
                    Observações
                  </h3>
                  {isEditMode ? (
                    <Textarea
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      placeholder="Adicione observações sobre o evento..."
                      className="min-h-[100px]"
                    />
                  ) : (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {event.description || 'Nenhuma observação'}
                    </p>
                  )}
                </div>
              </>
            )}

            {isEditMode && (
              <>
                <Separator />
                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditMode(false);
                      setEditedTitle(event.title);
                      setEditedStartTime(event.startTime);
                      setEditedEndTime(event.endTime);
                      setEditedLocation(event.location || "");
                      setEditedDescription(event.description || "");
                      setEditedCategory(event.category || "aula");
                      setEditedColor(event.color || "azul");
                    }}
                    disabled={isSaving}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSaveChanges}
                    disabled={isSaving}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
