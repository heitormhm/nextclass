import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { brokenCode, context, strategy = 'Reescreva o diagrama do zero seguindo sintaxe Mermaid estrita', attempt = 1 } = await req.json();
    
    if (!brokenCode) {
      throw new Error('Missing brokenCode parameter');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log(`[Fix Mermaid] Attempt ${attempt} - Strategy: ${strategy}`);
    console.log('[Fix Mermaid] Broken code:', brokenCode);

    const systemPrompt = `You are a Mermaid diagram syntax expert. Your job is to FIX broken Mermaid diagrams by correcting syntax errors while preserving the original intent and structure.

**STRATEGY FOR THIS ATTEMPT:** ${strategy}

**CRITICAL RULES:**
1. ONLY return the corrected Mermaid code (no explanations, no markdown fences)
2. Use ONLY ASCII characters for arrows: --> , <-- , ==>
3. Use ONLY alphanumeric node IDs (A, B, C1, Estado1)
4. Replace ALL Greek letters in labels with spelled names (Δ → Delta, α → alpha)
5. Remove ALL special characters from labels: ( ) < > & " '
6. Use ONLY these diagram types: graph, flowchart, sequenceDiagram, stateDiagram-v2, classDiagram

**EXAMPLE FIXES:**

❌ BROKEN:
\`\`\`
graph TD
  A[Sistema (Q→W)] --> B{Δ Estado}
\`\`\`

✅ FIXED:
graph TD
  A[Sistema Q para W] --> B{Delta Estado}

**Your task:**
Fix the following broken Mermaid diagram. Return ONLY the corrected code:`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Context: ${context || 'Engineering diagram'}\n\nBroken code:\n${brokenCode}` }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Fix Mermaid] AI error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const fixedCode = data.choices[0].message.content.trim();

    console.log('[Fix Mermaid] ✅ Fixed code:', fixedCode);

    return new Response(
      JSON.stringify({ fixedCode }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Fix Mermaid] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
