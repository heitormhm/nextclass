import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    const { lectureId, transcript, topic } = await req.json();

    if (!lectureId || !transcript) {
      throw new Error('ID da aula e transcrição são obrigatórios');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    // Prepare the AI prompt
    const systemPrompt = `Você é um assistente de IA pedagógico, especialista em transformar transcrições de aulas de engenharia em material de estudo didático e envolvente para estudantes universitários. Sua tarefa é processar uma transcrição bruta e convertê-la em um recurso educacional estruturado e de alta qualidade.

Diretrizes de Geração de Conteúdo:
1. **Filtragem de Ruído:** Ignore hesitações, palavras de preenchimento ("uhm", "então...", "tipo assim"), repetições e conversas fora do tópico para criar um texto limpo e focado.
2. **Resumo Estruturado:** Crie um resumo conciso da aula, destacando os objetivos de aprendizagem e as conclusões principais.
3. **Tópicos Principais e Conceitos-Chave:** Identifique e liste os conceitos fundamentais abordados. Para cada conceito, forneça uma definição clara e direta, extraída e refinada do conteúdo da transcrição.
4. **Material de Apoio e Referências:** Com base nos tópicos técnicos discutidos, sugira 2-3 referências externas válidas e de alta qualidade (links para artigos acadêmicos, documentação oficial, ou vídeos de canais educacionais renomados).
5. **Perguntas para Revisão:** Formule de 9 a 11 perguntas de múltipla escolha. As perguntas devem ser cenários práticos ou problemas que exijam a aplicação dos conceitos, em vez de simples memorização.
6. **Geração de Flashcards:** Com base nos conceitos-chave identificados, crie um conjunto de flashcards (termo e definição) para facilitar a memorização.

IMPORTANTE: Retorne APENAS um objeto JSON válido, sem texto adicional antes ou depois.`;

    const userPrompt = `Analise a transcrição fornecida da aula sobre o tema "${topic || 'Tema não especificado'}". Com base exclusivamente no conteúdo falado, gere um material didático completo no formato JSON.

Transcrição:
${transcript}

Formato de Saída (JSON):
{
  "titulo_aula": "string",
  "resumo": "string",
  "topicos_principais": [
    { "conceito": "string", "definicao": "string" }
  ],
  "referencias_externas": [
    { "titulo": "string", "url": "string", "tipo": "artigo/vídeo/documentação" }
  ],
  "perguntas_revisao": [
    { "pergunta": "string", "opcoes": ["A", "B", "C", "D"], "resposta_correta": "string" }
  ],
  "flashcards": [
    { "termo": "string", "definicao": "string" }
  ]
}`;

    console.log('Sending request to Lovable AI...');

    // Call Lovable AI with Gemini 2.5 Pro
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', aiResponse.status, errorText);
      throw new Error(`Erro da API Lovable AI: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('Received response from Lovable AI');

    const generatedContent = aiData.choices?.[0]?.message?.content;
    if (!generatedContent) {
      throw new Error('Nenhum conteúdo foi gerado pela IA');
    }

    // Parse the JSON response
    let structuredContent;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = generatedContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : generatedContent;
      structuredContent = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.log('Raw content:', generatedContent);
      throw new Error('Falha ao analisar resposta da IA');
    }

    // Update the lecture with the structured content
    const { error: updateError } = await supabaseClient
      .from('lectures')
      .update({
        structured_content: structuredContent,
        status: 'ready',
        updated_at: new Date().toISOString(),
      })
      .eq('id', lectureId)
      .eq('teacher_id', user.id);

    if (updateError) {
      console.error('Error updating lecture:', updateError);
      throw new Error('Falha ao atualizar aula no banco de dados');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        structuredContent 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in process-lecture-transcript:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});