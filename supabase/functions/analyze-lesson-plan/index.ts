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
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const tema = formData.get('tema') as string;

    if (!file || !tema) {
      return new Response(
        JSON.stringify({ error: 'Arquivo PDF e tema são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const pdfText = new TextDecoder().decode(bytes).slice(0, 4000);

    const systemPrompt = `Você é um assistente especializado em análise pedagógica de planos de aula.
Analise o plano de aula fornecido e determine:
1. Se está alinhado ao tema da aula
2. Conceitos-chave identificados (máx. 5)
3. Sugestões de melhoria (máx. 3)
4. Score de completude (0-100)

Retorne APENAS um JSON válido no formato:
{
  "aligned": boolean,
  "key_concepts": ["conceito1", "conceito2"],
  "suggestions": ["sugestão1", "sugestão2"],
  "completeness_score": number
}`;

    const userPrompt = `Tema da aula: "${tema}"\n\nConteúdo do plano de aula:\n${pdfText}\n\nAnalise o alinhamento e completude.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_lesson_plan",
              description: "Retorna análise estruturada do plano de aula",
              parameters: {
                type: "object",
                properties: {
                  aligned: { type: "boolean" },
                  key_concepts: { type: "array", items: { type: "string" } },
                  suggestions: { type: "array", items: { type: "string" } },
                  completeness_score: { type: "number" }
                },
                required: ["aligned", "key_concepts", "suggestions", "completeness_score"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "analyze_lesson_plan" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API Error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429 || aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Erro na API de IA', aligned: true, key_concepts: [], suggestions: [], completeness_score: 50 }),
          { status: aiResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error('Erro na API de IA');
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      return new Response(
        JSON.stringify({ aligned: true, key_concepts: [], suggestions: [], completeness_score: 50 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error analyzing lesson plan:', error);
    return new Response(
      JSON.stringify({ aligned: true, key_concepts: [], suggestions: [], completeness_score: 50 }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
