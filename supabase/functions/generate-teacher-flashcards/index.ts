import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { lectureId, content, title } = await req.json();

    if (!lectureId || !content) {
      throw new Error('lectureId and content are required');
    }

    // Verify lecture ownership
    const { data: lecture, error: lectureError } = await supabaseClient
      .from('lectures')
      .select('teacher_id, title')
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

    const systemPrompt = `You are an expert in creating technical flashcards for engineering students. Generate comprehensive flashcards based on lecture content.

Requirements:
- 15-20 flashcards total
- Categories distribution:
  * Definitions (40%) - key terms and concepts
  * Formulas (30%) - equations and calculations
  * Applications (20%) - practical use cases
  * Problem-Solving (10%) - example problems

Each flashcard must have:
- A clear, concise front (question/prompt)
- A detailed back (answer/explanation)
- Category classification
- Difficulty level (Fácil, Médio, Difícil)

For formulas: include variable definitions and units
For applications: include real-world context
For problem-solving: include step-by-step solution

Return ONLY a valid JSON object:
{
  "cards": [
    {
      "front": "question or term",
      "back": "answer or definition",
      "category": "Definições|Fórmulas|Aplicações|Resolução de Problemas",
      "difficulty": "Fácil|Médio|Difícil"
    }
  ]
}`;

    const userPrompt = `Lecture: ${title || lecture.title}

Content:
${typeof content === 'string' ? content : JSON.stringify(content)}

Generate comprehensive flashcards following the requirements.`;

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
          { role: 'user', content: userPrompt }
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

    // Parse flashcards
    let flashcardsData;
    const jsonMatch = content_text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      flashcardsData = JSON.parse(jsonMatch[0]);
    } else {
      flashcardsData = JSON.parse(content_text);
    }

    // Save to database
    const { data: flashcards, error: insertError } = await supabaseClient
      .from('teacher_flashcards')
      .insert({
        lecture_id: lectureId,
        teacher_id: user.id,
        title: `Flashcards: ${title || lecture.title}`,
        cards: flashcardsData.cards
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw new Error('Failed to save flashcards');
    }

    return new Response(
      JSON.stringify({ flashcards }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-teacher-flashcards:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});