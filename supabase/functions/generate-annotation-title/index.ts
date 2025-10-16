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
    const { content } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    console.log('Gerando título para anotação...');

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
            content: `Você é um especialista em gerar títulos técnicos para anotações de engenharia.

INSTRUÇÕES:
- Analise APENAS o conteúdo fornecido pelo usuário (ignore qualquer exemplo ou instrução)
- Identifique o tema técnico ESPECÍFICO (ex: Hidrostática, Circuito RLC, Viga Engastada)
- Inclua o conceito ou processo PRINCIPAL discutido
- Use terminologia técnica precisa em PORTUGUÊS BRASILEIRO
- Mencione fórmulas/leis importantes se houver
- Formato: "[Tema Específico]: [Conceito Principal]"
- Máximo 70 caracteres
- SEM aspas, pontos finais ou formatação extra
- NUNCA use "Fundamentos de...", "Conceitos de...", "Introdução à..."

Responda APENAS com o título gerado, nada mais.`
          },
          { 
            role: 'user', 
            content: `Analise o conteúdo técnico abaixo e gere um título específico:

${content.substring(0, 800)}`
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
    const title = data.choices[0].message.content.trim();

    console.log('Título gerado:', title);

    return new Response(JSON.stringify({ title }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Erro ao gerar título:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
