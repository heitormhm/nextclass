import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function sanitizeJSON(jsonString: string): string {
  let cleaned = jsonString.replace(/```json\s*/g, '').replace(/```\s*/g, '');
  cleaned = cleaned.replace(/\n(?=(?:[^"]*"[^"]*")*[^"]*$)/g, ' ');
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
  console.log(`[TEACHER] 🔍 Searching with pedagogical focus: "${query}"`);

  // MODIFICAÇÃO: Adicionar keywords pedagógicas à busca
  const pedagogicalQuery = `${query} (site:edu OR site:org OR "engineering education" OR "ERIC" OR "IEEE Education" OR "ASEE" OR "teaching" OR "pedagogy" OR "PBL" OR "active learning")`;
  
  try {
    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(pedagogicalQuery)}&count=${numResults * 3}`,
      {
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': braveApiKey,
        },
      }
    );

    if (!response.ok) {
      console.error(`[TEACHER] Brave API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const results = data.web?.results || [];

    // MODIFICAÇÃO: Priorizar fontes pedagógicas
    const filteredResults = results
      .filter((r: any) => {
        const url = r.url?.toLowerCase() || '';
        const title = r.title?.toLowerCase() || '';
        
        // Priority 1: Fontes pedagógicas
        const isPedagogical = url.includes('.edu') || 
                               url.includes('eric.ed.gov') ||
                               url.includes('ieeexplore.ieee.org') ||
                               url.includes('asee.org') ||
                               url.includes('engr.wisc.edu') ||
                               url.includes('educause.edu');
        
        // Priority 2: Keywords pedagógicas no título
        const hasPedagogicalKeywords = title.includes('teaching') ||
                                        title.includes('pedagogy') ||
                                        title.includes('education') ||
                                        title.includes('learning') ||
                                        title.includes('student') ||
                                        title.includes('engineering education');
        
        const isBlacklisted = url.includes('wikipedia') ||
                               url.includes('blog.') ||
                               url.includes('forum') ||
                               url.includes('reddit');
        
        return (isPedagogical || hasPedagogicalKeywords) && !isBlacklisted;
      })
      .map((r: any) => ({
        url: r.url || '',
        title: r.title || '',
        snippet: r.description || '',
      }));

    const pedagogicalCount = filteredResults.filter((s: any) => 
      s.url.includes('eric') || 
      s.url.includes('ieee') || 
      s.url.includes('asee')
    ).length;
    
    console.log(`[TEACHER] ✓ Found ${filteredResults.length} pedagogical sources (${pedagogicalCount} highly relevant)`);
    
    return filteredResults.slice(0, numResults);
  } catch (error) {
    console.error('[TEACHER] Search error:', error);
    return [];
  }
}

async function handlePendingState(job: any, supabaseAdmin: any, lovableApiKey: string) {
  if (job.intermediate_data?.pendingCompleted) {
    console.log(`[TEACHER] ⏭️ [${job.id}] PENDING state already processed, skipping`);
    return;
  }
  
  console.log(`[TEACHER] 🔄 [${job.id}] Handling PENDING state - Decomposing pedagogical query`);
  
  const query = job.input_payload.query;
  
  const systemPrompt = `Você é um assistente de pesquisa pedagógica especializado em educação em engenharia. 
Sua tarefa é decompor uma pergunta pedagógica complexa em 3-5 sub-perguntas específicas focadas em:
- Metodologias de ensino (PBL, Flipped Classroom, etc.)
- Estratégias de avaliação
- Design instrucional
- Fundamentos teóricos (Bloom, Constructivismo, etc.)
- Aplicações práticas em sala de aula

INSTRUÇÕES:
- Gere entre 3 e 5 sub-perguntas pedagógicas
- Foque em "como ensinar" em vez de "o que ensinar"
- Use terminologia pedagógica apropriada
- Responda APENAS com um array JSON de strings

Exemplo:
["Quais estratégias de PBL são eficazes para ensinar termodinâmica?", "Como avaliar aprendizagem em projetos de engenharia?"]`;

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
            { role: 'user', content: `Pergunta pedagógica: ${query}` }
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

    const jsonMatch = content.match(/\[.*\]/s);
    if (!jsonMatch) {
      throw new Error('No valid JSON array found in response');
    }

    const decomposedQuestions = JSON.parse(jsonMatch[0]);
    console.log(`[TEACHER] ✅ Decomposed into ${decomposedQuestions.length} pedagogical questions`);

    const { error: updateError } = await supabaseAdmin
      .from('jobs')
      .update({
        status: 'DECOMPOSING',
        intermediate_data: {
          decomposed_questions: decomposedQuestions,
          pendingCompleted: true,
          step: '1'
        }
      })
      .eq('id', job.id);
    
    if (updateError) {
      throw updateError;
    }

    await selfInvoke(job.id);
  } catch (error) {
    console.error('[TEACHER] Error in PENDING state:', error);
    throw error;
  }
}

async function handleDecomposingState(job: any, supabaseAdmin: any, braveApiKey: string) {
  if (job.intermediate_data?.decomposingCompleted) {
    console.log(`[TEACHER] ⏭️ [${job.id}] DECOMPOSING state already processed, skipping`);
    return;
  }
  
  console.log(`[TEACHER] 🔍 [${job.id}] Handling DECOMPOSING state - Searching pedagogical sources`);
  
  const decomposedQuestions = job.intermediate_data.decomposed_questions || [];
  
  if (decomposedQuestions.length === 0) {
    throw new Error('No decomposed questions found');
  }

  const TARGET_SOURCES = 5;
  const searchResults: Array<{ question: string; sources: any[] }> = [];

  for (let i = 0; i < decomposedQuestions.length; i++) {
    const question = decomposedQuestions[i];
    console.log(`[TEACHER] 📝 Searching for pedagogical question ${i + 1}/${decomposedQuestions.length}: ${question}`);
    
    const sources = await executeWebSearch(question, braveApiKey, TARGET_SOURCES);
    searchResults.push({
      question,
      sources: sources.slice(0, TARGET_SOURCES)
    });
    
    console.log(`[TEACHER] ✓ Found ${sources.length} sources for question ${i + 1}`);
  }

  console.log(`[TEACHER] ✅ Total pedagogical sources: ${searchResults.reduce((acc, r) => acc + r.sources.length, 0)}`);

  const { error: updateError } = await supabaseAdmin
    .from('jobs')
    .update({
      status: 'RESEARCHING',
      intermediate_data: {
        ...job.intermediate_data,
        search_results: searchResults,
        decomposingCompleted: true,
        step: '2'
      }
    })
    .eq('id', job.id);
  
  if (updateError) {
    throw updateError;
  }

  await selfInvoke(job.id);
}

async function handleResearchingState(job: any, supabaseAdmin: any, lovableApiKey: string) {
  if (job.intermediate_data?.researchingCompleted) {
    console.log(`[TEACHER] ⏭️ [${job.id}] RESEARCHING state already processed, skipping`);
    return;
  }
  
  console.log(`[TEACHER] 📝 [${job.id}] Handling RESEARCHING state - Synthesizing pedagogical report`);
  
  const newIntermediateData = {
    ...job.intermediate_data,
    step: '3',
    synthesisStarted: new Date().toISOString()
  };
  
  const { error: stepUpdateError } = await supabaseAdmin
    .from('jobs')
    .update({
      intermediate_data: newIntermediateData
    })
    .eq('id', job.id);
    
  if (stepUpdateError) {
    throw stepUpdateError;
  }
  
  const { data: updatedJob, error: reloadError } = await supabaseAdmin
    .from('jobs')
    .select('*')
    .eq('id', job.id)
    .single();
    
  if (reloadError || !updatedJob) {
    console.error(`[TEACHER] ❌ Error reloading job:`, reloadError);
    return;
  }
  
  const query = updatedJob.input_payload.query;
  const searchResults = updatedJob.intermediate_data.search_results || [];

  if (searchResults.length === 0) {
    throw new Error('No search results found');
  }

  let researchContext = '\n\n**FONTES PEDAGÓGICAS ENCONTRADAS:**\n\n';
  searchResults.forEach((result: any, idx: number) => {
    researchContext += `\n### ${result.question}\n`;
    result.sources.forEach((source: any, sourceIdx: number) => {
      researchContext += `\n**Fonte ${idx + 1}.${sourceIdx + 1}:**\n`;
      researchContext += `- Título: ${source.title}\n`;
      researchContext += `- URL: ${source.url}\n`;
      researchContext += `- Resumo: ${source.snippet}\n`;
    });
  });

  // MODIFICAÇÃO: System prompt pedagógico
  const systemPrompt = `Você é um assistente de design instrucional especializado em educação em engenharia.
Sua tarefa é sintetizar um relatório pedagógico completo em português brasileiro, focado em COMO ENSINAR, não apenas no conteúdo técnico.

**PÚBLICO-ALVO**: Professores de graduação e pós-graduação em engenharia.

**FORMATO OBRIGATÓRIO DO RELATÓRIO PEDAGÓGICO:**

# [Título do Tópico Pedagógico]

## 1. Objetivo de Aprendizagem
[Descreva os objetivos de aprendizagem usando a Taxonomia de Bloom (nível cognitivo: conhecimento, compreensão, aplicação, análise, síntese, avaliação). Cite fontes [1], [2], etc.]

## 2. Fundamentação Pedagógica
[Explique as teorias de aprendizagem relevantes (construtivismo, aprendizagem significativa, etc.) e como elas se aplicam a este tópico. Cite [X].]

## 3. Estratégias de Ensino Recomendadas
[Descreva metodologias ativas específicas: PBL, Flipped Classroom, Team-Based Learning, etc. Para cada estratégia:
- Como implementar passo a passo
- Tempo estimado
- Recursos necessários
- Adaptações para turmas grandes/pequenas]

## 4. Atividades Práticas e Avaliação
[Sugira atividades concretas, estudos de caso, problemas práticos. Inclua:
- Rubricas de avaliação
- Critérios de desempenho
- Como fornecer feedback formativo]

## 5. Recursos e Materiais Didáticos
[Liste materiais de apoio: vídeos, simuladores, laboratórios virtuais, artigos, livros-texto recomendados]

## 6. Desafios Comuns e Soluções
[Identifique dificuldades típicas dos alunos neste tópico e como superá-las pedagogicamente]

## 7. Avaliação da Eficácia do Ensino
[Como o professor pode avaliar se a estratégia pedagógica está funcionando?]

## Referências Bibliográficas
[Lista numerada no formato acadêmico:
[1] Título do Artigo Pedagógico - Autores - Revista/Conferência - URL
[2] ...]

**REGRAS CRÍTICAS:**

1. **Foco pedagógico**: Este relatório é para PROFESSORES, não para estudantes. Foque em "como ensinar", não em "o que ensinar".

2. **Citações obrigatórias**: TODAS as estratégias pedagógicas devem ter citação numérica [X].

3. **Apenas fontes fornecidas**: Use EXCLUSIVAMENTE as fontes web fornecidas.

4. **Praticidade**: Todas as sugestões devem ser DIRETAMENTE APLICÁVEIS em sala de aula.

5. **Rigor pedagógico**:
   - Use terminologia pedagógica precisa (andaime cognitivo, aprendizagem ativa, avaliação formativa)
   - Cite frameworks reconhecidos (Bloom, PBL de Aalborg, Design Thinking)
   - Mantenha tom profissional e colaborativo

6. **Contexto brasileiro**: Inclua adaptações para realidade de universidades brasileiras (carga horária, infraestrutura, perfil de alunos).

7. **Mínimo 1500 palavras, máximo 3000 palavras**.`;

  const userPrompt = `Pergunta Pedagógica Original: ${query}\n\n${researchContext}\n\nSintetize um relatório pedagógico completo para professores de engenharia, usando APENAS as fontes fornecidas acima.`;

  try {
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
      180000
    );

    if (!response.ok) {
      throw new Error(`AI synthesis error: ${response.status}`);
    }

    const data = await response.json();
    const report = data.choices?.[0]?.message?.content;

    if (!report) {
      throw new Error('No report generated');
    }

    console.log(`[TEACHER] ✅ Pedagogical report synthesized (${report.length} chars)`);

    await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: updatedJob.input_payload.conversationId,
        role: 'assistant',
        content: report
      });

    await supabaseAdmin
      .from('jobs')
      .update({
        status: 'COMPLETED',
        result: report,
        intermediate_data: {
          ...updatedJob.intermediate_data,
          researchingCompleted: true,
          step: 'completed'
        }
      })
      .eq('id', updatedJob.id);

    console.log(`[TEACHER] ✅ [${updatedJob.id}] Deep Search COMPLETED`);

  } catch (error) {
    console.error('[TEACHER] Error synthesizing report:', error);
    throw error;
  }
}

