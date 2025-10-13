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
    await supabaseAdmin
      .from('jobs')
      .update({
        status: 'DECOMPOSING',
        intermediate_data: {
          decomposed_questions: decomposedQuestions
        }
      })
      .eq('id', job.id);

    // Self-invoke for next state
    await selfInvoke(job.id);
  } catch (error) {
    console.error('Error in PENDING state:', error);
    throw error;
  }
}

async function handleDecomposingState(job: any, supabaseAdmin: any, braveApiKey: string) {
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
  await supabaseAdmin
    .from('jobs')
    .update({
      status: 'RESEARCHING',
      intermediate_data: {
        ...job.intermediate_data,
        search_results: searchResults
      }
    })
    .eq('id', job.id);

  // Self-invoke for next state
  await selfInvoke(job.id);
}

async function handleResearchingState(job: any, supabaseAdmin: any, lovableApiKey: string) {
  console.log(`📝 [${job.id}] Handling RESEARCHING state - Synthesizing report`);
  
  const query = job.input_payload.query;
  const searchResults = job.intermediate_data.search_results || [];

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

    // Update job as completed
    await supabaseAdmin
      .from('jobs')
      .update({
        status: 'COMPLETED',
        result: report
      })
      .eq('id', job.id);

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
              ...job.intermediate_data,
              suggestionsJobId: suggestionsJob.id
            }
          })
          .eq('id', job.id);
        
        supabaseAdmin.functions.invoke('job-runner', {
          body: { jobId: suggestionsJob.id }
        }).catch((err: Error) => console.error('Error invoking suggestions job:', err));
        
        console.log(`✨ Suggestions job ${suggestionsJob.id} created for Deep Search`);
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

async function handleGenerateSuggestions(job: any, supabaseAdmin: any, lovableApiKey: string) {
  console.log(`💡 [${job.id}] Generating topic suggestions`);
  
  const { context, topic } = job.input_payload;
  
  const systemPrompt = `Você é um assistente educacional especializado em engenharia.
Sua tarefa é gerar 3-4 perguntas de aprofundamento sobre o tópico discutido.

REGRAS:
- Cada sugestão deve ser uma PERGUNTA COMPLETA que pode iniciar uma pesquisa profunda
- As perguntas devem cobrir diferentes aspectos: teórico, prático, aplicação real, comparação
- Seja específico e relevante ao contexto fornecido
- Use linguagem clara e direta
- Limite: 15 palavras por pergunta

FORMATO DE RESPOSTA (JSON puro):
{
  "suggestions": [
    "Como calcular a eficiência térmica de motores a combustão?",
    "Quais são as aplicações práticas da Segunda Lei da Termodinâmica?",
    "Como a entropia afeta processos industriais reais?"
  ]
}`;
  
  const userPrompt = `Tópico discutido: ${topic}\n\nContexto da conversa:\n${typeof context === 'string' ? context.substring(0, 800) : JSON.stringify(context).substring(0, 800)}`;
  
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
      throw new Error(`AI Gateway error: ${response.status}`);
    }
    
    const data = await response.json();
    const suggestionsText = data.choices[0].message.content;
    const jsonMatch = suggestionsText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      console.warn('No JSON found in AI response, using fallback');
      const fallbackSuggestions = {
        suggestions: [
          `Como aprofundar mais sobre ${topic.substring(0, 50)}?`,
          `Quais são as aplicações práticas deste conceito?`,
          `Como esse tema se relaciona com outros conceitos de engenharia?`
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
    
    // Salvar sugestões na tabela para persistência
    if (job.input_payload.conversationId) {
      await supabaseAdmin
        .from('conversation_suggestions')
        .insert({
          conversation_id: job.input_payload.conversationId,
          message_index: job.input_payload.messageIndex || 0,
          suggestions: suggestions
        });
    }
    
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
  
  const { context, topic, conversationId } = job.input_payload;
  
  if (job.status === 'PENDING') {
    const systemPrompt = `Você é um criador de quizzes educacionais para engenharia.
Gere 6-9 perguntas de múltipla escolha baseadas no conteúdo fornecido.

⚠️ IDIOMA OBRIGATÓRIO: TODO O CONTEÚDO DEVE SER EM PORTUGUÊS DO BRASIL
⚠️ REGRAS CRÍTICAS DE FORMATAÇÃO:
1. Retorne APENAS o JSON puro, sem markdown (sem \`\`\`json)
2. Use aspas duplas escapadas corretamente
3. NÃO use quebras de linha dentro de strings
4. Todas as perguntas, opções e explicações devem estar em português do Brasil

FORMATO JSON OBRIGATÓRIO:
{
  "questions": [
    {
      "question": "Pergunta em português do Brasil",
      "options": ["Opção A em português", "Opção B em português", "Opção C em português", "Opção D em português"],
      "correctAnswer": 0,
      "explanation": "Explicação detalhada em português do Brasil"
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

// =========================
// MAIN JOB RUNNER
// =========================

async function runJob(jobId: string) {
  console.log(`\n========================================`);
  console.log(`🚀 Job Runner started for: ${jobId}`);
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
    } else if (job.job_type === 'LOG_ACADEMIC_INSIGHT') {
      await handleLogInsight(job, supabaseAdmin);
    } else if (job.job_type === 'GENERATE_SUGGESTIONS') {
      await handleGenerateSuggestions(job, supabaseAdmin, LOVABLE_API_KEY);
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
