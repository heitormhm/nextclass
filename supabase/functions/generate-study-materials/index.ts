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
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { content } = await req.json();
    if (!content) {
      return new Response(
        JSON.stringify({ error: 'Content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating study materials for user:', user.id);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate flashcards and quiz questions using tool calling
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente educacional que cria materiais de estudo a partir de anotações.'
          },
          {
            role: 'user',
            content: `Analise estas anotações e gere materiais de estudo:\n\n${content}`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'generate_study_materials',
              description: 'Gera flashcards e perguntas de quiz a partir de conteúdo educacional',
              parameters: {
                type: 'object',
                properties: {
                  flashcards: {
                    type: 'array',
                    description: 'Lista de flashcards gerados',
                    items: {
                      type: 'object',
                      properties: {
                        front: { type: 'string', description: 'Pergunta ou conceito' },
                        back: { type: 'string', description: 'Resposta ou explicação' }
                      },
                      required: ['front', 'back']
                    }
                  },
                  quizQuestions: {
                    type: 'array',
                    description: 'Lista de perguntas de quiz',
                    items: {
                      type: 'object',
                      properties: {
                        question: { type: 'string', description: 'Pergunta do quiz' },
                        options: {
                          type: 'array',
                          description: 'Opções de resposta',
                          items: { type: 'string' }
                        },
                        correctAnswer: { type: 'number', description: 'Índice da resposta correta (0-3)' },
                        explanation: { type: 'string', description: 'Explicação da resposta correta' }
                      },
                      required: ['question', 'options', 'correctAnswer', 'explanation']
                    }
                  }
                },
                required: ['flashcards', 'quizQuestions']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'generate_study_materials' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to generate study materials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      console.error('No tool call in response');
      return new Response(
        JSON.stringify({ error: 'Invalid AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const studyMaterials = JSON.parse(toolCall.function.arguments);
    console.log('Study materials generated successfully');

    return new Response(
      JSON.stringify(studyMaterials),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-study-materials:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
