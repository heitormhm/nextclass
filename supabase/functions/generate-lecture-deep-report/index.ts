import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Timeout helper
function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 120000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    ),
  ]);
}

// Main report generation function
async function generateReport(sessionId: string, lectureId: string, userId: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('📄 [Generate Report] Starting report generation...');

    // Check for idempotency - if report already generated, return it
    const { data: existingSession, error: fetchError } = await supabase
      .from('lecture_deep_search_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch session: ${fetchError.message}`);
    }

    if (existingSession.status === 'completed' && existingSession.result) {
      console.log('✅ [Generate Report] Report already exists (idempotency check)');
      return;
    }

    // Update status
    await supabase
      .from('lecture_deep_search_sessions')
      .update({ 
        status: 'generating',
        progress_step: 'Analyzing research data...',
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    // Load research data
    const researchData = existingSession.research_data;
    if (!researchData) {
      throw new Error('No research data found in session');
    }

    console.log('📊 [Generate Report] Research data loaded');
    console.log(`- Main query: ${researchData.main_query}`);
    console.log(`- Sub-questions: ${researchData.sub_questions?.length || 0}`);
    console.log(`- Total sources: ${researchData.total_sources || 0}`);

    // Update progress
    await supabase
      .from('lecture_deep_search_sessions')
      .update({ 
        progress_step: 'Generating educational material with AI...',
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    // Prepare context from research
    const researchContext = researchData.search_results
      .map((result: any, idx: number) => {
        const sourcesText = result.sources
          .map((s: any, i: number) => `   ${i + 1}. ${s.title}\n      URL: ${s.url}\n      Resumo: ${s.snippet}`)
          .join('\n\n');
        
        return `## Pergunta ${idx + 1}: ${result.question}\n\nFontes encontradas:\n${sourcesText}`;
      })
      .join('\n\n---\n\n');

    // Generate educational report using AI
    console.log('🤖 [AI] Calling Lovable AI to generate report...');
    
    const systemPrompt = `Você é Mia, uma assistente educacional especializada em criar material didático de alta qualidade.

Sua tarefa é transformar dados de pesquisa web em um resumo educacional estruturado e didático.

**FORMATO OBRIGATÓRIO:**

Use EXATAMENTE esta estrutura markdown:

# 📚 [Título do Tópico]

## 🎯 Resumo Executivo
[2-3 parágrafos com visão geral do tema, destacando os conceitos mais importantes]

## 📖 Conceitos Fundamentais

### [Conceito 1]
**Definição:** [definição clara]

**Aplicações:** [onde é usado]

**Exemplo Prático:** [exemplo real]

### [Conceito 2]
[mesma estrutura]

## 🔬 Estudo de Caso Real
**Contexto:** [situação real]

**Problema:** [desafio enfrentado]

**Solução:** [como foi resolvido]

**Resultados:** [impacto]

## 📐 Nota Técnica
[Explicação matemática ou técnica com equações/fórmulas se aplicável]

## 📚 Recursos Bibliográficos

1. **[Título da fonte]** - [URL]
   - Aborda: [o que contém]

2. **[Título da fonte 2]** - [URL]
   - Aborda: [o que contém]

## ✅ Pontos-Chave
- ✓ [ponto importante 1]
- ✓ [ponto importante 2]
- ✓ [ponto importante 3]

---

**REGRAS:**
- Use emojis para tornar mais visual
- Seja didático e claro
- Inclua exemplos práticos
- Cite as fontes fornecidas
- Use markdown (negrito, itálico, listas)
- Mantenha tom profissional mas acessível`;

    const userPrompt = `Tópico da Aula: "${researchData.main_query}"

Dados da Pesquisa Web:

${researchContext}

---

Gere um resumo educacional completo sobre este tópico, seguindo EXATAMENTE o formato especificado.`;

    let reportContent = '';
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        console.log(`🔄 [AI] Attempt ${retryCount + 1}/${maxRetries}`);
        
        const aiResponse = await withTimeout(
          fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${lovableApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
              ],
              temperature: 0.7,
              max_tokens: 4000,
            }),
          }),
          180000 // 3 minutes timeout
        );

        if (aiResponse.status === 429) {
          console.warn('⚠️ [AI] Rate limit, waiting 10s before retry...');
          await new Promise(resolve => setTimeout(resolve, 10000));
          retryCount++;
          continue;
        }

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          throw new Error(`AI request failed (${aiResponse.status}): ${errorText}`);
        }

        const aiData = await aiResponse.json();
        reportContent = aiData.choices[0].message.content;

        if (!reportContent || reportContent.trim().length < 100) {
          throw new Error('AI generated empty or too short response');
        }

        console.log('✅ [AI] Report generated successfully');
        break;

      } catch (error) {
        console.error(`❌ [AI] Error on attempt ${retryCount + 1}:`, error);
        retryCount++;
        
        if (retryCount >= maxRetries) {
          throw new Error(`Failed to generate report after ${maxRetries} attempts: ${error}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    // Update session with completed report
    await supabase
      .from('lecture_deep_search_sessions')
      .update({
        status: 'completed',
        result: reportContent,
        progress_step: 'Report generation complete!',
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    // Update lecture's structured_content with the new summary
    const { data: lecture, error: lectureError } = await supabase
      .from('lectures')
      .select('structured_content')
      .eq('id', lectureId)
      .single();

    if (!lectureError && lecture) {
      const structuredContent = lecture.structured_content || {};
      structuredContent.material_didatico = reportContent;

      await supabase
        .from('lectures')
        .update({ structured_content: structuredContent })
        .eq('id', lectureId);

      console.log('✅ [Update] Lecture material didático updated successfully');
    }

    console.log('✅ [Generate Report] Process completed successfully!');

  } catch (error) {
    console.error('❌ [Generate Report] Error:', error);
    
    await supabase
      .from('lecture_deep_search_sessions')
      .update({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error during report generation',
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);
    
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, lectureId } = await req.json();

    if (!sessionId || !lectureId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: sessionId, lectureId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📄 [Generate Lecture Deep Report] Starting background generation...');
    console.log('Session ID:', sessionId);
    console.log('Lecture ID:', lectureId);
    console.log('User ID:', user.id);

    // Start generation in background
    generateReport(sessionId, lectureId, user.id).catch(error => {
      console.error('Background report generation error:', error);
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Report generation started',
        sessionId 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-lecture-deep-report:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});