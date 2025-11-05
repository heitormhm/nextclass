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
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ 
          healthy: false, 
          error: 'LOVABLE_API_KEY não configurada',
          models: {}
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Testar modelos Gemini e OpenAI com requisições mínimas
    const testModels = [
      { name: 'google/gemini-2.5-flash', type: 'text' },
      { name: 'openai/gpt-5-mini', type: 'text' },
      { name: 'google/gemini-2.5-flash-image-preview', type: 'image' }
    ];

    const results: Record<string, any> = {};
    const startTime = Date.now();

    for (const model of testModels) {
      const modelStartTime = Date.now();
      try {
        const payload: any = {
          model: model.name,
          messages: [{ role: 'user', content: 'Test' }]
        };

        if (model.type === 'image') {
          payload.modalities = ['image', 'text'];
        }

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const latencyMs = Date.now() - modelStartTime;

        results[model.name] = {
          status: response.status,
          healthy: response.ok,
          latencyMs
        };

        if (!response.ok) {
          const errorText = await response.text();
          results[model.name].error = errorText.substring(0, 200);
        }
      } catch (error: any) {
        results[model.name] = {
          status: 0,
          healthy: false,
          error: error.message,
          latencyMs: Date.now() - modelStartTime
        };
      }
    }

    const totalLatencyMs = Date.now() - startTime;
    const overallHealthy = Object.values(results).some((r: any) => r.healthy);
    const allHealthy = Object.values(results).every((r: any) => r.healthy);

    return new Response(
      JSON.stringify({ 
        healthy: overallHealthy,
        allHealthy,
        timestamp: new Date().toISOString(),
        totalLatencyMs,
        models: results,
        status: overallHealthy ? 'operational' : 'degraded'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ 
        healthy: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
