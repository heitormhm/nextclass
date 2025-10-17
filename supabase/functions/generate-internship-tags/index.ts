import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { internshipType, locationDetails } = await req.json();
    
    if (!internshipType) {
      return new Response(
        JSON.stringify({ error: 'Tipo de estágio é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    console.log('Generating tags for:', { internshipType, locationDetails });

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
            content: 'Você é um especialista em categorização de estágios de engenharia. Gere tags relevantes, específicas e em português para o contexto fornecido.'
          },
          {
            role: 'user',
            content: `Gere 3-5 tags relevantes para este estágio:

Tipo de estágio: ${internshipType}
${locationDetails ? `Local: ${locationDetails}` : ''}

As tags devem ser:
- Específicas da área de engenharia
- Relevantes para o contexto
- Em português
- Uma palavra ou termo curto cada
- Únicas (sem repetições)

Retorne as tags como um array JSON.`
          }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'generate_tags',
            description: 'Gera tags para um estágio',
            parameters: {
              type: 'object',
              properties: {
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Lista de tags relevantes'
                }
              },
              required: ['tags']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'generate_tags' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Erro ao gerar tags com IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('AI response:', JSON.stringify(data, null, 2));

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error('No tool call in response');
      return new Response(
        JSON.stringify({ error: 'Formato de resposta inválido da IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tags = JSON.parse(toolCall.function.arguments).tags;
    console.log('Generated tags:', tags);

    return new Response(
      JSON.stringify({ tags }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-internship-tags:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});