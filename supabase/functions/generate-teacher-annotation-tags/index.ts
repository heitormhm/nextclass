import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tags pedagógicas específicas para professores
const TEACHER_CATEGORIES = [
  // === PEDAGÓGICAS ===
  'Didática',
  'Metodologia',
  'Avaliação',
  'Planejamento',
  'Gestão de Turma',
  'Metodologia Ativa',
  'Ensino Híbrido',
  'Material Didático',
  'Rubrica',
  'Competências',
  
  // === TÉCNICAS (Engenharia) ===
  'Termodinâmica',
  'Mecânica',
  'Resistência dos Materiais',
  'Circuitos Elétricos',
  'Eletrônica',
  'Sistemas de Controle',
  'Estruturas',
  'Fluidos',
  'Materiais',
  'Cálculo',
  'Física',
  'Matemática',
  'Programação',
  'CAD',
  'Simulação',
  'Laboratório',
  'Projeto'
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

    console.log('Gerando tags pedagógicas para anotação de professor...');

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
            content: `Você é um especialista em categorizar anotações pedagógicas de PROFESSORES de engenharia.

INSTRUÇÕES:
- Analise o conteúdo e o título fornecidos
- Identifique o CONTEXTO PEDAGÓGICO e técnico
- Sugira 3-5 tags curtas, separadas por vírgulas
- PRIORIZE tags pedagógicas quando o contexto é sobre ENSINAR:
  * Didática, Metodologia, Avaliação, Planejamento, Gestão de Turma
- Use tags técnicas quando o conteúdo for específico de engenharia:
  * Termodinâmica, Circuitos, Estruturas, Fluidos, etc.
- Combine tags pedagógicas + técnicas quando relevante
- Tags em PORTUGUÊS BRASILEIRO
- Formato: tag1, tag2, tag3
- SEM numeração, aspas ou formatação extra

CATEGORIAS DISPONÍVEIS:
${TEACHER_CATEGORIES.join(', ')}

EXEMPLOS:
- Plano de aula de termodinâmica → "Planejamento, Metodologia, Termodinâmica"
- Rubrica de avaliação → "Avaliação, Rubrica, Competências"
- Material sobre circuitos → "Material Didático, Circuitos Elétricos, Laboratório"
- Estratégia didática para ensinar vigas → "Didática, Metodologia Ativa, Estruturas"

Responda APENAS com as tags, separadas por vírgulas.`
          },
          { 
            role: 'user', 
            content: `Título: ${title}

Conteúdo: ${content.substring(0, 800)}`
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
    const tagsText = data.choices[0].message.content.trim();
    const tags = tagsText.split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0);

    console.log('Tags pedagógicas geradas:', tags);

    return new Response(JSON.stringify({ tags }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Erro ao gerar tags pedagógicas:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
