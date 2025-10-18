import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lectureId, sectionTitle, currentContent, editInstruction, conversationHistory } = await req.json();

    if (!lectureId || !sectionTitle || !currentContent || !editInstruction) {
      throw new Error('Missing required parameters');
    }

    console.log(`Editing ${sectionTitle} for lecture ${lectureId}`);

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `Você é Mia, uma assistente de IA pedagógica especializada em edição de material didático.
Sua tarefa é ajustar o conteúdo educacional com base nas instruções do professor, mantendo qualidade e coerência.

DIRETRIZES:
1. Mantenha o formato JSON original do conteúdo
2. Aplique as edições solicitadas de forma precisa
3. Preserve a qualidade pedagógica do material
4. Se solicitado adicionar/remover itens, ajuste a estrutura adequadamente
5. Confirme as mudanças feitas na sua resposta

IMPORTANTE: Retorne um JSON com:
{
  "response": "Mensagem explicando o que foi alterado",
  "updatedContent": {objeto JSON com o conteúdo atualizado}
}`;

    const userPrompt = `Seção: ${sectionTitle}

Conteúdo Atual:
${currentContent}

Instrução de Edição:
${editInstruction}

Aplique a edição solicitada e retorne o resultado no formato especificado.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(conversationHistory || []),
      { role: 'user', content: userPrompt }
    ];

    console.log('Calling Lovable AI for content editing...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
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
    let result;
    try {
      const jsonMatch = aiContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                       aiContent.match(/```\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : aiContent;
      result = JSON.parse(jsonString.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Fallback: return just the response text
      result = {
        response: aiContent,
        updatedContent: null
      };
    }

    // Update lecture in database if content was modified
    if (result.updatedContent) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Fetch current lecture
      const { data: lecture, error: fetchError } = await supabase
        .from('lectures')
        .select('structured_content')
        .eq('id', lectureId)
        .single();

      if (fetchError) throw fetchError;

      // Update the specific section
      const updatedStructuredContent = {
        ...lecture.structured_content,
        ...result.updatedContent
      };

      const { error: updateError } = await supabase
        .from('lectures')
        .update({
          structured_content: updatedStructuredContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', lectureId);

      if (updateError) throw updateError;

      console.log('Lecture updated successfully');
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error editing content:', error);
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
