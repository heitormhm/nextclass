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

  let lessonPlanId: string | undefined;

  try {
    const body = await req.json();
    lessonPlanId = body.lessonPlanId;
    const { topic, duration, notes, existingPlan, adjustmentInstruction } = body;

    console.log('Planning lesson with Mia:', { topic, duration, hasExistingPlan: !!existingPlan });

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Helper function to update progress
    const updateProgress = async (step: string) => {
      if (!lessonPlanId) return;
      
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.58.0');
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      await supabase
        .from('lesson_plans')
        .update({ progress_step: step })
        .eq('id', lessonPlanId);
      
      console.log('Progress updated:', step);
    };

    let systemPrompt = `Você é 'Mia', uma assistente de IA especialista em design curricular para o ensino superior de engenharia. A sua operação DEVE utilizar o modelo de linguagem de ponta mais recente e capaz disponível, otimizado para pesquisa aprofundada (deep search), raciocínio complexo e geração de documentos técnicos e explicativos. A sua principal diretriz é a precisão, a verificação de fontes e a excelência pedagógica.

IMPORTANTE: Formate TODA a sua resposta usando apenas HTML simples:
- Use <strong> ou <b> para títulos e subtítulos (NÃO use hashtags #)
- Use <p> para parágrafos
- Use <ul> e <li> para listas com marcadores
- Use <ol> e <li> para listas numeradas
- Use <br> para quebras de linha quando necessário
- Mantenha a formatação limpa e profissional

PROCESSO DE TRABALHO OBRIGATÓRIO:

1. FASE DE PESQUISA (DEEP SEARCH):
   Antes de escrever qualquer conteúdo, você DEVE realizar uma pesquisa aprofundada sobre o tópico. Consulte múltiplas fontes académicas confiáveis, como artigos científicos, livros de referência da área, documentação técnica e publicações de universidades. O objetivo é recolher uma base sólida de informações, incluindo definições, equações, exemplos práticos e referências.

2. FASE DE SÍNTESE E ESTRUTURAÇÃO:
   Analise e sintetize a informação recolhida. Identifique os conceitos-chave, as aplicações mais relevantes na indústria e formule uma problematização central que possa servir como fio condutor para a aula. Estruture o conhecimento de forma lógica e progressiva.

3. FASE DE GERAÇÃO DO PLANO DE AULA:
   Após a pesquisa e a síntese, construa o plano de aula seguindo a estrutura detalhada fornecida no prompt do utilizador. Utilize uma linguagem clara, objetiva e adequada para o ensino de engenharia, focando no método socrático.`;

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
      await updateProgress('A iniciar a pesquisa sobre o tópico...');
      console.log('Performing deep search for topic:', topic);
      searchContext = await performDeepSearch(topic);
      await updateProgress('A consultar fontes académicas de engenharia...');
      
      await updateProgress('A analisar os conceitos-chave e as suas aplicações práticas...');
      
      userPrompt = `Com base no tópico e informações abaixo, siga rigorosamente o processo de três fases para criar um plano de aula de excelência:

TÓPICO: ${topic}
DURAÇÃO: ${duration} minutos
${notes ? `NOTAS ADICIONAIS: ${notes}` : ''}

${searchContext ? `RESULTADOS DA PESQUISA APROFUNDADA:\n${searchContext}\n\n` : ''}

ESTRUTURA DO PLANO DE AULA (use formatação HTML):

<strong>PLANO DE AULA: ${topic}</strong>

<p><strong>1. OBJETIVOS DE APRENDIZAGEM</strong></p>
<p>Liste 3-5 objetivos claros e mensuráveis do que os alunos devem ser capazes de fazer ou compreender após a aula. Use verbos de ação específicos (ex: "Calcular", "Analisar", "Projetar", "Avaliar").</p>

<p><strong>2. CONCEITOS-CHAVE</strong></p>
<p>Crie um glossário dos termos, princípios fundamentais e equações que serão abordados na aula. Cada conceito deve ter uma definição clara e precisa.</p>

<p><strong>3. ROTEIRO DIDÁTICO (MÉTODO SOCRÁTICO)</strong></p>

<p><strong>3.1 Contextualização</strong></p>
<p>Apresente um cenário ou problema real da engenharia onde o tópico da aula é aplicado (2-3 parágrafos). Este cenário deve ser específico, relevante para a indústria e capaz de despertar o interesse dos alunos. Exemplo: "Como projetamos uma viga para suportar o peso de uma ponte sem falhar?"</p>

<p><strong>3.2 Problematização Central</strong></p>
<p>Formule uma grande questão ou desafio técnico que a aula se propõe a responder, derivada diretamente da contextualização. Esta questão deve ser aberta o suficiente para permitir exploração, mas focada o suficiente para guiar a aula.</p>

<p><strong>3.3 Desenvolvimento Socrático</strong></p>
<p>Crie uma sequência lógica de 5-8 perguntas-guia que levam os alunos a explorar os conceitos-chave e a construir o seu próprio entendimento. Cada pergunta deve:</p>
<ul>
<li>Partir do conhecimento anterior dos alunos</li>
<li>Estimular o pensamento crítico e a análise</li>
<li>Conectar-se logicamente à pergunta seguinte</li>
<li>Aproximar os alunos da solução da problematização central</li>
</ul>

<p><strong>Pergunta 1:</strong> [pergunta inicial que ativa conhecimento prévio]<br>
<em>Caminho de raciocínio esperado:</em> [breve indicação de como os alunos devem pensar]</p>

<p><strong>Pergunta 2:</strong> [pergunta que aprofunda um conceito específico]<br>
<em>Caminho de raciocínio esperado:</em> [indicação]</p>

<p><strong>Pergunta 3:</strong> [pergunta que explora relações entre conceitos]<br>
<em>Caminho de raciocínio esperado:</em> [indicação]</p>

<p>[Continue com mais perguntas, aumentando progressivamente a complexidade...]</p>

<p><strong>3.4 Síntese e Conclusão</strong></p>
<p>Resuma os principais insights e conclusões alcançados através do debate socrático. Demonstre explicitamente como estas conclusões respondem à problematização central e conecte os conceitos aprendidos à aplicação prática apresentada na contextualização.</p>

<p><strong>4. REFERÊNCIAS BIBLIOGRÁFICAS VERIFICADAS</strong></p>

<p><strong>CRÍTICO - REQUISITO NÃO NEGOCIÁVEL:</strong></p>
<ul>
<li>Liste APENAS fontes reais e verificáveis que foram consultadas durante a sua fase de pesquisa</li>
<li>NÃO invente ou "alucine" referências, autores, títulos, DOIs ou URLs</li>
<li>Priorize artigos científicos, livros de referência reconhecidos, documentação técnica oficial e publicações de universidades prestigiadas</li>
<li>Use formato ABNT corretamente</li>
<li>A precisão e a veracidade das fontes são obrigatórias</li>
<li>Se não tiver certeza absoluta sobre a existência de uma referência, NÃO a inclua</li>
</ul>

<p>Liste 3-5 referências bibliográficas reais e verificadas:</p>`;
    }

    await updateProgress('A estruturar o roteiro didático com o método socrático...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_completion_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      
      // Update lesson plan status to failed
      if (lessonPlanId) {
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.58.0');
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        const errorMsg = response.status === 429 
          ? "Erro: A IA está ocupada. Por favor, tente novamente em alguns momentos." 
          : "Erro: Não foi possível contactar a IA. Tente novamente.";
        
        await supabase
          .from('lesson_plans')
          .update({ 
            status: 'failed',
            progress_step: errorMsg
          })
          .eq('id', lessonPlanId);
      }
      
      return new Response(
        JSON.stringify({ 
          error: response.status === 429 
            ? "A IA está ocupada. Por favor, tente novamente em alguns momentos." 
            : "Não foi possível contactar a IA. Tente novamente." 
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid response from OpenAI:', data);
      throw new Error('Resposta inválida da IA');
    }
    
    await updateProgress('A verificar as referências bibliográficas...');
    
    const lessonPlan = data.choices[0].message.content;

    await updateProgress('A finalizar a formatação do seu plano de aula...');
    
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
          progress_step: null,
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
    
    // Update lesson plan status to failed if we have an ID
    if (lessonPlanId) {
      try {
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.58.0');
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        await supabase
          .from('lesson_plans')
          .update({ 
            status: 'failed',
            progress_step: `Erro: ${errorMessage}`
          })
          .eq('id', lessonPlanId);
      } catch (updateError) {
        console.error('Failed to update lesson plan status:', updateError);
      }
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage === 'OpenAI API key not configured'
          ? 'Serviço de IA não configurado. Contacte o administrador.'
          : 'Ocorreu um erro ao gerar o plano de aula. Tente novamente.'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
