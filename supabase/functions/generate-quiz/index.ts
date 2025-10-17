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
    const { lectureId, transcript } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log(`🎯 Generating quiz for lecture ${lectureId}`);
    console.log(`📄 Transcript preview (first 200 chars):`, transcript?.substring(0, 200) || 'No transcript provided');
    console.log(`📊 Transcript length:`, transcript?.length || 0, 'characters');

    // Call Lovable AI Gateway to generate quiz questions
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
            content: `IDIOMA OBRIGATÓRIO: Todo o conteúdo deve estar em PORTUGUÊS BRASILEIRO (pt-BR).

Você é um especialista em Avaliação de Aprendizagem para Engenharia, com profundo conhecimento da Taxonomia de Bloom e experiência em criar avaliações autênticas. Você compreende as concepções errôneas comuns dos alunos.

OBJETIVO: Gerar um quiz avaliativo formal que meça habilidades de pensamento de ordem superior (análise, avaliação) alinhadas com um cenário de engenharia realista.

INSTRUÇÕES:
1. Crie 8-10 perguntas de múltipla escolha de ORDEM SUPERIOR baseadas no conteúdo da aula
2. Cada pergunta deve APLICAR uma fórmula, ANALISAR uma mudança no cenário, ou AVALIAR uma consequência
3. Para CADA pergunta, forneça:
   - Stem: A pergunta em si (focada em conceitos de engenharia)
   - Correct Option: A resposta correta, incluindo cálculo ou raciocínio
   - Distractors (3): Opções incorretas mas PLAUSÍVEIS baseadas em erros comuns
   - Distractor Reasons: Para CADA distractor, explique o erro conceitual ou de cálculo específico que leva a ele
   - Competency Assessed: A competência de ordem superior avaliada (Raciocínio Analítico, Pensamento Crítico, Julgamento de Engenharia)
   - Source Timestamp: Indique onde na aula este conceito foi discutido (formato "MM:SS")

CRITÉRIOS DE QUALIDADE:
- Cálculos verificáveis: Todas as respostas numéricas devem ser matematicamente precisas
- Distractors plausíveis: Baseados em erros comuns e documentados de estudantes de engenharia
- Consistência de cenário: Todas as perguntas devem se referir diretamente aos dados fornecidos na transcrição
- Competência alinhada: A competência avaliada deve genuinamente corresponder ao que a pergunta exige
- Foco em engenharia: Princípios de termodinâmica, mecânica, circuitos, estruturas, materiais, etc.

⚠️ IDIOMA OBRIGATÓRIO:
- TODO o texto em português do Brasil
- Perguntas, opções, explicações e razões dos distractors em português
- NUNCA use inglês

FORMATO DE SAÍDA (JSON OBRIGATÓRIO - SEM markdown):
{
  "questions": [
    {
      "id": 1,
      "type": "multiple-choice",
      "question": "Em um sistema termodinâmico fechado...",
      "options": [
        "Opção correta com raciocínio técnico",
        "Distractor 1 - erro comum tipo A",
        "Distractor 2 - erro comum tipo B",
        "Distractor 3 - erro comum tipo C"
      ],
      "correctAnswer": 0,
      "explanation": "Explicação detalhada com raciocínio técnico e passos de cálculo se aplicável",
      "distractorReasons": [
        "Este distractor resulta de confundir sistema fechado com sistema isolado",
        "Este distractor vem de aplicar incorretamente a Primeira Lei da Termodinâmica",
        "Este distractor surge ao ignorar o trabalho realizado pelo sistema"
      ],
      "competencyAssessed": "Raciocínio Analítico",
      "sourceTimestamp": "12:34"
    }
  ]
}

Gere 8-10 perguntas com foco em habilidades de ordem superior e compreensão profunda dos conceitos de engenharia.`
          },
          {
            role: 'user',
            content: `Gere um quiz focado em engenharia baseado nesta transcrição de aula:\n\n${transcript || 'Aula de exemplo sobre análise estrutural, cálculo de tensões em vigas e limites de deflexão em projetos de engenharia.'}`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      if (response.status === 402) {
        throw new Error('AI credits depleted. Please add funds to continue.');
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse the JSON response
    let quizData;
    try {
      // ✅ Extrair JSON de markdown, se presente
      let jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        console.error('No JSON found in AI response:', content);
        throw new Error('No valid JSON structure in AI response');
      }
      
      // ✅ Sanitizar JSON removendo markdown
      let sanitizedJson = jsonMatch[0]
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .replace(/\n\s*\n/g, '\n')
        .trim();
      
      quizData = JSON.parse(sanitizedJson);
      
      // ✅ Validar estrutura
      if (!quizData.questions || !Array.isArray(quizData.questions)) {
        console.error('Invalid quiz structure:', quizData);
        throw new Error('Quiz data missing questions array');
      }
      
      console.log(`✅ Parsed ${quizData.questions.length} questions successfully`);
      console.log('🌐 Language check:', {
        hasPortuguese: JSON.stringify(quizData.questions).includes('ã') || JSON.stringify(quizData.questions).includes('ç'),
        firstQuestion: quizData.questions[0]?.question?.substring(0, 80)
      });
    } catch (parseError) {
      console.error('Failed to parse quiz data:', parseError);
      console.error('Raw content:', content.substring(0, 500));
      throw new Error('Failed to parse quiz data from AI response');
    }

    console.log(`Successfully generated ${quizData.questions?.length || 0} questions`);

    return new Response(
      JSON.stringify({
        success: true,
        quiz: quizData,
        totalQuestions: quizData.questions?.length || 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in generate-quiz function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
