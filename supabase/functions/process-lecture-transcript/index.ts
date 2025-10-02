import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lectureId, transcript, topic = "Engenharia" } = await req.json();

    if (!lectureId || !transcript) {
      throw new Error('lectureId and transcript are required');
    }

    console.log(`Processing lecture ${lectureId} with topic: ${topic}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Call Lovable AI with Gemini 2.5 Pro
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `Você é um assistente de IA pedagógico, especialista em transformar transcrições de aulas de engenharia em material de estudo didático e envolvente para estudantes universitários.

DIRETRIZES:
1. Filtre hesitações, palavras de preenchimento ("uhm", "então...", "tipo assim"), repetições e conversas fora do tópico
2. Crie um resumo conciso destacando objetivos de aprendizagem e conclusões principais
3. Identifique conceitos fundamentais com definições claras extraídas do conteúdo
4. Sugira 2-3 referências externas válidas e de alta qualidade (artigos acadêmicos, documentação oficial, vídeos educacionais)
5. Formule 9 a 11 perguntas de múltipla escolha práticas que exijam aplicação dos conceitos
6. Crie flashcards (termo e definição) baseados nos conceitos-chave

IMPORTANTE: Retorne APENAS o JSON, sem texto adicional antes ou depois.`;

    const userPrompt = `Analise esta transcrição de aula sobre ${topic} e gere material didático estruturado:

TRANSCRIÇÃO:
${transcript}

Retorne um JSON com esta estrutura exata:
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

    console.log('Calling Lovable AI with Gemini 2.5 Pro...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
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
      throw new Error(`Lovable AI request failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('Lovable AI response received');

    const aiContent = aiData.choices?.[0]?.message?.content;
    if (!aiContent) {
      throw new Error('No content in AI response');
    }

    // Parse the JSON response
    let structuredContent;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = aiContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                       aiContent.match(/```\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : aiContent;
      structuredContent = JSON.parse(jsonString.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.error('AI response:', aiContent);
      throw new Error('Failed to parse AI response as JSON');
    }

    // Update lecture with structured content
    const { error: updateError } = await supabase
      .from('lectures')
      .update({ 
        structured_content: structuredContent,
        status: 'ready',
        updated_at: new Date().toISOString()
      })
      .eq('id', lectureId);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw updateError;
    }

    console.log(`Lecture ${lectureId} processed successfully`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        lectureId,
        structuredContent 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing lecture:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});