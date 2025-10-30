import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// Types & Interfaces
// ============================================================================

interface ResearchResult {
  question: string;
  sources: Array<{
    url: string;
    title: string;
    snippet: string;
  }>;
}

interface LectureData {
  id: string;
  title: string;
  transcript: string;
  teacher_name?: string;
}

// ============================================================================
// Research Module - Question Decomposition
// ============================================================================

async function decomposeQuestion(
  lectureTitle: string,
  transcript: string,
  lovableApiKey: string
): Promise<string[]> {
  console.log('[Decompose] Starting question decomposition for:', lectureTitle);

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: 'You are an AI research agent specializing in engineering education. Generate 5-7 focused, searchable research questions in English to maximize academic search result quality.'
        },
        {
          role: 'user',
          content: `Analyze this lecture and break it into 5-7 specific, searchable sub-questions:

**Lecture Title:** ${lectureTitle}

**Transcript (first 1000 chars):** ${transcript.substring(0, 1000)}

Each question should be precise and target specific aspects like: foundational principles, practical applications, technical details, and engineering implementations.`
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
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Decompose] AI call failed:', errorText);
    throw new Error('Failed to decompose question');
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

  if (!toolCall?.function?.arguments) {
    throw new Error('No tool call in AI response');
  }

  const parsed = JSON.parse(toolCall.function.arguments);
  const questions = parsed.questions || [];

  console.log(`[Decompose] ✓ Generated ${questions.length} questions:`, questions);

  if (questions.length < 5 || questions.length > 7) {
    console.warn(`[Decompose] ⚠️ Generated ${questions.length} questions (expected 5-7)`);
  }

  return questions;
}

// ============================================================================
// Research Module - Web Search
// ============================================================================

