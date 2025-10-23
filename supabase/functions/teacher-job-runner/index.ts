import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function sanitizeJSON(text: string): string {
  return text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId } = await req.json();
    if (!jobId) {
      console.error('No jobId provided');
      return new Response(JSON.stringify({ error: 'jobId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('🔄 Processing job:', jobId);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar job
    const { data: job, error: jobError } = await supabaseAdmin
      .from('teacher_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      console.error('Job not found:', jobError);
      return new Response(JSON.stringify({ error: 'Job not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ Job found:', job.job_type, 'Status:', job.status);

    // Atualizar status para PROCESSING
    await supabaseAdmin
      .from('teacher_jobs')
      .update({ status: 'PROCESSING', updated_at: new Date().toISOString() })
      .eq('id', jobId);

    console.log('🔄 Job status updated to PROCESSING');

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const { title, transcript } = job.input_payload;

    let systemPrompt = '';
    let userPrompt = '';

    if (job.job_type === 'GENERATE_QUIZ') {
      systemPrompt = `Você é um assistente especializado em criar questões de múltipla escolha para avaliação em cursos de engenharia, seguindo rigorosamente a Taxonomia de Bloom.

INSTRUÇÕES CRÍTICAS:
1. Use APENAS o conteúdo fornecido na transcrição
2. Responda em português brasileiro
3. Retorne APENAS JSON válido, sem markdown
4. Crie 10 questões de múltipla escolha
5. Cada questão deve ter 4 alternativas (A, B, C, D)
6. Identifique corretamente a alternativa correta
7. Classifique cada questão segundo Bloom (Conhecimento, Compreensão, Aplicação, Análise, Síntese, Avaliação)

FORMATO JSON:
{
  "questions": [
    {
      "question": "Texto da pergunta",
      "options": {
        "A": "Texto alternativa A",
        "B": "Texto alternativa B",
        "C": "Texto alternativa C",
        "D": "Texto alternativa D"
      },
      "correctAnswer": "A",
      "bloomLevel": "Aplicação",
      "explanation": "Explicação detalhada"
    }
  ]
}`;

      userPrompt = `Baseado nesta aula de engenharia sobre "${title}", crie 10 questões de múltipla escolha:

Transcrição da aula:
${transcript}

IMPORTANTE: Retorne APENAS o JSON, sem texto adicional.`;

    } else if (job.job_type === 'GENERATE_FLASHCARDS') {
      systemPrompt = `Você é um assistente especializado em criar flashcards educacionais para cursos de engenharia.

INSTRUÇÕES CRÍTICAS:
1. Use APENAS o conteúdo fornecido na transcrição
2. Responda em português brasileiro
3. Retorne APENAS JSON válido, sem markdown
4. Crie 15 flashcards
5. Cada flashcard deve ter frente (pergunta/conceito) e verso (resposta/explicação)
6. Inclua tags relevantes para organização

FORMATO JSON:
{
  "cards": [
    {
      "front": "Pergunta ou conceito",
      "back": "Resposta ou explicação detalhada",
      "tags": ["tag1", "tag2"]
    }
  ]
}`;

      userPrompt = `Baseado nesta aula de engenharia sobre "${title}", crie 15 flashcards:

Transcrição da aula:
${transcript}

IMPORTANTE: Retorne APENAS o JSON, sem texto adicional.`;
    }

    console.log('🤖 Calling Lovable AI with 120s timeout...');

    // Chamar Lovable AI com timeout de 120s
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    let aiResponse;
    try {
      aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
        }),
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('AI request timed out after 120 seconds');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }

    console.log('✅ AI response status:', aiResponse.status);

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (aiResponse.status === 402) {
        throw new Error('Payment required. Please add credits to your Lovable AI workspace.');
      }
      throw new Error(`AI API error: ${aiResponse.status} ${errorText}`);
    }

    const aiData = await aiResponse.json();
    console.log('📦 AI response received, parsing content...');

    const content = aiData.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No content in AI response');
    }

    const sanitized = sanitizeJSON(content);
    console.log('🧹 Content sanitized, parsing JSON...');

    const parsedData = JSON.parse(sanitized);

    // Validar estrutura
    if (job.job_type === 'GENERATE_QUIZ') {
      if (!parsedData.questions || !Array.isArray(parsedData.questions)) {
        throw new Error('Invalid quiz structure: missing questions array');
      }
      
      console.log(`✅ Quiz validated (${parsedData.questions.length} questions), saving to database...`);

      // Deletar quiz existente
      await supabaseAdmin
        .from('teacher_quizzes')
        .delete()
        .eq('lecture_id', job.lecture_id);

      // Inserir novo quiz
      const { error: insertError } = await supabaseAdmin
        .from('teacher_quizzes')
        .insert({
          lecture_id: job.lecture_id,
          teacher_id: job.teacher_id,
          title: `Quiz - ${title}`,
          questions: parsedData.questions
        });

      if (insertError) {
        throw new Error(`Failed to save quiz: ${insertError.message}`);
      }

      console.log('💾 Quiz saved successfully');

    } else if (job.job_type === 'GENERATE_FLASHCARDS') {
      if (!parsedData.cards || !Array.isArray(parsedData.cards)) {
        throw new Error('Invalid flashcards structure: missing cards array');
      }

      console.log(`✅ Flashcards validated (${parsedData.cards.length} cards), saving to database...`);

      // Deletar flashcards existentes
      await supabaseAdmin
        .from('teacher_flashcards')
        .delete()
        .eq('lecture_id', job.lecture_id);

      // Inserir novos flashcards
      const { error: insertError } = await supabaseAdmin
        .from('teacher_flashcards')
        .insert({
          lecture_id: job.lecture_id,
          teacher_id: job.teacher_id,
          title: `Flashcards - ${title}`,
          cards: parsedData.cards
        });

      if (insertError) {
        throw new Error(`Failed to save flashcards: ${insertError.message}`);
      }

      console.log('💾 Flashcards saved successfully');
    }

    // Marcar job como COMPLETED
    await supabaseAdmin
      .from('teacher_jobs')
      .update({
        status: 'COMPLETED',
        result_payload: parsedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    console.log('🎉 Job completed successfully:', jobId);

    return new Response(
      JSON.stringify({ success: true, message: 'Job completed successfully' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ Error in teacher-job-runner:', error);

    // Tentar marcar job como FAILED
    try {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { jobId } = await req.json();
      if (jobId) {
        await supabaseAdmin
          .from('teacher_jobs')
          .update({
            status: 'FAILED',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId);
      }
    } catch (updateError) {
      console.error('Failed to update job status:', updateError);
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});