async function handleGenerateSuggestions(job: any, supabaseAdmin: any, lovableApiKey: string) {
  console.log(`[TEACHER] 💡 [${job.id}] Generating pedagogical suggestions`);
  
  const { context, topic } = job.input_payload;
  
  const systemPrompt = `Você é um assistente pedagógico especializado em educação em engenharia.
Gere 3-4 perguntas de aprofundamento PEDAGÓGICAS focadas em ESTRATÉGIAS DE ENSINO.

FOCO: Como ensinar melhor, não sobre o conteúdo técnico em si.

EXEMPLOS DE BOAS PERGUNTAS PEDAGÓGICAS:
✅ "Quais estratégias de PBL são mais eficazes para ensinar ${topic}?"
✅ "Como avaliar a aprendizagem de ${topic} de forma formativa?"
✅ "Que atividades práticas engajam alunos no estudo de ${topic}?"
✅ "Como adaptar o ensino de ${topic} para turmas numerosas?"

FORMATO JSON:
{
  "suggestions": [
    "Pergunta pedagógica 1",
    "Pergunta pedagógica 2",
    "Pergunta pedagógica 3"
  ]
}`;
  
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
          { role: 'user', content: `Tópico pedagógico: ${topic}` }
        ],
        max_tokens: 300,
      }),
    });
    
    if (!response.ok) {
      if (response.status === 402) {
        const fallbackSuggestions = {
          suggestions: [
            `Quais estratégias ativas são eficazes para ensinar ${topic}?`,
            `Como avaliar a compreensão de ${topic} de forma formativa?`,
            `Que recursos didáticos facilitam o aprendizado de ${topic}?`
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
      throw new Error(`AI Gateway error: ${response.status}`);
    }
    
    const data = await response.json();
    const suggestionsText = data.choices[0].message.content;
    const jsonMatch = suggestionsText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      const fallbackSuggestions = {
        suggestions: [
          `Estratégias ativas para ensinar ${topic}`,
          `Avaliação formativa de ${topic}`,
          `Materiais didáticos para ${topic}`
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
    
    await supabaseAdmin
      .from('jobs')
      .update({
        status: 'COMPLETED',
        result: JSON.stringify(suggestions)
      })
      .eq('id', job.id);
    
    if (job.input_payload.conversationId) {
      await supabaseAdmin
        .from('conversation_suggestions')
        .insert({
          conversation_id: job.input_payload.conversationId,
          message_index: job.input_payload.messageIndex || 0,
          suggestions: suggestions
        });
      
      const suggestionText = `✨ **Continue explorando estratégias pedagógicas** para **${topic}**:`;
      
      await supabaseAdmin
        .from('messages')
        .insert({
          conversation_id: job.input_payload.conversationId,
          role: 'assistant',
          content: suggestionText,
          suggestions_job_id: job.id
        });
    }
    
    console.log(`[TEACHER] ✅ [${job.id}] Pedagogical suggestions generated`);
    
  } catch (error) {
    console.error(`[TEACHER] Error generating suggestions:`, error);
    
    const fallbackSuggestions = {
      suggestions: [
        `Explorar estratégias para ${topic}`,
        "Ver atividades práticas relacionadas",
        "Consultar recursos didáticos"
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

async function handleGenerateTeacherQuiz(job: any, supabaseAdmin: any, lovableApiKey: string) {
  console.log(`[TEACHER] 📝 [${job.id}] Generating pedagogical quiz with rubric`);
  
  const { context, topic } = job.input_payload;
  
  const systemPrompt = `IDIOMA OBRIGATÓRIO: Todo o quiz deve estar em PORTUGUÊS BRASILEIRO (pt-BR).

Você é um especialista em avaliação pedagógica para cursos de engenharia.

OBJETIVO: Criar um quiz com 8-10 questões de múltipla escolha que:
- Avalie competências de ordem superior (Bloom: Aplicação, Análise, Síntese, Avaliação)
- Inclua rubrica de correção detalhada
- Forneça feedback formativo para cada distrator
- Seja adequado para uso em sala de aula

FORMATO JSON OBRIGATÓRIO:
{
  "title": "Avaliação: [Tópico]",
  "learning_objectives": [
    "Objetivo 1 (nível Bloom)",
    "Objetivo 2 (nível Bloom)"
  ],
  "questions": [
    {
      "id": 1,
      "stem": "[Enunciado contextualizado em cenário real de engenharia]",
      "options": [
        { "id": "A", "text": "[Opção]" },
        { "id": "B", "text": "[Opção]" },
        { "id": "C", "text": "[Opção]" },
        { "id": "D", "text": "[Opção]" }
      ],
      "correct_answer": "B",
      "explanation": "[Explicação pedagógica detalhada do conceito]",
      "distractor_analysis": {
        "A": "Aluno que escolheu esta resposta provavelmente confundiu [conceito X] com [conceito Y]",
        "C": "[Análise do erro conceitual]",
        "D": "[Análise do erro conceitual]"
      },
      "feedback_suggestions": "[Como o professor deve abordar este erro comum]",
      "bloom_level": "Aplicação",
      "difficulty": "Médio",
      "topic": "[Sub-tópico específico]"
    }
  ],
  "rubric": {
    "grading_criteria": [
      "Pontuação: 1 ponto por questão correta",
      "Aprovação: ≥70% (7/10 questões)",
      "Excelente: ≥90% (9/10 questões)"
    ],
    "feedback_guidelines": [
      "Para alunos abaixo de 50%: Revisar fundamentos com [recurso específico]",
      "Para alunos entre 50-70%: Focar em [área de dificuldade detectada]",
      "Para alunos acima de 70%: Desafios adicionais em [tópico avançado]"
    ]
  },
  "pedagogical_notes": {
    "common_misconceptions": ["[Erro conceitual frequente]", "[Outro erro]"],
    "suggested_interventions": ["[Estratégia de remediação]"],
    "extensions": ["[Questão desafiadora adicional para alunos avançados]"]
  }
}

REGRAS CRÍTICAS:
1. **Contexto Real**: Todas as questões devem usar cenários de engenharia brasileiros quando possível
2. **Distratores Plausíveis**: Cada opção incorreta deve refletir um erro conceitual específico
3. **Feedback Formativo**: Explique POR QUE cada distrator é tentador e como corrigir o raciocínio
4. **Bloom Alto**: Mínimo 60% das questões em níveis Aplicação ou superior
5. **Rubrica Prática**: Inclua critérios claros de avaliação e orientações de feedback
6. **Máximo 3000 caracteres por questão**`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Tópico: ${topic}\n\nContexto: ${context.substring(0, 1500)}` }
        ],
      }),
    });
    
    if (!response.ok) throw new Error(`AI error: ${response.status}`);
    
    const data = await response.json();
    const quizText = data.choices[0].message.content;
    
    const jsonMatch = quizText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No valid JSON found in response');
    
    const quiz = JSON.parse(sanitizeJSON(jsonMatch[0]));
    
    await supabaseAdmin
      .from('generated_quizzes')
      .insert({
        user_id: job.user_id,
        conversation_id: job.conversation_id,
        title: quiz.title || `Quiz Pedagógico: ${topic}`,
        topic: topic,
        questions: quiz
      });
    
    await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: job.input_payload.conversationId,
        role: 'assistant',
        content: `✅ **Quiz Pedagógico Criado!**\n\n**${quiz.title}**\n\n📊 ${quiz.questions.length} questões com rubrica de avaliação.\n\n*Use o botão "Ver Quiz" para revisar as questões, objetivos de aprendizagem e orientações de feedback.*`
      });
    
    await supabaseAdmin
      .from('jobs')
      .update({
        status: 'COMPLETED',
        result: JSON.stringify(quiz)
      })
      .eq('id', job.id);
    
    console.log(`[TEACHER] ✅ [${job.id}] Pedagogical quiz generated with rubric`);
    
  } catch (error) {
    console.error(`[TEACHER] Error generating quiz:`, error);
    throw error;
  }
}

async function handleGenerateTeacherFlashcards(job: any, supabaseAdmin: any, lovableApiKey: string) {
  console.log(`[TEACHER] 🎴 [${job.id}] Generating pedagogical flashcards`);
  
  const { context, topic } = job.input_payload;
  
  const systemPrompt = `IDIOMA OBRIGATÓRIO: Todos os flashcards devem estar em PORTUGUÊS BRASILEIRO (pt-BR).

Você é um especialista em design instrucional para engenharia.

OBJETIVO: Criar 10-15 flashcards pedagógicos que:
- Destaquem conceitos-chave essenciais para ensino
- Incluam conexões interdisciplinares
- Forneçam dicas de aplicação em aula
- Sirvam como guia de ensino rápido

FORMATO JSON OBRIGATÓRIO:
{
  "title": "Flashcards Pedagógicos: [Tópico]",
  "description": "Guia rápido para ensinar [tópico] com estratégias didáticas",
  "cards": [
    {
      "id": 1,
      "front": "[CONCEITO-CHAVE]\n[Pergunta pedagógica: Como ensinar isso?]",
      "back": "**Definição:**\n[Explicação concisa]\n\n**Como Ensinar:**\n- Estratégia 1: [abordagem prática]\n- Estratégia 2: [analogia ou exemplo]\n\n**Conexão Interdisciplinar:**\n[Relacionar com outras disciplinas]\n\n**Erro Comum:**\n[Misconception frequente dos alunos]\n\n**Dica de Avaliação:**\n[Como verificar compreensão]",
      "tags": ["[categoria]", "metodologia_ativa", "PBL"],
      "difficulty": "intermediário",
      "teaching_tip": "[Insight pedagógico específico]"
    }
  ],
  "pedagogical_sequence": {
    "suggested_order": "[Sequência recomendada de apresentação dos conceitos]",
    "pre_requisites": ["[Conceito que deve ser ensinado antes]"],
    "extensions": ["[Tópico avançado relacionado]"]
  },
  "classroom_activities": [
    {
      "concept": "[Conceito do flashcard X]",
      "activity": "[Atividade prática de 5-10 min para fixar este conceito]",
      "materials": ["[Material necessário]"]
    }
  ]
}

REGRAS CRÍTICAS:
1. **Foco no Professor**: Cada flashcard deve ajudar o PROFESSOR a ensinar, não o aluno a estudar
2. **Praticidade**: Inclua estratégias IMEDIATAMENTE APLICÁVEIS em sala de aula
3. **Misconceptions**: Sempre destaque erros conceituais comuns dos alunos
4. **Interdisciplinaridade**: Conecte conceitos com outras disciplinas de engenharia
5. **Metodologias Ativas**: Sugira como usar PBL, flipped classroom, peer instruction
6. **Avaliação Formativa**: Inclua formas rápidas de verificar compreensão
7. **Concisão**: Máximo 500 caracteres por lado do flashcard`;

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
          { role: 'user', content: `Tópico: ${topic}\n\nContexto: ${context.substring(0, 1500)}` }
        ],
      }),
    });
    
    if (!response.ok) throw new Error(`AI error: ${response.status}`);
    
    const data = await response.json();
    const flashcardsText = data.choices[0].message.content;
    
    const jsonMatch = flashcardsText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No valid JSON found in response');
    
    const flashcards = JSON.parse(sanitizeJSON(jsonMatch[0]));
    
    await supabaseAdmin
      .from('generated_flashcard_sets')
      .insert({
        user_id: job.user_id,
        conversation_id: job.conversation_id,
        title: flashcards.title || `Flashcards Pedagógicos: ${topic}`,
        topic: topic,
        cards: flashcards
      });
    
    await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: job.input_payload.conversationId,
        role: 'assistant',
        content: `✅ **Flashcards Pedagógicos Criados!**\n\n**${flashcards.title}**\n\n📚 ${flashcards.cards.length} conceitos-chave com estratégias de ensino.\n\n*Use o botão "Ver Flashcards" para acessar o guia pedagógico completo.*`
      });
    
    await supabaseAdmin
      .from('jobs')
      .update({
        status: 'COMPLETED',
        result: JSON.stringify(flashcards)
      })
      .eq('id', job.id);
    
    console.log(`[TEACHER] ✅ [${job.id}] Pedagogical flashcards generated`);
    
  } catch (error) {
    console.error(`[TEACHER] Error generating flashcards:`, error);
    throw error;
  }
}

async function handleGenerateLessonPlan(job: any, supabaseAdmin: any, lovableApiKey: string) {
  console.log(`[TEACHER] 📋 [${job.id}] Generating lesson plan with PBL framework`);
  
  const { context, topic } = job.input_payload;
  
  const systemPrompt = `IDIOMA OBRIGATÓRIO: Todo o plano de aula deve estar em PORTUGUÊS BRASILEIRO (pt-BR).

Você é um especialista em design instrucional para cursos de engenharia, com foco em metodologias ativas (PBL, Flipped Classroom).

OBJETIVO: Criar um plano de aula detalhado seguindo o framework PBL (Problem-Based Learning).

ESTRUTURA OBRIGATÓRIA DO PLANO (Markdown):

# Plano de Aula: [Tópico]

## 1. Informações Básicas
- **Duração:** [X minutos/horas]
- **Nível:** [Graduação - período X]
- **Pré-requisitos:** [Conceitos que os alunos devem já conhecer]

## 2. Objetivos de Aprendizagem (Taxonomia de Bloom)
1. **Conhecimento:** [Nível mais básico]
2. **Compreensão:** [Entender conceitos]
3. **Aplicação:** [Usar em problemas]
4. **Análise:** [Quebrar em partes]
5. **Síntese:** [Criar soluções]
6. **Avaliação:** [Julgar soluções]

## 3. Problema Central (PBL)
[Descreva um problema real e envolvente que motivará toda a aula. Deve ser:
- Autêntico (problema real de engenharia)
- Complexo (sem solução óbvia)
- Relevante (contexto brasileiro quando possível)
- Motivador (desperte curiosidade)]

**Exemplo:** "Uma ponte pedestre em [cidade] apresentou microfissuras após 2 anos. Investigue as causas e proponha soluções."

## 4. Sequência Didática

### Fase 1: Problematização (X min)
- [Apresentar o problema]
- [Atividade de engajamento]

### Fase 2: Desenvolvimento (X min)
- [Atividades em grupo]
- [Recursos a serem consultados]
- [Papel do professor (mediador)]

### Fase 3: Síntese e Avaliação (X min)
- [Apresentação de soluções]
- [Discussão em classe]
- [Feedback formativo]

## 5. Recursos Necessários
- **Materiais:** [Lista]
- **Ferramentas digitais:** [Simuladores, softwares]
- **Espaço:** [Sala tradicional, laboratório, etc.]

## 6. Avaliação
### Rubrica de Avaliação

| Critério | Excelente (4) | Bom (3) | Regular (2) | Insuficiente (1) |
|----------|---------------|---------|-------------|-------------------|
| [Critério 1] | [Descrição] | [Descrição] | [Descrição] | [Descrição] |
| [Critério 2] | [Descrição] | [Descrição] | [Descrição] | [Descrição] |

### Avaliação Formativa
- [Como monitorar progresso durante a aula]

## 7. Adaptações
- **Turmas numerosas (>50 alunos):** [Sugestões]
- **Infraestrutura limitada:** [Alternativas]
- **Ensino remoto:** [Adaptações]

## 8. Referências e Materiais de Apoio
- [Livros-texto relevantes]
- [Artigos científicos]
- [Vídeos educacionais]
- [Simuladores/Softwares]

REGRAS:
- SEMPRE inclua uma rubrica de avaliação detalhada
- Use exemplos do contexto brasileiro quando possível
- Seja PRÁTICO e DIRETAMENTE APLICÁVEL
- Máximo 2000 palavras`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Tópico: ${topic}\n\nContexto adicional: ${context.substring(0, 1000)}` }
        ],
      }),
    });
    
    if (!response.ok) throw new Error(`AI error: ${response.status}`);
    
    const data = await response.json();
    const lessonPlan = data.choices[0].message.content;
    
    await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: job.input_payload.conversationId,
        role: 'assistant',
        content: `✅ **Plano de Aula Criado!**\n\n${lessonPlan}`
      });
    
    await supabaseAdmin
      .from('jobs')
      .update({
        status: 'COMPLETED',
        result: lessonPlan
      })
      .eq('id', job.id);
    
    console.log(`[TEACHER] ✅ [${job.id}] Lesson plan generated`);
    
  } catch (error) {
    console.error(`[TEACHER] Error generating lesson plan:`, error);
    throw error;
  }
}

