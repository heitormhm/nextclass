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

    console.log(`📝 Generating flashcards for lecture: ${lecture.title}`);
    console.log(`📚 Context length: ${contextText.length} chars`);

    const systemPrompt = `IDIOMA OBRIGATÓRIO: Todos os flashcards devem estar em PORTUGUÊS BRASILEIRO (pt-BR).

Você é um Assistente de Ensino experiente para engenharia. Crie flashcards digitais para memorização.

OBJETIVO: Criar 8-12 flashcards baseados EXCLUSIVAMENTE no conteúdo fornecido.

⚠️ REGRAS CRÍTICAS:
1. Retorne APENAS JSON puro (sem \`\`\`json)
2. TODO conteúdo em português do Brasil
3. Foque em conceitos fundamentais DO CONTEÚDO
4. Use caracteres UTF-8 corretos (á, é, í, ó, ú, ã, õ, ç)

FORMATO JSON OBRIGATÓRIO:
{
  "cards": [
    {
      "front": "Primeira Lei da Termodinâmica",
      "back": "A energia não pode ser criada ou destruída, apenas transformada. ΔU = Q - W",
      "tags": ["termodinâmica", "conservação de energia"]
    }
  ]
}

Gere 8-12 flashcards focados nos fundamentos essenciais DO CONTEÚDO FORNECIDO.`;

    // Generate flashcards
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`AI service error: ${response.status}`);
    }

    const data = await response.json();
    const content_text = data.choices?.[0]?.message?.content;

    if (!content_text) {
      throw new Error('No response from AI');
    }

    console.log('📄 Raw AI response (first 300 chars):', content_text.substring(0, 300));

    // Sanitize and extract JSON
    const sanitized = sanitizeJSON(content_text);
    const jsonMatch = sanitized.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      console.error('❌ No JSON found in response');
      throw new Error('Failed to extract flashcards data from AI response');
    }

    let flashcardsData;
    try {
      flashcardsData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      throw new Error('Invalid JSON format from AI');
    }

    // Validate structure
    if (!flashcardsData.cards || !Array.isArray(flashcardsData.cards) || flashcardsData.cards.length === 0) {
      console.error('❌ Invalid flashcards structure:', flashcardsData);
      throw new Error('Flashcards generated with no cards');
    }

    console.log(`✅ Validated flashcards with ${flashcardsData.cards.length} cards`);

    // Delete existing flashcards (if any)
    await supabaseClient
      .from('teacher_flashcards')
      .delete()
      .eq('lecture_id', lectureId)
      .eq('teacher_id', user.id);

    // Insert new flashcards
    const { data: flashcards, error: insertError } = await supabaseClient
      .from('teacher_flashcards')
      .insert({
        lecture_id: lectureId,
        teacher_id: user.id,
        title: `Flashcards: ${topicText}`,
        cards: flashcardsData.cards
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw new Error(`Failed to save flashcards: ${insertError.message}`);
    }

    console.log(`✅ Flashcards saved with ID: ${flashcards.id}, ${flashcardsData.cards.length} cards`);

    return new Response(
      JSON.stringify({ 
        flashcards,
        cardCount: flashcardsData.cards.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in teacher-generate-flashcards-v2:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
