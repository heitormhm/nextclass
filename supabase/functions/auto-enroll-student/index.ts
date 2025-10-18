import { createClient } from 'https://esm.sh/@supabase/supabase-js';

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

    // Step 1: Get user role from user_roles table
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (roleError) {
      console.error('Error fetching user role:', roleError);
      throw new Error('Failed to fetch user role');
    }

    // Step 2: Only proceed if user is a student
    if (roleData.role !== 'student') {
      console.log('User is not a student, skipping auto-enrollment');
      return new Response(
        JSON.stringify({ message: 'User is not a student, no enrollment needed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Step 3: Get user period from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('period')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
      throw new Error('Failed to fetch user data');
    }

    console.log('Student period:', userData.period);

    // Step 4: Find the standard turma for this period (fixed turmas only)
    const { data: turma, error: turmaError } = await supabase
      .from('turmas')
      .select('id, nome_turma')
      .eq('periodo', userData.period)
      .eq('curso', 'Engenharia')
      .eq('faculdade', 'Centro Universitário Afya Montes Claros')
      .maybeSingle();

    if (turmaError) {
      console.error('Error finding turma:', turmaError);
      throw new Error('Failed to find turma');
    }

    if (!turma) {
      console.error(`No standard turma found for period ${userData.period}`);
      throw new Error(`Turma não encontrada para o período ${userData.period}. Entre em contato com o suporte.`);
    }

    console.log('Found standard turma:', turma.nome_turma, 'ID:', turma.id);

    // Step 5: Check if already enrolled
    const { data: existingEnrollment } = await supabase
      .from('turma_enrollments')
      .select('id')
      .eq('aluno_id', userId)
      .eq('turma_id', turma.id)
      .maybeSingle();

    if (existingEnrollment) {
      console.log('Student already enrolled in this turma');
      return new Response(
        JSON.stringify({ 
          message: 'Student already enrolled', 
          turmaId: turma.id,
          nomeTurma: turma.nome_turma
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Step 6: Enroll student in the standard turma
    const { error: enrollmentError } = await supabase
      .from('turma_enrollments')
      .insert({
        aluno_id: userId,
        turma_id: turma.id
      });

    if (enrollmentError) {
      console.error('Error enrolling student:', enrollmentError);
      throw new Error('Failed to enroll student');
    }

    console.log('Student successfully enrolled in turma:', turma.id);

    return new Response(
      JSON.stringify({ 
        message: 'Student successfully enrolled in standard turma',
        turmaId: turma.id,
        nomeTurma: turma.nome_turma
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