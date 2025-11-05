import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Custom error class for AI requests
class AIError extends Error {
  status: number;
  responseText: string;

  constructor(status: number, responseText: string, message?: string) {
    super(message || `AI Error (${status}): ${responseText}`);
    this.status = status;
    this.responseText = responseText;
    this.name = 'AIError';
  }
}

// Retry logic with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on configuration/validation errors
      if (
        error instanceof AIError && (
          error.status === 401 || 
          error.status === 403 || 
          error.status === 400 ||
          error.status === 402 || // No credits
          error.status === 429 || // Rate limited
          (error.status === 500 && error.responseText.includes('internal_server_error'))
        )
      ) {
        console.error(`[Retry] ⚠️ Non-retryable error (${error.status}), not retrying:`, error.message);
        throw error;
      }
      
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`[Retry] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}

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

    console.log('[Thumbnail] Calling Lovable AI for image generation...');

    // Use retry logic for image generation
    const generateImage = async () => {
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
        console.error('[Thumbnail] Lovable AI error:', aiResponse.status, errorText);
        
        if (aiResponse.status === 429) {
          throw new AIError(429, errorText, 'RATE_LIMITED: Excesso de requisições. Aguarde alguns minutos.');
        }
        if (aiResponse.status === 402) {
          throw new AIError(402, errorText, 'NO_CREDITS: Créditos insuficientes. Adicione créditos ao seu workspace Lovable.');
        }
        
        throw new AIError(aiResponse.status, errorText);
      }

      return await aiResponse.json();
    };

    const aiData = await retryWithBackoff(generateImage, 2, 2000); // 2 retries, 2s base delay
    const imageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      console.error('[Thumbnail] ❌ No image URL in AI response:', JSON.stringify(aiData).substring(0, 500));
      throw new Error('No image generated in AI response');
    }

    console.log('[Thumbnail] ✅ Thumbnail generated successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        imageUrl,
        topic
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[Thumbnail] ❌ Error generating thumbnail:', error);
    
    // Build detailed error metadata
    const errorMetadata: any = {
      technical_error: error.message,
      error_type: error.name || 'UnknownError',
      timestamp: new Date().toISOString(),
    };
    
    // Capture AI-specific error details
    if (error instanceof AIError) {
      errorMetadata.ai_status = error.status;
      errorMetadata.ai_response = error.responseText.substring(0, 500);
    }
    
    // Capture stack trace
    if (error.stack) {
      errorMetadata.stack_trace = error.stack.substring(0, 500);
    }
    
    let userMessage = 'Erro ao gerar thumbnail. Tente novamente.';
    let statusCode = 500;
    
    if (error.message.includes('RATE_LIMITED')) {
      userMessage = 'Limite de requisições atingido. Aguarde alguns minutos.';
      statusCode = 429;
    } else if (error.message.includes('NO_CREDITS')) {
      userMessage = 'Créditos insuficientes. Contate o administrador.';
      statusCode = 402;
    } else if (error.message.includes('LOVABLE_API_KEY not configured')) {
      userMessage = 'Configuração pendente. Contate o administrador.';
      statusCode = 500;
    } else if (error instanceof AIError && error.status === 500) {
      userMessage = 'Erro na IA. Tente novamente em alguns minutos.';
      errorMetadata.suggestion = 'AI provider may be experiencing issues. Check AI Gateway status.';
    }
    
    console.error('[Thumbnail] Error metadata:', JSON.stringify(errorMetadata, null, 2));
    
    return new Response(
      JSON.stringify({ 
        error: userMessage,
        metadata: errorMetadata
      }),
      { 
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
