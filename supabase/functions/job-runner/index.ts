import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// =========================
// HELPER FUNCTIONS
// =========================

// Função para sanitizar JSON malformado
function sanitizeJSON(jsonString: string): string {
  // Remove markdown wrappers
  let cleaned = jsonString.replace(/```json\s*/g, '').replace(/```\s*/g, '');
  
  // Remove quebras de linha dentro de strings
  cleaned = cleaned.replace(/\n(?=(?:[^"]*"[^"]*")*[^"]*$)/g, ' ');
  
  // Remove espaços extras
  cleaned = cleaned.trim();
  
  return cleaned;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 120000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

async function executeWebSearch(
  query: string,
  braveApiKey: string,
  numResults: number = 5
): Promise<Array<{ url: string; title: string; snippet: string }>> {
  console.log(`🔍 Searching: "${query}"`);

  // Add academic keywords to query
  const academicQuery = `${query} (site:edu OR site:gov OR site:org OR "journal" OR "paper" OR "research" OR "academic" OR "scientific")`;
  
  try {
    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(academicQuery)}&count=${numResults * 3}`,
      {
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': braveApiKey,
        },
      }
    );

    if (!response.ok) {
      console.error(`Brave API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const results = data.web?.results || [];

    // Filter and prioritize academic sources
    const filteredResults = results
      .filter((r: any) => {
        const url = r.url?.toLowerCase() || '';
        const title = r.title?.toLowerCase() || '';
        
        // Priority 1: Academic domains
        const isAcademic = url.includes('.edu') || 
                           url.includes('.gov') || 
                           url.includes('.org') ||
                           url.includes('scielo') ||
                           url.includes('scholar') ||
                           url.includes('ieee') ||
                           url.includes('springer') ||
                           url.includes('elsevier') ||
                           url.includes('researchgate');
        
        // Priority 2: Academic keywords in title
        const hasAcademicKeywords = title.includes('journal') ||
                                     title.includes('paper') ||
                                     title.includes('research') ||
                                     title.includes('study') ||
                                     title.includes('academic') ||
                                     title.includes('engineering');
        
        // Reject unreliable sources
        const isBlacklisted = url.includes('wikipedia') ||
                               url.includes('blog.') ||
                               url.includes('forum') ||
                               url.includes('reddit');
        
        return (isAcademic || hasAcademicKeywords) && !isBlacklisted;
      })
      .map((r: any) => ({
        url: r.url || '',
        title: r.title || '',
        snippet: r.description || '',
      }));

    const academicCount = filteredResults.filter((s: any) => 
      s.url.includes('.edu') || 
      s.url.includes('.gov') || 
      s.url.includes('scholar')
    ).length;
    
    console.log(`✓ Found ${filteredResults.length} filtered sources (${academicCount} academic) from ${results.length} total results`);
    
    return filteredResults.slice(0, numResults);
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}

// =========================
// STATE MACHINE HANDLERS
// =========================

async function handlePendingState(job: any, supabaseAdmin: any, lovableApiKey: string) {
  // ✅ IDEMPOTÊNCIA: Verificar se já processamos este estado
  if (job.intermediate_data?.pendingCompleted) {
    console.log(`⏭️ [${job.id}] PENDING state already processed, skipping`);
    return;
  }
  
  console.log(`🔄 [${job.id}] Handling PENDING state - Decomposing query`);
  
  const query = job.input_payload.query;
  
  const systemPrompt = `Você é um assistente de pesquisa académica especializado em engenharia. 
Sua tarefa é decompor uma pergunta complexa em 3-5 sub-perguntas mais simples e específicas que, quando respondidas em conjunto, fornecem uma resposta completa à pergunta original.

INSTRUÇÕES:
- Gere entre 3 e 5 sub-perguntas
- Cada sub-pergunta deve ser clara, específica e focada
- As sub-perguntas devem cobrir diferentes aspectos do tópico
- Use terminologia técnica apropriada para engenharia
- Responda APENAS com um array JSON de strings, sem texto adicional

Exemplo de formato de resposta:
["Sub-pergunta 1", "Sub-pergunta 2", "Sub-pergunta 3"]`;

  try {
    const response = await withTimeout(
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
            { role: 'user', content: `Pergunta: ${query}` }
          ],
          temperature: 0.7,
        }),
      }),
      120000
    );

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    // Parse JSON response
    const jsonMatch = content.match(/\[.*\]/s);
    if (!jsonMatch) {
      throw new Error('No valid JSON array found in response');
    }

    const decomposedQuestions = JSON.parse(jsonMatch[0]);
    console.log(`✅ Decomposed into ${decomposedQuestions.length} questions`);

    // Update job status and save intermediate data
    const updatePayload = {
      status: 'DECOMPOSING',
      intermediate_data: {
        decomposed_questions: decomposedQuestions,
        pendingCompleted: true,
        step: '1'
      }
    };
    
    console.log(`\n🔵 DB-UPDATE-INTENT [handlePendingState]:`, JSON.stringify({
      jobId: job.id,
      action: 'Setting status to DECOMPOSING and step to 1',
      payload: updatePayload
    }, null, 2));
    
    const { error: updateError } = await supabaseAdmin
      .from('jobs')
      .update(updatePayload)
      .eq('id', job.id);
    
    if (updateError) {
      console.error(`❌ DB-UPDATE-FAILED [handlePendingState]:`, updateError);
      throw updateError;
    } else {
      console.log(`✅ DB-UPDATE-SUCCESS [handlePendingState]`);
    }
    
    // Validar que foi persistido
    const { data: validatedJob, error: validationError } = await supabaseAdmin
      .from('jobs')
      .select('intermediate_data, status')
      .eq('id', job.id)
      .single();
    
    if (validationError) {
      console.error(`❌ DB-VALIDATION-FAILED [handlePendingState]:`, validationError);
    } else {
      console.log(`🔍 DB-VALIDATION-SUCCESS [handlePendingState]:`, JSON.stringify({
        status: validatedJob.status,
        step: validatedJob.intermediate_data?.step,
        pendingCompleted: validatedJob.intermediate_data?.pendingCompleted
      }, null, 2));
    }

    // Self-invoke for next state
    await selfInvoke(job.id);
  } catch (error) {
    console.error('Error in PENDING state:', error);
    throw error;
  }
}

async function handleDecomposingState(job: any, supabaseAdmin: any, braveApiKey: string) {
  // ✅ IDEMPOTÊNCIA: Verificar se já executamos as buscas
  if (job.intermediate_data?.decomposingCompleted) {
    console.log(`⏭️ [${job.id}] DECOMPOSING state already processed, skipping`);
    return;
  }
  
  console.log(`🔍 [${job.id}] Handling DECOMPOSING state - Executing web searches`);
  
  const decomposedQuestions = job.intermediate_data.decomposed_questions || [];
  
  if (decomposedQuestions.length === 0) {
    throw new Error('No decomposed questions found');
  }

  const MAX_ITERATIONS = 5;
  const TARGET_SOURCES = 5;
  const searchResults: Array<{ question: string; sources: any[] }> = [];

  // Execute searches for each question
  for (let i = 0; i < decomposedQuestions.length; i++) {
    const question = decomposedQuestions[i];
    console.log(`📝 Searching for question ${i + 1}/${decomposedQuestions.length}: ${question}`);
    
    const sources = await executeWebSearch(question, braveApiKey, TARGET_SOURCES);
    searchResults.push({
      question,
      sources: sources.slice(0, TARGET_SOURCES)
    });
    
    console.log(`✓ Found ${sources.length} sources for question ${i + 1}`);
  }

  console.log(`✅ Total search results collected: ${searchResults.reduce((acc, r) => acc + r.sources.length, 0)} sources`);

  // Update job status and save search results
  const updatePayload = {
    status: 'RESEARCHING',
    intermediate_data: {
      ...job.intermediate_data,
      search_results: searchResults,
      decomposingCompleted: true,
      step: '2'
    }
  };
  
  console.log(`\n🔵 DB-UPDATE-INTENT [handleDecomposingState]:`, JSON.stringify({
    jobId: job.id,
    action: 'Setting status to RESEARCHING and step to 2',
    payload: updatePayload
  }, null, 2));
  
  const { error: updateError } = await supabaseAdmin
    .from('jobs')
    .update(updatePayload)
    .eq('id', job.id);
  
  if (updateError) {
    console.error(`❌ DB-UPDATE-FAILED [handleDecomposingState]:`, updateError);
    throw updateError;
  } else {
    console.log(`✅ DB-UPDATE-SUCCESS [handleDecomposingState]`);
  }
  
  // Validar que foi persistido
  const { data: validatedJob, error: validationError } = await supabaseAdmin
    .from('jobs')
    .select('intermediate_data, status')
    .eq('id', job.id)
    .single();
  
  if (validationError) {
    console.error(`❌ DB-VALIDATION-FAILED [handleDecomposingState]:`, validationError);
  } else {
    console.log(`🔍 DB-VALIDATION-SUCCESS [handleDecomposingState]:`, JSON.stringify({
      status: validatedJob.status,
      step: validatedJob.intermediate_data?.step,
      decomposingCompleted: validatedJob.intermediate_data?.decomposingCompleted,
      searchResultsCount: validatedJob.intermediate_data?.search_results?.length
    }, null, 2));
  }

  // Self-invoke for next state
  await selfInvoke(job.id);
}

async function handleResearchingState(job: any, supabaseAdmin: any, lovableApiKey: string) {
  // ✅ IDEMPOTÊNCIA: Verificar se já sintetizamos o relatório
  if (job.intermediate_data?.researchingCompleted) {
    console.log(`⏭️ [${job.id}] RESEARCHING state already processed, skipping`);
    return;
  }
  
  console.log(`📝 [${job.id}] Handling RESEARCHING state - Synthesizing report`);
  console.log(`🔍 [${job.id}] Current intermediate_data BEFORE step 3 update:`, JSON.stringify(job.intermediate_data, null, 2));
  
  // ✅ Atualizar para step 3 ANTES de sintetizar
  const newIntermediateData = {
    ...job.intermediate_data,
    step: '3',
    synthesisStarted: new Date().toISOString()
  };
  
  console.log(`\n🔵 DB-UPDATE-INTENT [handleResearchingState - Step 3]:`, JSON.stringify({
    jobId: job.id,
    action: 'Setting step to 3 before AI synthesis',
    currentStep: job.intermediate_data?.step,
    newStep: '3'
  }, null, 2));
  
  const { error: stepUpdateError } = await supabaseAdmin
    .from('jobs')
    .update({
      intermediate_data: newIntermediateData
    })
    .eq('id', job.id);
    
  if (stepUpdateError) {
    console.error(`❌ DB-UPDATE-FAILED [Step 3]:`, stepUpdateError);
    throw stepUpdateError;
  } else {
    console.log(`✅ DB-UPDATE-SUCCESS [Step 3]`);
  }
  
  // Validação IMEDIATA
  const { data: validatedStep3, error: validationError } = await supabaseAdmin
    .from('jobs')
    .select('intermediate_data')
    .eq('id', job.id)
    .single();
  
  if (validationError) {
    console.error(`❌ DB-VALIDATION-FAILED [Step 3]:`, validationError);
  } else {
    console.log(`🔍 DB-VALIDATION-SUCCESS [Step 3]:`, JSON.stringify({
      step: validatedStep3?.intermediate_data?.step,
      synthesisStarted: validatedStep3?.intermediate_data?.synthesisStarted
    }, null, 2));
  }
  
  // Recarregar job completo para usar daqui pra frente
  const { data: updatedJob, error: reloadError } = await supabaseAdmin
    .from('jobs')
    .select('*')
    .eq('id', job.id)
    .single();
    
  if (reloadError || !updatedJob) {
    console.error(`❌ [${job.id}] Error reloading job:`, reloadError);
    return;
  }
  
  const query = updatedJob.input_payload.query;
  const searchResults = updatedJob.intermediate_data.search_results || [];

  if (searchResults.length === 0) {
    throw new Error('No search results found');
  }

  // Build context from search results
  let researchContext = '\n\n**FONTES ENCONTRADAS:**\n\n';
  searchResults.forEach((result: any, idx: number) => {
    researchContext += `\n### ${result.question}\n`;
    result.sources.forEach((source: any, sourceIdx: number) => {
      researchContext += `\n**Fonte ${idx + 1}.${sourceIdx + 1}:**\n`;
      researchContext += `- Título: ${source.title}\n`;
      researchContext += `- URL: ${source.url}\n`;
      researchContext += `- Resumo: ${source.snippet}\n`;
    });
  });

  const systemPrompt = `Você é um assistente de pesquisa acadêmica especializado em engenharia de nível universitário.
Sua tarefa é sintetizar um relatório acadêmico completo, profundo e tecnicamente rigoroso em português brasileiro, apropriado para estudantes e profissionais de engenharia.

**PÚBLICO-ALVO**: Estudantes de graduação e pós-graduação em engenharia, professores e profissionais da área.

**NÍVEL DE RIGOR**: Ensino superior - use terminologia técnica precisa, equações matemáticas quando apropriado, e mantenha alto padrão de rigor científico.

**FORMATO OBRIGATÓRIO DO RELATÓRIO:**

# [Título Técnico do Tópico]

## 1. Introdução
[Contextualização acadêmica do tema, incluindo relevância histórica e estado da arte. Todas as afirmações devem ter citações numeradas [1], [2], etc.]

## 2. Fundamentação Teórica
[Explicação detalhada dos conceitos, equações e princípios fundamentais. Cada afirmação factual deve ter citação [X]. Use notação matemática apropriada: ΔU = Q - W, etc.]

## 3. Análise Técnica Aprofundada
[Discussão técnica avançada com derivações matemáticas quando relevante, diagramas conceituais descritos, e análise crítica das fontes.]

## 4. Aplicações em Engenharia
[Exemplos práticos de aplicação industrial e de projeto, preferencialmente com casos brasileiros quando disponíveis.]

## 5. Desafios e Perspectivas Futuras
[Limitações atuais, áreas de pesquisa ativa, e tendências tecnológicas.]

## 6. Conclusão
[Síntese objetiva dos pontos principais e relevância para a prática profissional.]

## 7. Tópicos Sugeridos para Aprofundamento

Com base nesta análise, recomendo explorar os seguintes tópicos para expandir seu conhecimento:

1. **[Tópico 1]**: [Breve descrição do por quê é relevante para compreender melhor o tema principal]
2. **[Tópico 2]**: [Breve descrição do por quê é relevante]
3. **[Tópico 3]**: [Breve descrição do por quê é relevante]

Estes tópicos complementam a compreensão de [tema principal] e podem ser explorados através de pesquisas adicionais ou consultas com o assistente AI.

## Referências Bibliográficas
[Lista numerada no formato acadêmico:
[1] Título da Fonte - Instituição/Autor - URL
[2] ...]

**REGRAS CRÍTICAS:**

1. **Citações obrigatórias**: TODAS as afirmações factuais devem ter citação numérica [X] imediatamente após.

2. **Apenas fontes fornecidas**: Use EXCLUSIVAMENTE as fontes web fornecidas. Não invente referências.

3. **Rigor acadêmico**: 
   - Use terminologia técnica precisa (ex: "entalpia específica", "escoamento isentrópico")
   - Quando houver equações, use notação matemática clara: ΔU = Q - W, P₁V₁ = P₂V₂
   - Explique conceitos de forma completa mas concisa
   - Mantenha tom formal e objetivo

4. **Qualidade sobre quantidade**:
   - Priorize informações de fontes .edu, .gov, .org, e publicações científicas
   - Se uma fonte não for confiável, não a use
   - Mínimo 1500 palavras, máximo 3000 palavras

5. **Contexto brasileiro**: Quando relevante, inclua exemplos de aplicação no contexto da engenharia brasileira (normas ABNT, indústrias nacionais, etc.).

6. **Estrutura clara**: Use cabeçalhos numerados (##), listas quando apropriado, e parágrafos bem organizados para facilitar leitura.

7. **Matemática**: Para equações importantes, apresente-as destacadas e explique cada variável.`;

  const userPrompt = `Pergunta Original: ${query}

${researchContext}

Sintetize um relatório académico completo sobre este tema, usando APENAS as fontes fornecidas acima.`;

  try {
    console.log('🤖 Calling AI for report synthesis...');
    const response = await withTimeout(
      fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
      }),
      180000 // 3 minutes for synthesis
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const report = data.choices?.[0]?.message?.content;

    if (!report) {
      throw new Error('No report content in AI response');
    }

    console.log(`✅ Report generated (${report.length} characters)`);

    // ✅ SALVAR RELATÓRIO COMO MENSAGEM NO CHAT
    await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: job.input_payload.conversationId,
        role: 'assistant',
        content: report,
        metadata: {
          isReport: true,
          reportTitle: 'Relatório de Pesquisa Profunda'
        }
      });

    console.log('✅ Report saved as message');

    // Update job as completed with step 4
    const finalIntermediateData = {
      ...updatedJob.intermediate_data,
      researchingCompleted: true,
      step: '4',
      completedAt: new Date().toISOString()
    };
    
    const finalPayload = {
      status: 'COMPLETED',
      result: report,
      intermediate_data: finalIntermediateData
    };
    
    console.log(`\n🔵 DB-UPDATE-INTENT [handleResearchingState - COMPLETED]:`, JSON.stringify({
      jobId: job.id,
      action: 'Setting status to COMPLETED and step to 4',
      payload: finalPayload
    }, null, 2));
    
    const { error: completionError } = await supabaseAdmin
      .from('jobs')
      .update(finalPayload)
      .eq('id', job.id);
      
    if (completionError) {
      console.error(`❌ DB-UPDATE-FAILED [COMPLETED]:`, completionError);
      throw completionError;
    } else {
      console.log(`✅ DB-UPDATE-SUCCESS [COMPLETED]`);
    }
    
    // Validação CRÍTICA
    const { data: finalValidation, error: finalValidationError } = await supabaseAdmin
      .from('jobs')
      .select('status, intermediate_data')
      .eq('id', job.id)
      .single();
      
    if (finalValidationError) {
      console.error(`❌ DB-VALIDATION-FAILED [COMPLETED]:`, finalValidationError);
    } else {
      console.log(`🔍 DB-VALIDATION-SUCCESS [COMPLETED]:`, JSON.stringify({
        status: finalValidation?.status,
        step: finalValidation?.intermediate_data?.step,
        researchingCompleted: finalValidation?.intermediate_data?.researchingCompleted,
        completedAt: finalValidation?.intermediate_data?.completedAt
      }, null, 2));
    }

    console.log(`✅ [${job.id}] Deep search completed`);
    
    // 🔥 CRIAR JOB DE SUGESTÕES APÓS DEEP SEARCH
    try {
      console.log(`💡 Creating suggestions job for Deep Search ${job.id}`);
      
      const { data: suggestionsJob, error: suggestionError } = await supabaseAdmin
        .from('jobs')
        .insert({
          user_id: job.user_id,
          job_type: 'GENERATE_SUGGESTIONS',
          status: 'PENDING',
          input_payload: { 
            context: report,
            topic: job.input_payload.query,
            conversationId: job.input_payload.conversationId
          }
        })
        .select()
        .single();

      if (!suggestionError && suggestionsJob) {
        await supabaseAdmin
          .from('jobs')
          .update({
            intermediate_data: {
              ...finalIntermediateData, // ✅ Use the final completed state
              suggestionsJobId: suggestionsJob.id
            }
          })
          .eq('id', job.id);
        
        // Vincular o job de sugestões à última mensagem da Mia
        const { data: lastMessage } = await supabaseAdmin
          .from('messages')
          .select('id')
          .eq('conversation_id', job.input_payload.conversationId)
          .eq('role', 'assistant')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (lastMessage) {
          await supabaseAdmin
            .from('messages')
            .update({ suggestions_job_id: suggestionsJob.id })
            .eq('id', lastMessage.id);
        }
        
        supabaseAdmin.functions.invoke('job-runner', {
          body: { jobId: suggestionsJob.id }
        }).catch((err: Error) => console.error('Error invoking suggestions job:', err));
        
        console.log(`✨ Suggestions job ${suggestionsJob.id} created and linked for Deep Search`);
      }
    } catch (error) {
      console.error('Failed to create suggestions after Deep Search:', error);
    }
  } catch (error) {
    console.error('Error in RESEARCHING state:', error);
    throw error;
  }
}

