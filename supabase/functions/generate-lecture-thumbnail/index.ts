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

    // Generate image using Gemini 2.5 Flash Image Preview (Nano banana)
    const imagePrompt = `Create a professional educational thumbnail image for a university engineering lecture about "${topic}".
    
Style: Modern, clean, academic
Elements: Include relevant engineering symbols, diagrams, or concepts
Colors: Use professional blues, purples, and gradients
Text: DO NOT include any text in the image
Quality: High resolution, suitable for a lecture cover image
Aspect ratio: 16:9 (landscape orientation)

The image should be visually appealing and immediately convey the subject matter to engineering students.`;

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
