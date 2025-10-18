import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";
import { Resend } from "https://esm.sh/resend@2.0.0";

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
  endTime: string;
  eventType: 'online' | 'presencial';
  location: string | null;
  category: string;
  teacherName: string;
  subjectName: string | null;
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
    const { 
      eventId, 
      classId, 
      title, 
      eventDate, 
      startTime, 
      endTime,
      eventType,
      location,
      category,
      teacherName,
      subjectName,
      notifyPlatform, 
      notifyEmail 
    } = payload;

    console.log('[send-class-event-notification] Processing:', { 
      eventId, 
      classId, 
      notifyPlatform, 
      notifyEmail 
    });

    // Buscar turma + professor com JOIN otimizado
    const { data: turma, error: turmaError } = await supabase
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
      .eq('id', classId)
      .single();

    if (turmaError) {
      console.error('[send-class-event-notification] Error fetching turma:', turmaError);
      throw turmaError;
    }

    // Validação crítica: verificar se teacher_id existe
    if (!turma.teacher_id) {
      console.error('❌ CRÍTICO: Turma sem teacher_id vinculado!', {
        classId,
        nome_turma: turma.nome_turma
      });
    }

    const teacherData = turma.users as any;
    const teacherFullName = teacherData?.full_name || teacherName || 'Professor(a)';
    const teacherEmail = teacherData?.email || '';
    console.log('✅ Teacher info loaded:', {
      teacherId: turma.teacher_id,
      teacherName: teacherFullName,
      teacherEmail
    });

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

    // Generate AI message using Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    let aiGeneratedMessage = '';

    if (LOVABLE_API_KEY) {
      try {
        const formattedDate = new Date(eventDate).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });

        const prompt = `Gere uma mensagem de notificação concisa e profissional para alunos sobre um novo evento no calendário acadêmico.

Informações do evento:
- Professor: ${teacherFullName}
- Disciplina: ${subjectName || 'Não especificada'}
- Título do evento: ${title}
- Tipo: ${eventType === 'presencial' ? 'Presencial' : 'Online'}
${eventType === 'presencial' && location ? `- Local: ${location}` : ''}
- Data: ${formattedDate}
- Horário: ${startTime} às ${endTime}
- Categoria: ${category}
- Turma: ${turma.nome_turma}

A mensagem deve ter no máximo 150 caracteres, ser clara e incluir as informações mais relevantes. Use tom formal mas acessível. Escreva apenas a mensagem, sem introdução ou conclusão.`;

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { 
                role: 'system', 
                content: 'Você é um assistente que gera mensagens de notificação acadêmica concisas e profissionais em português do Brasil.' 
              },
              { role: 'user', content: prompt }
            ],
            temperature: 0.7,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          aiGeneratedMessage = aiData.choices?.[0]?.message?.content?.trim() || '';
          console.log('[send-class-event-notification] AI message generated:', aiGeneratedMessage);
        } else {
          console.error('[send-class-event-notification] AI API error:', await aiResponse.text());
        }
      } catch (aiError) {
        console.error('[send-class-event-notification] Error generating AI message:', aiError);
      }
    }

    // Fallback message if AI fails
    if (!aiGeneratedMessage) {
      const formattedDate = new Date(eventDate).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit'
      });
      
      aiGeneratedMessage = `${category} de ${subjectName || title} com ${teacherFullName} em ${formattedDate} às ${startTime}${eventType === 'presencial' && location ? ` no ${location}` : ' (online)'}.`;
    }

    let platformNotificationsSent = 0;
    let emailNotificationsSent = 0;

    // Enviar notificações na plataforma
    if (notifyPlatform) {
      const notificationsToInsert = students.map((student: any) => ({
        user_id: student.id,
        title: `Novo Evento: ${title}`,
        message: aiGeneratedMessage,
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

    // Enviar notificações por email
    if (notifyEmail) {
      const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
      
      if (!RESEND_API_KEY) {
        console.error('[send-class-event-notification] RESEND_API_KEY not configured');
      } else {
        const resend = new Resend(RESEND_API_KEY);
        const emailsToSend = students.filter((s: any) => s.email_notifications && s.email);
        
        console.log(`[send-class-event-notification] Sending emails to ${emailsToSend.length} students`);

        for (const student of emailsToSend) {
          try {
            const emailHtml = `
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="utf-8">
                  <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                    .event-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
                    .detail-row { margin: 10px 0; }
                    .detail-label { font-weight: bold; color: #667eea; }
                    .cta-button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h1>📅 Nova Atualização no Calendário</h1>
                    </div>
                    <div class="content">
                      <p>Olá, <strong>${student.full_name}</strong>!</p>
                      
                      <p>${aiGeneratedMessage}</p>
                      
                      <div class="event-details">
                        <h2 style="margin-top: 0; color: #667eea;">Detalhes do Evento</h2>
                        <div class="detail-row">
                          <span class="detail-label">Título:</span> ${title}
                        </div>
                        <div class="detail-row">
                          <span class="detail-label">Professor:</span> ${teacherFullName}
                        </div>
                        ${subjectName ? `
                        <div class="detail-row">
                          <span class="detail-label">Disciplina:</span> ${subjectName}
                        </div>
                        ` : ''}
                        <div class="detail-row">
                          <span class="detail-label">Categoria:</span> ${category}
                        </div>
                        <div class="detail-row">
                          <span class="detail-label">Tipo:</span> ${eventType === 'presencial' ? '📍 Presencial' : '💻 Online'}
                        </div>
                        ${location ? `
                        <div class="detail-row">
                          <span class="detail-label">Local:</span> ${location}
                        </div>
                        ` : ''}
                        <div class="detail-row">
                          <span class="detail-label">Data:</span> ${new Date(eventDate).toLocaleDateString('pt-BR', { 
                            day: '2-digit', 
                            month: 'long', 
                            year: 'numeric' 
                          })}
                        </div>
                        <div class="detail-row">
                          <span class="detail-label">Horário:</span> ${startTime} às ${endTime}
                        </div>
                      </div>
                      
                      <center>
                        <a href="${Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '')}/calendar" class="cta-button">
                          Ver no Calendário
                        </a>
                      </center>
                      
                      <p style="margin-top: 20px; font-size: 14px; color: #666;">
                        Este evento foi adicionado ao calendário da turma <strong>${turma.nome_turma}</strong>.
                      </p>
                    </div>
                    <div class="footer">
                      <p>Você está recebendo este e-mail porque está matriculado na turma ${turma.nome_turma}.</p>
                      <p>Para gerenciar suas preferências de notificação, acesse as configurações da sua conta.</p>
                    </div>
                  </div>
                </body>
              </html>
            `;

            const { error: emailError } = await resend.emails.send({
              from: 'NextDoc <onboarding@resend.dev>',
              to: [student.email],
              subject: 'Nova Atualização no Calendário',
              html: emailHtml,
            });

            if (emailError) {
              console.error(`[send-class-event-notification] Error sending email to ${student.email}:`, emailError);
            } else {
              emailNotificationsSent++;
              console.log(`[send-class-event-notification] Email sent to ${student.email}`);
            }
          } catch (emailError) {
            console.error(`[send-class-event-notification] Exception sending email to ${student.email}:`, emailError);
          }
        }

        console.log(`[send-class-event-notification] Successfully sent ${emailNotificationsSent} emails`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        studentsNotified: students.length,
        platformNotificationsSent,
        emailNotificationsSent
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