async function runJob(jobId: string) {
  const startTime = Date.now();
  console.log(`\n========================================`);
  console.log(`[TEACHER] 🚀 Teacher Job Runner started for: ${jobId}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log(`========================================\n`);

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const BRAVE_API_KEY = Deno.env.get('BRAVE_SEARCH_API_KEY');

  if (!LOVABLE_API_KEY || !BRAVE_API_KEY) {
    console.error('[TEACHER] ❌ API keys not configured');
    return;
  }

  try {
    const { data: job, error } = await supabaseAdmin
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error || !job) {
      console.error(`[TEACHER] ❌ Job ${jobId} not found:`, error);
      return;
    }

    console.log(`[TEACHER] 📋 Job found: ${job.job_type} - Status: ${job.status}`);

    if (job.status === 'COMPLETED' || job.status === 'FAILED') {
      console.log(`[TEACHER] ⏭️ Job ${jobId} already in terminal state: ${job.status}`);
      return;
    }

    // Dispatch pedagógico
    if (job.job_type === 'GENERATE_SUGGESTIONS') {
      await handleGenerateSuggestions(job, supabaseAdmin, LOVABLE_API_KEY);
    } else if (job.job_type === 'GENERATE_QUIZ') {
      await handleGenerateTeacherQuiz(job, supabaseAdmin, LOVABLE_API_KEY);
    } else if (job.job_type === 'GENERATE_FLASHCARDS') {
      await handleGenerateTeacherFlashcards(job, supabaseAdmin, LOVABLE_API_KEY);
    } else if (job.job_type === 'GENERATE_LESSON_PLAN') {
      await handleGenerateLessonPlan(job, supabaseAdmin, LOVABLE_API_KEY);
    } else if (job.job_type === 'GENERATE_RUBRIC') {
      // NOVO handler específico para professores
      console.log('[TEACHER] Rubric generation not yet implemented');
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
          console.warn(`[TEACHER] ⚠️ Unknown state: ${job.status}`);
      }
    } else {
      console.warn(`[TEACHER] ⚠️ Unknown job type: ${job.job_type}`);
    }
  } catch (error) {
    console.error(`[TEACHER] ❌ Error processing job ${jobId}:`, error);
    
    try {
      await supabaseAdmin
        .from('jobs')
        .update({
          status: 'FAILED',
          error_log: error instanceof Error ? error.message : String(error)
        })
        .eq('id', jobId);
    } catch (updateError) {
      console.error('[TEACHER] Failed to update job as failed:', updateError);
    }
  } finally {
    const duration = Date.now() - startTime;
    console.log(`\n[TEACHER] ⏱️ Job ${jobId} completed in ${duration}ms\n`);
  }
}

async function selfInvoke(jobId: string) {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  console.log(`[TEACHER] 🔄 Self-invoking for next state: ${jobId}`);

  fetch(`${SUPABASE_URL}/functions/v1/teacher-job-runner`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ jobId })
  }).catch(err => console.error('[TEACHER] Self-invoke error:', err));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId } = await req.json();

    if (!jobId) {
      throw new Error('jobId is required');
    }

    console.log(`[TEACHER] 📨 Received request for job: ${jobId}`);

    runJob(jobId)
      .then(() => console.log(`[TEACHER] ✅ Background task completed for ${jobId}`))
      .catch((error) => console.error(`[TEACHER] ❌ Background task failed for ${jobId}:`, error));

    return new Response(
      JSON.stringify({ success: true, message: 'Teacher job processing started' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[TEACHER] Job runner error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
