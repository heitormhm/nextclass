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
    const { topic, style = 'educational' } = await req.json();

    if (!topic) {
      throw new Error('Topic is required');
    }

    console.log(`Generating thumbnail for topic: ${topic}`);

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Generate PHOTOREALISTIC image using Gemini 2.5 Flash Image Preview (Nano banana)
    const imagePrompt = `Generate a high-quality, PHOTOREALISTIC image of REAL industrial equipment or engineering infrastructure related to "${topic}".

**CRITICAL REQUIREMENTS:**
- Style: Photorealistic, professional engineering photography
- Subject: MUST show a REAL physical object (machine, equipment, construction, industrial plant)
- Examples by topic:
  * Thermodynamics → Industrial boiler, heat exchanger, steam turbine, power plant cooling towers
  * Fluid Mechanics → Pump station, hydraulic system, pipeline network, water treatment plant
  * Electrical Circuits → Electrical substation, transformer bank, control panel, circuit breakers
  * Structural Analysis → Bridge structure, building frame, steel truss, construction site
  * Materials Science → Steel mill, metallurgy equipment, materials testing machine
  * Control Systems → Industrial automation equipment, PLC panel, SCADA control room

**VISUAL REQUIREMENTS:**
- Lighting: Natural industrial lighting or well-lit factory environment
- Perspective: Professional 3/4 angle showing scale and detail
- Background: Industrial environment context (factory floor, construction site, power plant)
- Quality: 4K photographic quality, sharp focus on main equipment
- Colors: Natural industrial colors (steel gray, machinery green, safety yellow accents)
- NO text, NO labels, NO diagrams, NO illustrations
- NO people in the image (focus on equipment only)

**TECHNICAL SPECIFICATIONS:**
- Aspect ratio: 16:9 (landscape)
- Resolution: High resolution suitable for lecture cover
- Composition: Rule of thirds, main subject in focus
- Depth of field: Slight bokeh on background to emphasize main equipment

The image should immediately convey "this is real industrial engineering equipment" to university students.`;

    console.log('Calling Lovable AI for image generation...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: imagePrompt
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', aiResponse.status, errorText);
      throw new Error(`Lovable AI request failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const imageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      throw new Error('No image generated in AI response');
    }

    console.log('Thumbnail generated successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        imageUrl,
        topic
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating thumbnail:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
