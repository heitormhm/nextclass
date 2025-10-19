import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Technical categories for engineering courses
const ENGINEERING_CATEGORIES = [
  "Fundamentos de Engenharia",
  "Cálculo e Matemática Aplicada",
  "Física e Mecânica",
  "Termodinâmica e Energia",
  "Circuitos e Sistemas Elétricos",
  "Mecânica dos Fluidos",
  "Ciência dos Materiais",
  "Resistência dos Materiais",
  "Sistemas de Controle",
  "Processos Industriais",
  "Projeto e Análise",
  "Instrumentação e Medição",
  "Métodos Numéricos",
  "Análise Estrutural",
  "Sistemas Dinâmicos",
  "Transferência de Calor",
  "Máquinas e Mecanismos",
  "Eletrônica e Microcontroladores",
  "Gestão de Projetos",
  "Sustentabilidade e Meio Ambiente"
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { theme, discipline, content } = await req.json();

    if (!theme) {
      throw new Error('Theme is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `You are an expert technical tagger for engineering education content. Your task is to generate 3-5 relevant tags for a lecture based on its theme, discipline, and content.

Available categories to choose from:
${ENGINEERING_CATEGORIES.join(', ')}

Rules:
- Generate 3-5 tags maximum
- Tags should be specific, technical, and relevant to engineering education
- Prioritize tags from the available categories, but you can create new ones if highly relevant
- Tags should be in Portuguese
- Return ONLY a JSON array of strings, nothing else`;

    const userPrompt = `Lecture Theme: ${theme}
${discipline ? `Discipline: ${discipline}` : ''}
${content ? `Additional Content: ${content}` : ''}

Generate appropriate technical tags for this engineering lecture.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`AI service error: ${response.status}`);
    }

    const data = await response.json();
    const content_text = data.choices?.[0]?.message?.content;

    if (!content_text) {
      throw new Error('No response from AI');
    }

    // Extract JSON array from response
    let tags: string[] = [];
    const jsonMatch = content_text.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      tags = JSON.parse(jsonMatch[0]);
    } else {
      // Fallback: try to parse the whole response
      tags = JSON.parse(content_text);
    }

    // Ensure we have valid tags
    if (!Array.isArray(tags) || tags.length === 0) {
      throw new Error('Invalid tags format');
    }

    // Limit to 5 tags
    tags = tags.slice(0, 5);

    return new Response(
      JSON.stringify({ tags }),
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