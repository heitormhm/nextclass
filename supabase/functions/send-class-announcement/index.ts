import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { classId, message } = await req.json();

    console.log('Sending announcement to class:', classId);

    if (!classId || !message) {
      throw new Error('Class ID and message are required');
    }

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Verify the teacher owns this class
    const { data: classData, error: classError } = await supabaseClient
      .from('classes')
      .select('teacher_id, name, course')
      .eq('id', classId)
      .single();

    if (classError || !classData) {
      throw new Error('Class not found');
    }

    if (classData.teacher_id !== user.id) {
      throw new Error('Unauthorized: You do not own this class');
    }

    // For now, we'll log the announcement
    // In a complete implementation, you would:
    // 1. Get all students enrolled in this class
    // 2. Create notification records for each student
    // 3. Optionally send emails/push notifications

    console.log('Announcement details:', {
      classId,
      className: classData.name,
      course: classData.course,
      message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
      sentBy: user.id,
      timestamp: new Date().toISOString(),
    });

    // TODO: Implement student notification system when students table is ready
    // const { data: students, error: studentsError } = await supabaseClient
    //   .from('student_enrollments')
    //   .select('student_id')
    //   .eq('class_id', classId);
    //
    // if (!studentsError && students) {
    //   for (const student of students) {
    //     await supabaseClient.from('notifications').insert({
    //       user_id: student.student_id,
    //       type: 'class_announcement',
    //       title: `Novo anúncio: ${classData.name}`,
    //       message: message,
    //       class_id: classId,
    //     });
    //   }
    // }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Announcement sent successfully',
        classId,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in send-class-announcement:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred while sending the announcement';
    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
