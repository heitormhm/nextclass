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
            content: `Você é um especialista em criar títulos técnicos específicos para anotações de engenharia.

REGRAS OBRIGATÓRIAS:
1. Identifique o TEMA ESPECÍFICO da engenharia (ex: "Hidrostática", "Viga Engastada", "Circuito RLC")
2. Inclua o CONCEITO PRINCIPAL ou PROCESSO descrito (ex: "Princípio de Pascal", "Cálculo de Flexão", "Análise de Ressonância")
3. Use TERMINOLOGIA TÉCNICA PRECISA (ex: "Momento Fletor", "Impedância Complexa", "Pressão Hidrostática")
4. Se houver FÓRMULAS ou LEIS importantes, mencione-as (ex: "2ª Lei de Newton", "Equação de Bernoulli")
5. Se for um COMPONENTE ou SISTEMA, especifique-o (ex: "Motor CC", "Transformador Trifásico", "Coluna de Concreto")
6. NUNCA use títulos genéricos como "Fundamentos de...", "Conceitos de...", "Introdução à..."
7. Máximo 70 caracteres (relaxado para permitir mais especificidade)
8. SEMPRE em PORTUGUÊS BRASILEIRO
9. SEM aspas, SEM pontos finais, SEM formatação extra

FORMATO IDEAL:
"[Tema Específico]: [Conceito/Processo Principal]"

EXEMPLOS CORRETOS:
✅ "Hidrostática: Pressão e Princípio de Pascal"
✅ "Viga Engastada: Cálculo de Momentos Fletores"
✅ "Circuito RLC Série: Impedância e Ressonância"
✅ "Transformada de Laplace: Análise de Sistemas LTI"
✅ "Diagramas de Bode: Resposta em Frequência"
✅ "Termodinâmica: 1ª Lei e Balanço Energético"

EXEMPLOS INCORRETOS:
❌ "Fundamentos de Mecânica dos Fluidos"
❌ "Conceitos Básicos de Estruturas"
❌ "Introdução à Análise de Circuitos"
❌ "Tópicos de Engenharia Elétrica"
❌ "Anotações sobre Física Aplicada"`
          },
          { 
            role: 'user', 
            content: `Analise este conteúdo de engenharia em DETALHES e identifique:
1. Qual é o tema/tópico ESPECÍFICO?
2. Quais conceitos, fórmulas ou componentes principais são discutidos?
3. Há algum processo, cálculo ou análise sendo realizado?

Com base nisso, gere um título técnico e específico que capture a ESSÊNCIA do conteúdo:

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