// =========================
// INTERACTIVE ACTION HANDLERS
// =========================

// 🆕 Função auxiliar para criar mensagem de sugestões
async function createSuggestionsMessage(job: any, supabaseAdmin: any, suggestions: any) {
  if (!job.input_payload.conversationId) return;
  
  // Salvar na tabela conversation_suggestions
  await supabaseAdmin
    .from('conversation_suggestions')
    .insert({
      conversation_id: job.input_payload.conversationId,
      message_index: job.input_payload.messageIndex || 0,
      suggestions: suggestions
    });
  
  // Criar mensagem simples - os botões serão renderizados pelo componente SuggestionsButtons
  const suggestionText = `✨ **Continue explorando** sobre **${job.input_payload.topic || 'este tema'}**:`;
  
  await supabaseAdmin
    .from('messages')
    .insert({
      conversation_id: job.input_payload.conversationId,
      role: 'assistant',
      content: suggestionText,
      suggestions_job_id: job.id // Este campo dispara o componente SuggestionsButtons
    });
  
  console.log(`✨ Created new message with suggestions for conversation ${job.input_payload.conversationId}`);
}

async function handleGenerateSuggestions(job: any, supabaseAdmin: any, lovableApiKey: string) {
  console.log(`💡 [${job.id}] Generating topic suggestions`);
  
  const { context, topic } = job.input_payload;
  
  const systemPrompt = `Você é um assistente educacional especializado em engenharia.
Sua tarefa é gerar 3-4 perguntas de aprofundamento ESPECÍFICAS sobre o conteúdo do relatório.

REGRAS CRÍTICAS:
- EXTRAIA conceitos técnicos, métodos, e termos específicos do contexto fornecido
- Use NOMES PRÓPRIOS de teorias, leis, métodos mencionados no texto
- Cada pergunta deve INCLUIR termos técnicos específicos do relatório (ex: "Método dos Elementos Finitos", "cargas dinâmicas")
- Cubra aspectos: aplicações práticas, casos de uso, limitações, comparações entre métodos
- EVITE perguntas genéricas como "Como aprofundar mais sobre..."
- Seja direto e técnico
- Limite: 18 palavras por pergunta

EXEMPLOS DE BOAS PERGUNTAS:
✅ "Quais são as limitações do Método dos Elementos Finitos em estruturas com cargas concentradas?"
✅ "Como a teoria de Euler-Bernoulli se aplica em vigas de grande esbeltez?"
✅ "Qual a diferença entre análise linear e não-linear em distribuição de cargas?"

EXEMPLOS DE PERGUNTAS RUINS:
❌ "Como aprofundar mais sobre: Tópico de Engenharia?"
❌ "Quais são as aplicações práticas deste conceito?"
❌ "Como esse tema se relaciona com outros conceitos?"

FORMATO DE RESPOSTA (JSON puro):
{
  "suggestions": [
    "Como calcular a eficiência térmica de motores a combustão?",
    "Quais são as aplicações práticas da Segunda Lei da Termodinâmica?",
    "Como a entropia afeta processos industriais reais?"
  ]
}`;
  
  const contextText = typeof context === 'string' ? context : JSON.stringify(context);
  const extendedContext = contextText.substring(0, 2500);
  
  const userPrompt = `Tópico principal: ${topic}

CONTEXTO DO RELATÓRIO (use os termos técnicos deste texto para gerar perguntas):
${extendedContext}

Gere 3-4 perguntas específicas usando os conceitos, métodos e termos técnicos mencionados acima.`;
  
  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
        max_tokens: 300,
      }),
    });
    
    if (!response.ok) {
      console.error(`AI error: ${response.status}`);
      
      // 🆕 Fallback para erro 402 (sem créditos)
      if (response.status === 402) {
        console.warn('⚠️ AI quota exceeded, using fallback suggestions');
        const fallbackSuggestions = {
          suggestions: [
            `Quais são as aplicações práticas de ${topic} em projetos reais?`,
            `Como ${topic} se relaciona com análise estrutural computacional?`,
            `Quais são os principais desafios na implementação de ${topic}?`,
            `Que ferramentas de software auxiliam na análise de ${topic}?`
          ]
        };
        
        // Atualizar job como COMPLETED com fallback
        await supabaseAdmin
          .from('jobs')
          .update({
            status: 'COMPLETED',
            result: JSON.stringify(fallbackSuggestions)
          })
          .eq('id', job.id);
        
        // Criar mensagem com sugestões fallback
        await createSuggestionsMessage(job, supabaseAdmin, fallbackSuggestions);
        return;
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }
    
    const data = await response.json();
    const suggestionsText = data.choices[0].message.content;
    const jsonMatch = suggestionsText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      console.warn('No JSON found in AI response, using fallback');
      const fallbackSuggestions = {
        suggestions: [
          `Quais são as aplicações práticas de ${topic} em projetos de engenharia?`,
          `Como ${topic} se relaciona com resistência dos materiais?`,
          `Quais ferramentas computacionais auxiliam na análise de ${topic}?`
        ]
      };
      
      await supabaseAdmin
        .from('jobs')
        .update({
          status: 'COMPLETED',
          result: JSON.stringify(fallbackSuggestions)
        })
        .eq('id', job.id);
      
      return;
    }
    
    const suggestions = JSON.parse(jsonMatch[0]);
    
    if (!suggestions.suggestions || !Array.isArray(suggestions.suggestions)) {
      throw new Error('Invalid suggestions format');
    }
    
    await supabaseAdmin
      .from('jobs')
      .update({
        status: 'COMPLETED',
        result: JSON.stringify(suggestions)
      })
      .eq('id', job.id);
    
    // Criar mensagem com as sugestões usando a função auxiliar
    await createSuggestionsMessage(job, supabaseAdmin, suggestions);
    
    console.log(`✅ [${job.id}] ${suggestions.suggestions.length} suggestions generated`);
    
  } catch (error) {
    console.error(`Error generating suggestions:`, error);
    
    const fallbackSuggestions = {
      suggestions: [
        `Aprofundar mais sobre ${topic.substring(0, 50)}`,
        "Ver aplicações práticas deste conceito",
        "Explorar conceitos relacionados"
      ]
    };
    
    await supabaseAdmin
      .from('jobs')
      .update({
        status: 'COMPLETED',
        result: JSON.stringify(fallbackSuggestions)
      })
      .eq('id', job.id);
  }
}

