import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId } = await req.json();

    console.log('Auto-enrolling student:', userId);

    // Step 1: Get user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, course, period, university, city')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
      throw new Error('Failed to fetch user data');
    }

    // Step 2: Only proceed if user is a student
    if (userData.role !== 'student') {
      console.log('User is not a student, skipping auto-enrollment');
      return new Response(
        JSON.stringify({ message: 'User is not a student, no enrollment needed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Step 3: Build turma name
    const nomeTurma = `${userData.course} - ${userData.period}º Período - ${userData.university}`;
    console.log('Looking for turma:', nomeTurma);

    // Step 4: Check if turma exists
    let turmaId: string;
    const { data: existingTurma, error: turmaFetchError } = await supabase
      .from('turmas')
      .select('id')
      .eq('nome_turma', nomeTurma)
      .maybeSingle();

    if (turmaFetchError) {
      console.error('Error checking turma existence:', turmaFetchError);
      throw new Error('Failed to check turma existence');
    }

    if (existingTurma) {
      // Turma exists, use its id
      turmaId = existingTurma.id;
      console.log('Turma already exists with id:', turmaId);
    } else {
      // Step 5: Create new turma
      console.log('Creating new turma:', nomeTurma);
      const { data: newTurma, error: createError } = await supabase
        .from('turmas')
        .insert({
          nome_turma: nomeTurma,
          curso: userData.course,
          periodo: userData.period,
          faculdade: userData.university,
          cidade: userData.city
        })
        .select('id')
        .single();

      if (createError) {
        console.error('Error creating turma:', createError);
        throw new Error('Failed to create turma');
      }

      turmaId = newTurma.id;
      console.log('New turma created with id:', turmaId);
    }

    // Step 6: Enroll student in turma
    const { error: enrollmentError } = await supabase
      .from('turma_enrollments')
      .insert({
        aluno_id: userId,
        turma_id: turmaId
      });

    if (enrollmentError) {
      // Check if it's a duplicate enrollment error
      if (enrollmentError.code === '23505') {
        console.log('Student already enrolled in this turma');
        return new Response(
          JSON.stringify({ message: 'Student already enrolled', turmaId }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
      console.error('Error enrolling student:', enrollmentError);
      throw new Error('Failed to enroll student');
    }

    console.log('Student successfully enrolled in turma:', turmaId);

    return new Response(
      JSON.stringify({ 
        message: 'Student successfully enrolled',
        turmaId,
        nomeTurma
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in auto-enroll-student function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});