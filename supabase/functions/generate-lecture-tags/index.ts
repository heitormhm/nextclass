import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { theme, discipline } = await req.json();
    
    if (!theme || !discipline) {
      throw new Error('Theme and discipline are required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Generating lecture tags and title...');

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
            content: `Você é um assistente especializado em educação de engenharia.

Sua tarefa é gerar:
1. Um título conciso e descritivo para a aula (máximo 60 caracteres)
2. 5-7 tags relevantes para categorização e busca

Retorne APENAS um JSON válido no formato:
{
  "title": "Título da Aula",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}

Diretrizes:
- Título deve ser academicamente preciso mas acessível
- Tags devem cobrir: tema principal, subtemas, aplicações, nível (fundamental/avançado)
- Use terminologia técnica em português brasileiro
- Tags devem ser curtas e objetivas`
          },
          {
            role: 'user',
            content: `Disciplina: ${discipline}
Tema da Aula: ${theme}

Gere título e tags para esta aula.`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    console.log('AI response:', content);
    
    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }
    
    const result = JSON.parse(jsonMatch[0]);
    
    console.log('Generated title and tags:', result);

    return new Response(
      JSON.stringify({ 
        title: result.title,
        tags: result.tags 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-lecture-tags:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