async function searchWeb(
  query: string,
  braveApiKey: string,
  numResults: number = 5
): Promise<Array<{ url: string; title: string; snippet: string }>> {
  console.log(`[Search] Executing Brave Search for: "${query}"`);

  const url = new URL('https://api.search.brave.com/res/v1/web/search');
  
  // Prioritize academic domains
  const academicSites = 'site:ieee.org OR site:sciencedirect.com OR site:springer.com OR site:.edu OR site:researchgate.net';
  const academicQuery = `${query} ${academicSites}`;
  
  url.searchParams.set('q', academicQuery);
  url.searchParams.set('count', numResults.toString());
  url.searchParams.set('search_lang', 'en');
  url.searchParams.set('safesearch', 'strict');

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'X-Subscription-Token': braveApiKey,
    },
  });

  if (response.status === 429) {
    console.log('[Search] ⚠️ Rate limited, waiting 5s...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    throw new Error('Rate limited, retry later');
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Search] ✗ Brave API failed (${response.status}):`, errorText.substring(0, 200));
    throw new Error(`Search API failed: ${response.status}`);
  }

  const data = await response.json();
  const results = data.web?.results || [];

  console.log(`[Search] ✓ Returned ${results.length} results`);

  return results.map((result: any) => ({
    url: result.url,
    title: result.title || '',
    snippet: result.description || '',
  }));
}

// ============================================================================
// Research Module - Main Executor
// ============================================================================

async function executeResearch(lectureData: LectureData): Promise<ResearchResult[]> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const BRAVE_API_KEY = Deno.env.get('BRAVE_SEARCH_API_KEY');

  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured');
  }
  if (!BRAVE_API_KEY) {
    throw new Error('BRAVE_SEARCH_API_KEY not configured');
  }

  console.log('[Research] Starting research for lecture:', lectureData.title);

  // Step 1: Decompose into sub-questions
  const subQuestions = await decomposeQuestion(
    lectureData.title,
    lectureData.transcript,
    LOVABLE_API_KEY
  );

  // Step 2: Execute searches using AI agent (agentic search)
  const researchResults: ResearchResult[] = [];
  const MAX_ITERATIONS = 3; // Limit iterations for each question
  const TARGET_SOURCES = 5;

  for (let questionIdx = 0; questionIdx < subQuestions.length; questionIdx++) {
    const subQuestion = subQuestions[questionIdx];
    console.log(`\n[Research] Question ${questionIdx + 1}/${subQuestions.length}: "${subQuestion}"`);

    const conversationHistory: any[] = [
      {
        role: 'system',
        content: `You are an ACADEMIC research assistant specializing in engineering sources. Find ${TARGET_SOURCES} HIGH-QUALITY ACADEMIC sources for: "${subQuestion}".

✅ PRIORITY DOMAINS:
- .edu (university sites)
- ieee.org, ieeexplore.ieee.org
- sciencedirect.com
- springer.com, springerlink.com
- researchgate.net

⛔ REJECT:
- Wikipedia
- Personal blogs
- Generic educational sites

Use queries like: "topic site:ieee.org" or add "filetype:pdf" for papers.`
      },
      {
        role: 'user',
        content: `Find authoritative sources to answer: ${subQuestion}`
      }
    ];

    const searchResults: Array<{ url: string; title: string; snippet: string }> = [];
    const seenUrls = new Set<string>();

    // Agentic search loop
    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      if (searchResults.length >= TARGET_SOURCES) {
        console.log(`[Research] ✓ Target reached: ${searchResults.length} sources`);
        break;
      }

      console.log(`[Research] Iteration ${iteration + 1}/${MAX_ITERATIONS} (${searchResults.length}/${TARGET_SOURCES})`);

      try {
        const agentResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: conversationHistory,
            tools: [{
              type: "function",
              function: {
                name: "web_search",
                description: "Search the web for academic information",
                parameters: {
                  type: "object",
                  properties: {
                    query: { type: "string" },
                    num_results: { type: "number", default: 5 }
                  },
                  required: ["query"]
                }
              }
            }],
            max_completion_tokens: 2000,
          }),
        });

        if (!agentResponse.ok) {
          console.error(`[Research] ✗ AI call failed (${agentResponse.status})`);
          break;
        }

        const agentData = await agentResponse.json();
        const message = agentData.choices?.[0]?.message;

        if (!message) {
          console.error('[Research] ✗ No message in response');
          break;
        }

        conversationHistory.push(message);

        // Check if AI wants to search
        if (message.tool_calls && message.tool_calls.length > 0) {
          for (const toolCall of message.tool_calls) {
            if (toolCall.function.name === 'web_search') {
              const args = JSON.parse(toolCall.function.arguments);
              const searchQuery = args.query;
              const numResults = args.num_results || 5;

              console.log(`[Research]   🔍 web_search("${searchQuery}", ${numResults})`);

              try {
                const results = await searchWeb(searchQuery, BRAVE_API_KEY, numResults);

                let addedCount = 0;
                for (const result of results) {
                  if (!seenUrls.has(result.url) && result.snippet && result.snippet.length > 50) {
                    searchResults.push({
                      url: result.url,
                      title: result.title,
                      snippet: result.snippet,
                    });
                    seenUrls.add(result.url);
                    addedCount++;
                  }
                }

                console.log(`[Research]   ✓ Added ${addedCount} sources (total: ${searchResults.length})`);

                conversationHistory.push({
                  role: 'tool',
                  tool_call_id: toolCall.id,
                  content: JSON.stringify({
                    success: true,
                    results: results.slice(0, 5),
                    message: `Found ${results.length} results`
                  })
                });

              } catch (searchError) {
                console.error(`[Research]   ✗ Search failed:`, searchError);
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

          if (searchResults.length >= TARGET_SOURCES) {
            break;
          }
        } else {
          console.log(`[Research] ✓ AI completed research`);
          break;
        }

      } catch (error) {
        console.error(`[Research] ✗ Error in iteration ${iteration + 1}:`, error);
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (searchResults.length > 0) {
      researchResults.push({
        question: subQuestion,
        sources: searchResults.slice(0, 5),
      });
      console.log(`[Research] ✓ Collected ${searchResults.length} sources for question ${questionIdx + 1}`);
    } else {
      console.warn(`[Research] ⚠️ No sources found for question ${questionIdx + 1}`);
    }

    // Delay between questions
    if (questionIdx < subQuestions.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`\n[Research] ✓ Completed ${researchResults.length}/${subQuestions.length} questions`);
  return researchResults;
}

// ============================================================================
// AI Report Generator - Phase 2
// ============================================================================

function getEngineeringPrompt(teacherName: string, lectureTitle: string): string {
  return `You are Professor Mia, an engineering education specialist creating high-quality didactic materials.

**Instructor:** ${teacherName || 'Professor'}
**Topic:** ${lectureTitle}

# 📐 MANDATORY MARKDOWN STRUCTURE

## Header Format:
\`\`\`markdown
### **Material Didático - Engenharia**

**Disciplina:** [Subject name from topic]
**Tópico:** ${lectureTitle}
**Professor:** ${teacherName || 'Professor'}
\`\`\`

## Body Requirements:

⛔ **ABSOLUTELY PROHIBITED:**
- NO table of contents, index, or section numbers
- NO "1. Introduction, 2. Concepts..." numbering
- START DIRECTLY with descriptive heading: "## Introduction to [Topic]"

✅ **CORRECT FORMAT:**
- Use ## for main titles (NO numbers, NO asterisks in titles)
- Use ### for subtitles (NO numbers, NO asterisks in titles)
- Titles must be DESCRIPTIVE, not generic
- Use professional Markdown (##, ###, **bold**, numbered lists in content)
- Create comparative tables for similar concepts
- Use Mermaid blocks for visual diagrams (flowcharts, class diagrams)
- **Minimum length:** 4000-5000 words (dense, technical content)

# ⚠️ STRICT LaTeX SYNTAX (MANDATORY)

## ✅ CORRECT FORMAT (ONLY ALLOWED):
\`\`\`markdown
$$E = mc^2$$

$$\\Delta U = Q - W$$

$$W = \\int_{V_1}^{V_2} P \\, dV$$
\`\`\`

## ❌ PROHIBITED FORMATS:
- ** 1$ ** ← NEVER use asterisks + numbers + dollar
- ___LATEX_DOUBLE_2___ ← NEVER use placeholders
- $E = mc^2$ ← NEVER use single $ (always double: $$)
- \\Delta U without delimiters ← ALWAYS wrap in $$

## 📋 MANDATORY RULES:
1. **ALL** mathematical formulas MUST be between $$...$$
2. **NEVER** mix asterisks with formulas: \`**$$formula$$**\` is FORBIDDEN
3. Isolated variables (T, P, V) in text DO NOT need $$
4. Mathematical expressions (like ΔU = Q - W) ALWAYS need $$
5. **ALWAYS** leave space before and after: \`text $$formula$$ text\`

# ⚠️ CRITICAL MERMAID RULES (MATERIAL REJECTED IF VIOLATED)

## 1. MANDATORY Syntax for graphs:
✅ CORRECT:
\`\`\`mermaid
graph TD
    A["Process Start"]
    B["Second Step"]
    A --> B
\`\`\`

❌ PROHIBITED:
- "graphTDA[...]" (type glued to node)
- "graph TDA[...]" (no line break)
- Using HTML tags (<br/>, <strong>) - use \\n for line breaks

## 2. Labels ALWAYS in double quotes if containing:
- Spaces: ["My Label"]
- Special characters: ["Pressure > 0"]
- Portuguese accents: ["Pressão"]

## 3. Arrow syntax:
✅ ONLY ASCII: --> , <-- , ==>
❌ PROHIBITED: → , ← , ⇒ (Unicode arrows)

## 4. Node IDs:
✅ ONLY alphanumeric: A, B, C1, State1
❌ PROHIBITED: Special characters, spaces, accents

## 5. Prohibited diagram elements:
- NO subgraphs (split into separate diagrams)
- NO nested structures (keep flat)
- NO HTML in labels (use plain text + \\n)

**CRITICAL:** If you violate these rules, the system will REJECT the material.

# 📚 CONTENT STRUCTURE

Create comprehensive engineering educational material covering:

1. **Fundamentals** - Core concepts and principles
2. **Mathematical Formulation** - Equations with $$...$$ syntax
3. **Practical Applications** - Real-world engineering examples
4. **Visual Diagrams** - Mermaid flowcharts/diagrams following rules
5. **Comparative Analysis** - Tables comparing related concepts
6. **Key Takeaways** - Summary of critical points

Use research sources provided to ensure accuracy and depth.

Return ONLY the Markdown content. NO explanations, NO code fences wrapping the entire output.`;
}

