import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, duration, notes, existingPlan, adjustmentInstruction } = await req.json();

    console.log('Planning lesson with Mia:', { topic, duration, hasExistingPlan: !!existingPlan });

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    let systemPrompt = `Você é 'Mia', uma assistente de IA especialista em design curricular para o ensino superior de engenharia. A sua especialidade é a criação de roteiros de aula didáticos que utilizam métodos ativos de aprendizagem, como o método socrático.`;

    let userPrompt = '';

    if (existingPlan && adjustmentInstruction) {
      // Refinamento de plano existente
      userPrompt = `Com base no plano de aula existente abaixo, refine-o de acordo com a seguinte instrução: "${adjustmentInstruction}".

PLANO EXISTENTE:
${existingPlan}

Por favor, gere o plano de aula atualizado seguindo a mesma estrutura.`;
    } else {
      // Criação de novo plano
      userPrompt = `Com base no seguinte tópico e informações, gere um plano de aula completo e estruturado:

TÓPICO: ${topic}
DURAÇÃO: ${duration} minutos
${notes ? `NOTAS ADICIONAIS: ${notes}` : ''}

O plano de aula DEVE seguir rigorosamente esta estrutura:

# PLANO DE AULA: ${topic}

## 1. OBJETIVOS DE APRENDIZAGEM
Liste 3-5 objetivos claros do que os alunos devem ser capazes de fazer após a aula.

## 2. CONCEITOS-CHAVE
Liste os termos e ideias fundamentais que serão abordados.

## 3. ROTEIRO DIDÁTICO (MÉTODO SOCRÁTICO)

### 3.1 Contextualização
Uma introdução breve (2-3 parágrafos) que conecta o tópico a um problema ou aplicação real da engenharia.

### 3.2 Problematização Central
Uma pergunta desafiadora ou um cenário-problema que servirá como fio condutor da aula.

### 3.3 Desenvolvimento Socrático
Uma sequência de 5-8 perguntas-guia que o professor pode usar para levar os alunos a explorar os conceitos-chave:

**Pergunta 1:** [pergunta]
*Resposta esperada:* [breve indicação]

**Pergunta 2:** [pergunta]
*Resposta esperada:* [breve indicação]

[Continue com mais perguntas...]

### 3.4 Síntese e Conclusão
Um resumo dos principais insights alcançados e como eles resolvem a problematização central.

## 4. REFERÊNCIAS BIBLIOGRÁFICAS

CRÍTICO: Você DEVE gerar apenas referências a livros, artigos e publicações que existem de facto. NÃO invente autores, títulos ou DOIs. Verifique a plausibilidade das suas fontes. Se não tiver a certeza sobre a existência de uma referência, é preferível não a incluir.

Liste 3-5 referências bibliográficas reais e verificáveis em formato ABNT.`;
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
