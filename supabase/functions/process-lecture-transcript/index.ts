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
1. GERE UM TÍTULO AUTOMÁTICO: Analise os temas centrais da transcrição e crie um título conciso e descritivo
2. Filtre hesitações, palavras de preenchimento ("uhm", "então...", "tipo assim"), repetições e conversas fora do tópico
3. Crie um resumo conciso destacando objetivos de aprendizagem e conclusões principais
4. Identifique conceitos fundamentais com definições claras extraídas do conteúdo
5. **REFERÊNCIAS CONFIÁVEIS**: Sugira APENAS 2-3 referências de fontes acadêmicas verificadas:
   - Artigos revisados por pares (IEEE, Elsevier, Springer, ABNT, SciELO)
   - Livros técnicos de editoras reconhecidas (McGraw-Hill, Pearson, Wiley, etc)
   - Documentação oficial de órgãos/universidades (MIT OpenCourseWare, Khan Academy)
   - **PROIBIDO**: Wikipedia, blogs pessoais, fóruns, redes sociais, PDFs aleatórios
   - **VALIDAÇÃO**: URLs devem ser de domínios .edu, .org (acadêmicos), .gov, ou editoras científicas
6. Formule 9 a 11 perguntas de múltipla escolha que apresentem cenários práticos ou problemas que exijam aplicação dos conceitos
7. Crie flashcards (termo e definição) baseados nos conceitos-chave

**DIAGRAMAS MERMAID - REGRAS CRÍTICAS (SE INCLUIR DIAGRAMAS NO MATERIAL DIDÁTICO):**
- Use APENAS sintaxe Mermaid ESTRITAMENTE válida (flowchart TD/LR, graph TD/LR, sequenceDiagram, stateDiagram-v2)
- Use APENAS setas ASCII simples: --> (direita), <-- (esquerda), <--> (ambos), ==> (bold)
- NUNCA use setas Unicode: ❌ → ← ↔ ⇒ ⇐ ⇔
- Use APENAS IDs de nós alfanuméricos SIMPLES: A, B, C, Node1, Estado1 (SEM espaços, SEM caracteres especiais)
- LABELS devem conter APENAS texto ASCII básico (A-Z, a-z, 0-9, espaços)
- REMOVA parênteses (), aspas "", colchetes [] do CONTEÚDO de labels
- SUBSTITUA letras gregas por nomes: Δ→Delta, π→pi, α→alpha, θ→theta
- REMOVA caracteres especiais: &, <, >, ", '
- TESTE mentalmente o diagrama antes de gerar
- Se houver QUALQUER dúvida sobre a sintaxe, NÃO inclua o diagrama

**EXEMPLO CORRETO:**
\`\`\`mermaid
flowchart TD
    A[Sistema Inicial] --> B{Verifica Estado}
    B -->|Sim| C[Processa Delta T]
    B -->|Nao| D[Aguarda]
\`\`\`

**EXEMPLO INCORRETO (NÃO FAZER):**
\`\`\`mermaid
graph TD
    A[Sistema (Q→W)] → B{Δ Estado}
\`\`\`

IMPORTANTE: Retorne APENAS o JSON, sem texto adicional antes ou depois.`;

    const userPrompt = `Analise esta transcrição de aula e gere material didático estruturado:

TRANSCRIÇÃO:
${transcript}

Retorne um JSON com esta estrutura exata:
{
  "titulo_aula": "string (gere automaticamente com base no conteúdo)",
  "resumo": "string",
  "topicos_principais": [
    { "conceito": "string", "definicao": "string" }
  ],
  "referencias_externas": [
    { "titulo": "string", "url": "string (URL válida)", "tipo": "artigo/livro/documentação" }
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

    console.log('Parsed response:', structuredContent);

    // Validate and clean Mermaid diagrams
    function validateAndCleanMermaidDiagrams(markdown: string): string {
      console.log('[Mermaid Validation] Starting validation...');
      
      const mermaidBlockRegex = /```mermaid\s*\n([\s\S]*?)```/g;
      const problematicCharsRegex = /[→←↔⇒⇐⇔ΔΣαβγθλμπσω&<>"']/;
      
      let cleanedMarkdown = markdown;
      let blocksFound = 0;
      let blocksRemoved = 0;
      
      cleanedMarkdown = cleanedMarkdown.replace(mermaidBlockRegex, (match, code) => {
        blocksFound++;
        
        // Validação 1: Verifica caracteres problemáticos
        if (problematicCharsRegex.test(code)) {
          console.warn(`[Mermaid Validation] Block ${blocksFound} contains problematic characters. Removing.`);
          blocksRemoved++;
          return '';
        }
        
        // Validação 2: Verifica tipo de diagrama válido
        const validDiagramTypes = /^(flowchart|graph|sequenceDiagram|stateDiagram-v2|classDiagram)/m;
        if (!validDiagramTypes.test(code)) {
          console.warn(`[Mermaid Validation] Block ${blocksFound} has invalid diagram type. Removing.`);
          blocksRemoved++;
          return '';
        }
        
        // Validação 3: Verifica se tem conteúdo mínimo
        if (code.trim().length < 20) {
          console.warn(`[Mermaid Validation] Block ${blocksFound} is too short. Removing.`);
          blocksRemoved++;
          return '';
        }
        
        console.log(`[Mermaid Validation] Block ${blocksFound} passed validation ✅`);
        return match;
      });
      
      console.log(`[Mermaid Validation] Summary: ${blocksFound} blocks found, ${blocksRemoved} removed, ${blocksFound - blocksRemoved} kept`);
      
      return cleanedMarkdown;
    }

    // Update lecture with structured content
    const { error: updateError } = await supabase
      .from('lectures')
      .update({ 
        structured_content: {
          ...structuredContent,
          material_didatico: structuredContent.material_didatico 
            ? validateAndCleanMermaidDiagrams(structuredContent.material_didatico)
            : null
        },
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