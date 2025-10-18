import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";
import { format, parseISO } from "https://esm.sh/date-fns@3.6.0";
import { ptBR } from "https://esm.sh/date-fns@3.6.0/locale";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CancellationNotificationPayload {
  eventId: string;
  classId: string;
  title: string;
  originalDate: string;
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

    const payload: CancellationNotificationPayload = await req.json();
    console.log('[send-class-event-cancellation-notification] Payload:', payload);

    const { eventId, classId, title, originalDate } = payload;

    // Buscar evento atualizado
    const { data: eventData, error: eventError } = await supabase
      .from('class_events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError) {
      console.error('[send-class-event-cancellation-notification] Error fetching event:', eventError);
      throw eventError;
    }

    // Buscar alunos matriculados na turma
    const { data: enrollments, error: enrollError } = await supabase
      .from('turma_enrollments')
      .select('aluno_id, users:aluno_id(id, full_name)')
      .eq('turma_id', classId);

    if (enrollError) {
      console.error('[send-class-event-cancellation-notification] Error fetching enrollments:', enrollError);
      throw enrollError;
    }

    console.log(`[send-class-event-cancellation-notification] Encontrados ${enrollments?.length || 0} alunos matriculados`);

    if (!enrollments || enrollments.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No students enrolled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Gerar mensagem empática com AI
    let aiMessage = `O evento "${title}" foi cancelado.`;
    
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
              content: `Gere uma mensagem empática (máx 120 caracteres) notificando alunos sobre o CANCELAMENTO de um evento acadêmico.

Título: ${title}
Data original: ${format(parseISO(originalDate), "dd 'de' MMMM", { locale: ptBR })}

Use tom compreensivo e informe que mais detalhes podem ser verificados no calendário.`
            }]
          })
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          aiMessage = aiData.choices[0]?.message?.content || aiMessage;
          console.log('[send-class-event-cancellation-notification] AI generated message:', aiMessage);
        }
      } catch (aiError) {
        console.error('[send-class-event-cancellation-notification] AI generation error:', aiError);
      }
    }

    // Criar notificações para cada aluno
    const notifications = enrollments.map((enrollment: any) => ({
      user_id: enrollment.aluno_id,
      title: '❌ Evento Cancelado',
      message: aiMessage,
      event_type: 'event_cancelled',
      event_id: eventId,
      is_read: false,
    }));

    const { error: notifError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (notifError) {
      console.error('[send-class-event-cancellation-notification] Error inserting notifications:', notifError);
      throw notifError;
    }

    console.log(`[send-class-event-cancellation-notification] ✓ ${notifications.length} notificações de cancelamento enviadas`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        notificationsSent: notifications.length,
        message: aiMessage
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[send-class-event-cancellation-notification] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});