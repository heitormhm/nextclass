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

    const systemPrompt = `Você é Mia, assistente especializada em edição de material didático.

TAREFA: Editar o conteúdo com base nas instruções do professor.

FORMATO DE RESPOSTA OBRIGATÓRIO (JSON válido):
{
  "response": "Breve descrição do que foi alterado (max 100 caracteres)",
  "updatedContent": {
    "material_didatico": "conteúdo atualizado aqui com gráficos Mermaid integrados"
  }
}

REGRAS CRÍTICAS DE FORMATAÇÃO:
1. SEMPRE retorne JSON válido no formato acima
2. NUNCA adicione texto fora do JSON
3. NUNCA use markdown code blocks (sem \`\`\`json)
4. Para gráficos Mermaid, use blocos: \`\`\`mermaid\\ngraph TD\\nA-->B\`\`\`
5. Use \\n para quebras de linha dentro do JSON
6. Escape aspas duplas dentro do conteúdo: \\"
7. Mantenha o conteúdo original e adicione elementos visuais
8. Use no mínimo 2 diagramas Mermaid relevantes

IMPORTANTE: 
- Sua resposta DEVE ser JSON puro válido
- Inicie com { e termine com }
- Use escape correto para todos os caracteres especiais`;

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
      // Remover markdown code blocks se existirem
      let cleanedContent = aiContent.trim();
      
      // Remover ```json ... ``` ou ``` ... ```
      const jsonMatch = cleanedContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        cleanedContent = jsonMatch[1].trim();
      }
      
      // Tentar encontrar JSON válido
      const jsonStart = cleanedContent.indexOf('{');
      const jsonEnd = cleanedContent.lastIndexOf('}');
      
      if (jsonStart === -1 || jsonEnd === -1 || jsonStart > jsonEnd) {
        throw new Error('No valid JSON structure found (missing { or })');
      }
      
      cleanedContent = cleanedContent.substring(jsonStart, jsonEnd + 1);
      
      // Tentar parsing incremental para detectar onde falha
      console.log('[Edit Content] Attempting to parse JSON...');
      console.log('[Edit Content] JSON length:', cleanedContent.length);
      
      try {
        result = JSON.parse(cleanedContent);
      } catch (parseError1) {
        // Se falhar, tentar remover o último caractere (pode estar truncado)
        console.warn('[Edit Content] First parse attempt failed, trying without last char...');
        try {
          result = JSON.parse(cleanedContent.slice(0, -1) + '}');
        } catch (parseError2) {
          // Se ainda falhar, logar mais detalhes
          console.error('[Edit Content] ❌ Both parse attempts failed');
          console.error('[Edit Content] Last 200 chars:', cleanedContent.slice(-200));
          throw parseError1;
        }
      }
      
      // Validar estrutura
      if (!result.updatedContent || !result.updatedContent.material_didatico) {
        throw new Error('Invalid response structure: missing updatedContent.material_didatico');
      }
      
      console.log('✅ Successfully parsed AI response');
      console.log('[Edit Content] Response description:', result.response);
      console.log('[Edit Content] Material length:', result.updatedContent.material_didatico.length);
      
    } catch (parseError) {
      console.error('❌ Failed to parse AI response:', parseError);
      console.error('📋 First 500 chars:', aiContent.substring(0, 500));
      console.error('📋 Last 500 chars:', aiContent.substring(Math.max(0, aiContent.length - 500)));
      
      throw new Error(`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
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
