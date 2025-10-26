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

// Execute web search using Brave Search API
async function executeWebSearch(
  query: string,
  braveApiKey: string,
  numResults: number = 5
): Promise<Array<{ url: string; title: string; snippet: string }>> {
  try {
    console.log(`🔎 [Web Search] Query: "${query}"`);
    
    const searchUrl = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${numResults}`;
    
    const response = await withTimeout(
      fetch(searchUrl, {
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': braveApiKey,
        },
      }),
      30000
    );

    if (response.status === 429) {
      console.warn('⚠️ [Web Search] Rate limit hit, waiting 5s...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      return executeWebSearch(query, braveApiKey, numResults);
    }

    if (!response.ok) {
      console.error(`❌ [Web Search] Error ${response.status}: ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    const results = (data.web?.results || []).slice(0, numResults).map((r: any) => ({
      url: r.url,
      title: r.title,
      snippet: r.description || '',
    }));

    console.log(`✅ [Web Search] Found ${results.length} results`);
    return results;
  } catch (error) {
    console.error('❌ [Web Search] Error:', error);
    return [];
  }
}

// Main deep research processing function
async function processDeepResearch(
  query: string,
  sessionId: string,
  lectureId: string,
  userId: string
) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
  const braveApiKey = Deno.env.get('BRAVE_SEARCH_API_KEY')!;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('🚀 [Deep Research] Starting research process...');

    // Update status to analyzing
    await supabase
      .from('lecture_deep_search_sessions')
      .update({ 
        status: 'analyzing',
        progress_step: 'Decomposing query into sub-questions...',
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    // Step 1: Decompose query using AI
    console.log('🧠 [Step 1] Decomposing query into sub-questions...');
    
    const decompositionPrompt = `You are a research assistant helping to break down a lecture topic into searchable sub-questions.

Main Topic: "${query}"

Generate 4-5 specific, searchable questions that would help gather comprehensive information about this topic. Each question should:
- Be specific and focused
- Be answerable through web search
- Cover different aspects of the topic
- Be formulated to find reliable educational sources

Return ONLY a JSON array of strings, nothing else:
["question 1", "question 2", "question 3", ...]`;

    const decompositionResponse = await withTimeout(
      fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'user', content: decompositionPrompt }
          ],
          temperature: 0.7,
        }),
      }),
      60000
    );

    if (!decompositionResponse.ok) {
      throw new Error(`AI decomposition failed: ${decompositionResponse.status}`);
    }

    const decompositionData = await decompositionResponse.json();
    const subQuestionsText = decompositionData.choices[0].message.content;
    const subQuestions = JSON.parse(subQuestionsText.replace(/```json\n?|\n?```/g, '').trim());

    console.log(`📋 [Step 1] Generated ${subQuestions.length} sub-questions`);

    // Update progress
    await supabase
      .from('lecture_deep_search_sessions')
      .update({ 
        progress_step: `Searching web for ${subQuestions.length} topics...`,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    // Step 2: Search for each sub-question
    console.log('🔍 [Step 2] Executing web searches...');
    const allSearchResults: Array<{
      question: string;
      sources: Array<{ url: string; title: string; snippet: string }>;
    }> = [];

    for (let i = 0; i < subQuestions.length; i++) {
      const question = subQuestions[i];
      console.log(`🔎 [Search ${i + 1}/${subQuestions.length}] "${question}"`);
      
      await supabase
        .from('lecture_deep_search_sessions')
        .update({ 
          progress_step: `Searching: ${question.substring(0, 50)}...`,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      const searchResults = await executeWebSearch(question, braveApiKey, 5);
      
      allSearchResults.push({
        question,
        sources: searchResults,
      });

      // Small delay to avoid rate limiting
      if (i < subQuestions.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log(`✅ [Step 2] Completed ${allSearchResults.length} searches`);

    // Save research data
    const researchData = {
      main_query: query,
      sub_questions: subQuestions,
      search_results: allSearchResults,
      total_sources: allSearchResults.reduce((sum, r) => sum + r.sources.length, 0),
    };

    await supabase
      .from('lecture_deep_search_sessions')
      .update({
        status: 'researched',
        research_data: researchData,
        progress_step: 'Research complete! Generating educational report...',
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    console.log('✅ [Deep Research] Research phase completed successfully!');
    console.log(`📊 [Stats] Total sources found: ${researchData.total_sources}`);

  } catch (error) {
    console.error('❌ [Deep Research] Error:', error);
    
    await supabase
      .from('lecture_deep_search_sessions')
      .update({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error during research',
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
    const { query, sessionId, lectureId } = await req.json();

    if (!query || !sessionId || !lectureId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: query, sessionId, lectureId' }),
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

    console.log('🚀 [Lecture Deep Research Agent] Starting background research...');
    console.log('Query:', query);
    console.log('Session ID:', sessionId);
    console.log('Lecture ID:', lectureId);
    console.log('User ID:', user.id);

    // Start processing in background
    processDeepResearch(query, sessionId, lectureId, user.id).catch(error => {
      console.error('Background research error:', error);
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Deep research started',
        sessionId 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in lecture-deep-research-agent:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});