async function handleGenerateQuiz(job: any, supabaseAdmin: any, lovableApiKey: string) {
  console.log(`📝 [${job.id}] Generating quiz`);
  
  let { context, topic, conversationId } = job.input_payload;
  
  // ✅ VALIDAÇÃO DE TOPIC
  if (!topic || topic === 'Tópico de Engenharia' || topic.length > 100 || topic.includes('Olá!')) {
    console.log('⚠️ Invalid topic detected, attempting extraction from context...');
    
    // Tentar extrair de markdown headers
    const headerMatch = context.match(/##\s+([^\n]+)/);
    if (headerMatch) {
      topic = headerMatch[1].replace(/\*\*/g, '').trim();
      console.log(`✅ Extracted topic from header: "${topic}"`);
    } else {
      // Extrair primeiras palavras-chave significativas
      const words = context.split(/\s+/).filter((w: string) => 
        w.length > 4 && 
        !['sobre', 'para', 'como', 'você', 'Olá!', 'Que', 'ótimo'].includes(w)
      );
      topic = words.slice(0, 3).join(' ');
      console.log(`✅ Extracted topic from keywords: "${topic}"`);
    }
  }
  
  console.log(`🎯 Final topic for quiz: "${topic}"`);
  console.log(`📚 Context length: ${context.length} chars`);
  console.log(`📄 Context preview (first 200): ${context.substring(0, 200)}`);
  
  if (job.status === 'PENDING') {
    const systemPrompt = `🇧🇷 CRITICAL: You MUST generate ALL content in BRAZILIAN PORTUGUESE (pt-BR).

⚠️ **RESTRIÇÃO CRÍTICA**: Você DEVE gerar um quiz baseado EXCLUSIVAMENTE no conteúdo fornecido no campo 'context'. É PROIBIDO usar qualquer conhecimento externo ou informações que não estejam presentes no texto. O 'topic' serve apenas para contextualização, mas as perguntas e respostas devem ser derivadas APENAS do 'context'.

Você é um criador de quizzes educacionais para engenharia em PORTUGUÊS DO BRASIL.
Gere 6-9 perguntas de múltipla escolha baseadas SOMENTE no conteúdo fornecido.

⚠️ IDIOMA OBRIGATÓRIO: 
- TODO texto deve estar em português do Brasil
- Perguntas em português
- Todas as 4 opções de resposta em português
- Explicações em português
- NUNCA use inglês

⚠️ REGRAS CRÍTICAS DE FORMATAÇÃO:
1. Retorne APENAS o JSON puro, sem markdown (sem \`\`\`json)
2. Use aspas duplas escapadas corretamente
3. NÃO use quebras de linha dentro de strings
4. Use caracteres UTF-8 (acentos corretos: á, é, í, ó, ú, ã, õ, ç)

FORMATO JSON OBRIGATÓRIO:
{
  "questions": [
    {
      "question": "O que é pressão hidrostática?",
      "options": [
        "Pressão exercida por um fluido em repouso",
        "Pressão de um gás em movimento",
        "Força aplicada em uma superfície sólida",
        "Energia potencial de um líquido"
      ],
      "correctAnswer": 0,
      "explanation": "A pressão hidrostática é a pressão exercida por um fluido em repouso devido ao seu peso. Ela aumenta com a profundidade."
    }
  ]
}`;
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Tópico: ${topic}\n\n${typeof context === 'string' ? context.substring(0, 2000) : JSON.stringify(context)}` }
        ],
      }),
    });
    
    if (!response.ok) throw new Error(`AI error: ${response.status}`);
    
    const data = await response.json();
    const quizJson = data.choices[0].message.content;

    // ✅ Log para debug
    console.log('📄 Raw AI response (first 300 chars):', quizJson.substring(0, 300));
    console.log('📄 Has markdown wrapper:', quizJson.includes('```'));
    console.log('📄 Has JSON structure:', /\{[\s\S]*\}/.test(quizJson));
    
    await supabaseAdmin
      .from('jobs')
      .update({
        status: 'SYNTHESIZING',
        intermediate_data: { quizData: quizJson }
      })
      .eq('id', job.id);
    
    await selfInvoke(job.id);
    
  } else if (job.status === 'SYNTHESIZING') {
    // ✅ Extrair e validar JSON
    console.log('📄 Raw quizData (first 500 chars):', job.intermediate_data.quizData.substring(0, 500));

    const sanitized = sanitizeJSON(job.intermediate_data.quizData);
    console.log('🧹 Sanitized JSON (first 300 chars):', sanitized.substring(0, 300));

    const jsonMatch = sanitized.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      console.error('❌ No JSON found in quiz data');
      await supabaseAdmin
        .from('jobs')
        .update({
          status: 'FAILED',
          result: JSON.stringify({ error: 'Failed to extract quiz data from AI response' }),
          error_log: 'No JSON structure found'
        })
        .eq('id', job.id);
      return;
    }

    let quizData;
    try {
      quizData = JSON.parse(jsonMatch[0]);
    } catch (parseError: any) {
      console.error('❌ JSON parse error:', parseError.message);
      await supabaseAdmin
        .from('jobs')
        .update({
          status: 'FAILED',
          result: JSON.stringify({ error: 'Invalid JSON format from AI' }),
          error_log: `JSON parse error: ${parseError.message}`
        })
        .eq('id', job.id);
      return;
    }

    // ✅ Validar que há perguntas
    if (!quizData.questions || !Array.isArray(quizData.questions) || quizData.questions.length === 0) {
      console.error('❌ Invalid quiz structure:', quizData);
      await supabaseAdmin
        .from('jobs')
        .update({
          status: 'FAILED',
          result: JSON.stringify({ error: 'Quiz generated with no questions' })
        })
        .eq('id', job.id);
      throw new Error('Quiz data is invalid or empty');
    }

    console.log(`✅ Validated quiz with ${quizData.questions.length} questions`);
    
    const { data: newQuiz, error: quizError } = await supabaseAdmin
      .from('generated_quizzes')
      .insert({
        user_id: job.user_id,
        conversation_id: job.input_payload.conversationId,
        title: `Quiz: ${job.input_payload.topic}`,
        topic: job.input_payload.topic,
        questions: quizData.questions
      })
      .select()
      .single();
    
    if (quizError) throw new Error(`Failed to save quiz: ${quizError.message}`);
    
    await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: job.input_payload.conversationId,
        role: 'assistant',
        content: `✅ **Quiz criado com sucesso!**\n\nCriei um quiz com ${quizData.questions.length} perguntas sobre ${job.input_payload.topic}.`
      });
    
    await supabaseAdmin
      .from('jobs')
      .update({
        status: 'COMPLETED',
        result: JSON.stringify({
          quizId: newQuiz.id,
          title: `Quiz: ${job.input_payload.topic}`,
          questionCount: quizData.questions.length
        })
      })
      .eq('id', job.id);
    
    console.log(`✅ [${job.id}] Quiz saved with ID: ${newQuiz.id}`);
    console.log('🌐 AI Response language check:', {
      hasPortuguese: JSON.stringify(quizData.questions).includes('ã') || JSON.stringify(quizData.questions).includes('ç') || JSON.stringify(quizData.questions).includes('é'),
      firstQuestion: quizData.questions[0]?.question?.substring(0, 100)
    });
  }
}