async function generateMarkdownReport(
  research: ResearchResult[],
  lectureTitle: string,
  teacherName: string
): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  console.log('[Report] Starting AI report generation...');

  // Build context from research
  const researchContext = research.map((r, idx) => 
    `## Research Question ${idx + 1}: ${r.question}\n\n${r.sources.map((s, i) => 
      `${i + 1}. **${s.title}**\n   ${s.snippet}\n   Source: ${s.url}`
    ).join('\n\n')}`
  ).join('\n\n---\n\n');

  const systemPrompt = getEngineeringPrompt(teacherName, lectureTitle);
  const userPrompt = `Based on the research below, generate comprehensive educational material in Markdown format.

# Research Context

${researchContext}

Generate high-quality engineering educational material following ALL formatting rules specified.`;

  console.log('[Report] Calling Lovable AI (Gemini 2.5 Pro)...');
  console.log(`[Report] Context size: ${researchContext.length} chars`);

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-pro', // Use Pro for quality
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_completion_tokens: 8000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Report] AI call failed:', errorText);
    throw new Error(`AI report generation failed: ${response.status}`);
  }

  const data = await response.json();
  const markdown = data.choices[0].message.content;

  console.log('[Report] ✓ Generated report:', markdown.length, 'chars');
  return markdown;
}

