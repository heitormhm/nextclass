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
    const { lessonPlan, lectureContent } = await req.json();

    if (!lessonPlan || !lectureContent) {
      throw new Error('Lesson plan and lecture content are required');
    }

    console.log('Comparing lecture with lesson plan...');

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `Você é um assistente de IA pedagógico especializado em análise comparativa de conteúdo educacional.
Sua tarefa é comparar o plano de aula com o conteúdo efetivamente lecionado e gerar um relatório de cobertura.

DIRETRIZES:
1. Identifique os tópicos planejados vs. os tópicos abordados
2. Calcule a porcentagem de cobertura
3. Identifique tópicos não abordados
4. Identifique tópicos extras (não planejados mas lecionados)
5. Forneça recomendações para próximas aulas

Retorne um JSON com esta estrutura:
{
  "coverage_percentage": number,
  "covered_topics": [{ "topic": string, "status": "fully_covered" | "partially_covered" }],
  "missing_topics": [{ "topic": string, "priority": "high" | "medium" | "low" }],
  "extra_topics": [string],
  "recommendations": [string]
}`;

    const userPrompt = `PLANO DE AULA:
${lessonPlan}

CONTEÚDO LECIONADO:
${JSON.stringify(lectureContent, null, 2)}

Analise a cobertura do plano de aula e gere o relatório.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', aiResponse.status, errorText);
      throw new Error(`Lovable AI request failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;

    if (!aiContent) {
      throw new Error('No content in AI response');
    }

    // Parse the JSON response
    let comparisonResult;
    try {
      const jsonMatch = aiContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                       aiContent.match(/```\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : aiContent;
      comparisonResult = JSON.parse(jsonString.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Failed to parse comparison result');
    }

    console.log('Comparison completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        comparison: comparisonResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error comparing with lesson plan:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
