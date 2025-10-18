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

    console.log('Gerando título pedagógico para anotação de professor...');

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
            content: `Você é um especialista em gerar títulos pedagógicos para anotações de PROFESSORES de engenharia.

INSTRUÇÕES CRÍTICAS:
1. Analise APENAS o conteúdo fornecido pelo usuário
2. Identifique o CONTEXTO PEDAGÓGICO principal e escolha UMA destas categorias:
   • Planejamento de aula
   • Avaliação/Rubrica  
   • Metodologia/Didática
   • Material didático
   • Gestão de turma
   • Conteúdo técnico específico

3. Estrutura do título:
   - Se for planejamento: "Plano: [Descrição específica]"
   - Se for avaliação: "Avaliação: [Descrição específica]"
   - Se for metodologia: "Didática: [Descrição específica]"
   - Se for material: "Material: [Descrição específica]"
   - Se for gestão: "Gestão: [Descrição específica]"
   - Se for conteúdo técnico: "[Nome específico do conceito técnico]"

4. Para conteúdo técnico, NÃO use prefixos genéricos
   ❌ ERRADO: "[Tema Técnico]: Hidrodinâmica"
   ✅ CORRETO: "Hidrodinâmica em Sistemas de Abastecimento"
   ✅ CORRETO: "Circuitos RLC: Análise de Ressonância"

5. Seja ESPECÍFICO, não genérico:
   ❌ EVITE: "Fundamentos de...", "Introdução à...", "Conceitos de..."
   ✅ PREFIRA: Mencione o conceito técnico direto

FORMATO FINAL:
- Máximo 70 caracteres
- PORTUGUÊS BRASILEIRO
- SEM aspas, pontos finais ou colchetes genéricos
- Foque no PROPÓSITO DE ENSINO

EXEMPLOS DE TÍTULOS BEM FORMATADOS:
- "Plano: Circuitos RLC com Metodologia Ativa"
- "Avaliação: Rubrica de Termodinâmica Aplicada"
- "Didática: Analogias para Resistência dos Materiais"
- "Equações de Bernoulli na Engenharia Hidráulica"
- "Análise Modal de Estruturas Aporticadas"

Responda APENAS com o título gerado, sem explicações adicionais.`
          },
          { 
            role: 'user', 
            content: `Analise o conteúdo pedagógico abaixo e gere um título específico:

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

    console.log('Título pedagógico gerado:', title);

    return new Response(JSON.stringify({ title }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Erro ao gerar título pedagógico:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