async function handleGenerateFlashcards(job: any, supabaseAdmin: any, lovableApiKey: string) {
  console.log(`🎴 [${job.id}] Generating flashcards`);
  
  const { context, topic, conversationId } = job.input_payload;
  
  if (job.status === 'PENDING') {
    const systemPrompt = `Você é um criador de flashcards educacionais para engenharia.
Gere 8-12 flashcards baseados no conteúdo fornecido.

⚠️ IDIOMA OBRIGATÓRIO: TODO O CONTEÚDO DEVE SER EM PORTUGUÊS DO BRASIL
⚠️ REGRAS CRÍTICAS DE FORMATAÇÃO:
1. Retorne APENAS o JSON puro, sem markdown (sem \`\`\`json)
2. Use aspas duplas escapadas corretamente
3. NÃO use quebras de linha dentro de strings
4. Todas as perguntas (front) e respostas (back) devem estar em português do Brasil

FORMATO JSON OBRIGATÓRIO:
{
  "cards": [
    {
      "front": "Pergunta ou conceito em português do Brasil",
      "back": "Resposta ou explicação detalhada em português do Brasil"
    }
  ]
}`;
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Tópico: ${topic}\n\n${typeof context === 'string' ? context.substring(0, 2000) : JSON.stringify(context)}` }
        ],
      }),
    });
    
    if (!response.ok) throw new Error(`AI error: ${response.status}`);
    
    const data = await response.json();
    const flashcardsJson = data.choices[0].message.content;

    // ✅ Log para debug
    console.log('📄 Raw AI response (first 300 chars):', flashcardsJson.substring(0, 300));
    console.log('📄 Has markdown wrapper:', flashcardsJson.includes('```'));
    console.log('📄 Has JSON structure:', /\{[\s\S]*\}/.test(flashcardsJson));
    
    await supabaseAdmin
      .from('jobs')
      .update({
        status: 'SYNTHESIZING',
        intermediate_data: { flashcardsData: flashcardsJson }
      })
      .eq('id', job.id);
    
    await selfInvoke(job.id);
    
  } else if (job.status === 'SYNTHESIZING') {
    // ✅ Extrair e validar JSON
    console.log('📄 Raw flashcardsData (first 500 chars):', job.intermediate_data.flashcardsData.substring(0, 500));

    const sanitized = sanitizeJSON(job.intermediate_data.flashcardsData);
    console.log('🧹 Sanitized JSON (first 300 chars):', sanitized.substring(0, 300));

    const jsonMatch = sanitized.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      console.error('❌ No JSON found in flashcards data');
      await supabaseAdmin
        .from('jobs')
        .update({
          status: 'FAILED',
          result: JSON.stringify({ error: 'Failed to extract flashcards from AI response' }),
          error_log: 'No JSON structure found'
        })
        .eq('id', job.id);
      return;
    }

    let flashcardsData;
    try {
      flashcardsData = JSON.parse(jsonMatch[0]);
    } catch (parseError: any) {
      console.error('❌ JSON parse error:', parseError.message);
      await supabaseAdmin
        .from('jobs')
        .update({
          status: 'FAILED',
          result: JSON.stringify({ error: 'Invalid JSON format from AI' }),
          error_log: `JSON parse error: ${parseError.message}`
        })
        .eq('id', job.id);
      return;
    }

    // ✅ Validar que há cards
    if (!flashcardsData.cards || !Array.isArray(flashcardsData.cards) || flashcardsData.cards.length === 0) {
      console.error('❌ Invalid flashcards structure:', flashcardsData);
      await supabaseAdmin
        .from('jobs')
        .update({
          status: 'FAILED',
          result: JSON.stringify({ error: 'Flashcards generated with no cards' })
        })
        .eq('id', job.id);
      throw new Error('Flashcards data is invalid or empty');
    }

    console.log(`✅ Validated flashcards with ${flashcardsData.cards.length} cards`);
    
    const { data: newSet, error: setError } = await supabaseAdmin
      .from('generated_flashcard_sets')
      .insert({
        user_id: job.user_id,
        conversation_id: job.input_payload.conversationId,
        title: `Flashcards: ${job.input_payload.topic}`,
        topic: job.input_payload.topic,
        cards: flashcardsData.cards
      })
      .select()
      .single();
    
    if (setError) throw new Error(`Failed to save flashcards: ${setError.message}`);
    
    await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: job.input_payload.conversationId,
        role: 'assistant',
        content: `✅ **Flashcards criados com sucesso!**\n\nCriei ${flashcardsData.cards.length} flashcards sobre ${job.input_payload.topic}.`
      });
    
    await supabaseAdmin
      .from('jobs')
      .update({
        status: 'COMPLETED',
        result: JSON.stringify({
          flashcardSetId: newSet.id,
          title: `Flashcards: ${job.input_payload.topic}`,
          cardCount: flashcardsData.cards.length
        })
      })
      .eq('id', job.id);
    
    console.log(`✅ [${job.id}] Flashcards saved with ID: ${newSet.id}`);
  }
}