// ============================================================================
// Markdown Processor - Phase 2
// ============================================================================

function fixMermaidDiagrams(markdown: string): string {
  console.log('[Processor] Fixing Mermaid diagrams...');
  const mermaidRegex = /```mermaid\s*\n([\s\S]*?)```/g;
  
  let fixCount = 0;
  const result = markdown.replace(mermaidRegex, (match, code) => {
    let fixed = code.trim();
    const originalCode = fixed;

    // Fix 1: graphTDA[...] → graph TD\n    A[...]
    fixed = fixed.replace(/^graph([A-Z]{2})([A-Z])/gm, 'graph $1\n    $2');

    // Fix 2: Unicode arrows → ASCII
    fixed = fixed
      .replace(/→/g, '-->')
      .replace(/←/g, '<--')
      .replace(/⇒/g, '==>')
      .replace(/⇐/g, '<==');

    // Fix 3: Greek letters → names (avoid Mermaid parse errors)
    fixed = fixed
      .replace(/Δ/g, 'Delta')
      .replace(/Ω/g, 'Omega')
      .replace(/α/g, 'alpha')
      .replace(/β/g, 'beta')
      .replace(/γ/g, 'gamma')
      .replace(/π/g, 'pi');

    // Fix 4: Remove HTML tags
    fixed = fixed.replace(/<[^>]*>/g, '');

    // Fix 5: Ensure node IDs are alphanumeric
    fixed = fixed.replace(/([A-Z]\d*)\[/g, '$1["');
    
    if (fixed !== originalCode) {
      fixCount++;
      console.log(`[Processor]   Fixed diagram ${fixCount}`);
    }

    return `\`\`\`mermaid\n${fixed}\n\`\`\``;
  });

  console.log(`[Processor] ✓ Fixed ${fixCount} Mermaid diagrams`);
  return result;
}

function fixLaTeXFormulas(markdown: string): string {
  console.log('[Processor] Fixing LaTeX formulas...');
  
  let cleaned = markdown;

  // Remove corrupted placeholders
  cleaned = cleaned.replace(/___LATEX_\w+_\d+___/g, '');

  // Fix ** 1$ ** patterns (corrupted formulas)
  cleaned = cleaned.replace(/\*\*\s*\d+\$\s*\*\*/g, '');

  // Normalize: single $ → $$ (but be careful not to break existing $$)
  // This regex matches $ that are not already part of $$
  cleaned = cleaned.replace(/(?<!\$)\$(?!\$)([^\$\n]+?)(?<!\$)\$(?!\$)/g, '$$$$$1$$$$');

  console.log('[Processor] ✓ LaTeX formulas sanitized');
  return cleaned;
}

function removeProhibitedPatterns(markdown: string): string {
  console.log('[Processor] Removing prohibited patterns...');
  
  // Remove table of contents headers
  const tocPatterns = [
    /^#+\s*(Índice|Sumário|Table of Contents|Contents|Conteúdo).*$/gmi,
    /^#+\s*\d+\.\s+/gm // Remove numbered headings like "## 1. Introduction"
  ];

  let cleaned = markdown;
  for (const pattern of tocPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Remove excessive blank lines
  cleaned = cleaned.replace(/\n{4,}/g, '\n\n\n');

  console.log('[Processor] ✓ Prohibited patterns removed');
  return cleaned;
}

async function processMarkdown(markdown: string): Promise<string> {
  console.log('\n[Processor] Starting markdown validation...');

  // Step 1: Validate and fix Mermaid diagrams
  let cleaned = fixMermaidDiagrams(markdown);

  // Step 2: Sanitize LaTeX formulas
  cleaned = fixLaTeXFormulas(cleaned);

  // Step 3: Remove prohibited patterns
  cleaned = removeProhibitedPatterns(cleaned);

  console.log('[Processor] ✓ Validation complete\n');
  return cleaned;
}

// ============================================================================
// Database Operations
// ============================================================================

async function fetchLectureData(lectureId: string): Promise<LectureData> {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { data, error } = await supabaseAdmin
    .from('lectures')
    .select('id, title, transcript, teacher_id')
    .eq('id', lectureId)
    .single();

  if (error || !data) {
    throw new Error(`Failed to fetch lecture: ${error?.message}`);
  }

  // Get teacher name
  let teacherName = 'Professor';
  if (data.teacher_id) {
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('full_name')
      .eq('id', data.teacher_id)
      .single();
    
    if (userData?.full_name) {
      teacherName = userData.full_name;
    }
  }

  console.log('[Database] ✓ Fetched lecture:', data.title);
  return { ...data, teacher_name: teacherName } as LectureData;
}

async function saveMarkdownToDatabase(lectureId: string, markdown: string): Promise<void> {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { error } = await supabaseAdmin
    .from('lectures')
    .update({
      material_didatico_v2: markdown, // Pure Markdown
      updated_at: new Date().toISOString()
    })
    .eq('id', lectureId);

  if (error) {
    throw new Error(`Failed to save markdown: ${error.message}`);
  }

  console.log('[Database] ✓ Saved Markdown material');
}

// ============================================================================
// Main HTTP Handler
// ============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { lectureId } = await req.json();
    console.log('\n=== Material Didático Generator - Phase 1 + 2 ===');
    console.log('[Main] Lecture ID:', lectureId);

    if (!lectureId) {
      throw new Error('Missing lectureId');
    }

    // Validate JWT
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

    console.log('[Main] ✓ User authenticated:', user.id);

    // ========================================================================
    // PHASE 1: Research
    // ========================================================================
    console.log('\n--- PHASE 1: Research ---');
    
    // Step 1: Fetch lecture data
    const lectureData = await fetchLectureData(lectureId);

    // Step 2: Execute research
    const researchResults = await executeResearch(lectureData);

    console.log(`[Main] ✓ Phase 1 complete: ${researchResults.length} research results`);

    // ========================================================================
    // PHASE 2: AI Report Generation + Markdown Processing
    // ========================================================================
    console.log('\n--- PHASE 2: Report Generation ---');

    // Step 3: Generate Markdown report with AI
    const rawMarkdown = await generateMarkdownReport(
      researchResults,
      lectureData.title,
      lectureData.teacher_name || 'Professor'
    );

    // Step 4: Process and validate Markdown
    const cleanedMarkdown = await processMarkdown(rawMarkdown);

    // Step 5: Save to database
    await saveMarkdownToDatabase(lectureId, cleanedMarkdown);

    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    console.log(`\n[Main] ✓ Phase 2 complete`);
    console.log(`[Main] ✓ Total time: ${elapsed}s`);
    console.log(`[Main] ✓ Final markdown size: ${cleanedMarkdown.length} chars`);
    console.log('=== Material Didático Generation Complete ===\n');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Material didático generated successfully',
        researchCount: researchResults.length,
        markdownLength: cleanedMarkdown.length,
        elapsedSeconds: elapsed
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[Main] ✗ Error:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
