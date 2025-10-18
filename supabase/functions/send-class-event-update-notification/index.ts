import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateNotificationPayload {
  eventId: string;
  classId: string;
  changes: string[];
  title: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const payload: UpdateNotificationPayload = await req.json();
    const { eventId, classId, changes, title } = payload;

    console.log('📝 Processing event update notification:', { eventId, classId, changes });

    // Buscar evento atualizado
    const { data: event, error: eventError } = await supabase
      .from('class_events')
      .select(`
        *,
        turmas!class_id (
          teacher_id,
          nome_turma,
          users!turmas_teacher_id_fkey (
            full_name
          )
        )
      `)
      .eq('id', eventId)
      .single();

    if (eventError) {
      console.error('Error fetching event:', eventError);
      throw eventError;
    }

    const turma = event?.turmas as any;
    const teacherFullName = turma?.users?.full_name || 'Professor(a)';

    console.log('✅ Event fetched:', { title, teacherFullName, className: turma?.nome_turma });

    // Buscar alunos matriculados na turma
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('turma_enrollments')
      .select(`
        aluno_id,
        users!turma_enrollments_aluno_id_fkey (
          full_name,
          email,
          email_notifications
        )
      `)
      .eq('turma_id', classId);

    if (enrollmentsError) {
      console.error('Error fetching enrollments:', enrollmentsError);
      throw enrollmentsError;
    }

    if (!enrollments || enrollments.length === 0) {
      console.log('⚠️ No students enrolled in this class');
      return new Response(
        JSON.stringify({ message: 'No students to notify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📤 Found ${enrollments.length} students to notify`);

    // Gerar mensagem AI sobre a atualização
    let notificationMessage = `O evento "${title}" foi atualizado.`;

    if (lovableApiKey) {
      try {
        const changesText = changes.join(', ');
        const aiPrompt = `Gere uma mensagem concisa (máx 150 caracteres) notificando alunos sobre ATUALIZAÇÃO de um evento acadêmico.

Campos alterados: ${changesText}
Título: ${title}
Professor: ${teacherFullName}

Use tom profissional e destaque que houve uma alteração importante. Mencione apenas os campos mais relevantes que foram alterados.`;

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'Você é um assistente educacional que cria notificações concisas e profissionais.' },
              { role: 'user', content: aiPrompt }
            ],
            max_tokens: 100,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const generatedMessage = aiData.choices?.[0]?.message?.content?.trim();
          if (generatedMessage) {
            notificationMessage = generatedMessage;
            console.log('✅ AI-generated notification message:', notificationMessage);
          }
        }
      } catch (aiError) {
        console.warn('⚠️ AI generation failed, using fallback message:', aiError);
      }
    }

    // Inserir notificações para cada aluno
    const notificationsToInsert = enrollments.map((enrollment: any) => {
      const student = enrollment.users;
      return {
        user_id: enrollment.aluno_id,
        title: '📝 Evento Atualizado',
        message: notificationMessage,
        event_id: eventId,
        event_type: 'event_update',
        is_read: false,
      };
    });

    const { error: notificationError } = await supabase
      .from('notifications')
      .insert(notificationsToInsert);

    if (notificationError) {
      console.error('Error inserting notifications:', notificationError);
      throw notificationError;
    }

    console.log(`✅ Successfully sent ${notificationsToInsert.length} notifications`);

    return new Response(
      JSON.stringify({
        success: true,
        notificationsSent: notificationsToInsert.length,
        message: notificationMessage
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in send-class-event-update-notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
