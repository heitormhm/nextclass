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
      
      // Helper function to validate and filter sources
      const validateSources = (sources: Array<{ url: string; snippet: string }>) => {
        const seenDomains = new Set<string>();
        const lowQualityDomains = ['quora.com', 'reddit.com', 'answers.yahoo.com', 'stackoverflow.com'];
        
        return sources.filter(source => {
          try {
            const url = new URL(source.url);
            const domain = url.hostname.replace('www.', '');
            
            // Check for duplicate domains
            if (seenDomains.has(domain)) {
              console.log(`  ⤷ Rejected duplicate domain: ${domain}`);
              return false;
            }
            
            // Check for low-quality domains
            if (lowQualityDomains.some(lq => domain.includes(lq))) {
              console.log(`  ⤷ Rejected low-quality domain: ${domain}`);
              return false;
            }
            
            seenDomains.add(domain);
            return true;
          } catch {
            console.log(`  ⤷ Rejected invalid URL: ${source.url}`);
            return false;
          }
        });
      };
      
      // Retry logic for insufficient sources with guaranteed termination
      const MAX_RETRIES = 2;
      let finalSources: Array<{ url: string; snippet: string }> = [];
      let currentQuery = subQuestion;
      const originalSubQuestion = subQuestion;
      
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const attemptLabel = attempt === 0 ? 'initial' : `retry ${attempt}`;
        console.log(`  Attempt ${attempt + 1}/${MAX_RETRIES + 1} (${attemptLabel}): "${currentQuery}"`);
        
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
                  content: `CONTEXT:
You are a meticulous AI research assistant for the NextClass engineering platform. Your function is to gather high-quality, verifiable information from multiple distinct sources to answer a specific academic question.

TASK:
Conduct a targeted Google Search for the query: "${currentQuery}". Your goal is to find at least THREE (3) distinct and reputable sources that directly answer this query.

CONSTRAINTS:
1. **Source Quality:** Prioritize sources from academic journals, university websites (.edu), reputable engineering organizations (.org), and official technical documentation. You must critically evaluate and AVOID sources like forums, personal blogs, or Q&A sites.

2. **Content Extraction:** For each valid source found, extract the most relevant paragraphs or sections that directly answer the query. The snippet must be substantial (2-3 paragraphs minimum).

3. **Output Format:** Structure your response as:
[SOURCE 1]
URL: [full URL]
Content: [extracted relevant text - 2-3 paragraphs]

[SOURCE 2]
URL: [full URL]
Content: [extracted relevant text - 2-3 paragraphs]

[SOURCE 3]
URL: [full URL]
Content: [extracted relevant text - 2-3 paragraphs]

**CRITICAL:** Use ONLY real information from actual web searches. Do NOT fabricate sources or content. If you cannot find high-quality sources, return what you find with accurate citations.`
                },
                {
                  role: 'user',
                  content: currentQuery
                }
              ],
              tools: [
                {
                  googleSearchRetrieval: {
                    dynamicRetrievalConfig: {
                      mode: "MODE_DYNAMIC",
                      dynamicThreshold: 0.5  // More aggressive retrieval
                    }
                  }
                }
              ],
              temperature: 0.5,
              max_tokens: 2000,
            }),
          });

          if (researchResponse.ok) {
            const researchData = await researchResponse.json();
            const result = researchData.choices?.[0]?.message?.content;
            
            if (result) {
              console.log(`  ⤷ API response length: ${result.length} characters`);
              console.log(`  ⤷ Response preview: ${result.substring(0, 200)}...`);
              
              // Parse structured sources from [SOURCE N] format
              const rawSources: Array<{ url: string; snippet: string }> = [];
              const sourceMatches = result.matchAll(/\[SOURCE \d+\]\s*URL:\s*(https?:\/\/[^\s\n]+)\s*Content:\s*([^[]*?)(?=\[SOURCE \d+\]|$)/gs);
              
              for (const match of sourceMatches) {
                const url = match[1].trim();
                const snippet = match[2].trim();
                if (url && snippet && snippet.length > 100) {  // Ensure substantial content
                  rawSources.push({ url, snippet });
                }
              }
              
              // If no sources found with [SOURCE N] format, try parsing as JSON
              if (rawSources.length === 0) {
                try {
                  const jsonMatch = result.match(/\[[\s\S]*\]/);
                  if (jsonMatch) {
                    const jsonSources = JSON.parse(jsonMatch[0]);
                    if (Array.isArray(jsonSources)) {
                      jsonSources.forEach((src: any) => {
                        if (src.url && src.snippet && src.snippet.length > 100) {
                          rawSources.push({ url: src.url, snippet: src.snippet });
                        }
                      });
                      console.log(`  ⤷ Parsed ${rawSources.length} sources from JSON format`);
                    }
                  }
                } catch (e) {
                  console.log(`  ⤷ Could not parse JSON format either`);
                }
              }
              
              console.log(`  ⤷ Raw sources found: ${rawSources.length}`);
              
              // Validate and filter sources
              const validSources = validateSources(rawSources);
              console.log(`  ⤷ Valid sources after filtering: ${validSources.length}`);
              
              // Merge with any sources from previous attempts
              for (const source of validSources) {
                if (!finalSources.some(s => s.url === source.url)) {
                  finalSources.push(source);
                }
              }
              
              if (finalSources.length >= 3) {
                console.log(`  ✓ Success! Found ${finalSources.length} quality sources`);
                break; // Exit the for loop - we have enough sources
              } else if (attempt < MAX_RETRIES) {
                console.log(`  ⚠️ Only ${finalSources.length} sources so far, will retry with reformulated query...`);
                
                // Use Gemini to reformulate the query for better results
                try {
                  const reformulateResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      model: 'google/gemini-2.5-flash',
                      messages: [{
                        role: 'user',
                        content: `Reformulate this academic search query to be broader and more likely to find academic sources. Keep it focused on engineering/science education: "${currentQuery}". Return ONLY the reformulated query, nothing else.`
                      }],
                      max_tokens: 100,
                      temperature: 0.7,
                    }),
                  });
                  
                  if (reformulateResponse.ok) {
                    const reformData = await reformulateResponse.json();
                    const reformulatedQuery = reformData.choices?.[0]?.message?.content?.trim();
                    if (reformulatedQuery && reformulatedQuery.length > 0) {
                      currentQuery = reformulatedQuery;
                      console.log(`  ⤷ Reformulated query: "${currentQuery}"`);
                    } else {
                      // Fallback: programmatic reformulation
                      currentQuery = attempt === 0 
                        ? `${originalSubQuestion} engineering applications education`
                        : `${originalSubQuestion.split(' ').slice(0, 4).join(' ')} fundamentals`;
                      console.log(`  ⤷ Fallback reformulated query: "${currentQuery}"`);
                    }
                  } else {
                    // Fallback: programmatic reformulation
                    currentQuery = attempt === 0 
                      ? `${originalSubQuestion} engineering applications education`
                      : `${originalSubQuestion.split(' ').slice(0, 4).join(' ')} fundamentals`;
                    console.log(`  ⤷ Fallback reformulated query: "${currentQuery}"`);
                  }
                } catch (reformError) {
                  console.log(`  ⤷ Error reformulating, using fallback approach`);
                  currentQuery = attempt === 0 
                    ? `${originalSubQuestion} engineering applications education`
                    : `${originalSubQuestion.split(' ').slice(0, 4).join(' ')} fundamentals`;
                  console.log(`  ⤷ Fallback reformulated query: "${currentQuery}"`);
                }
              } else {
                // LAST ATTEMPT: Log that we're proceeding with what we have
                console.warn(`  ⚠️ Max retries reached for "${originalSubQuestion}". Proceeding with ${finalSources.length} sources.`);
              }
            }
          } else {
            const errorText = await researchResponse.text();
            console.warn(`  ✗ API request failed (attempt ${attempt + 1}):`, errorText);
          }
        } catch (error) {
          console.error(`  ✗ Error in attempt ${attempt + 1}:`, error);
          // If it's the last attempt and it fails, break to avoid further issues
          if (attempt >= MAX_RETRIES) {
            console.error(`  ✗ Breaking loop after final attempt failed for "${originalSubQuestion}"`);
            break;
          }
        }
        
        // Small delay between retries to avoid rate limits (skip delay after last attempt)
        if (attempt < MAX_RETRIES && finalSources.length < 3) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // Final assessment
      if (finalSources.length >= 3) {
        researchResults.push({
          question: subQuestion,
          sources: finalSources.slice(0, 5)  // Limit to top 5 sources
        });
        console.log(`✓ Completed research for question ${researchResults.length}/${subQuestions.length} with ${finalSources.length} sources`);
      } else {
        console.warn(`⚠️ INSUFFICIENT SOURCES: Only found ${finalSources.length} sources after ${MAX_RETRIES + 1} attempts for: ${subQuestion}`);
        console.warn(`  ⤷ Continuing with available sources to avoid blocking entire research`);
        
        // Include partial results if any sources were found
        if (finalSources.length > 0) {
          researchResults.push({
            question: subQuestion,
            sources: finalSources
          });
        }
      }

      // Delay between questions to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 300));
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
