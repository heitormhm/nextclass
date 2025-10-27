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
    const imagePrompt = `Generate a PHOTOREALISTIC photograph (NOT an illustration, NOT a diagram) of REAL industrial equipment related to "${topic}".

**STYLE REQUIREMENTS:**
- Style: Professional engineering photography (like Getty Images industrial photos)
- Camera: DSLR, professional lighting, shallow depth of field
- Quality: 4K resolution, ultra-realistic textures, real materials (metal, concrete, glass)

**SUBJECT REQUIREMENTS:**
- MUST be a REAL PHYSICAL OBJECT that exists in the real world
- Examples by topic:
  * Thermodynamics → Industrial boiler in factory, steam turbine cutaway, power plant cooling towers
  * Fluid Mechanics → Industrial pump station, hydraulic press, water treatment plant pipes
  * Electrical Circuits → Electrical substation transformers, industrial control panel, circuit breakers array
  * Structural Analysis → Steel bridge construction, building concrete frame, truss structure
  * Materials Science → Steel manufacturing plant, metallurgy furnace, materials testing lab

**PHOTOGRAPHIC SPECIFICATIONS:**
- Lighting: Natural industrial environment lighting (warehouse, factory floor, outdoor industrial site)
- Perspective: 3/4 angle showing scale and engineering detail
- Composition: Main equipment centered, industrial background with slight bokeh
- Colors: Natural industrial palette (weathered steel gray, machinery green, safety yellow, rust orange)
- Textures: Show real material properties (metal grain, concrete roughness, paint wear, rust)

**CRITICAL PROHIBITIONS:**
❌ NO technical drawings or schematics
❌ NO vector illustrations or flat design
❌ NO diagrams with arrows and labels
❌ NO cartoon or stylized graphics
❌ NO symbols or icons (⚡, 🔧, etc.)
❌ NO text overlays or typography
❌ NO people or human figures
❌ NO abstract representations

**VALIDATION:**
✅ Ask yourself: "Could this be a photo from an engineering documentary?"
✅ Should look like: Discovery Channel, Engineering Explained, Industrial Photography
✅ Should NOT look like: Textbook diagram, PowerPoint slide, infographic

Generate a photograph that an engineering professor would use as a realistic visual reference for students.`;

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
