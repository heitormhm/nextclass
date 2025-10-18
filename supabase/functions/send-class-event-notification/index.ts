import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  eventId: string;
  classId: string;
  title: string;
  eventDate: string;
  startTime: string;
  notifyPlatform: boolean;
  notifyEmail: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: NotificationPayload = await req.json();
    const { eventId, classId, title, eventDate, startTime, notifyPlatform, notifyEmail } = payload;

    console.log('[send-class-event-notification] Processing:', { 
      eventId, 
      classId, 
      notifyPlatform, 
      notifyEmail 
    });

    // Buscar turma para informações
    const { data: turma, error: turmaError } = await supabase
      .from('turmas')
      .select('nome_turma, curso, periodo')
      .eq('id', classId)
      .single();

    if (turmaError) {
      console.error('[send-class-event-notification] Error fetching turma:', turmaError);
      throw turmaError;
    }

    // Buscar alunos matriculados na turma
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('turma_enrollments')
      .select(`
        aluno_id,
        users:aluno_id(id, full_name, email, email_notifications)
      `)
      .eq('turma_id', classId);

    if (enrollmentsError) {
      console.error('[send-class-event-notification] Error fetching enrollments:', enrollmentsError);
      throw enrollmentsError;
    }

    const students = enrollments?.map((e: any) => e.users).filter(Boolean) || [];
    console.log(`[send-class-event-notification] Found ${students.length} students`);

    if (students.length === 0) {
      console.log('[send-class-event-notification] No students found for this class');
      return new Response(
        JSON.stringify({ success: true, studentsNotified: 0, message: 'No students enrolled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let platformNotificationsSent = 0;

    // Enviar notificações na plataforma
    if (notifyPlatform) {
      const notificationsToInsert = students.map((student: any) => ({
        user_id: student.id,
        title: `Novo Evento: ${title}`,
        message: `Um novo evento foi criado para a turma ${turma.nome_turma}. Data: ${new Date(eventDate).toLocaleDateString('pt-BR')} às ${startTime}`,
        event_type: 'class_event',
        event_id: eventId,
        is_read: false,
      }));

      const { error: notifyError, data: insertedNotifications } = await supabase
        .from('notifications')
        .insert(notificationsToInsert)
        .select();

      if (notifyError) {
        console.error('[send-class-event-notification] Error creating notifications:', notifyError);
      } else {
        platformNotificationsSent = insertedNotifications?.length || 0;
        console.log(`[send-class-event-notification] Created ${platformNotificationsSent} platform notifications`);
      }
    }

    // TODO: Implementar envio de email (requer Resend API)
    if (notifyEmail) {
      console.log('[send-class-event-notification] Email notifications requested but not yet implemented');
      // Aqui você pode integrar com Resend ou outro serviço de email
      // const emailsToSend = students.filter((s: any) => s.email_notifications && s.email);
      // for (const student of emailsToSend) {
      //   await sendEmail(student.email, title, eventDate, startTime);
      // }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        studentsNotified: students.length,
        platformNotificationsSent,
        emailNotificationsSent: 0 // Will be implemented later
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('[send-class-event-notification] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error occurred',
        success: false
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
