import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Timeout helper
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  const timeout = new Promise<T>((_, reject) => {
    setTimeout(() => reject(new Error('Operation timed out')), timeoutMs);
  });
  return Promise.race([promise, timeout]);
}

// Execute web search using Brave Search API
async function executeWebSearch(
  query: string,
  braveApiKey: string,
  numResults: number = 5
): Promise<Array<{ url: string; title: string; snippet: string }>> {
  console.log(`  → Executing Brave Search for: "${query}"`);
  
  const url = new URL('https://api.search.brave.com/res/v1/web/search');
  url.searchParams.set('q', query);
  url.searchParams.set('count', numResults.toString());
  url.searchParams.set('search_lang', 'en');
  url.searchParams.set('safesearch', 'moderate');
  
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'X-Subscription-Token': braveApiKey,
    },
  });
  
  if (response.status === 429) {
    console.log('  ⚠️ Rate limited by Brave Search, waiting 5s...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    throw new Error('Rate limited, retry later');
  }
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`  ✗ Brave Search API failed (${response.status}):`, errorText.substring(0, 200));
    throw new Error(`Search API failed: ${response.status}`);
  }
  
  const data = await response.json();
  const results = data.web?.results || [];
  
  console.log(`  ✓ Brave Search returned ${results.length} results`);
  
  return results.map((result: any) => ({
    url: result.url,
    title: result.title || '',
    snippet: result.description || '',
  }));
}

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
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const BRAVE_API_KEY = Deno.env.get('BRAVE_SEARCH_API_KEY');
    
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }
    if (!BRAVE_API_KEY) {
      throw new Error('BRAVE_SEARCH_API_KEY not configured');
    }

    // ====================================================================
    // Step 1: Decompose the question with OpenAI GPT-5 + Function Calling
    // ====================================================================
    await updateProgress("A decompor a pergunta em tópicos...");
    console.log('\n=== Step 1: Decomposing question with OpenAI GPT-5 ===');

    const decomposeResponse = await withTimeout(
      fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-5',
          messages: [
            {
              role: 'system',
              content: 'You are an AI research agent specializing in engineering education. Generate 5-7 focused, searchable research questions in English to maximize academic search result quality.'
            },
            {
              role: 'user',
              content: `Analyze this query and break it into 5-7 specific, searchable sub-questions: "${query}"\n\nEach question should be precise and target specific aspects like: foundational principles, practical applications, technical details, and engineering implementations.`
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
          max_completion_tokens: 2000,
        }),
      }),
      30000 // 30s timeout
    );

    if (!decomposeResponse.ok) {
      const errorText = await decomposeResponse.text();
      console.error('Question decomposition failed:', errorText);
      throw new Error('Failed to decompose question');
    }

    const decomposeData = await decomposeResponse.json();
    
    // Extract structured questions from tool call
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
    
    console.log(`✓ Generated ${subQuestions.length} sub-questions:`, subQuestions);
    
    if (subQuestions.length < 5 || subQuestions.length > 7) {
      console.warn(`⚠️ Generated ${subQuestions.length} questions (expected 5-7)`);
    }

    // ====================================================================
    // Step 2: Execute Web Searches with GPT-5 Agentic Researcher
    // ====================================================================
    await updateProgress("A executar buscas na web...");
    console.log('\n=== Step 2: Executing web searches with GPT-5 agent ===');

    interface ResearchResult {
      question: string;
      sources: Array<{
        url: string;
        snippet: string;
      }>;
    }

    const researchResults: ResearchResult[] = [];

    // Define the web search tool for GPT-5 function calling
    const webSearchTool = {
      type: "function",
      function: {
        name: "web_search",
        description: "Search the web for academic and technical information on a specific engineering topic. Use this to find authoritative sources.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query - should be specific and academic (e.g., 'First Law of Thermodynamics mathematical formulation')"
            },
            num_results: {
              type: "number",
              description: "Number of results to return (default: 5)",
              default: 5
            }
          },
          required: ["query"]
        }
      }
    };

    // For each sub-question, let GPT-5 conduct research using function calling
    for (let questionIdx = 0; questionIdx < subQuestions.length; questionIdx++) {
      const subQuestion = subQuestions[questionIdx];
      console.log(`\n--- Researching Question ${questionIdx + 1}/${subQuestions.length}: "${subQuestion}" ---`);
      
      const conversationHistory: any[] = [
        {
          role: 'system',
          content: `You are a research assistant. Your task is to find 3-5 high-quality sources for the question: "${subQuestion}".

Use the web_search function to search for information. You should:
1. Start with a direct search of the question
2. If results are poor, refine your query to be more specific or broader
3. Focus on academic sources (.edu, .org, technical documentation)
4. Stop once you have 3-5 quality sources with substantial content

Be strategic about your searches - you have a limited number of iterations.`
        },
        {
          role: 'user',
          content: `Find authoritative sources to answer: ${subQuestion}`
        }
      ];
      
      const MAX_ITERATIONS = 5; // Hard limit to prevent infinite loops
      let iteration = 0;
      const searchResults: Array<{ url: string; snippet: string }> = [];
      const seenUrls = new Set<string>();
      
      // Agentic loop - GPT-5 decides when to search and when it's done
      agentLoop: while (iteration < MAX_ITERATIONS) {
        iteration++;
        console.log(`  Iteration ${iteration}/${MAX_ITERATIONS} (${searchResults.length} sources so far)`);
        
        try {
          const agentResponse = await withTimeout(
            fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'gpt-5',
                messages: conversationHistory,
                tools: [webSearchTool],
                max_completion_tokens: 4000,
              }),
            }),
            30000 // 30s timeout per GPT-5 call
          );
          
          if (!agentResponse.ok) {
            const errorText = await agentResponse.text();
            console.error(`  ✗ GPT-5 call failed (${agentResponse.status}):`, errorText.substring(0, 200));
            break agentLoop; // Exit on error
          }
          
          const agentData = await agentResponse.json();
          const message = agentData.choices?.[0]?.message;
          
          if (!message) {
            console.error('  ✗ No message in GPT-5 response');
            break agentLoop;
          }
          
          // Add assistant's response to history
          conversationHistory.push(message);
          
          // Check if GPT-5 wants to call the search function
          if (message.tool_calls && message.tool_calls.length > 0) {
            console.log(`  → GPT-5 is calling ${message.tool_calls.length} tool(s)`);
            
            for (const toolCall of message.tool_calls) {
              if (toolCall.function.name === 'web_search') {
                const args = JSON.parse(toolCall.function.arguments);
                const searchQuery = args.query;
                const numResults = args.num_results || 5;
                
                console.log(`    🔍 web_search("${searchQuery}", ${numResults})`);
                
                try {
                  // Execute the actual web search with timeout
                  const results = await withTimeout(
                    executeWebSearch(searchQuery, BRAVE_API_KEY, numResults),
                    15000 // 15s timeout per search
                  );
                  
                  // Filter and add results to our collection
                  let addedCount = 0;
                  for (const result of results) {
                    if (!seenUrls.has(result.url) && result.snippet && result.snippet.length > 50) {
                      searchResults.push({
                        url: result.url,
                        snippet: result.snippet,
                      });
                      seenUrls.add(result.url);
                      addedCount++;
                    }
                  }
                  
                  console.log(`    ✓ Added ${addedCount} new sources (total: ${searchResults.length})`);
                  
                  // Send results back to GPT-5
                  conversationHistory.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: JSON.stringify({
                      success: true,
                      results: results.slice(0, 5), // Limit to 5 per search
                      message: `Found ${results.length} results`
                    })
                  });
                  
                } catch (searchError) {
                  console.error(`    ✗ Search failed:`, searchError);
                  // Send error back to GPT-5 so it can decide what to do
                  conversationHistory.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: JSON.stringify({
                      success: false,
                      error: searchError instanceof Error ? searchError.message : 'Search failed'
                    })
                  });
                }
              }
            }
            
            // Check if we have enough sources
            if (searchResults.length >= 5) {
              console.log(`  ✓ Found sufficient sources (${searchResults.length}), stopping research for this question`);
              break agentLoop;
            }
            
          } else {
            // GPT-5 has finished researching (no more function calls)
            console.log(`  ✓ GPT-5 completed research after ${iteration} iteration(s)`);
            break agentLoop;
          }
          
        } catch (error) {
          console.error(`  ✗ Error in iteration ${iteration}:`, error);
          break agentLoop;
        }
        
        // Small delay between iterations
        if (iteration < MAX_ITERATIONS) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // Store results for this question
      if (searchResults.length > 0) {
        researchResults.push({
          question: subQuestion,
          sources: searchResults.slice(0, 5), // Limit to top 5 sources
        });
        console.log(`✓ Completed: ${searchResults.length} sources found for question ${questionIdx + 1}`);
      } else {
        console.warn(`⚠️ No sources found for question ${questionIdx + 1}, skipping`);
      }
      
      // Delay between questions
      if (questionIdx < subQuestions.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`\n✓ Completed ${researchResults.length}/${subQuestions.length} research questions`);

    // ====================================================================
    // Step 3: Synthesize Content
    // ====================================================================
    await updateProgress("A sintetizar conteúdo...");
    console.log('\n=== Step 3: Synthesizing research content ===');
    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay for UI

    // ====================================================================
    // Step 4: Generate Final Report with OpenAI GPT-5
    // ====================================================================
    await updateProgress("A gerar relatório final...");
    console.log('\n=== Step 4: Generating final report with OpenAI GPT-5 ===');

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
Com base exclusivamente nas informações fornecidas na variável compiledResearch abaixo, escreva um documento explicativo detalhado, entre 2 a 4 páginas, sobre o tópico "${query}".

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

    // Start periodic progress updates during report generation
    let progressInterval: number | undefined;
    const startProgressUpdates = () => {
      let dots = 0;
      progressInterval = setInterval(async () => {
        dots = (dots + 1) % 4;
        const dotsStr = '.'.repeat(dots);
        await updateProgress(`A gerar relatório final${dotsStr}`);
      }, 5000) as unknown as number; // Update every 5 seconds with animated dots
    };
    
    startProgressUpdates();
    
    let reportResponse;
    try {
      reportResponse = await withTimeout(
        fetch('https://api.openai.com/v1/chat/completions', {
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
        }),
        300000 // 5 minute timeout for report generation
      );
    } catch (error) {
      if (progressInterval) clearInterval(progressInterval);
      if (error instanceof Error && error.message === 'Operation timed out') {
        console.error('✗ Report generation timed out after 5 minutes');
        throw new Error('O relatório está a demorar muito tempo a gerar. Tente uma pergunta mais específica.');
      }
      throw error;
    }
    
    if (progressInterval) clearInterval(progressInterval);
    await updateProgress("A gerar relatório final...");

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

    console.log('✓ Report generated successfully, length:', finalReport.length);

    // Update session with completed status
    await updateProgress("Concluído");
    console.log('Updating session with completed status...');
    
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

    console.log('✓ Session updated successfully');
    console.log('✓ Deep research completed successfully');

  } catch (error) {
    console.error('✗ Error in background task:', error);
    
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

// HTTP Server
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
