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
    console.group('[teacher-generate-flashcards-v2] 📥 Request received');
    console.log('Method:', req.method);
    console.log('Headers:', Object.fromEntries(req.headers.entries()));
    console.groupEnd();

    const authHeader = req.headers.get('Authorization');
    
    console.log('[teacher-generate-flashcards-v2] 🔐 Auth header present:', !!authHeader);
    console.log('[teacher-generate-flashcards-v2] 🔐 Auth header value (first 20 chars):', authHeader?.substring(0, 20));
    
    if (!authHeader) {
      console.error('[teacher-generate-flashcards-v2] ❌ No authorization header');
      return new Response(JSON.stringify({ 
        error: 'No authorization header',
        hint: 'Make sure you are logged in and session is active'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar formato do header
    if (!authHeader.startsWith('Bearer ')) {
      console.error('[teacher-generate-flashcards-v2] ❌ Invalid authorization header format');
      return new Response(JSON.stringify({ 
        error: 'Invalid authorization header format',
        hint: 'Header must start with "Bearer "'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[teacher-generate-flashcards-v2] 🔐 Creating auth client for user validation...');

    // Client para autenticação do usuário (usa ANON_KEY)
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Client para operações internas (usa SERVICE_ROLE_KEY)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      console.error('[teacher-generate-flashcards-v2] ❌ User authentication failed:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[teacher-generate-flashcards-v2] ✅ User validation: SUCCESS, user_id:', user.id);

    const { lectureId } = await req.json();
    if (!lectureId) {
      return new Response(JSON.stringify({ error: 'lectureId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar ownership da lecture (usa client com auth do usuário)
    console.log('[teacher-generate-flashcards-v2] 🔍 Verifying lecture ownership...');
    
    const { data: lecture, error: lectureError } = await supabaseAuth
      .from('lectures')
      .select('id, teacher_id, title, raw_transcript')
      .eq('id', lectureId)
      .single();

    if (lectureError || !lecture) {
      console.error('[teacher-generate-flashcards-v2] ❌ Lecture not found:', lectureError);
      return new Response(JSON.stringify({ error: 'Lecture not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (lecture.teacher_id !== user.id) {
      console.error('[teacher-generate-flashcards-v2] ❌ Unauthorized: User does not own this lecture');
      return new Response(JSON.stringify({ error: 'Unauthorized to access this lecture' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[teacher-generate-flashcards-v2] ✅ Lecture ownership verified, creating job...');

    // Criar job na tabela teacher_jobs (usa admin client com SERVICE_ROLE_KEY)
    console.log('[teacher-generate-flashcards-v2] 💾 Creating job in database...');
    
    const { data: job, error: jobError } = await supabaseAdmin
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
      console.error('[teacher-generate-flashcards-v2] ❌ Failed to create job:', jobError);
      return new Response(JSON.stringify({ error: 'Failed to create generation job' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[teacher-generate-flashcards-v2] ✅ Job created successfully:', job.id);

    // Invocar teacher-job-runner de forma assíncrona (usa admin client)
    console.log('[teacher-generate-flashcards-v2] 🚀 Invoking teacher-job-runner...');
    
    supabaseAdmin.functions.invoke('teacher-job-runner', {
      body: { jobId: job.id }
    }).catch(err => {
      console.error('[teacher-generate-flashcards-v2] ⚠️ Error invoking job runner:', err);
    });

    console.log('[teacher-generate-flashcards-v2] 🎉 Job runner invoked for job:', job.id);

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