import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

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

    // Get the authenticated user from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('Error getting user:', userError);
      throw new Error('Unauthorized');
    }

    console.log('Fetching classes for student:', user.id);

    // Step 1: Get the student's enrolled turmas
    const { data: enrollments, error: enrollmentError } = await supabase
      .from('turma_enrollments')
      .select('turma_id')
      .eq('aluno_id', user.id);

    if (enrollmentError) {
      console.error('Error fetching enrollments:', enrollmentError);
      throw enrollmentError;
    }

    if (!enrollments || enrollments.length === 0) {
      console.log('No enrollments found for student');
      return new Response(
        JSON.stringify({ classes: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const turmaIds = enrollments.map(e => e.turma_id);
    console.log('Student enrolled in turmas:', turmaIds);

    // Step 2: Get lectures DIRECTLY by turma_id
    const { data: lectures, error: lecturesError } = await supabase
      .from('lectures')
      .select(`
        id,
        title,
        duration,
        created_at,
        turma_id,
        teacher_id,
        status,
        structured_content
      `)
      .in('turma_id', turmaIds)
      .eq('status', 'published');

    if (lecturesError) {
      console.error('Error fetching lectures:', lecturesError);
      throw lecturesError;
    }

    if (!lectures || lectures.length === 0) {
      console.log('No published lectures found for enrolled turmas');
      return new Response(
        JSON.stringify({ classes: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found', lectures.length, 'published lectures');

    // Step 5: Get teacher information for each lecture
    const teacherIds = [...new Set(lectures.map(l => l.teacher_id))];
    const { data: teachers, error: teachersError } = await supabase
      .from('users')
      .select('id, full_name')
      .in('id', teacherIds);

    if (teachersError) {
      console.error('Error fetching teachers:', teachersError);
    }

    const teacherMap = new Map(teachers?.map(t => [t.id, t.full_name]) || []);

    // Step 4: Get turmas info for lecture topics
    const { data: turmasData, error: turmasError } = await supabase
      .from('turmas')
      .select('id, nome_turma, curso')
      .in('id', turmaIds);

    if (turmasError) {
      console.error('Error fetching turmas:', turmasError);
    }

    const turmaMap = new Map(turmasData?.map(t => [t.id, { name: t.nome_turma, course: t.curso }]) || []);

    // Step 5: Format the response
    const formattedClasses = lectures.map((lecture, index) => {
      const turmaInfo = turmaMap.get(lecture.turma_id);
      
      // Extract thumbnail from structured_content if available
      let thumbnail = '';
      if (lecture.structured_content?.sections?.[0]?.image) {
        thumbnail = lecture.structured_content.sections[0].image;
      }
      
      return {
        id: lecture.id,
        lessonNumber: `Aula ${index + 1}`,
        title: lecture.title,
        instructor: teacherMap.get(lecture.teacher_id) || 'Professor Desconhecido',
        duration: lecture.duration ? `${lecture.duration} min` : '45 min',
        progress: 0,
        thumbnail: thumbnail,
        topic: turmaInfo?.course || 'Engenharia',
        type: 'online',
        turmaId: lecture.turma_id,
        className: turmaInfo?.name || 'Sem turma'
      };
    });

    console.log('Returning', formattedClasses.length, 'classes');

    return new Response(
      JSON.stringify({ classes: formattedClasses }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-student-classes:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});