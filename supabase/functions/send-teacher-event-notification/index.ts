import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting teacher event notification job...');

    // Get current date and 24 hours from now
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Fetch class events in next 24h from all teachers
    const { data: classEvents, error: classEventsError } = await supabase
      .from('class_events')
      .select(`
        *,
        classes!inner(
          id,
          name,
          teacher_id,
          users!classes_teacher_id_fkey(id, email, full_name)
        )
      `)
      .gte('event_date', now.toISOString())
      .lte('event_date', tomorrow.toISOString());

    if (classEventsError) {
      console.error('Error fetching class events:', classEventsError);
      throw classEventsError;
    }

    console.log(`Found ${classEvents?.length || 0} class events`);

    // Process notifications for each event
    for (const event of classEvents || []) {
      const eventDate = new Date(event.event_date);
      const formattedDate = eventDate.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });

      const className = event.classes?.name || 'Turma';
      const teacherId = event.classes?.teacher_id;

      // Create notification for the teacher
      const { error: teacherNotifError } = await supabase
        .from('notifications')
        .insert({
          user_id: teacherId,
          title: `Evento agendado: ${event.title}`,
          message: `O evento "${event.title}" da turma ${className} está agendado para ${formattedDate} às ${event.start_time}`,
          event_id: event.id,
          event_type: 'class_event',
          is_read: false
        });

      if (teacherNotifError) {
        console.error('Error creating teacher notification:', teacherNotifError);
      } else {
        console.log(`Created notification for teacher on event ${event.id}`);
      }

      // Fetch enrolled students
      const { data: enrollments, error: enrollError } = await supabase
        .from('turma_enrollments')
        .select('aluno_id, users!turma_enrollments_aluno_id_fkey(id, email, full_name)')
        .eq('turma_id', event.class_id);

      if (enrollError) {
        console.error('Error fetching enrollments:', enrollError);
        continue;
      }

      console.log(`Found ${enrollments?.length || 0} students enrolled in class ${event.class_id}`);

      // Create notification for each enrolled student
      for (const enrollment of enrollments || []) {
        const { error: studentNotifError } = await supabase
          .from('notifications')
          .insert({
            user_id: enrollment.aluno_id,
            title: `Evento da turma: ${event.title}`,
            message: `A turma ${className} tem o evento "${event.title}" agendado para ${formattedDate} às ${event.start_time}`,
            event_id: event.id,
            event_type: 'class_event',
            is_read: false
          });

        if (studentNotifError) {
          console.error('Error creating student notification:', studentNotifError);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: classEvents?.length || 0,
        message: 'Teacher event notifications processed successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in send-teacher-event-notification:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
