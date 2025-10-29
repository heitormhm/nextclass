/**
 * AI client with retry logic and timeout handling
 */

/**
 * Test AI API connection health
 */
export async function testAIConnection(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: 'test' }],
      }),
    });
    
    return response.ok;
  } catch (error) {
    console.error('[AI Client] Connection test failed:', error);
    return false;
  }
}

interface AICallOptions {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  timeout?: number;
  maxRetries?: number;
}

export async function callAIWithRetry(
  apiKey: string,
  options: AICallOptions,
  jobId: string
): Promise<any> {
  const MAX_RETRIES = options.maxRetries || 3;
  const TIMEOUT_MS = options.timeout || 120000; // 120s default
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[Job ${jobId}] 🔄 AI call attempt ${attempt}/${MAX_RETRIES}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: options.model,
          messages: [
            { role: 'system', content: options.systemPrompt },
            { role: 'user', content: options.userPrompt }
          ],
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Job ${jobId}] ❌ API Error ${response.status}:`, errorText);
        if (response.status === 429) {
          throw new Error('Rate limit atingido. Aguarde alguns segundos e tente novamente.');
        }
        if (response.status === 402) {
          throw new Error('Créditos insuficientes no Lovable AI. Adicione créditos em Settings > Usage.');
        }
        throw new Error(`AI API error: ${response.status}`);
      }

      // ✅ CRITICAL: Parse as text first to handle potential markdown wrapping
      const responseText = await response.text();
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error(`[Job ${jobId}] ❌ Failed to parse JSON response:`, parseError);
        console.error(`[Job ${jobId}] Response preview:`, responseText.substring(0, 500));
        
        // ✅ PHASE 1: Try to extract JSON from markdown code block
        const jsonMatch = responseText.match(/```json\s*\n([\s\S]*?)\n```/);
        if (jsonMatch && jsonMatch[1]) {
          console.log(`[Job ${jobId}] ⚠️ AI wrapped response in markdown, extracting...`);
          try {
            data = JSON.parse(jsonMatch[1]);
            console.log(`[Job ${jobId}] ✅ Successfully extracted JSON from markdown wrapper`);
          } catch (innerError) {
            throw new Error(`Invalid JSON in markdown wrapper: ${innerError instanceof Error ? innerError.message : 'Unknown error'}`);
          }
        } else {
          throw new Error(`Invalid JSON response from AI: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
        }
      }
      
      // Log response details for debugging
      const content = data.choices?.[0]?.message?.content;
      console.log(`[Job ${jobId}] 📥 AI Response received - Content length: ${content?.length || 0} chars`);
      
      if (!content || content.trim().length === 0) {
        console.error(`[Job ${jobId}] ❌ AI returned empty content:`, JSON.stringify(data).substring(0, 500));
      }
      
      return data;
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn(`[Job ${jobId}] ⏱️ Timeout on attempt ${attempt}`);
        lastError = new Error(`AI request timed out after ${TIMEOUT_MS/1000}s`);
      } else {
        lastError = error instanceof Error ? error : new Error('Unknown error');
      }
      
      if (attempt < MAX_RETRIES) {
        const delay = Math.min(2000 * Math.pow(2, attempt - 1), 10000);
        console.log(`[Job ${jobId}] ⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Failed after all retries');
}
