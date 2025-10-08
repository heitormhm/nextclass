import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Background task processor
async function processDeepResearch(
  query: string,
  deepSearchSessionId: string,
  userId: string
) {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Helper to update progress
  const updateProgress = async (step: string) => {
    try {
      await supabaseAdmin
        .from('deep_search_sessions')
        .update({ progress_step: step, updated_at: new Date().toISOString() })
        .eq('id', deepSearchSessionId);
      console.log('Progress:', step);
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Step 1: Decompose the question with Gemini 2.5 Pro
    await updateProgress("A decompor a pergunta em tópicos...");
    console.log('Step 1: Decomposing question with Gemini 2.5 Pro');

    const decomposeResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          {
            role: 'user',
            content: `You are an AI research agent for the NextClass platform, specializing in engineering education.

TASK: Analyze the user's query: "${query}". Deconstruct it into 5 to 7 logical, specific, and searchable sub-questions that will maximize search result quality from academic databases and technical documentation.

CONSTRAINTS:
- Output MUST be a valid JSON array of strings
- Each string must be a precise, searchable question
- Questions should be in ENGLISH for optimal academic search results
- Cover: foundational principles, practical applications, technical details, and future trends
- Format: ["Question 1?", "Question 2?", ...]

Example for "Thermodynamics Laws":
["What is the formal definition and mathematical formulation of the First Law of Thermodynamics?",
 "How does the Second Law introduce entropy and irreversibility in engineering?",
 "What are practical applications of the Third Law in materials science?",
 "How are thermodynamic cycles analyzed using these laws?",
 "What causes inefficiency in real-world heat engines?"]`
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_research_questions",
            description: "Generate focused research questions for deep search",
            parameters: {
              type: "object",
              properties: {
                questions: {
                  type: "array",
                  items: { type: "string" },
                  minItems: 5,
                  maxItems: 7,
                  description: "Array of 5-7 focused research questions in English"
                }
              },
              required: ["questions"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "generate_research_questions" } },
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!decomposeResponse.ok) {
      throw new Error('Failed to decompose question');
    }

    const decomposeData = await decomposeResponse.json();
    
    // Extract structured JSON from tool call
    let subQuestions: string[] = [];
    const toolCall = decomposeData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        subQuestions = parsed.questions || [];
      } catch (e) {
        console.error('Failed to parse JSON questions:', e);
        throw new Error('Invalid question format from AI');
      }
    }
    
    const questionCount = subQuestions.length;
    console.log(`Generated ${questionCount} sub-questions (English):`, subQuestions);
    
    if (questionCount < 5 || questionCount > 7) {
      console.warn(`⚠️ Generated ${questionCount} questions (expected 5-7)`);
    }

    // Step 2: Execute searches using Google Search grounding
    await updateProgress("A executar buscas na web...");
    console.log('Step 2: Executing web searches');

    interface ResearchResult {
      question: string;
      sources: Array<{
        url: string;
        snippet: string;
      }>;
    }

    const researchResults: ResearchResult[] = [];

    for (const subQuestion of subQuestions) {
      console.log('Researching:', subQuestion);
      
      try {
        const researchResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-pro',
            messages: [
              {
                role: 'system',
                content: `You are an academic research specialist for engineering education.

TASK: For the question "${subQuestion}", search the web and find information from at least 3 different reputable sources.

SOURCE REQUIREMENTS:
- Minimum 3 distinct sources (scientific articles, university websites, official documentation)
- Each source must be from a different domain
- Prioritize: .edu, .org, academic publishers, government sites, technical documentation

OUTPUT FORMAT:
For each source, provide:
1. Full URL
2. 2-3 most relevant paragraphs that directly answer the question

Format your response as:
[SOURCE 1]
URL: [full URL]
Content: [relevant paragraphs]

[SOURCE 2]
URL: [full URL]
Content: [relevant paragraphs]

[SOURCE 3]
URL: [full URL]
Content: [relevant paragraphs]

CRITICAL: You MUST find and cite at least 3 different sources. Use ONLY real information from actual web searches.`
              },
              {
                role: 'user',
                content: subQuestion
              }
            ],
            tools: [
              {
                googleSearchRetrieval: {
                  dynamicRetrievalConfig: {
                    mode: "MODE_DYNAMIC",
                    dynamicThreshold: 0.7
                  }
                }
              }
            ],
            temperature: 0.5,
            max_tokens: 1500,
          }),
        });

        if (researchResponse.ok) {
          const researchData = await researchResponse.json();
          const result = researchData.choices?.[0]?.message?.content;
          if (result) {
            // Parse structured sources from [SOURCE N] format
            const sources: Array<{ url: string; snippet: string }> = [];
            const sourceMatches = result.matchAll(/\[SOURCE \d+\]\s*URL:\s*(https?:\/\/[^\s\n]+)\s*Content:\s*([^[]*?)(?=\[SOURCE \d+\]|$)/gs);
            
            for (const match of sourceMatches) {
              const url = match[1].trim();
              const snippet = match[2].trim();
              if (url && snippet) {
                sources.push({ url, snippet });
              }
            }
            
            if (sources.length >= 3) {
              researchResults.push({
                question: subQuestion,
                sources
              });
              console.log(`✓ Completed research for question ${researchResults.length}/${subQuestions.length} with ${sources.length} sources`);
            } else {
              console.warn(`⚠️ Only found ${sources.length} sources (minimum 3 required) for: ${subQuestion}`);
            }
          }
        } else {
          console.warn(`Failed to research: ${subQuestion}`);
        }
      } catch (error) {
        console.error(`Error researching question:`, error);
        // Continue with next question instead of failing completely
      }

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`Completed ${researchResults.length} research results`);

    // Step 3 & 4: Generate final report with OpenAI GPT-5
    await updateProgress("A gerar relatório final...");
    console.log('Step 3: Generating final report with OpenAI GPT-5');

    // Compile all research results into a structured format
    const compiledResearch = researchResults
      .map((result, idx) => {
        const sourcesFormatted = result.sources
          .map((s, i) => `[${idx * 10 + i + 1}] ${s.url}\n${s.snippet}`)
          .join('\n\n');
        
        return `--- EXTRATO ${idx + 1} ---
PERGUNTA: ${result.question}

FONTES E CONTEÚDO:
${sourcesFormatted}
`;
      })
      .join('\n\n');

    const masterPrompt = `CONTEXTO:
Você é um redator técnico especialista em engenharia, encarregado de compilar um relatório académico detalhado. Você recebeu um conjunto de extratos de pesquisa, cada um associado a uma URL de origem. A pesquisa foi conduzida em inglês para obter melhores fontes acadêmicas, mas você deve escrever o relatório em PORTUGUÊS. As fontes citadas podem estar em inglês - traduza e adapte os conceitos técnicos mantendo precisão e rigor. A sua única fonte de verdade é este material.

TAREFA:
Com base exclusivamente nas informações fornecidas na variável compiledResearch abaixo, escreva um documento explicativo detalhado, entre 3 a 10 páginas, sobre o tópico "${query}".

RESTRIÇÕES:
- **Nível do Público:** O relatório destina-se a um estudante de engenharia de nível superior. Adapte a profundidade técnica e os exemplos para serem desafiadores e educativos, mas evite jargões excessivamente especializados sem explicação. O objetivo é a clareza e a aplicação prática do conhecimento.

- **Estrutura:**
  1. **Introdução:** Apresente o tópico e a sua relevância na engenharia.
  2. **Desenvolvimento:** Organize os conceitos em secções lógicas com subtítulos. Use ## para secções principais e ### para subsecções.
  3. **Aplicações Práticas:** Explore aplicações do tópico na engenharia com exemplos concretos.
  4. **Conclusão:** Sintetize os pontos principais.
  5. **Referências Bibliográficas:** No final do documento, crie uma secção com este título e liste todas as fontes numeradas.

- **Regras de Citação (Obrigatórias):**
  - Para cada informação utilizada, insira um número de referência entre parêntesis retos (ex: [1], [2]).
  - Pode usar múltiplas referências no mesmo parágrafo (ex: [1][2]).
  - Na secção "Referências Bibliográficas", liste cada fonte com o seu número e URL completo. Formato: [1] https://exemplo.com/artigo

- **Restrição Crítica:**
  - NÃO INVENTE INFORMAÇÕES OU REFERÊNCIAS. A sua principal diretriz é a fidelidade absoluta às fontes fornecidas. Se a informação for insuficiente, declare isso explicitamente.

- **Formatação:**
  - Use markdown para estruturar o documento.
  - Use # para o título principal, ## para secções, e ### para subsecções.
  - Mantenha um tom formal e académico.

---

MATERIAL DE PESQUISA FORNECIDO:

${compiledResearch}

---

Agora, escreva o relatório final em Português, seguindo todas as diretrizes acima.`;

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const reportResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5',
        messages: [
          {
            role: 'user',
            content: masterPrompt
          }
        ],
        max_completion_tokens: 16000,
      }),
    });

    if (!reportResponse.ok) {
      const errorText = await reportResponse.text();
      console.error('Report generation failed:', errorText);
      throw new Error('Failed to generate report');
    }

    const reportData = await reportResponse.json();
    const finalReport = reportData.choices?.[0]?.message?.content;

    if (!finalReport) {
      throw new Error('No report generated');
    }

    console.log('Report generated successfully, length:', finalReport.length);

    // Update progress to "Concluído" and add a small delay before final DB update
    await updateProgress("Concluído");
    console.log('Updating session with completed status...');
    
    // Small delay to ensure progress update is processed before final state
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const { data: updateData, error: updateError } = await supabaseAdmin
      .from('deep_search_sessions')
      .update({
        status: 'completed',
        result: finalReport,
        progress_step: 'Concluído',
        updated_at: new Date().toISOString()
      })
      .eq('id', deepSearchSessionId)
      .select();

    if (updateError) {
      console.error('Error updating session:', updateError);
      throw new Error(`Failed to save report: ${updateError.message}`);
    }

    console.log('Session updated successfully:', updateData);
    console.log('Deep research completed successfully');

  } catch (error) {
    console.error('Error in background task:', error);
    
    // Update session with error
    try {
      await supabaseAdmin
        .from('deep_search_sessions')
        .update({
          status: 'error',
          progress_step: 'Erro na pesquisa. Por favor tente novamente.',
          updated_at: new Date().toISOString()
        })
        .eq('id', deepSearchSessionId);
    } catch (updateError) {
      console.error('Failed to update error status:', updateError);
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, deepSearchSessionId } = await req.json();
    console.log('Deep research request:', { query, deepSearchSessionId });

    if (!query || !deepSearchSessionId) {
      throw new Error('Missing query or deepSearchSessionId');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Start background task (fire and forget)
    console.log('Starting background task for deep research...');
    processDeepResearch(query, deepSearchSessionId, user.id).catch((error) => {
      console.error('Background task failed:', error);
    });

    // Return immediately - processing will continue in background
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Pesquisa iniciada. Acompanhe o progresso na interface.',
        sessionId: deepSearchSessionId,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in deep research agent:', error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
