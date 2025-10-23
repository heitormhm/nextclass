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
    console.group('[teacher-generate-quiz-v2] 📥 Request received');
    console.log('Method:', req.method);
    console.log('Headers:', Object.fromEntries(req.headers.entries()));
    console.groupEnd();

    const authHeader = req.headers.get('Authorization');
    
    console.log('[teacher-generate-quiz-v2] 🔐 Auth header present:', !!authHeader);
    console.log('[teacher-generate-quiz-v2] 🔐 Auth header value (first 20 chars):', authHeader?.substring(0, 20));
    
    if (!authHeader) {
      console.error('[teacher-generate-quiz-v2] ❌ No authorization header');
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
      console.error('[teacher-generate-quiz-v2] ❌ Invalid authorization header format');
      return new Response(JSON.stringify({ 
        error: 'Invalid authorization header format',
        hint: 'Header must start with "Bearer "'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[teacher-generate-quiz-v2] 🔐 Validating JWT token...');

    // ✅ SOLUÇÃO: Usar SERVICE_ROLE_KEY + validar JWT manualmente
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Extrair JWT token do Authorization header
    const token = authHeader.replace('Bearer ', '');

    // Validar JWT usando supabaseAdmin (tem privilégios para isso)
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error('[teacher-generate-quiz-v2] ❌ JWT validation failed:', userError);
      return new Response(JSON.stringify({ 
        error: 'Invalid or expired authentication token',
        details: userError?.message 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[teacher-generate-quiz-v2] ✅ JWT validated successfully, user_id:', user.id);

    const { lectureId } = await req.json();
    if (!lectureId) {
      return new Response(JSON.stringify({ error: 'lectureId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar ownership da lecture usando supabaseAdmin
    console.log('[teacher-generate-quiz-v2] 🔍 Verifying lecture ownership...');
    
    const { data: lecture, error: lectureError } = await supabaseAdmin
      .from('lectures')
      .select('id, teacher_id, title, raw_transcript')
      .eq('id', lectureId)
      .eq('teacher_id', user.id) // ✅ Verificar ownership diretamente na query
      .single();

    if (lectureError || !lecture) {
      console.error('[teacher-generate-quiz-v2] ❌ Lecture not found or unauthorized:', lectureError);
      return new Response(JSON.stringify({ 
        error: 'Lecture not found or you do not have permission to access it' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[teacher-generate-quiz-v2] ✅ Lecture ownership verified, creating job...');

    // Criar job na tabela teacher_jobs (usa admin client com SERVICE_ROLE_KEY)
    console.log('[teacher-generate-quiz-v2] 💾 Creating job in database...');
    
    const { data: job, error: jobError } = await supabaseAdmin
      .from('teacher_jobs')
      .insert({
        teacher_id: user.id,
        lecture_id: lectureId,
        job_type: 'GENERATE_QUIZ',
        status: 'PENDING',
        input_payload: {
          title: lecture.title,
          transcript: lecture.raw_transcript
        }
      })
      .select()
      .single();

    if (jobError || !job) {
      console.error('[teacher-generate-quiz-v2] ❌ Failed to create job:', jobError);
      return new Response(JSON.stringify({ error: 'Failed to create generation job' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[teacher-generate-quiz-v2] ✅ Job created successfully:', job.id);

    // Invocar teacher-job-runner de forma assíncrona (usa admin client)
    console.log('[teacher-generate-quiz-v2] 🚀 Invoking teacher-job-runner...');
    
    supabaseAdmin.functions.invoke('teacher-job-runner', {
      body: { jobId: job.id }
    }).catch(err => {
      console.error('[teacher-generate-quiz-v2] ⚠️ Error invoking job runner:', err);
    });

    console.log('[teacher-generate-quiz-v2] 🎉 Job runner invoked for job:', job.id);

    return new Response(
      JSON.stringify({
        success: true,
        jobId: job.id,
        message: 'Quiz generation started. You will be notified when complete.'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in teacher-generate-quiz-v2:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});