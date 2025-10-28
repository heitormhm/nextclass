import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * FASE 3: Agente Corretor de Fórmulas LaTeX
 * 
 * Este Edge Function corrige automaticamente fórmulas LaTeX quebradas ou incompletas
 * usando o Lovable AI Gateway para análise e correção inteligente.
 */

interface FixLatexRequest {
  content: string;
  jobId?: string;
}

interface LatexIssue {
  type: 'incomplete' | 'malformed' | 'missing_closing' | 'invalid_command';
  position: number;
  original: string;
  suggestion: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, jobId = 'manual' }: FixLatexRequest = await req.json();
    
    if (!content) {
      return new Response(
        JSON.stringify({ error: 'Content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[fix-latex-formulas] [Job ${jobId}] 🔧 Starting LaTeX correction...`);
    
    // Step 1: Detect LaTeX issues
    const issues = detectLatexIssues(content);
    
    if (issues.length === 0) {
      console.log(`[fix-latex-formulas] [Job ${jobId}] ✅ No LaTeX issues detected`);
      return new Response(
        JSON.stringify({ 
          correctedContent: content, 
          issuesFixed: 0,
          issues: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[fix-latex-formulas] [Job ${jobId}] ⚠️ Found ${issues.length} LaTeX issues`);
    
    // Step 2: Use AI to fix complex issues
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `You are a LaTeX formula correction expert. Your task is to fix broken, incomplete, or malformed LaTeX formulas in educational content.

**RULES:**
1. Only fix the LaTeX formulas, do not change any other text
2. Ensure all formulas are properly closed with matching $ or $$
3. Complete incomplete formulas with reasonable mathematical expressions
4. Remove isolated variables that are not part of a formula
5. Fix common LaTeX syntax errors (e.g., \\frac{}{} must have both numerator and denominator)
6. Preserve the original meaning and context

**EXAMPLES:**

Input: "A energia é $E = mc^2 e a temperatura é $T"
Output: "A energia é $E = mc^2$ e a temperatura é $T$"

Input: "O trabalho é dado por $$W = onde F é força"
Output: "O trabalho é dado por $$W = F \\cdot d$$ onde F é força"

Input: "Temos que \\frac{P_1 e a pressão"
Output: "Temos que \\frac{P_1}{P_2} e a pressão"

Return ONLY the corrected content, without any additional explanations.`;

    const userPrompt = `Fix all LaTeX issues in the following content:\n\n${content}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 8000
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error(`[fix-latex-formulas] [Job ${jobId}] ❌ AI API error: ${aiResponse.status} - ${errorText}`);
      
      // Fallback: Apply basic regex fixes
      const basicCorrected = applyBasicLatexFixes(content);
      return new Response(
        JSON.stringify({ 
          correctedContent: basicCorrected, 
          issuesFixed: issues.length,
          issues: issues.map(i => i.type),
          fallback: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const correctedContent = aiData.choices[0]?.message?.content || content;

    console.log(`[fix-latex-formulas] [Job ${jobId}] ✅ LaTeX correction complete. Fixed ${issues.length} issues`);

    // Step 3: Validate the corrected content
    const remainingIssues = detectLatexIssues(correctedContent);
    
    if (remainingIssues.length > 0) {
      console.warn(`[fix-latex-formulas] [Job ${jobId}] ⚠️ ${remainingIssues.length} issues remain after correction`);
    }

    return new Response(
      JSON.stringify({ 
        correctedContent, 
        issuesFixed: issues.length - remainingIssues.length,
        issues: issues.map(i => ({ type: i.type, original: i.original })),
        remainingIssues: remainingIssues.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[fix-latex-formulas] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Detect common LaTeX issues in content
 */
function detectLatexIssues(content: string): LatexIssue[] {
  const issues: LatexIssue[] = [];
  
  // Issue 1: Unclosed single $ formulas
  const singleDollarRegex = /\$([^$\n]+?)(?!\$)/g;
  let match;
  while ((match = singleDollarRegex.exec(content)) !== null) {
    const nextChar = content[match.index + match[0].length];
    if (nextChar !== '$') {
      issues.push({
        type: 'missing_closing',
        position: match.index,
        original: match[0],
        suggestion: match[0] + '$'
      });
    }
  }
  
  // Issue 2: Unclosed $$ formulas
  const doubleDollarMatches = content.match(/\$\$[^$]+?(?!\$\$)/g);
  if (doubleDollarMatches) {
    doubleDollarMatches.forEach(m => {
      issues.push({
        type: 'missing_closing',
        position: content.indexOf(m),
        original: m,
        suggestion: m + '$$'
      });
    });
  }
  
  // Issue 3: Incomplete \frac commands
  const incompleteFracRegex = /\\frac\{[^}]*\}(?!\{)/g;
  while ((match = incompleteFracRegex.exec(content)) !== null) {
    issues.push({
      type: 'incomplete',
      position: match.index,
      original: match[0],
      suggestion: match[0] + '{denominator}'
    });
  }
  
  // Issue 4: Isolated variables (single letters between spaces that might be LaTeX)
  const isolatedVarRegex = /\s([a-zA-Z])\s(?=[^$]*(?:\$|$))/g;
  while ((match = isolatedVarRegex.exec(content)) !== null) {
    // Check if it's not already inside a formula
    const before = content.substring(0, match.index);
    const openDollars = (before.match(/\$/g) || []).length;
    if (openDollars % 2 === 0) { // Even number = outside formula
      issues.push({
        type: 'incomplete',
        position: match.index,
        original: match[1],
        suggestion: `$${match[1]}$`
      });
    }
  }
  
  return issues;
}

/**
 * Apply basic regex-based fixes (fallback if AI fails)
 */
function applyBasicLatexFixes(content: string): string {
  let fixed = content;
  
  // Fix 1: Close unclosed single $ formulas
  fixed = fixed.replace(/\$([^$\n]{1,100})(?!\$)(?=\s|[.,;:]|$)/g, '$$$1$$');
  
  // Fix 2: Remove isolated single letters that look like variables
  fixed = fixed.replace(/\s([a-zA-Z])\s/g, (match, letter) => {
    // Only wrap if it's a common variable letter
    if (['x', 'y', 'z', 'a', 'b', 'c', 't', 'n', 'm', 'P', 'T', 'V', 'E', 'F'].includes(letter)) {
      return ` $${letter}$ `;
    }
    return match;
  });
  
  // Fix 3: Complete incomplete \frac
  fixed = fixed.replace(/\\frac\{([^}]+)\}(?!\{)/g, '\\frac{$1}{1}');
  
  return fixed;
}