async function handleGenerateLessonPlan(job: any, supabaseAdmin: any, lovableApiKey: string) {
  console.log(`📚 [${job.id}] PLACEHOLDER: Generating lesson plan`);
  await supabaseAdmin.from('jobs').update({
    status: 'COMPLETED',
    result: JSON.stringify({ lessonPlanId: 'placeholder', title: 'Plano (Em Desenvolvimento)' })
  }).eq('id', job.id);
}

async function handleGenerateMultipleChoiceActivity(job: any, supabaseAdmin: any, lovableApiKey: string) {
  console.log(`✅ [${job.id}] PLACEHOLDER: Generating activity`);
  await supabaseAdmin.from('jobs').update({
    status: 'COMPLETED',
    result: JSON.stringify({ activityId: 'placeholder', title: 'Atividade (Em Desenvolvimento)', questionCount: 10 })
  }).eq('id', job.id);
}

async function handleGenerateOpenEndedActivity(job: any, supabaseAdmin: any, lovableApiKey: string) {
  console.log(`📝 [${job.id}] PLACEHOLDER: Generating open-ended activity`);
  await supabaseAdmin.from('jobs').update({
    status: 'COMPLETED',
    result: JSON.stringify({ activityId: 'placeholder', title: 'Atividade Dissertativa (Em Desenvolvimento)' })
  }).eq('id', job.id);
}

