import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { plaintextContent } = await req.json();
    
    if (!plaintextContent) {
      throw new Error('Plaintext content is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `You are a structured content parser. Convert marked plaintext back to structured JSON format.

MARKER SYNTAX:
- [CALLOUT-INFO]text[/CALLOUT-INFO] → callout with type "info"
- [CALLOUT-WARNING]text[/CALLOUT-WARNING] → callout with type "warning"
- [CALLOUT-SUCCESS]text[/CALLOUT-SUCCESS] → callout with type "success"
- [CALLOUT-ERROR]text[/CALLOUT-ERROR] → callout with type "error"
- [POSTIT-YELLOW]text[/POSTIT-YELLOW] → styled textbox
- [COLOR-RED]text[/COLOR-RED] → colored text (red)
- [COLOR-BLUE]text[/COLOR-BLUE] → colored text (blue)
- [COLOR-GREEN]text[/COLOR-GREEN] → colored text (green)
- [LIST-BULLET] → bullet list starts
- [LIST-NUMBER] → numbered list starts
- [DIAGRAM-MERMAID]mermaid code[/DIAGRAM-MERMAID] → mermaid diagram (read-only, preserve as-is)
- [CHART-BARS]chart data[/CHART-BARS] → chart (read-only, preserve as-is)
- [ACCORDION title="Title"]content[/ACCORDION] → accordion block

OUTPUT FORMAT (JSON):
{
  "titulo": "Main title extracted from content or 'Anotação'",
  "conteudo": [
    {
      "tipo": "titulo" | "paragrafo" | "callout" | "diagrama" | "grafico" | "accordion",
      "conteudo": "text content",
      "nivel": 1-3 (for titles),
      "tipo_callout": "info" | "warning" | "success" | "error",
      "tipo_diagrama": "mermaid",
      "codigo_diagrama": "mermaid code",
      "tipo_grafico": "barras",
      "dados_grafico": {...},
      "titulo_acordeao": "title",
      "itens_acordeao": [...]
    }
  ]
}

RULES:
1. Preserve diagrams and charts exactly as marked
2. Convert markers to appropriate structured blocks
3. Detect headings (lines starting with # ## ###)
4. Group regular text into paragraphs
5. Return ONLY valid JSON, no markdown wrappers
6. Keep the original text content intact`;

    console.log('Calling Lovable AI to parse plaintext...');
    
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
          { role: 'user', content: `Parse this marked plaintext into structured JSON:\n\n${plaintextContent}` }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      if (response.status === 402) {
        throw new Error('AI credits exhausted. Please add credits to your workspace.');
      }
      
      throw new Error(`AI parsing failed: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    console.log('AI response received:', aiResponse.substring(0, 200));

    // Clean up AI response (remove markdown wrappers if present)
    let cleanedResponse = aiResponse.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // Parse the JSON
    const structuredData = JSON.parse(cleanedResponse);

    // Validate structure
    if (!structuredData.conteudo || !Array.isArray(structuredData.conteudo)) {
      throw new Error('Invalid structured data format');
    }

    console.log('Successfully parsed to structured format');

    return new Response(
      JSON.stringify({ structuredData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in parse-teacher-annotation:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
