import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, MapPin, User, BookOpen, GraduationCap, FileText, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

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
  isPersonalEvent?: boolean;
  color?: string;
  category?: string;
  disciplinaId?: string;
  classId?: string;
}

interface EventDetailsDialogProps {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface EventDetails {
  teacherName: string;
  teacherEmail: string;
  disciplinaName: string;
  className: string;
  curso: string;
  periodo: string;
}

export const EventDetailsDialog = ({ event, open, onOpenChange }: EventDetailsDialogProps) => {
  const [details, setDetails] = useState<EventDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (event && !event.isPersonalEvent && open) {
      fetchEventDetails();
    }
  }, [event, open]);

  const fetchEventDetails = async () => {
    if (!event?.classId) return;
    
    setIsLoading(true);
    try {
      console.log('🔍 Fetching event details for classId:', event.classId);
      
      // BUSCA OTIMIZADA COM JOIN - Buscar turma + professor em uma única query
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
        console.error('❌ Error fetching turma data:', error);
      }

      // Extrair dados do professor com segurança
      const teacherData = eventData?.users as any;
      const teacherName = teacherData?.full_name || 'Professor não identificado';
      const teacherEmail = teacherData?.email || '';

      // Buscar nome da disciplina
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

      console.log('✅ Event details fetched successfully:', {
        teacherName,
        teacherEmail,
        disciplinaName,
        className: eventData?.nome_turma,
        teacherId: eventData?.teacher_id
      });

      setDetails({
        teacherName,
        teacherEmail,
        disciplinaName,
        className: eventData?.nome_turma || '',
        curso: eventData?.curso || '',
        periodo: eventData?.periodo || '',
      });
    } catch (error) {
      console.error('❌ Critical error fetching event details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryLabel = (category?: string) => {
    const categoryLabels: Record<string, string> = {
      'aula': 'Aula',
      'aula_presencial': 'Aula Presencial',
      'aula_online': 'Aula Online',
      'atividade_avaliativa': 'Avaliação',
      'trabalho': 'Trabalho',
      'prova': 'Prova',
      'seminario': 'Seminário',
      'outro': 'Outro'
    };
    
    if (!category) return 'Evento';
    return categoryLabels[category] || category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getEventColorClasses = (color: string = 'azul') => {
    const colorMap: Record<string, { bg: string; text: string; badge: string }> = {
      'azul': { bg: 'from-blue-500 to-blue-600', text: 'text-blue-700', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
      'vermelho': { bg: 'from-red-500 to-red-600', text: 'text-red-700', badge: 'bg-red-50 text-red-700 border-red-200' },
      'verde': { bg: 'from-green-500 to-green-600', text: 'text-green-700', badge: 'bg-green-50 text-green-700 border-green-200' },
      'amarelo': { bg: 'from-yellow-500 to-yellow-600', text: 'text-yellow-700', badge: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
      'roxo': { bg: 'from-purple-500 to-purple-600', text: 'text-purple-700', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
      'rosa': { bg: 'from-pink-500 to-pink-600', text: 'text-pink-700', badge: 'bg-pink-50 text-pink-700 border-pink-200' },
      'laranja': { bg: 'from-orange-500 to-orange-600', text: 'text-orange-700', badge: 'bg-orange-50 text-orange-700 border-orange-200' },
    };
    return colorMap[color] || colorMap['azul'];
  };

  if (!event) return null;

  const colorClasses = getEventColorClasses(event.color);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto custom-scrollbar animate-in fade-in-0 zoom-in-95 duration-300">
        {/* Custom Close Button - POSICIONADO ACIMA DO GRADIENTE */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-3 top-3 z-[60] h-10 w-10 rounded-full bg-white hover:bg-gray-100 shadow-2xl transition-all duration-200 hover:scale-110 border-2 border-gray-200"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-5 w-5 text-gray-800 font-bold" />
        </Button>

        <DialogHeader>
          <div className={cn(
            "rounded-lg p-4 pr-16 bg-gradient-to-br mb-4",
            colorClasses.bg
          )}>
            <DialogTitle className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <BookOpen className="h-6 w-6" />
              {event.title}
            </DialogTitle>
            {event.category && (
              <Badge 
                variant="outline" 
                className="bg-white/20 text-white border-white/30 backdrop-blur-sm"
              >
                {getCategoryLabel(event.category)}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Data e Horário */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 text-gray-700 mb-2">
              <Clock className="h-5 w-5 text-pink-600" />
              <span className="font-semibold text-sm">Horário</span>
            </div>
            <div className="ml-7 space-y-1">
              <p className="text-lg font-bold text-gray-900">
                {event.startTime} - {event.endTime}
              </p>
              <p className="text-sm text-gray-600 capitalize">
                {format(event.date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
              <Badge variant="outline" className={cn(
                "mt-2",
                event.type === 'online' 
                  ? 'bg-blue-50 text-blue-700 border-blue-200' 
                  : 'bg-green-50 text-green-700 border-green-200'
              )}>
                {event.type === 'online' ? '🌐 Online' : '🏫 Presencial'}
              </Badge>
            </div>
          </div>

          {/* Professor e Disciplina */}
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : details ? (
            <>
              {/* Professor */}
              <div className={cn(
                "rounded-lg p-4 border",
                details.teacherName === 'Professor não identificado'
                  ? "bg-gradient-to-br from-red-50 to-orange-50 border-red-200"
                  : "bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200"
              )}>
                <div className={cn(
                  "flex items-center gap-2 mb-2",
                  details.teacherName === 'Professor não identificado' ? 'text-red-700' : 'text-purple-700'
                )}>
                  <User className="h-5 w-5" />
                  <span className="font-semibold text-sm">Professor(a)</span>
                  {details.teacherName === 'Professor não identificado' && (
                    <Badge variant="destructive" className="ml-2 text-xs">
                      ⚠️ Não identificado
                    </Badge>
                  )}
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

              {/* Disciplina */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center gap-2 text-blue-700 mb-2">
                  <BookOpen className="h-5 w-5" />
                  <span className="font-semibold text-sm">Disciplina</span>
                </div>
                <p className="ml-7 text-base font-medium text-gray-900">
                  {details.disciplinaName}
                </p>
              </div>

              {/* Turma */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center gap-2 text-green-700 mb-2">
                  <GraduationCap className="h-5 w-5" />
                  <span className="font-semibold text-sm">Turma</span>
                </div>
                <div className="ml-7 space-y-1">
                  <p className="text-base font-medium text-gray-900">
                    {details.className}
                  </p>
                  <p className="text-sm text-gray-600">
                    {details.curso} - {details.periodo}
                  </p>
                </div>
              </div>
            </>
          ) : null}

          {/* Local */}
          {event.location && (
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-4 border border-orange-200">
              <div className="flex items-center gap-2 text-orange-700 mb-2">
                <MapPin className="h-5 w-5" />
                <span className="font-semibold text-sm">Local</span>
              </div>
              <p className="ml-7 text-base font-medium text-gray-900">
                {event.location}
              </p>
            </div>
          )}

          {/* Observações */}
          {event.description && (
            <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 text-gray-700 mb-2">
                <FileText className="h-5 w-5" />
                <span className="font-semibold text-sm">Observações do Professor</span>
              </div>
              <p className="ml-7 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {event.description}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
