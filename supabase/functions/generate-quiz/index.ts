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

    console.log(`Generating quiz for lecture ${lectureId}`);

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
            content: `🇧🇷 CRITICAL: You MUST generate ALL content in BRAZILIAN PORTUGUESE (pt-BR).

Você é um criador de quizzes educacionais para estudantes de engenharia em PORTUGUÊS DO BRASIL.
Gere um quiz baseado APENAS no conteúdo da aula fornecida.

⚠️ IDIOMA OBRIGATÓRIO:
- TODO o texto deve estar em português do Brasil
- Perguntas em português
- Todas as 4 opções de resposta em português  
- Explicações em português
- NUNCA use inglês

IMPORTANTE: Perguntas devem ser técnicas e relevantes aos conceitos de engenharia discutidos na aula. Foque em:
- Princípios de engenharia (termodinâmica, mecânica, circuitos, estruturas, materiais, etc.)
- Cálculos técnicos e análise
- Princípios de design e metodologias
- Abordagens de resolução de problemas de engenharia

Para cada pergunta, você DEVE incluir:
1. O texto da pergunta (focado em conceitos de engenharia)
2. O tipo (multiple-choice, true-false, fill-blank, ou short-answer)
3. Opções (para múltipla escolha) - todas as opções devem ser tecnicamente plausíveis
4. A resposta correta
5. Uma explicação com raciocínio técnico
6. Um sourceTimestamp (formato "MM:SS") apontando onde na aula este conceito foi discutido

Retorne APENAS JSON válido neste formato exato (SEM markdown):
{
  "questions": [
    {
      "id": 1,
      "type": "multiple-choice",
      "question": "O que é pressão hidrostática?",
      "options": [
        "Pressão exercida por um fluido em repouso",
        "Pressão de um gás em movimento",
        "Força aplicada em uma superfície sólida",
        "Energia potencial de um líquido"
      ],
      "correctAnswer": 0,
      "explanation": "A pressão hidrostática é a pressão exercida por um fluido em repouso devido ao seu peso.",
      "sourceTimestamp": "12:34"
    }
  ]
}

Gere 8-10 perguntas com uma boa mistura de tipos. Foque em testar compreensão de conceitos de engenharia, cálculos e aplicações.`
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
