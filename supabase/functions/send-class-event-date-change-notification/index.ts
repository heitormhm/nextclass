import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";
import { format, parseISO } from "https://esm.sh/date-fns@3.6.0";
import { ptBR } from "https://esm.sh/date-fns@3.6.0/locale";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DateChangeNotificationPayload {
  eventId: string;
  classId: string;
  title: string;
  oldDate: string;
  newDate: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: DateChangeNotificationPayload = await req.json();
    console.log('[send-class-event-date-change-notification] Payload:', payload);

    const { eventId, classId, title, oldDate, newDate } = payload;

    // Buscar evento atualizado
    const { data: eventData, error: eventError } = await supabase
      .from('class_events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError) {
      console.error('[send-class-event-date-change-notification] Error fetching event:', eventError);
      throw eventError;
    }

    // Buscar alunos matriculados na turma
    const { data: enrollments, error: enrollError } = await supabase
      .from('turma_enrollments')
      .select('aluno_id, users:aluno_id(id, full_name)')
      .eq('turma_id', classId);

    if (enrollError) {
      console.error('[send-class-event-date-change-notification] Error fetching enrollments:', enrollError);
      throw enrollError;
    }

    console.log(`[send-class-event-date-change-notification] Encontrados ${enrollments?.length || 0} alunos matriculados`);

    if (!enrollments || enrollments.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No students enrolled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Gerar mensagem clara com AI
    const oldDateFormatted = format(parseISO(oldDate), "dd 'de' MMMM", { locale: ptBR });
    const newDateFormatted = format(parseISO(newDate), "dd 'de' MMMM", { locale: ptBR });
    
    let aiMessage = `A data do evento "${title}" foi alterada de ${oldDateFormatted} para ${newDateFormatted}.`;
    
    if (lovableApiKey) {
      try {
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [{
              role: 'user',
              content: `Gere uma mensagem clara (máx 130 caracteres) notificando alunos sobre MUDANÇA DE DATA de um evento acadêmico.

Título: ${title}
Data antiga: ${oldDateFormatted}
Data nova: ${newDateFormatted}

Destaque a nova data e seja objetivo.`
            }]
          })
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          aiMessage = aiData.choices[0]?.message?.content || aiMessage;
          console.log('[send-class-event-date-change-notification] AI generated message:', aiMessage);
        }
      } catch (aiError) {
        console.error('[send-class-event-date-change-notification] AI generation error:', aiError);
      }
    }

    // Criar notificações para cada aluno
    const notifications = enrollments.map((enrollment: any) => ({
      user_id: enrollment.aluno_id,
      title: '📅 Data do Evento Alterada',
      message: aiMessage,
      event_type: 'event_date_changed',
      event_id: eventId,
      is_read: false,
    }));

    const { error: notifError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (notifError) {
      console.error('[send-class-event-date-change-notification] Error inserting notifications:', notifError);
      throw notifError;
    }

    console.log(`[send-class-event-date-change-notification] ✓ ${notifications.length} notificações de mudança de data enviadas`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        notificationsSent: notifications.length,
        message: aiMessage
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[send-class-event-date-change-notification] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});