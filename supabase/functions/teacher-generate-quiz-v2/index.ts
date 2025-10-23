import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Sanitization function (from job-runner)
function sanitizeJSON(text: string): string {
  return text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    console.log('🔐 Auth header:', authHeader ? `Present (length: ${authHeader.length})` : 'MISSING');
    
    if (!authHeader) {
      console.error('❌ No Authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Extrair token limpo (sem "Bearer ")
    const token = authHeader.replace('Bearer ', '');
    console.log('🔑 Token extracted (first 20 chars):', token.substring(0, 20) + '...');

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    console.log('👤 User validation:', user ? `✅ SUCCESS (ID: ${user.id}, Email: ${user.email})` : '❌ FAILED');
    
    if (userError) {
      console.error('❌ User error details:', {
        name: userError.name,
        message: userError.message,
        status: userError.status
      });
    }
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid token',
          details: userError?.message || 'User not found'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { lectureId, title } = await req.json();

    if (!lectureId) {
      throw new Error('lectureId is required');
    }

    // Verify lecture ownership
    const { data: lecture, error: lectureError } = await supabaseClient
      .from('lectures')
      .select('teacher_id, title, raw_transcript')
      .eq('id', lectureId)
      .single();

    if (lectureError || !lecture || lecture.teacher_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized or lecture not found' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Use raw transcript (more reliable than structured_content)
    const contextText = lecture.raw_transcript?.substring(0, 3000) || '';
    const topicText = title || lecture.title || 'Conteúdo de Engenharia';

    console.log('🎯 Starting quiz generation process');
    console.log(`📝 Generating quiz for lecture: ${lecture.title}`);
    console.log(`📚 Context length: ${contextText.length} chars`);
    console.log(`🤖 Calling Lovable AI...`);

    const systemPrompt = `🇧🇷 CRITICAL: You MUST generate ALL content in BRAZILIAN PORTUGUESE (pt-BR).

⚠️ **RESTRIÇÃO CRÍTICA**: Você DEVE gerar um quiz baseado EXCLUSIVAMENTE no conteúdo fornecido. É PROIBIDO usar qualquer conhecimento externo.

Você é um criador de quizzes educacionais para engenharia em PORTUGUÊS DO BRASIL.
Gere 6-10 perguntas de múltipla escolha baseadas SOMENTE no conteúdo fornecido.

⚠️ IDIOMA OBRIGATÓRIO: 
- TODO texto deve estar em português do Brasil
- Perguntas em português
- Todas as 4 opções de resposta em português
- Explicações em português
- NUNCA use inglês

⚠️ REGRAS CRÍTICAS DE FORMATAÇÃO:
1. Retorne APENAS o JSON puro, sem markdown (sem \`\`\`json)
2. Use aspas duplas escapadas corretamente
3. NÃO use quebras de linha dentro de strings
4. Use caracteres UTF-8 (acentos corretos: á, é, í, ó, ú, ã, õ, ç)

FORMATO JSON OBRIGATÓRIO:
{
  "questions": [
    {
      "question": "O que é pressão hidrostática?",
      "options": [
        "Pressão exercida por um fluido em repouso",
        "Pressão de um gás em movimento",
        "Força aplicada em uma superfície sólida",
        "Energia potencial de um líquido"
      ],
      "correctAnswer": 0,
      "explanation": "A pressão hidrostática é a pressão exercida por um fluido em repouso devido ao seu peso."
    }
  ]
}`;

    // Generate quiz with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    let response;
    try {
      response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Tópico: ${topicText}\n\nConteúdo da aula:\n${contextText}` }
          ],
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('❌ Timeout: AI generation took too long');
        throw new Error('Timeout: A geração está demorando muito. Tente novamente com um conteúdo menor.');
      }
      throw error;
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`AI service error: ${response.status}`);
    }
    
    console.log('✅ AI response received');

    const data = await response.json();
    const content_text = data.choices?.[0]?.message?.content;

    if (!content_text) {
      throw new Error('No response from AI');
    }

    console.log('📄 Raw AI response (first 300 chars):', content_text.substring(0, 300));
    console.log('🔍 Parsing JSON...');

    // Sanitize and extract JSON
    const sanitized = sanitizeJSON(content_text);
    const jsonMatch = sanitized.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      console.error('❌ No JSON found in response');
      throw new Error('Failed to extract quiz data from AI response');
    }

    let quizData;
    try {
      quizData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      throw new Error('Invalid JSON format from AI');
    }

    // Validate structure
    if (!quizData.questions || !Array.isArray(quizData.questions) || quizData.questions.length === 0) {
      console.error('❌ Invalid quiz structure:', quizData);
      throw new Error('Quiz generated with no questions');
    }

    console.log(`✅ Validated quiz with ${quizData.questions.length} questions`);
    console.log('💾 Deleting old quiz (if exists)...');

    // Delete existing quiz (if any)
    await supabaseClient
      .from('teacher_quizzes')
      .delete()
      .eq('lecture_id', lectureId)
      .eq('teacher_id', user.id);
    
    console.log('💾 Inserting new quiz...');

    // Insert new quiz
    const { data: quiz, error: insertError } = await supabaseClient
      .from('teacher_quizzes')
      .insert({
        lecture_id: lectureId,
        teacher_id: user.id,
        title: `Quiz: ${topicText}`,
        questions: quizData.questions
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw new Error(`Failed to save quiz: ${insertError.message}`);
    }

    console.log(`✅ Quiz saved with ID: ${quiz.id}, ${quizData.questions.length} questions`);
    console.log('🎉 Quiz generation complete!');

    return new Response(
      JSON.stringify({ 
        quiz,
        questionCount: quizData.questions.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in teacher-generate-quiz-v2:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