async function handleLogInsight(job: any, supabaseAdmin: any) {
  console.log(`📊 [${job.id}] Logging academic insight`);
  
  const { action, topic, timestamp } = job.input_payload;
  
  await supabaseAdmin
    .from('student_insights')
    .insert({
      user_id: job.user_id,
      action_type: action,
      topic: topic,
      context: { timestamp }
    });
  
  await supabaseAdmin
    .from('jobs')
    .update({ status: 'COMPLETED' })
    .eq('id', job.id);
  
  console.log(`✅ [${job.id}] Insight logged`);
}

async function handleGenerateRecommendation(job: any, supabaseAdmin: any, lovableApiKey: string) {
  console.log(`🎯 [${job.id}] Generating personalized recommendation`);
  
  const { userId } = job.input_payload;
  
  try {
    // 1. Buscar dados do estudante (últimos 30 dias)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Query quiz attempts
    const { data: quizData } = await supabaseAdmin
      .from('quiz_attempts')
      .select('topic, percentage, created_at')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(10);
    
    // Query flashcard reviews
    const { data: flashcardData } = await supabaseAdmin
      .from('flashcard_reviews')
      .select('topic, percentage, correct_count, total_count, created_at')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(10);
    
    // Query student insights (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: insightsData } = await supabaseAdmin
      .from('student_insights')
      .select('action_type, topic, context, created_at')
      .eq('user_id', userId)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(20);
    
    // 2. Sintetizar perfil do estudante
    const avgQuizScore = quizData && quizData.length > 0
      ? quizData.reduce((sum: number, q: any) => sum + (q.percentage || 0), 0) / quizData.length
      : null;
    
    const avgFlashcardScore = flashcardData && flashcardData.length > 0
      ? flashcardData.reduce((sum: number, f: any) => sum + (f.percentage || 0), 0) / flashcardData.length
      : null;
    
    // Identificar tópicos com dificuldade (< 70%)
    const weakTopics = [...(quizData || []), ...(flashcardData || [])]
      .filter(item => (item.percentage || 0) < 70)
      .map(item => item.topic)
      .filter((topic, index, self) => self.indexOf(topic) === index)
      .slice(0, 3);
    
    // Identificar tópicos dominados (> 85%)
    const strongTopics = [...(quizData || []), ...(flashcardData || [])]
      .filter(item => (item.percentage || 0) > 85)
      .map(item => item.topic)
      .filter((topic, index, self) => self.indexOf(topic) === index)
      .slice(0, 3);
    
    // Última atividade
    const lastActivity = insightsData && insightsData.length > 0
      ? insightsData[0].created_at
      : 'sem atividade recente';
    
    const profileSummary = `
Dados do Estudante (últimos 30 dias):

DESEMPENHO:
- Média em quizzes: ${avgQuizScore ? avgQuizScore.toFixed(1) + '%' : 'sem dados'}
- Média em flashcards: ${avgFlashcardScore ? avgFlashcardScore.toFixed(1) + '%' : 'sem dados'}
- Total de quizzes: ${quizData?.length || 0}
- Total de revisões: ${flashcardData?.length || 0}

TÓPICOS COM DIFICULDADE (< 70%):
${weakTopics.length > 0 ? weakTopics.join(', ') : 'nenhum identificado'}

TÓPICOS DOMINADOS (> 85%):
${strongTopics.length > 0 ? strongTopics.join(', ') : 'nenhum identificado'}

ATIVIDADE RECENTE:
${insightsData?.slice(0, 5).map((i: any) => `- ${i.action_type}: ${i.topic}`).join('\n') || 'sem atividades recentes'}

Última atividade: ${lastActivity}
`;

    // 3. Chamar Lovable AI para gerar recomendação
    const systemPrompt = `Você é um assistente educacional especializado em engenharia.
Analise o perfil do estudante e gere UMA ÚNICA recomendação personalizada e acionável em PT-BR.

REGRAS:
- Priorize áreas com baixo desempenho (< 70%) como "high priority"
- Se não houver dados suficientes, incentive o uso da plataforma
- Se desempenho geral > 80%, sugira tópicos avançados
- Se flashcard review rate < 80%, priorize revisão
- A recomendação deve ser motivadora e específica
- Inclua um action_route válido: /review, /quiz/new, /courses, /aichat, /grades

FORMATO JSON OBRIGATÓRIO:
{
  "title": "Título curto e claro (max 60 chars)",
  "description": "Descrição acionável em 1-2 frases (max 120 chars)",
  "action_route": "/rota/válida",
  "priority": "high|medium|low"
}

EXEMPLOS:
- Se média quiz < 70%: "Reforce seus conhecimentos em [tópico]" → /quiz/new?topic=[tópico]
- Se sem atividade recente: "Continue aprendendo! Explore novos tópicos" → /courses
- Se alta performance: "Parabéns! Explore tópicos avançados" → /aichat
`;

    const userPrompt = `${profileSummary}

Gere UMA recomendação personalizada para este estudante.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
        max_tokens: 200,
      }),
    });
    
    if (!response.ok) {
      console.error(`AI error: ${response.status}`);
      
      // Fallback baseado em dados reais
      const fallbackRecommendation = {
        title: weakTopics.length > 0 
          ? `Reforce ${weakTopics[0]}` 
          : "Continue sua jornada de aprendizado!",
        description: weakTopics.length > 0
          ? `Seu desempenho em ${weakTopics[0]} está abaixo de 70%. Vamos praticar?`
          : "Explore novos tópicos e desafie seus conhecimentos.",
        action_route: weakTopics.length > 0 
          ? `/quiz/new?topic=${encodeURIComponent(weakTopics[0])}`
          : "/courses",
        priority: weakTopics.length > 0 ? "high" : "medium"
      };
      
      // Salvar fallback na tabela
      await supabaseAdmin
        .from('recommendations')
        .insert({
          user_id: userId,
          title: fallbackRecommendation.title,
          description: fallbackRecommendation.description,
          action_route: fallbackRecommendation.action_route,
          priority: fallbackRecommendation.priority,
          is_active: true
        });
      
      await supabaseAdmin
        .from('jobs')
        .update({
          status: 'COMPLETED',
          result: JSON.stringify(fallbackRecommendation)
        })
        .eq('id', job.id);
      
      console.log(`✅ [${job.id}] Fallback recommendation saved`);
      return;
    }
    
    const data = await response.json();
    const recommendationText = data.choices[0].message.content;
    const jsonMatch = recommendationText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }
    
    const recommendation = JSON.parse(jsonMatch[0]);
    
    // Validar estrutura
    if (!recommendation.title || !recommendation.action_route || !recommendation.priority) {
      throw new Error('Invalid recommendation format');
    }
    
    // 4. Salvar na tabela recommendations
    await supabaseAdmin
      .from('recommendations')
      .insert({
        user_id: userId,
        title: recommendation.title,
        description: recommendation.description || '',
        action_route: recommendation.action_route,
        priority: recommendation.priority,
        is_active: true
      });
    
    // 5. Marcar job como COMPLETED
    await supabaseAdmin
      .from('jobs')
      .update({
        status: 'COMPLETED',
        result: JSON.stringify(recommendation)
      })
      .eq('id', job.id);
    
    console.log(`✅ [${job.id}] Recommendation generated and saved`);
    
  } catch (error) {
    console.error(`Error generating recommendation:`, error);
    
    // Fallback genérico
    const fallbackRecommendation = {
      title: "Continue aprendendo!",
      description: "Explore novos tópicos e pratique seus conhecimentos.",
      action_route: "/courses",
      priority: "medium"
    };
    
    await supabaseAdmin
      .from('recommendations')
      .insert({
        user_id: userId,
        title: fallbackRecommendation.title,
        description: fallbackRecommendation.description,
        action_route: fallbackRecommendation.action_route,
        priority: fallbackRecommendation.priority,
        is_active: true
      });
    
    await supabaseAdmin
      .from('jobs')
      .update({
        status: 'COMPLETED',
        result: JSON.stringify(fallbackRecommendation)
      })
      .eq('id', job.id);
    
    console.log(`✅ [${job.id}] Generic fallback recommendation saved`);
  }
}

// =========================
// MAIN JOB RUNNER
// =========================

async function runJob(jobId: string) {
  const startTime = Date.now();
  console.log(`\n========================================`);
  console.log(`🚀 Job Runner started for: ${jobId}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log(`========================================\n`);

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const BRAVE_API_KEY = Deno.env.get('BRAVE_SEARCH_API_KEY');

  if (!LOVABLE_API_KEY) {
    console.error('❌ LOVABLE_API_KEY not configured');
    return;
  }

  if (!BRAVE_API_KEY) {
    console.error('❌ BRAVE_SEARCH_API_KEY not configured');
    return;
  }

  try {
    // 1. Fetch job from DB
    const { data: job, error } = await supabaseAdmin
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error || !job) {
      console.error(`❌ Job ${jobId} not found:`, error);
      return;
    }

    console.log(`📋 Job found: ${job.job_type} - Status: ${job.status}`);
    console.log(`📊 JOB INITIAL STATE:`, JSON.stringify({ 
      id: job.id, 
      status: job.status, 
      job_type: job.job_type,
      intermediate_data: job.intermediate_data 
    }, null, 2));

    // 2. Check if already in terminal state
    if (job.status === 'COMPLETED' || job.status === 'FAILED') {
      console.log(`⏭️ Job ${jobId} already in terminal state: ${job.status}`);
      return;
    }

    // 3. State machine dispatch for interactive jobs or deep search
    if (job.job_type === 'GENERATE_SUGGESTIONS') {
      await handleGenerateSuggestions(job, supabaseAdmin, LOVABLE_API_KEY);
    } else if (job.job_type === 'GENERATE_QUIZ') {
      await handleGenerateQuiz(job, supabaseAdmin, LOVABLE_API_KEY);
    } else if (job.job_type === 'GENERATE_FLASHCARDS') {
      await handleGenerateFlashcards(job, supabaseAdmin, LOVABLE_API_KEY);
    } else if (job.job_type === 'GENERATE_LESSON_PLAN') {
      await handleGenerateLessonPlan(job, supabaseAdmin, LOVABLE_API_KEY);
    } else if (job.job_type === 'GENERATE_MULTIPLE_CHOICE_ACTIVITY') {
      await handleGenerateMultipleChoiceActivity(job, supabaseAdmin, LOVABLE_API_KEY);
    } else if (job.job_type === 'GENERATE_OPEN_ENDED_ACTIVITY') {
      await handleGenerateOpenEndedActivity(job, supabaseAdmin, LOVABLE_API_KEY);
    } else if (job.job_type === 'LOG_ACADEMIC_INSIGHT') {
      await handleLogInsight(job, supabaseAdmin);
    } else if (job.job_type === 'GENERATE_RECOMMENDATION') {
      await handleGenerateRecommendation(job, supabaseAdmin, LOVABLE_API_KEY);
    } else if (job.job_type === 'DEEP_SEARCH') {
      switch (job.status) {
        case 'PENDING':
          await handlePendingState(job, supabaseAdmin, LOVABLE_API_KEY);
          break;
        case 'DECOMPOSING':
          await handleDecomposingState(job, supabaseAdmin, BRAVE_API_KEY);
          break;
        case 'RESEARCHING':
          await handleResearchingState(job, supabaseAdmin, LOVABLE_API_KEY);
          break;
        default:
          console.warn(`⚠️ Unknown state: ${job.status}`);
      }
    } else {
      console.warn(`⚠️ Unknown job type: ${job.job_type}`);
    }
  } catch (error) {
    console.error(`❌ Error processing job ${jobId}:`, error);
    
    // Mark job as failed
    try {
      await supabaseAdmin
        .from('jobs')
        .update({
          status: 'FAILED',
          error_log: error instanceof Error ? error.message : String(error)
        })
        .eq('id', jobId);
    } catch (updateError) {
      console.error('Failed to update job as failed:', updateError);
    }
  } finally {
    const duration = Date.now() - startTime;
    console.log(`\n⏱️ Job ${jobId} completed in ${duration}ms\n`);
  }
}

async function selfInvoke(jobId: string) {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  console.log(`🔄 Self-invoking for next state: ${jobId}`);

  // Fire and forget
  fetch(`${SUPABASE_URL}/functions/v1/job-runner`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ jobId })
  }).catch(err => console.error('Self-invoke error:', err));
}

// =========================
// HTTP SERVER
// =========================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId } = await req.json();

    if (!jobId) {
      throw new Error('jobId is required');
    }

    console.log(`📨 Received request for job: ${jobId}`);

    // Run job in background (fire and forget)
    runJob(jobId)
      .then(() => console.log(`✅ Background task completed for ${jobId}`))
      .catch((error) => console.error(`❌ Background task failed for ${jobId}:`, error));

    // Return immediately
    return new Response(
      JSON.stringify({ success: true, message: 'Job processing started' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Job runner error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
