/**
 * AI client with retry logic and timeout handling
 */

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
        if (response.status === 429) {
          throw new Error('Rate limit atingido. Aguarde alguns segundos e tente novamente.');
        }
        if (response.status === 402) {
          throw new Error('Créditos insuficientes no Lovable AI. Adicione créditos em Settings > Usage.');
        }
        throw new Error(`AI API error: ${response.status}`);
      }

      return await response.json();
      
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
