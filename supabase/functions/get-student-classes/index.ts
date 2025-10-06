import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

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

    // Step 2: Get the turmas details
    const { data: turmas, error: turmasError } = await supabase
      .from('turmas')
      .select('curso, periodo')
      .in('id', turmaIds);

    if (turmasError) {
      console.error('Error fetching turmas:', turmasError);
      throw turmasError;
    }

    if (!turmas || turmas.length === 0) {
      console.log('No turmas found');
      return new Response(
        JSON.stringify({ classes: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Turmas details:', turmas);

    // Step 3: Find matching classes based on course and period
    const classQueries = turmas.map(turma => 
      supabase
        .from('classes')
        .select('id')
        .eq('course', turma.curso)
        .eq('period', turma.periodo)
    );

    const classResults = await Promise.all(classQueries);
    const classIds: string[] = [];

    classResults.forEach(result => {
      if (result.data) {
        result.data.forEach(c => classIds.push(c.id));
      }
    });

    console.log('Matching class IDs:', classIds);

    if (classIds.length === 0) {
      console.log('No matching classes found');
      return new Response(
        JSON.stringify({ classes: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 4: Get lectures for these classes with teacher info
    const { data: lectures, error: lecturesError } = await supabase
      .from('lectures')
      .select(`
        id,
        title,
        duration,
        created_at,
        class_id,
        teacher_id,
        status
      `)
      .in('class_id', classIds)
      .eq('status', 'completed');

    if (lecturesError) {
      console.error('Error fetching lectures:', lecturesError);
      throw lecturesError;
    }

    if (!lectures || lectures.length === 0) {
      console.log('No lectures found');
      return new Response(
        JSON.stringify({ classes: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // Step 6: Get class information
    const { data: classesData, error: classesError } = await supabase
      .from('classes')
      .select('id, name, course')
      .in('id', classIds);

    if (classesError) {
      console.error('Error fetching classes:', classesError);
    }

    const classMap = new Map(classesData?.map(c => [c.id, { name: c.name, course: c.course }]) || []);

    // Step 7: Format the response
    const formattedClasses = lectures.map((lecture, index) => {
      const classInfo = classMap.get(lecture.class_id);
      return {
        id: lecture.id,
        lessonNumber: `Aula ${index + 1}`,
        title: lecture.title,
        instructor: teacherMap.get(lecture.teacher_id) || 'Professor Desconhecido',
        duration: lecture.duration ? `${lecture.duration} min` : '45 min',
        progress: 0, // TODO: Implement progress tracking
        thumbnail: '', // TODO: Implement thumbnail support
        topic: classInfo?.course || 'Engenharia',
        type: 'online',
        classId: lecture.class_id,
        className: classInfo?.name || 'Sem turma'
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