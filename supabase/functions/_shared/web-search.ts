// Shared Web Search Module with Brave API Integration
// For automatic content enrichment in Teacher AI Chat

import { calculateTrustScore } from './engineering-knowledge.ts';

// Retry with exponential backoff for API rate limiting
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  operation: string,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if (i === maxRetries - 1) throw error;
      
      if (error.message && error.message.includes('RATE_LIMITED')) {
        const delay = baseDelay * Math.pow(2, i);
        console.log(`[${operation}] Rate limited, retrying in ${delay}ms... (attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  throw new Error(`${operation} failed after ${maxRetries} retries`);
}

// Web Search with Trust Scoring using Brave API
export async function searchWeb(
  query: string,
  braveApiKey: string,
  numResults = 8
): Promise<Array<{ url: string; title: string; snippet: string; trustScore: number }>> {
  return retryWithBackoff(async () => {
    // Enhanced query for engineering content
    const enhancedQuery = query.includes('livro') || query.includes('textbook') 
      ? query 
      : `${query} engineering textbook OR livro engenharia OR artigo científico`;
    
    const encodedQuery = encodeURIComponent(enhancedQuery);
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodedQuery}&count=20`;

    console.log(`[Web Search] Querying Brave API: "${enhancedQuery}"`);

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': braveApiKey,
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('RATE_LIMITED: Brave API rate limit exceeded');
      }
      const errorText = await response.text();
      throw new Error(`Brave API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const results = data.web?.results || [];
    
    // Filter, score, and sort results by trust score
    const scoredResults = results
      .filter((r: any) => r.url && r.title)
      .map((r: any) => ({
        url: r.url,
        title: r.title,
        snippet: r.description || '',
        trustScore: calculateTrustScore(r.url, r.title)
      }))
      .filter((r: { trustScore: number }) => r.trustScore > 0) // Remove blacklisted
      .sort((a: { trustScore: number }, b: { trustScore: number }) => b.trustScore - a.trustScore)
      .slice(0, numResults);
    
    console.log(`[Web Search] ✅ "${query}" → ${scoredResults.length} trusted results (avg trust: ${
      scoredResults.length > 0 
        ? (scoredResults.reduce((sum: number, r: { trustScore: number }) => sum + r.trustScore, 0) / scoredResults.length).toFixed(1)
        : 0
    })`);
    
    return scoredResults;
  }, `Web Search: ${query}`);
}

// Content Enrichment Function - automatically enriches thin content
export async function enrichContentWithSearch(
  topic: string,
  currentContent: string,
  braveApiKey: string
): Promise<{ enrichedContent: string; sources: string[] }> {
  const wordCount = currentContent.split(/\s+/).length;
  
  // Only enrich if content is thin (<150 words)
  if (wordCount < 150) {
    console.log(`[Content Enrichment] Content too short (${wordCount} words), triggering web search...`);
    
    // Extract clean topic (first 100 chars, remove special characters)
    const cleanTopic = topic.substring(0, 100).replace(/[^\w\sáàâãéèêíïóôõöúçñ]/gi, ' ').trim();
    
    // Generate 2-3 targeted queries for engineering content
    const queries = [
      `${cleanTopic} fundamentos teóricos engenharia`,
      `${cleanTopic} aplicações práticas Brasil`,
      `${cleanTopic} normas ABNT exemplos`
    ];
    
    const allSources: string[] = [];
    let enrichmentText = '\n\n**📚 CONTEÚDO ENRIQUECIDO COM PESQUISA WEB:**\n\n';
    enrichmentText += '*Este conteúdo foi automaticamente expandido com fontes acadêmicas confiáveis.*\n\n';
    
    // Execute up to 2 searches
    for (const query of queries.slice(0, 2)) {
      try {
        const results = await searchWeb(query, braveApiKey, 3);
        
        if (results.length > 0) {
          enrichmentText += `\n**📖 Referências sobre "${query}":**\n`;
          results.forEach(r => {
            enrichmentText += `- **${r.title}** (Confiabilidade: ${r.trustScore}/10)\n`;
            enrichmentText += `  ${r.snippet}\n`;
            enrichmentText += `  🔗 Fonte: ${r.url}\n\n`;
            allSources.push(`${r.title} - ${r.url}`);
          });
        }
      } catch (error: any) {
        console.error(`[Content Enrichment] ⚠️ Search failed for "${query}":`, error.message);
        // Continue with other queries even if one fails
      }
    }
    
    if (allSources.length > 0) {
      enrichmentText += '\n---\n\n**💡 Dica Pedagógica:** Use estas fontes para aprofundar o conteúdo das suas aulas.\n';
      
      return {
        enrichedContent: currentContent + enrichmentText,
        sources: allSources
      };
    }
  }
  
  // Content is sufficient or enrichment failed
  return {
    enrichedContent: currentContent,
    sources: []
  };
}

// Multi-query search for comprehensive coverage
export async function multiQuerySearch(
  baseQuery: string,
  braveApiKey: string,
  numQueriesPerTopic = 2
): Promise<Array<{ url: string; title: string; snippet: string; trustScore: number }>> {
  const queries = [
    `${baseQuery} fundamentos`,
    `${baseQuery} aplicações práticas`,
    `${baseQuery} exemplos reais`,
    `${baseQuery} teoria`
  ];
  
  const allResults: Array<{ url: string; title: string; snippet: string; trustScore: number }> = [];
  const seenUrls = new Set<string>();
  
  for (const query of queries.slice(0, numQueriesPerTopic)) {
    try {
      const results = await searchWeb(query, braveApiKey, 4);
      
      // Deduplicate by URL
      for (const result of results) {
        if (!seenUrls.has(result.url)) {
          seenUrls.add(result.url);
          allResults.push(result);
        }
      }
    } catch (error: any) {
      console.error(`[Multi-Query Search] Error for "${query}":`, error.message);
    }
  }
  
  // Sort by trust score and return top results
  return allResults
    .sort((a, b) => b.trustScore - a.trustScore)
    .slice(0, 10);
}
