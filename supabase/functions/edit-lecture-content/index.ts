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

  const systemPrompt = `Você é Mia, especialista em criar materiais visuais educacionais para engenharia.

TAREFA: Adicionar gráficos Mermaid, tabelas e diagramas ao material didático.

REQUISITOS OBRIGATÓRIOS:
1. Adicione NO MÍNIMO 3 gráficos Mermaid (idealmente 4-5)
2. Use tipos variados:
   - Flowchart (graph TD/LR) para processos
   - Sequence diagram para interações
   - State diagram para máquinas de estado
   - Class diagram para estruturas
3. Posicione gráficos estrategicamente:
   - Após seções explicativas (nunca antes)
   - Um gráfico a cada 400-600 palavras
   - No mínimo 1 gráfico nas seções principais
4. Mantenha TODO o conteúdo original (não remova NADA)
5. Use sintaxe Mermaid válida e testada

EXEMPLOS DE POSICIONAMENTO:

**❌ ERRADO (antes da explicação):**
## 2. Conceitos

\`\`\`mermaid
graph TD
  A-->B
\`\`\`

Aqui está o conceito...

**✅ CORRETO (depois da explicação):**
## 2. Conceitos

A Primeira Lei estabelece que... [300 palavras de explicação]

\`\`\`mermaid
graph TD
    A[Energia Interna] --> B{Primeira Lei}
    B --> C[Q - W = ΔU]
\`\`\`

SINTAXE MERMAID VÁLIDA:

\`\`\`mermaid
graph TD
    A[Entrada] --> B{Decisão}
    B -->|Sim| C[Processo 1]
    B -->|Não| D[Processo 2]
    C --> E[Saída]
    D --> E
\`\`\`

Use a função 'update_material' para retornar o conteúdo atualizado.`;

    // Define tool for structured output
    const updateMaterialTool = {
      type: "function",
      function: {
        name: "update_material",
        description: "Retorna o material didático atualizado com gráficos Mermaid integrados",
        parameters: {
          type: "object",
          properties: {
            response: {
              type: "string",
              description: "Breve descrição das mudanças (max 150 chars)"
            },
            updatedContent: {
              type: "object",
              properties: {
                material_didatico: {
                  type: "string",
                  description: "Material completo com gráficos Mermaid adicionados"
                }
              },
              required: ["material_didatico"]
            }
          },
          required: ["response", "updatedContent"]
        }
      }
    };

    console.log('Calling Lovable AI for content editing...');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 90s timeout

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
          {
            role: 'user',
            content: `Material atual:\n\n${currentContent}\n\nInstrução: ${editInstruction}`
          }
        ],
        tools: [updateMaterialTool],
        tool_choice: { type: "function", function: { name: "update_material" } },
        max_completion_tokens: 16000,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[Edit Content] AI API error:', aiResponse.status, errorText.substring(0, 200));
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const data = await aiResponse.json();
    const message = data.choices?.[0]?.message;

    if (!message?.tool_calls || message.tool_calls.length === 0) {
      console.error('[Edit Content] No tool calls in response');
      throw new Error('AI did not call update_material function');
    }

    // Extract result from tool call
    const toolCall = message.tool_calls[0];
    const result = JSON.parse(toolCall.function.arguments);

    console.log('[Edit Content] ✅ Tool call successful');
    console.log('[Edit Content] Response:', result.response);
    console.log('[Edit Content] Material length:', result.updatedContent?.material_didatico?.length || 0);

    // Validate structure
    if (!result.updatedContent?.material_didatico) {
      throw new Error('Invalid tool response: missing updatedContent.material_didatico');
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
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('Error editing content: timeout');
      return new Response(
        JSON.stringify({ error: 'AI request timeout (90s). Material muito extenso.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
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
