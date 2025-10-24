import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { title, tags } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const prompt = `# GERAR UMA PERGUNTA DE QUIZ

**Título da Aula:** ${title}
**Tags:** ${tags?.join(', ') || 'Não especificadas'}

## INSTRUÇÕES:
1. Crie **UMA** pergunta de múltipla escolha focada no título e tags acima
2. Use Nível de Bloom apropriado (Conhecimento, Compreensão, Aplicação ou Análise)
3. Retorne no formato JSON exato abaixo

## FORMATO OBRIGATÓRIO:
{
  "question": "Pergunta clara e objetiva sobre ${title}",
  "options": {
    "A": "Primeira opção",
    "B": "Segunda opção",
    "C": "Terceira opção",
    "D": "Quarta opção"
  },
  "correctAnswer": "B",
  "explanation": "Explicação detalhada (2-3 frases) do porquê a resposta B está correta",
  "bloomLevel": "Compreensão"
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Extrair JSON do conteúdo
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid AI response format');
    }

    const question = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify({ question }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
