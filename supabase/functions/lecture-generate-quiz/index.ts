/**
 * Lecture-specific Quiz Generation (isolated from teacher routes)
 * Direct call - no job polling
 */
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
    console.log('[lecture-generate-quiz] Request received');

    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      return new Response(JSON.stringify({ 
        error: 'No authorization header'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ 
        error: 'Invalid authorization header format'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ 
        error: 'Invalid or expired authentication token'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { lectureId } = await req.json();
    if (!lectureId) {
      return new Response(JSON.stringify({ error: 'lectureId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify lecture ownership
    const { data: lecture, error: lectureError } = await supabaseAdmin
      .from('lectures')
      .select('id, teacher_id, title, raw_transcript')
      .eq('id', lectureId)
      .eq('teacher_id', user.id)
      .single();

    if (lectureError || !lecture) {
      return new Response(JSON.stringify({ 
        error: 'Lecture not found or unauthorized' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create job
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
      return new Response(JSON.stringify({ error: 'Failed to create generation job' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Invoke job runner asynchronously
    supabaseAdmin.functions.invoke('teacher-job-runner', {
      body: { jobId: job.id }
    }).catch(err => {
      console.error('[lecture-generate-quiz] Error invoking job runner:', err);
    });

    return new Response(
      JSON.stringify({
        success: true,
        jobId: job.id,
        message: 'Quiz generation started'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[lecture-generate-quiz] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
