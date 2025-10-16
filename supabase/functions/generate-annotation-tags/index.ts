import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Categorias base de engenharia
const BASE_CATEGORIES = [
  'Termodinâmica', 'Estruturas', 'Circuitos', 'Materiais', 'Controle',
  'Mecânica', 'Eletrônica', 'Civil', 'Computação', 'Química',
  'Laboratório', 'Projeto', 'Cálculo', 'Física', 'Programação'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, title } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    console.log('Gerando tags para anotação...');

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
            content: `Você é um assistente que sugere tags para anotações de engenharia. 
            
Categorias base disponíveis: ${BASE_CATEGORIES.join(', ')}

Regras:
- Retorne exatamente 3-5 tags
- Use categorias base quando possível, mas pode criar tags específicas
- Tags devem ser curtas (1-2 palavras)
- Responda apenas com as tags separadas por vírgula
- Sem aspas ou formatação extra`
          },
          { 
            role: 'user', 
            content: `Título: ${title}\n\nConteúdo: ${content.substring(0, 500)}\n\nSugira tags relevantes:`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro na API:', response.status, errorText);
      throw new Error(`Erro na API de IA: ${response.status}`);
    }

    const data = await response.json();
    const tagsString = data.choices[0].message.content.trim();
    const tags = tagsString.split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0);

    console.log('Tags geradas:', tags);

    return new Response(JSON.stringify({ tags }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Erro ao gerar tags:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
