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

  const systemPrompt = `Você é Mia, especialista em adicionar elementos visuais a materiais educacionais.

🎯 TAREFA CRÍTICA:
Você receberá um material didático em Markdown e deve RETORNAR O MATERIAL COMPLETO com gráficos Mermaid integrados.

⚠️ REGRA OBRIGATÓRIA:
- NUNCA retorne apenas os gráficos
- SEMPRE retorne o material didático INTEIRO (cabeçalho, texto, equações, referências)
- Os gráficos devem ser INSERIDOS estrategicamente no texto existente
- Mantenha 100% do conteúdo original (não remova NADA)

📊 REQUISITOS DE GRÁFICOS:
1. Adicione NO MÍNIMO 3-5 diagramas Mermaid
2. Use tipos variados:
   - \`graph TD\` ou \`graph LR\` → Flowcharts de processos
   - \`sequenceDiagram\` → Interações entre componentes
   - \`stateDiagram-v2\` → Máquinas de estado
   - \`classDiagram\` → Estruturas de classes
3. Posicione estrategicamente:
   - ❌ NUNCA antes da explicação do conceito
   - ✅ SEMPRE após 300-600 palavras de explicação
   - ✅ Um diagrama por seção principal
   - ✅ Após parágrafos que mencionam processos, fluxos ou estruturas

🎨 POSICIONAMENTO CORRETO:

**❌ ERRADO:**
## 2. Primeira Lei da Termodinâmica

\`\`\`mermaid
graph TD
  A-->B
\`\`\`

A Primeira Lei estabelece...

**✅ CORRETO:**
## 2. Primeira Lei da Termodinâmica

A Primeira Lei da Termodinâmica estabelece a conservação de energia em sistemas termodinâmicos. Para um sistema fechado, a energia interna ($\\Delta U$) varia conforme o calor ($Q$) adicionado ao sistema e o trabalho ($W$) realizado pelo sistema, segundo a equação:

$$\\Delta U = Q - W$$

Onde:
- $Q$ → Calor transferido para o sistema (J)
- $W$ → Trabalho realizado pelo sistema (J)
- $\\Delta U$ → Variação da energia interna (J)

\`\`\`mermaid
graph TD
    A[Sistema Recebe Calor Q] --> B{Primeira Lei}
    B --> C[Trabalho W realizado]
    B --> D[Energia Interna ΔU aumenta]
    C --> E[Q - W = ΔU]
    D --> E
    style A fill:#e3f2fd
    style B fill:#fff9c4
    style E fill:#c8e6c9
\`\`\`

Esta relação mostra que...

📐 SINTAXE MERMAID VÁLIDA:

**Flowchart básico:**
\`\`\`mermaid
graph TD
    A[Entrada] --> B{Decisão}
    B -->|Sim| C[Processo 1]
    B -->|Não| D[Processo 2]
    C --> E[Saída]
    D --> E
    style A fill:#e3f2fd
    style B fill:#fff9c4
    style E fill:#c8e6c9
\`\`\`

**Diagrama de sequência:**
\`\`\`mermaid
sequenceDiagram
    participant A as Sistema
    participant B as Ambiente
    A->>B: Fornece Calor Q
    B->>A: Realiza Trabalho W
    A->>A: Aumenta ΔU
\`\`\`

**State diagram:**
\`\`\`mermaid
stateDiagram-v2
    [*] --> Estado_Inicial
    Estado_Inicial --> Processo: Adição de Calor
    Processo --> Estado_Final
    Estado_Final --> [*]
\`\`\`

🔧 INSTRUÇÕES DE TOOL:
Use a função 'update_material' retornando:
- \`response\`: Breve resumo das mudanças (max 150 chars)
- \`updatedContent.material_didatico\`: Material COMPLETO com gráficos inseridos`;

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
        max_completion_tokens: 24000, // Increased from 16000 to support large materials with diagrams
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

    // Validate content size to detect truncation
    const updatedLength = result.updatedContent.material_didatico.length;
    const originalLength = currentContent.length;

    if (updatedLength < originalLength * 0.8) {
      console.error(`[Edit Content] ⚠️ Output too short: ${updatedLength} chars vs ${originalLength} original`);
      throw new Error(`AI returned truncated content (${updatedLength} chars vs ${originalLength} original). Material may be too long.`);
    }

    if (updatedLength < 1000) {
      throw new Error('AI returned suspiciously short content (< 1000 chars)');
    }

    console.log(`[Edit Content] ✅ Validation passed: ${updatedLength} chars (original: ${originalLength})`);

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
