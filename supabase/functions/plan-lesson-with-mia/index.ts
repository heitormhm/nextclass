import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function performDeepSearch(topic: string): Promise<string> {
  const searchQuery = `${topic} engenharia educação método socrático bibliografia`;
  
  try {
    const searchResponse = await fetch(`https://www.googleapis.com/customsearch/v1?key=AIzaSyBqXt6F8z0-demo&cx=017576662512468239146:omuauf_lfve&q=${encodeURIComponent(searchQuery)}`);
    
    if (!searchResponse.ok) {
      console.log('Search API not available, proceeding without deep search');
      return '';
    }
    
    const searchData = await searchResponse.json();
    const results = searchData.items?.slice(0, 5).map((item: any) => 
      `Título: ${item.title}\nResumo: ${item.snippet}\nFonte: ${item.link}`
    ).join('\n\n') || '';
    
    return results;
  } catch (error) {
    console.log('Deep search failed, proceeding without it:', error);
    return '';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lessonPlanId, topic, duration, notes, existingPlan, adjustmentInstruction } = await req.json();

    console.log('Planning lesson with Mia:', { topic, duration, hasExistingPlan: !!existingPlan });

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    let systemPrompt = `Você é 'Mia', uma assistente de IA especialista em design curricular para o ensino superior de engenharia, que baseia todas as suas criações em pesquisa aprofundada e fontes verificáveis.

IMPORTANTE: Formate TODA a sua resposta usando apenas HTML simples:
- Use <strong> ou <b> para títulos e subtítulos (NÃO use hashtags #)
- Use <p> para parágrafos
- Use <ul> e <li> para listas com marcadores
- Use <ol> e <li> para listas numeradas
- Use <br> para quebras de linha quando necessário
- Mantenha a formatação limpa e profissional`;

    let userPrompt = '';
    let searchContext = '';

    if (existingPlan && adjustmentInstruction) {
      // Refinamento de plano existente
      userPrompt = `Com base no plano de aula existente abaixo, refine-o de acordo com a seguinte instrução: "${adjustmentInstruction}".

PLANO EXISTENTE:
${existingPlan}

Por favor, gere o plano de aula atualizado seguindo a mesma estrutura e formatação HTML.`;
    } else {
      // Criação de novo plano - realizar pesquisa profunda
      console.log('Performing deep search for topic:', topic);
      searchContext = await performDeepSearch(topic);
      
      userPrompt = `Com base no tópico e informações abaixo, e utilizando os resultados da pesquisa fornecidos, gere um plano de aula completo e estruturado:

TÓPICO: ${topic}
DURAÇÃO: ${duration} minutos
${notes ? `NOTAS ADICIONAIS: ${notes}` : ''}

${searchContext ? `RESULTADOS DA PESQUISA APROFUNDADA:\n${searchContext}\n\n` : ''}

O plano de aula DEVE seguir rigorosamente esta estrutura (use formatação HTML):

<strong>PLANO DE AULA: ${topic}</strong>

<p><strong>1. OBJETIVOS DE APRENDIZAGEM</strong></p>
<p>Liste 3-5 objetivos claros do que os alunos devem ser capazes de fazer após a aula.</p>

<p><strong>2. CONCEITOS-CHAVE</strong></p>
<p>Liste os termos e ideias fundamentais que serão abordados.</p>

<p><strong>3. ROTEIRO DIDÁTICO (MÉTODO SOCRÁTICO)</strong></p>

<p><strong>3.1 Contextualização</strong></p>
<p>Uma introdução breve (2-3 parágrafos) que conecta o tópico a um problema ou aplicação real da engenharia.</p>

<p><strong>3.2 Problematização Central</strong></p>
<p>Uma pergunta desafiadora ou um cenário-problema que servirá como fio condutor da aula.</p>

<p><strong>3.3 Desenvolvimento Socrático</strong></p>
<p>Uma sequência de 5-8 perguntas-guia que o professor pode usar para levar os alunos a explorar os conceitos-chave:</p>

<p><strong>Pergunta 1:</strong> [pergunta]<br>
<em>Resposta esperada:</em> [breve indicação]</p>

<p><strong>Pergunta 2:</strong> [pergunta]<br>
<em>Resposta esperada:</em> [breve indicação]</p>

<p>[Continue com mais perguntas...]</p>

<p><strong>3.4 Síntese e Conclusão</strong></p>
<p>Um resumo dos principais insights alcançados e como eles resolvem a problematização central.</p>

<p><strong>4. REFERÊNCIAS BIBLIOGRÁFICAS</strong></p>

<p><strong>CRÍTICO:</strong> Todas as referências bibliográficas mencionadas devem ser baseadas na pesquisa realizada e devem ser reais e verificáveis. Priorize fontes académicas e publicações reconhecidas na área da engenharia. NÃO invente autores, títulos ou DOIs. Se não tiver certeza sobre a existência de uma referência, é preferível não a incluir.</p>

<p>Liste 3-5 referências bibliográficas reais e verificáveis em formato ABNT, baseadas nos resultados da pesquisa fornecidos.</p>`;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const lessonPlan = data.choices[0].message.content;

    console.log('Lesson plan generated successfully');

    // Update lesson plan in database if lessonPlanId is provided
    if (lessonPlanId) {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.58.0');
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { error: updateError } = await supabase
        .from('lesson_plans')
        .update({
          content: lessonPlan,
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', lessonPlanId);

      if (updateError) {
        console.error('Error updating lesson plan:', updateError);
      } else {
        console.log('Lesson plan updated in database');
      }
    }

    return new Response(
      JSON.stringify({ lessonPlan }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in plan-lesson-with-mia function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
