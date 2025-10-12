import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Timeout helper with default 120s for Phase 1
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 120000): Promise<T> {
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
  const startTime = Date.now();
  
  // Monitor execution time periodically
  const timeMonitor = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    console.log(`⏱️ Function running for ${elapsed}s`);
  }, 10000) as unknown as number; // Log every 10 seconds
  
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Helper to update progress with timestamps
  const updateProgress = async (step: string) => {
    const timestamp = new Date().toISOString();
    try {
      await supabaseAdmin
        .from('deep_search_sessions')
        .update({ progress_step: step, updated_at: timestamp })
        .eq('id', deepSearchSessionId);
      console.log(`[${timestamp}] Progress:`, step);
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  // Define research results outside try block so it's accessible in catch
  interface ResearchResult {
    question: string;
    sources: Array<{
      url: string;
      snippet: string;
    }>;
  }
  const researchResults: ResearchResult[] = [];

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
      120000 // 120s timeout - increased for GPT-5 response time under load
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
      
      const MAX_ITERATIONS = 5; // Guaranteed termination after 5 attempts
      const MIN_SOURCES = 3; // Minimum acceptable sources
      const TARGET_SOURCES = 5; // Ideal number of sources
      const searchResults: Array<{ url: string; snippet: string }> = [];
      const seenUrls = new Set<string>();
      
      // Deterministic loop - guarantees exactly MAX_ITERATIONS attempts
      for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
        // Check if we have enough sources before attempting more searches
        if (searchResults.length >= TARGET_SOURCES) {
          console.log(`  ✓ Target reached: ${searchResults.length} sources collected`);
          break;
        }
        
        console.log(`  Iteration ${iteration + 1}/${MAX_ITERATIONS} (${searchResults.length}/${TARGET_SOURCES} sources)`);
        
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
            break; // Exit on error
          }
          
          const agentData = await agentResponse.json();
          const message = agentData.choices?.[0]?.message;
          
          if (!message) {
            console.error('  ✗ No message in GPT-5 response');
            break;
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
            
            // Check if we have enough sources after this round
            if (searchResults.length >= TARGET_SOURCES) {
              console.log(`  ✓ Found sufficient sources (${searchResults.length}), stopping research for this question`);
              break;
            }
            
          } else {
            // GPT-5 has finished researching (no more function calls)
            console.log(`  ✓ GPT-5 completed research after ${iteration + 1} iteration(s)`);
            break;
          }
          
        } catch (error) {
          console.error(`  ✗ Error in iteration ${iteration + 1}:`, error);
          // Continue to next iteration instead of breaking
          // This ensures we always attempt MAX_ITERATIONS
        }
        
        // Small delay between iterations
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Validate minimum sources after loop completion
      if (searchResults.length < MIN_SOURCES) {
        console.warn(`⚠️ Only found ${searchResults.length} sources (minimum: ${MIN_SOURCES})`);
        // Still save partial results - don't throw error
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
    // Phase 1 Complete: Save Research Data for Phase 2
    // ====================================================================
    await updateProgress("Pesquisa concluída, a preparar relatório...");
    console.log('\n=== Phase 1 Complete: Saving research data ===');
    
    // Save research data to database for Phase 2 (report generation)
    const { error: saveError } = await supabaseAdmin
      .from('deep_search_sessions')
      .update({
        status: 'research_completed',
        research_data: researchResults,
        progress_step: 'Pesquisa concluída, a preparar relatório...',
        updated_at: new Date().toISOString()
      })
      .eq('id', deepSearchSessionId);

    if (saveError) {
      console.error('Error saving research data:', saveError);
      throw new Error(`Failed to save research data: ${saveError.message}`);
    }

    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    console.log(`✓ Phase 1 completed successfully in ${elapsed}s`);
    console.log(`✓ Saved ${researchResults.length} research results`);
    console.log('✓ Ready for Phase 2 (report generation)');

  } catch (error) {
    console.error('✗ Error in Phase 1:', error);
    
    // Clear time monitor
    if (timeMonitor) clearInterval(timeMonitor);
    
    // Save partial research data if available
    if (researchResults.length > 0) {
      try {
        await supabaseAdmin
          .from('deep_search_sessions')
          .update({
            status: 'error',
            research_data: researchResults,
            progress_step: `Erro na pesquisa após coletar ${researchResults.length} resultados`,
            updated_at: new Date().toISOString()
          })
          .eq('id', deepSearchSessionId);
      } catch (updateError) {
        console.error('Failed to save partial research data:', updateError);
      }
    } else {
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
  } finally {
    // Ensure time monitor is cleared
    if (timeMonitor) clearInterval(timeMonitor);
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
