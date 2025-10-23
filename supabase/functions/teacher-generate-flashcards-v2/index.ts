import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header');
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('User authentication failed:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ User validation: SUCCESS, user_id:', user.id);

    const { lectureId } = await req.json();
    if (!lectureId) {
      return new Response(JSON.stringify({ error: 'lectureId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar ownership da lecture
    const { data: lecture, error: lectureError } = await supabaseClient
      .from('lectures')
      .select('id, teacher_id, title, raw_transcript')
      .eq('id', lectureId)
      .single();

    if (lectureError || !lecture) {
      console.error('Lecture not found:', lectureError);
      return new Response(JSON.stringify({ error: 'Lecture not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (lecture.teacher_id !== user.id) {
      console.error('Unauthorized: User does not own this lecture');
      return new Response(JSON.stringify({ error: 'Unauthorized to access this lecture' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ Lecture ownership verified, creating job...');

    // Criar job na tabela teacher_jobs
    const { data: job, error: jobError } = await supabaseClient
      .from('teacher_jobs')
      .insert({
        teacher_id: user.id,
        lecture_id: lectureId,
        job_type: 'GENERATE_FLASHCARDS',
        status: 'PENDING',
        input_payload: {
          title: lecture.title,
          transcript: lecture.raw_transcript
        }
      })
      .select()
      .single();

    if (jobError || !job) {
      console.error('Failed to create job:', jobError);
      return new Response(JSON.stringify({ error: 'Failed to create generation job' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ Job created successfully:', job.id);

    // Invocar teacher-job-runner de forma assíncrona (fire-and-forget)
    supabaseClient.functions.invoke('teacher-job-runner', {
      body: { jobId: job.id }
    }).catch(err => {
      console.error('Error invoking job runner:', err);
    });

    console.log('🚀 Job runner invoked for job:', job.id);

    return new Response(
      JSON.stringify({
        success: true,
        jobId: job.id,
        message: 'Flashcards generation started. You will be notified when complete.'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in teacher-generate-flashcards-v2:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});