/**
 * ==========================================
 * MATERIAL DIDÁTICO GENERATOR V2 - JOB-BASED
 * ==========================================
 * 
 * ✅ PHASE 1: Critical Blockers
 * - Retry logic with exponential backoff
 * - Lovable AI rate limit handling (402/429)
 * 
 * ✅ PHASE 2: High Priority  
 * - Global edge function timeout (3 minutes)
 * - Job-based async system
 * - Markdown validation before save
 * 
 * ✅ PHASE 3: Polish
 * - Improved LaTeX regex
 * - Telemetry tracking
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ==========================================
// BOOK-FIRST HYBRID APPROACH: Known Engineering Books
// ==========================================

const KNOWN_ENGINEERING_BOOKS = [
  {
    title: 'Termodinâmica',
    authors: 'Yunus A. Çengel & Michael A. Boles',
    topics: ['termodinâmica', 'primeira lei', 'segunda lei', 'entropia', 'entalpia', 'ciclos térmicos', 'energia'],
    trustScore: 10.0
  },
  {
    title: 'Mecânica dos Fluidos',
    authors: 'Frank M. White',
    topics: ['fluidos', 'escoamento', 'viscosidade', 'reynolds', 'bernoulli', 'turbulência', 'hidrodinâmica'],
    trustScore: 10.0
  },
  {
    title: 'Resistência dos Materiais',
    authors: 'Ferdinand P. Beer & E. Russell Johnston Jr.',
    topics: ['tensão', 'deformação', 'flexão', 'torção', 'fadiga', 'estruturas', 'materiais'],
    trustScore: 10.0
  },
  {
    title: 'Fundamentos de Circuitos Elétricos',
    authors: 'Charles K. Alexander & Matthew N.O. Sadiku',
    topics: ['circuitos', 'corrente', 'tensão', 'resistência', 'capacitância', 'indutância', 'eletricidade'],
    trustScore: 10.0
  },
  {
    title: 'Estática',
    authors: 'R.C. Hibbeler',
    topics: ['estática', 'forças', 'equilíbrio', 'momentos', 'estruturas', 'vigas', 'treliças'],
    trustScore: 10.0
  },
  {
    title: 'Dinâmica',
    authors: 'R.C. Hibbeler',
    topics: ['dinâmica', 'movimento', 'velocidade', 'aceleração', 'energia cinética', 'momento linear'],
    trustScore: 10.0
  },
  {
    title: 'Transferência de Calor e Massa',
    authors: 'Yunus A. Çengel',
    topics: ['transferência calor', 'condução', 'convecção', 'radiação', 'calor', 'massa'],
    trustScore: 10.0
  },
  {
    title: 'Sistemas de Controle Modernos',
    authors: 'Richard C. Dorf & Robert H. Bishop',
    topics: ['controle', 'sistemas', 'automação', 'realimentação', 'estabilidade', 'controladores'],
    trustScore: 10.0
  },
  {
    title: 'Análise Estrutural',
    authors: 'R.C. Hibbeler',
    topics: ['estruturas', 'análise estrutural', 'vigas', 'pórticos', 'treliças', 'deslocamentos'],
    trustScore: 10.0
  },
  {
    title: 'Física para Cientistas e Engenheiros',
    authors: 'Raymond A. Serway',
    topics: ['física', 'mecânica', 'ondas', 'termodinâmica', 'eletromagnetismo', 'ótica'],
    trustScore: 9.0
  },
  {
    title: 'Cálculo',
    authors: 'James Stewart',
    topics: ['cálculo', 'derivadas', 'integrais', 'limites', 'séries', 'equações diferenciais'],
    trustScore: 9.0
  },
  {
    title: 'Mecânica dos Materiais',
    authors: 'Beer, Johnston, DeWolf',
    topics: ['materiais', 'propriedades mecânicas', 'tensão', 'deformação', 'elasticidade'],
    trustScore: 10.0
  },
];

const TRUSTED_DOMAINS = {
  tier1_books: [
    'mheducation.com', 'pearson.com', 'cengage.com',
    'blucher.com.br', 'grupo-gen.com.br', 'grupoa.com.br',
    'wiley.com', 'springer.com', 'cambridge.org'
  ],
  tier2_academic: [
    'sciencedirect.com', 'ieeexplore.ieee.org', 'asme.org',
    'scielo.br', 'periodicos.capes.gov.br', 'elsevier.com',
    'tandfonline.com', 'sagepub.com'
  ],
  tier3_universities: [
    'mit.edu', 'stanford.edu', 'caltech.edu',
    'usp.br', 'unicamp.br', 'ita.br', 'ufrj.br', 'ufsc.br',
    'edu'
  ],
};

const BLACKLISTED_DOMAINS = [
  'wikipedia.org', 'wikihow.com', 'fandom.com',
  'brainly.com', 'medium.com', 'blogspot.com', 'wordpress.com',
  'sparknotes.com', 'cliffsnotes.com', 'shmoop.com',
  'yahoo.com', 'answers.com'
];

// ==========================================
// PHASE 1: Retry Logic with Exponential Backoff
// ==========================================

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  operation: string,
  maxRetries = 3,
  baseDelay = 5000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`[Retry] Attempt ${attempt + 1}/${maxRetries} for ${operation}`);
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on auth errors or validation errors
      if (error.status === 401 || error.status === 403 || error.status === 400) {
        throw error;
      }
      
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
        console.warn(`[Retry] ${operation} failed, retrying in ${delay}ms:`, error.message);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error(`[Retry] All ${maxRetries} attempts failed for ${operation}`);
  throw lastError || new Error(`Failed after ${maxRetries} attempts`);
}

// ==========================================
// TRUST SCORE CALCULATION
// ==========================================

function calculateTrustScore(url: string, title: string): number {
  try {
    const domain = new URL(url).hostname.toLowerCase();
    
    // Blacklist check (immediate disqualification)
    if (BLACKLISTED_DOMAINS.some(blocked => domain.includes(blocked))) {
      console.log(`[Filter] ❌ Blacklisted: ${domain}`);
      return 0;
    }
    
    // Tier 1: Engineering textbooks (highest priority)
    if (TRUSTED_DOMAINS.tier1_books.some(trusted => domain.includes(trusted))) {
      const bookKeywords = ['textbook', 'livro', 'fundamentals', 'fundamentos', 'principles', 'engineering'];
      const hasBookKeyword = bookKeywords.some(kw => title.toLowerCase().includes(kw));
      return hasBookKeyword ? 10.0 : 8.0;
    }
    
    // Tier 2: Academic publishers
    if (TRUSTED_DOMAINS.tier2_academic.some(trusted => domain.includes(trusted))) {
      return 7.0;
    }
    
    // Tier 3: Universities
    if (TRUSTED_DOMAINS.tier3_universities.some(trusted => domain.includes(trusted))) {
      return 5.0;
    }
    
    // Unknown sources (low priority, but not blocked)
    return 2.0;
  } catch (error) {
    console.warn('[TrustScore] Invalid URL:', url);
    return 0;
  }
}

// ==========================================
// PHASE 1: Web Search with Retry & Filtering
// ==========================================

async function searchWeb(
  query: string,
  braveApiKey: string,
  numResults = 10
): Promise<Array<{ url: string; title: string; snippet: string; trustScore: number }>> {
  return retryWithBackoff(async () => {
    // Enhanced query for engineering content
    const enhancedQuery = query.includes('livro') || query.includes('textbook') 
      ? query 
      : `${query} engineering textbook OR livro engenharia`;
    
    const encodedQuery = encodeURIComponent(enhancedQuery);
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodedQuery}&count=20`; // Fetch more to compensate for filtering

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
      throw new Error(`Brave API error: ${response.status}`);
    }

    const data = await response.json();
    const results = data.web?.results || [];
    
    // Filter, score, and sort by trust
    const scoredResults = results
      .filter((r: any) => r.url && r.title)
      .map((r: any) => {
        const trustScore = calculateTrustScore(r.url, r.title);
        return {
          url: r.url,
          title: r.title,
          snippet: r.description || '',
          trustScore
        };
      })
      .filter((r: { trustScore: number }) => r.trustScore > 0) // Remove blacklisted
      .sort((a: { trustScore: number }, b: { trustScore: number }) => b.trustScore - a.trustScore) // Sort by trust score (highest first)
      .slice(0, numResults);
    
    console.log(`[Search] Query: "${query}" → ${scoredResults.length} trusted results`);
    if (scoredResults.length > 0) {
      console.log(`[Search] Top source: ${scoredResults[0].title} (trust: ${scoredResults[0].trustScore})`);
    }
    
    return scoredResults;
  }, `Brave Search: ${query}`);
}

// ==========================================
// PHASE 1: AI Call with Rate Limit Handling
// ==========================================

async function callLovableAI(
  messages: any[],
  lovableApiKey: string,
  operation: string
): Promise<string> {
  return retryWithBackoff(async () => {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('RATE_LIMITED: Excesso de requisições. Aguarde alguns minutos.');
      }
      if (response.status === 402) {
        throw new Error('NO_CREDITS: Créditos insuficientes. Adicione créditos ao seu workspace Lovable.');
      }
      const errorText = await response.text();
      throw new Error(`AI Error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }, operation, 2, 10000); // Only 2 retries for AI calls, 10s delay
}

// ==========================================
// PHASE 2: Update Job Progress
// ==========================================

async function updateJobProgress(
  supabase: any,
  jobId: string,
  progress: number,
  step: string
) {
  await supabase
    .from('material_v2_jobs')
    .update({
      progress,
      progress_step: step,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);
  
  console.log(`[Job ${jobId}] Progress: ${progress}% - ${step}`);
}

// ==========================================
// PHASE 3: Improved LaTeX Regex
// ==========================================

function fixLaTeXFormulas(markdown: string): string {
  console.log('[LaTeX] Fixing formulas with improved regex...');
  
  let cleaned = markdown;

  // Remove corrupted placeholders
  cleaned = cleaned.replace(/___LATEX_\w+_\d+___/g, '');
  cleaned = cleaned.replace(/\*\*\s*\d+\$\s*\*\*/g, '');

  // ✅ IMPROVED: Only convert mathematical expressions
  // Matches patterns like: $x^2$, $\Delta T$, $E = mc^2$, $T_1 > T_2$
  // Ignores: "$50", "$100K"
  cleaned = cleaned.replace(
    /(?<!\$)\$(?!\$)([^\$\n]*?[\+\-\*\/\^\=\\{}_\(\)<>≤≥∆∫∂∇][^\$\n]*?)(?<!\$)\$(?!\$)/g,
    '$$$$$1$$$$'
  );

  // Also handle Greek letters and subscripts without operators
  cleaned = cleaned.replace(
    /(?<!\$)\$(?!\$)(\\[a-zA-Z]+|[a-zA-Z]+_\{?[a-zA-Z0-9]+\}?)(?<!\$)\$(?!\$)/g,
    '$$$$$1$$$$'
  );

  // Ensure spacing
  cleaned = cleaned.replace(/([^\s])(\$\$)/g, '$1 $2');
  cleaned = cleaned.replace(/(\$\$)([^\s])/g, '$1 $2');

  console.log('[LaTeX] ✅ Formulas fixed with improved validation');
  return cleaned;
}

// ==========================================
// PHASE 2: Markdown Validation
// ==========================================

function validateMarkdown(markdown: string): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  
  // Check minimum length
  if (markdown.length < 500) {
    warnings.push('Markdown muito curto (< 500 caracteres)');
  }
  
  // Check for unclosed LaTeX delimiters
  const latexCount = (markdown.match(/\$\$/g) || []).length;
  if (latexCount % 2 !== 0) {
    warnings.push('Delimitadores LaTeX não balanceados');
  }
  
  // Check for broken Mermaid blocks
  const mermaidStarts = (markdown.match(/```mermaid/g) || []).length;
  const codeBlockEnds = (markdown.match(/```\s*$/gm) || []).length;
  if (mermaidStarts > codeBlockEnds) {
    warnings.push('Blocos Mermaid não fechados');
  }
  
  // Check for corrupted artifacts
  if (markdown.includes('___LATEX_')) {
    warnings.push('Artefatos LaTeX corrompidos detectados');
  }
  
  return {
    valid: warnings.length === 0,
    warnings
  };
}

// ==========================================
// BOOK IDENTIFICATION (Using Gemini's Internal Knowledge)
// ==========================================

async function identifyRelevantBooks(
  lectureTitle: string,
  lovableApiKey: string
): Promise<Array<{ title: string; authors: string; relevance: string }>> {
  const bookList = KNOWN_ENGINEERING_BOOKS
    .map(b => `- ${b.title} (${b.authors})`)
    .join('\n');

  const response = await callLovableAI([
    {
      role: 'system',
      content: `Você é um especialista em literatura acadêmica de Engenharia. Identifique os 3 livros-texto clássicos mais relevantes para o tópico fornecido.`
    },
    {
      role: 'user',
      content: `Tópico: ${lectureTitle}\n\nLivros disponíveis:\n${bookList}\n\nRetorne APENAS os 3 mais relevantes no formato:\n1. [Título] - [Autor] - [Capítulos/conceitos relevantes]`
    }
  ], lovableApiKey, 'Book Identification');

  // Parse response
  const books = response.split('\n')
    .filter(line => /^\d+\./.test(line))
    .map(line => {
      const match = line.match(/^(\d+)\.\s*(.+?)\s*-\s*(.+?)\s*-\s*(.+)$/);
      return match ? {
        title: match[2].trim(),
        authors: match[3].trim(),
        relevance: match[4].trim()
      } : null;
    })
    .filter((book): book is { title: string; authors: string; relevance: string } => book !== null)
    .slice(0, 3);

  console.log(`[Books] ✅ Identified ${books.length} relevant books`);
  books.forEach(b => console.log(`[Books]   - ${b.title} (${b.authors})`));
  
  return books;
}

// ==========================================
// EXTRACT CONCEPTS FROM BOOKS (Gemini's Internal Knowledge)
// ==========================================

async function extractBookConcepts(
  lectureTitle: string,
  books: Array<{ title: string; authors: string; relevance: string }>,
  lovableApiKey: string
): Promise<string> {
  const bookContext = books
    .map(b => `**${b.title}** (${b.authors}): ${b.relevance}`)
    .join('\n');

  const response = await callLovableAI([
    {
      role: 'system',
      content: `Você é um professor de Engenharia com conhecimento profundo dos seguintes livros:

${bookContext}

TAREFA: Extraia os conceitos fundamentais sobre "${lectureTitle}" EXATAMENTE como apresentados nesses livros clássicos.

ESTRUTURA OBRIGATÓRIA (Markdown):

## Fundamentos Teóricos (Base: Livros Clássicos)

### 1. Definição Formal
[Definição exata conforme os livros, com citação natural do autor]

### 2. Equações Fundamentais
$$equação1$$
$$equação2$$
[Use LaTeX com $$ $$, NUNCA $ $]

### 3. Premissas e Limitações
- Premissa 1
- Premissa 2

### 4. Conceitos Relacionados
[Conceitos que os livros relacionam com o tópico]

### 5. Diagrama Conceitual
\`\`\`mermaid
flowchart TD
    A[Conceito] --> B[Sub-conceito]
\`\`\`

REGRAS CRÍTICAS:
- Use terminologia EXATA dos livros
- Cite autores naturalmente: "Segundo Çengel..." ou "Beer e Johnston definem..."
- Mantenha rigor matemático original
- Use APENAS Markdown, LaTeX ($$formula$$) e Mermaid
- NÃO invente informações além do que está nos livros
- FOQUE EM FUNDAMENTOS TEÓRICOS, não em aplicações práticas

IMPORTANTE SOBRE CALLOUTS:
- Use callouts Markdown para destacar conceitos importantes:
  > ✏️ Conceito-Chave: [Definição fundamental]
  > 🤔 Pergunta para Reflexão: [Questão instigante]
  > 💡 Dica Importante: [Insight prático]
  > ⚠️ Atenção: [Limitações ou cuidados]
  > 🔬 Exemplo Prático: [Caso real]`
    },
    {
      role: 'user',
      content: `Tópico: ${lectureTitle}\n\nExtraia os conceitos fundamentais dos livros identificados acima.`
    }
  ], lovableApiKey, 'Book Concept Extraction');

  console.log(`[Books] ✅ Extracted ${response.length} chars of book-based content`);
  return response;
}

// ==========================================
// PHASE 3: Log Telemetry
// ==========================================

async function logTelemetry(
  supabase: any,
  jobId: string,
  lectureId: string,
  metrics: {
    booksIdentified?: number;
    bookContentLength?: number;
    bookContentPercentage?: number;
    webContentPercentage?: number;
    researchQueriesCount: number;
    webSearchesCount: number;
    markdownLength: number;
    mermaidCount: number;
    latexCount: number;
    generationTimeMs: number;
    success: boolean;
    errorType?: string;
    identifiedBooks?: string[];
  }
) {
  try {
    await supabase
      .from('material_generation_metrics')
      .insert({
        job_id: jobId,
        lecture_id: lectureId,
        research_queries_count: metrics.researchQueriesCount,
        web_searches_count: metrics.webSearchesCount,
        markdown_length: metrics.markdownLength,
        mermaid_diagrams_count: metrics.mermaidCount,
        latex_formulas_count: metrics.latexCount,
        generation_time_ms: metrics.generationTimeMs,
        success: metrics.success,
        error_type: metrics.errorType,
      });
    
    console.log(`[Telemetry] Metrics logged for job ${jobId}`);
  } catch (error) {
    console.error('[Telemetry] Failed to log metrics:', error);
  }
}

// ==========================================
// Main Job Processor (runs async)
// ==========================================

async function processGenerationJob(jobId: string, lectureId: string, lectureTitle: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const startTime = Date.now();
  const metrics = {
    booksIdentified: 0,
    bookContentLength: 0,
    bookContentPercentage: 0,
    webContentPercentage: 0,
    researchQueriesCount: 0,
    webSearchesCount: 0,
    markdownLength: 0,
    mermaidCount: 0,
    latexCount: 0,
    generationTimeMs: 0,
    success: false,
    errorType: undefined as string | undefined,
    identifiedBooks: [] as string[],
  };

  try {
    // Update job to PROCESSING
    await supabase
      .from('material_v2_jobs')
      .update({ status: 'PROCESSING', updated_at: new Date().toISOString() })
      .eq('id', jobId);

    await updateJobProgress(supabase, jobId, 5, 'Iniciando geração (Book-First Approach)...');

    // Get API keys
    const braveApiKey = Deno.env.get('BRAVE_SEARCH_API_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    if (!lovableApiKey) {
      throw new Error('MISSING_KEY: LOVABLE_API_KEY não configurada. Contate o administrador.');
    }

    // === PHASE 1: BOOK-BASED CONTENT (60% Target) ===
    console.log('\n=== PHASE 1: BOOK-BASED CONTENT ===');
    await updateJobProgress(supabase, jobId, 15, 'Identificando livros-texto relevantes...');
    
    const relevantBooks = await identifyRelevantBooks(lectureTitle, lovableApiKey);
    metrics.booksIdentified = relevantBooks.length;
    metrics.identifiedBooks = relevantBooks.map(b => `${b.title} - ${b.authors}`);

    await updateJobProgress(supabase, jobId, 30, 'Extraindo conceitos fundamentais dos livros...');
    
    const bookBasedContent = await extractBookConcepts(lectureTitle, relevantBooks, lovableApiKey);
    metrics.bookContentLength = bookBasedContent.length;

    // === PHASE 2: WEB SEARCH FOR PRACTICAL CASES (40% Target) ===
    console.log('\n=== PHASE 2: WEB SEARCH FOR PRACTICAL CASES ===');
    
    let practicalContext = '';
    const sourcesUsed: Array<{ url: string; domain: string; trustScore: number }> = [];
    
    // Only do web search if Brave API key is available (fallback to 100% books if not)
    if (braveApiKey) {
      await updateJobProgress(supabase, jobId, 50, 'Buscando aplicações práticas e casos reais...');
      
      // Focused queries for practical content (reduced from 5-7 to 3-4)
      const practicalQueries = [
        `${lectureTitle} aplicação industrial Brasil`,
        `${lectureTitle} normas técnicas ABNT NBR`,
        `${lectureTitle} caso prático engenharia`,
      ];

      const searchResults: any[] = [];
      for (const query of practicalQueries) {
        try {
          const results = await searchWeb(query, braveApiKey, 5);
          searchResults.push({ query, sources: results });
          metrics.webSearchesCount += results.length;
          
          // Track sources for telemetry
          results.forEach((r: any) => {
            try {
              const domain = new URL(r.url).hostname;
              sourcesUsed.push({
                url: r.url,
                domain,
                trustScore: r.trustScore || 0
              });
            } catch (e) {
              console.warn('[Sources] Invalid URL:', r.url);
            }
          });
        } catch (error: any) {
          console.warn(`[Web Search] Failed for query "${query}":`, error.message);
          // Continue with other queries
        }
      }

      practicalContext = searchResults
        .map(r => `**Consulta:** ${r.query}\n\n${r.sources.map((s: any) => `- ${s.title} (confiança: ${s.trustScore || 0}/10): ${s.snippet}`).join('\n')}`)
        .join('\n\n---\n\n');
      
      console.log(`[Web] ✅ Found ${sourcesUsed.length} trusted sources for practical cases`);
    } else {
      console.warn('[Web] ⚠️ Brave API key not configured, using 100% book-based content');
      practicalContext = '(Sem chave Brave API - conteúdo 100% baseado em livros)';
    }

    // === PHASE 3: CONTENT INTEGRATION ===
    console.log('\n=== PHASE 3: CONTENT INTEGRATION ===');
    await updateJobProgress(supabase, jobId, 70, 'Integrando conteúdo teórico + prático...');
    
    const integrationPrompt = `Você é um professor experiente de Engenharia criando material didático completo EM PORTUGUÊS.

VOCÊ TEM DOIS TIPOS DE CONTEÚDO:

1. **FUNDAMENTOS TEÓRICOS (dos livros clássicos):**
${bookBasedContent}

2. **CASOS PRÁTICOS E APLICAÇÕES (da web):**
${practicalContext}

TAREFA: Integre esses dois conteúdos em um material didático coeso e bem estruturado.

🎯 DIAGRAMAS: REGRA ABSOLUTA DE VARIEDADE + LATEX INTEGRADO ✅ FASE 7

Você DEVE criar 3-4 diagramas de TIPOS DIFERENTES. Esta é a ÚNICA instrução sobre diagramas:

**OBRIGATÓRIO:** Pelo menos 1 de cada tipo abaixo:
1. flowchart LR (processos sequenciais)
2. graph TD (hierarquias/relações)
3. stateDiagram-v2 OU classDiagram (estados/classificações)

**EXEMPLOS com LaTeX INTEGRADO:**

Tipo 1 - flowchart com fórmulas:
\`\`\`mermaid
flowchart LR
    A["Entrada: $$T_1, P_1$$"] --> B["Processo: $$Q = mc_p\\Delta T$$"]
    B --> C["Saída: $$T_2, P_2$$"]
\`\`\`

Tipo 2 - graph com equações:
\`\`\`mermaid
graph TD
    Lei["Primeira Lei: $$\\Delta U = Q - W$$"]
    Lei --> Calor["Calor $$Q$$"]
    Lei --> Trabalho["Trabalho $$W$$"]
\`\`\`

Tipo 3 - stateDiagram com variáveis:
\`\`\`mermaid
stateDiagram-v2
    [*] --> Solido
    Solido --> Liquido: $$T > T_{fusao}$$
    Liquido --> Vapor: $$T > T_{ebulicao}$$
\`\`\`

Tipo 4 - classDiagram (opcional):
\`\`\`mermaid
classDiagram
    class Sistema {
        +Pressao: $$P$$
        +Volume: $$V$$
        +Temperatura: $$T$$
    }
\`\`\`

**IMPORTANTE SOBRE LATEX EM DIAGRAMAS:**
- Use $$formula$$ dentro de labels entre aspas: ["Texto $$E=mc^2$$"]
- Mantenha fórmulas simples (evite comandos complexos em diagramas)
- Teste: Se a fórmula funciona sozinha em $$...$$, funcionará no diagrama

NUNCA crie 3 do mesmo tipo. SEMPRE use pelo menos 2 tipos diferentes.

---

ESTRUTURA DO MATERIAL:

# ${lectureTitle}

## 1. Fundamentos Teóricos
[Use 60-70% do material dos livros - mantenha citações de autores]

## 2. Aplicações Práticas
[Use 30-40% dos casos práticos da web - foque em indústria brasileira e normas]

## 3. Exercícios e Exemplos
[Misture exemplos dos livros + casos práticos]

**REGRA ABSOLUTA:** CADA diagrama deve ser de um TIPO diferente. Se você criar 3 diagramas, use 3 TIPOS diferentes (flowchart + graph + stateDiagram).

REGRAS CRÍTICAS PARA LATEX (LEIA COM ATENÇÃO):

❌ **ERROS MAIS COMUNS QUE VOCÊ DEVE EVITAR:**
1. NUNCA: "libera calor ( $$ Q $$ ) que é transferido..."
2. NUNCA: "realiza trabalho ( $$ W $$ ), que é convertido..."
3. NUNCA: "A energia interna ( $$ U $$ ) é uma função..."
4. NUNCA: "calor específico ( $$ c_p $$ ) em processos..."
5. NUNCA: "onde ( $$ \\Delta U $$ ) representa a variação..."

✅ **FORMA CORRETA:**
1. SIM: "libera calor ($Q$) que é transferido..."
2. SIM: "realiza trabalho ($W$), que é convertido..."
3. SIM: "A energia interna ($U$) é uma função..."
4. SIM: "calor específico ($c_p$) em processos..."
5. SIM: "onde ($\\Delta U$) representa a variação..."

**REGRA ABSOLUTA**: 
- NO MEIO DE UMA FRASE → use SEMPRE $variavel$ (um $ de cada lado)
- EQUAÇÃO ISOLADA EM LINHA PRÓPRIA → use $$
$$
\\Delta U = Q - W
$$

**TESTE MENTAL**: Se você vê a variável ENTRE palavras → use $ e NÃO $$

REGRAS PARA REFERÊNCIAS BIBLIOGRÁFICAS:

**OBRIGATÓRIO**: Inclua 5-7 referências diversificadas ao final:

1. **2-3 Livros-texto clássicos**:
   - Çengel, Y. A., & Boles, M. A. (Termodinâmica, 9ª ed.)
   - Moran, M. J., & Shapiro, H. N. (Fundamentos de Termodinâmica, 6ª ed.)
   - Van Wylen, G. J., & Sonntag, R. E. (Fundamentos da Termodinâmica)

2. **1-2 Normas técnicas brasileiras**:
   - ABNT (se aplicável ao tópico)
   - INMETRO (para aspectos de medição)

3. **1-2 Artigos/papers acadêmicos**:
   - Preferencialmente de universidades brasileiras (USP, UNICAMP, UFRJ)
   - SciELO, Google Scholar

4. **1 Recurso online de qualidade**:
   - MIT OpenCourseWare
   - Khan Academy (em português quando disponível)
   - NPTEL (Indian Institute of Technology)

FORMATO DAS REFERÊNCIAS (ao final do documento):
## 📚 Referências Bibliográficas

1. [Título do Livro] - [Autores] - [Editora, Ano]
2. [Título do Artigo] - [Autores] - [Journal/Conferência, Ano]
...

Cite fontes naturalmente no texto: "Segundo Çengel..." ou "Beer e Johnston definem..."
Mermaid válido com \`\`\`mermaid
SEM tabelas HTML, SEM JSON, SEM código executável
Priorize RIGOR TÉCNICO e FUNDAMENTOS SÓLIDOS
A seção de fundamentos teóricos deve ser mais extensa que a de aplicações
**OBJETIVO**: 3-5 diagramas por material didático (diversos tipos)

IMPORTANTE SOBRE CALLOUTS:
Use callouts Markdown para destacar informações importantes:
> ✏️ Conceito-Chave: [Definição fundamental que todo estudante deve memorizar]
> 🤔 Pergunta para Reflexão: [Questão que estimula pensamento crítico]
> 💡 Dica Importante: [Insight prático ou macete útil]
> ⚠️ Atenção: [Cuidado com erros comuns ou limitações]
> 🔬 Exemplo Prático: [Caso real de aplicação]

**DIAGRAMAS: USE VARIEDADE DE TIPOS**

Crie 3-4 diagramas usando TIPOS DIFERENTES (escolha o mais apropriado para cada conceito):

1. **flowchart LR** - Para processos sequenciais e fluxos
\`\`\`mermaid
flowchart LR
    A[Entrada] --> B[Processo] --> C[Saida]
\`\`\`

2. **graph TD** - Para hierarquias e relações entre conceitos
\`\`\`mermaid
graph TD
    Conceito1[Principal] --> Conceito2[Derivado]
    Conceito1 --> Conceito3[Relacionado]
\`\`\`

3. **stateDiagram-v2** - Para estados, transições e ciclos
\`\`\`mermaid
stateDiagram-v2
    [*] --> Estado1
    Estado1 --> Estado2: Transicao
    Estado2 --> [*]
\`\`\`

4. **classDiagram** - Para classificações e taxonomias (opcional)
\`\`\`mermaid
classDiagram
    Categoria <|-- Tipo1
    Categoria <|-- Tipo2
\`\`\`

**IMPORTANTE**: Use pelo menos 2 tipos diferentes. NUNCA use apenas graph TD para todos os diagramas.

**REGRAS CRÍTICAS PARA DIAGRAMAS**:
- **NUNCA use caracteres especiais em labels**: Δ, Σ, ṁ, Q̇, Ẇ, α, β, γ, θ
- **Use notação ASCII**: "Delta", "Sigma", "Q_dot", "m_dot", "alpha"
- **Labels curtos**: Máximo 40 caracteres por label
- **Sem parênteses em labels**: Prefira hífens ou underscores
- **Fórmulas matemáticas**: Coloque em seção LaTeX separada, NUNCA em diagramas

EXEMPLO CORRETO DE DIAGRAMA:
\`\`\`mermaid
flowchart TD
    A[Primeira Lei] --> B[Conservacao de Energia]
    B --> C[DeltaE = Q - W]
    C --> D[Sistema Fechado]
\`\`\`

EXEMPLO INCORRETO (NÃO FAÇA):
\`\`\`mermaid
flowchart TD
    A[Primeira Lei] --> B[ΔE = Q - W]  ❌ Caracteres especiais
    B --> C[Q̇ - Ẇ = dE/dt + Σṁ...]  ❌ Fórmula muito longa
\`\`\`

EXEMPLO DE CALLOUT:
> ✏️ Conceito-Chave: A Primeira Lei da Termodinâmica estabelece que a energia total de um sistema isolado permanece constante, podendo apenas mudar de forma entre energia interna, calor e trabalho.

EXEMPLO CORRETO DE LATEX:
No texto: "A entalpia ($H$) é uma propriedade termodinâmica..."

Em bloco separado:
$$
\\Delta H = m \\times c_p \\times \\Delta T
$$

INCORRETO (NÃO FAÇA):
"A entalpia $$ H $$ é uma propriedade..." ❌`;

    const finalMarkdown = await callLovableAI([
      { role: 'system', content: integrationPrompt },
      { role: 'user', content: `Integre o conteúdo completo para: ${lectureTitle}` }
    ], lovableApiKey, 'Content Integration');
    
    // === PHASE 4: PROCESSING & VALIDATION ===
    console.log('\n=== PHASE 4: PROCESSING & VALIDATION ===');
    await updateJobProgress(supabase, jobId, 85, 'Processando e validando conteúdo...');
    
    let processedMarkdown = fixLaTeXFormulas(finalMarkdown);
    
    // Post-generation validation and auto-fix
    const validateContent = (markdown: string): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];
      
      // Check for inline $$ usage (should be single $)
      const inlineDoubleDollar = markdown.match(/\w+\s*\$\$\s*[A-Za-z_\\]+\s*\$\$/g);
      if (inlineDoubleDollar) {
        errors.push(`Found ${inlineDoubleDollar.length} inline $$ formulas (should use single $)`);
      }
      
      // Check for special characters in Mermaid labels
      const mermaidBlocks = markdown.match(/```mermaid[\s\S]*?```/g) || [];
      mermaidBlocks.forEach((block, i) => {
        const labels = block.match(/\[([^\]]+)\]/g) || [];
        labels.forEach(label => {
          if (/[ΔΣṁQ̇Ẇαβγθμπω]/.test(label)) {
            errors.push(`Mermaid diagram ${i+1} has special characters in label: ${label}`);
          }
          if (label.length > 50) {
            errors.push(`Mermaid diagram ${i+1} has long label (${label.length} chars): ${label.substring(0, 30)}...`);
          }
        });
      });
      
      // Check diagram type diversity
      const diagramTypes = new Set<string>();
      mermaidBlocks.forEach(block => {
        const typeMatch = block.match(/```mermaid\s+(flowchart|graph|stateDiagram|classDiagram|pie|sequenceDiagram)/);
        if (typeMatch) {
          diagramTypes.add(typeMatch[1]);
        }
      });
      
      if (mermaidBlocks.length >= 3 && diagramTypes.size < 3) {
        errors.push(`REJECTED: Only ${diagramTypes.size} diagram types used (${Array.from(diagramTypes).join(', ')}). REQUIRED: 3 different types (flowchart + graph + stateDiagram/classDiagram).`);
      }
      
      // Also check for minimum variety (at least 2 types even with 2 diagrams)
      if (mermaidBlocks.length >= 2 && diagramTypes.size < 2) {
        errors.push(`REJECTED: All diagrams are the same type. REQUIRED: Use different types.`);
      }
      
      return { valid: errors.length === 0, errors };
    };
    
    const contentValidation = validateContent(processedMarkdown);
    if (!contentValidation.valid) {
      console.warn('⚠️ Content validation warnings:', contentValidation.errors);
    }
    
    // PHASE 4: Aggressive LaTeX inline fix (catches ALL inline $$ patterns)
    console.log('[LaTeX] Applying comprehensive inline formula fixes...');
    
    // Fix 1: ( $$ variable $$ ) → ($variable$)
    processedMarkdown = processedMarkdown.replace(/\(\s*\$\$\s*([^$]+?)\s*\$\$\s*\)/g, '($$$1$)');
    
    // Fix 2: $variable $$ → $variable$ (ENHANCED: catches subscripts, superscripts)
    processedMarkdown = processedMarkdown.replace(/\$([A-Za-z_\\{}\^]+)\s+\$\$/g, '$$$1$');
    
    // Fix 3: word $$ variable $$ word → word $variable$ word
    processedMarkdown = processedMarkdown.replace(/(\w+)\s+\$\$\s*([A-Za-z_\\]+)\s*\$\$\s+(\w+)/g, '$1 $$$2$ $3');
    
    // Fix 3: Start of line with inline $$
    processedMarkdown = processedMarkdown.replace(/^(\*\s+|\d+\.\s+|>\s+)(.+?)\$\$\s*([^$\n]+?)\s*\$\$/gm, '$1$2$$$3$');
    
    // Fix 4: Single variable between $$  $$ → $ $
    processedMarkdown = processedMarkdown.replace(/\$\$\s*([A-Za-z_\\]{1,10})\s*\$\$/g, '$$$1$');
    
    // Fix 5: In parentheses or after comma
    processedMarkdown = processedMarkdown.replace(/([,(])\s*\$\$\s*([^$\n]+?)\s*\$\$\s*([,)])/g, '$1$$$2$$3');
    
    console.log('[LaTeX] ✅ Comprehensive inline fixes applied');
    
  // NOVA PHASE 4: Minimal LaTeX Protection (NÃO-destrutiva) ✅ FASE 1
  console.log('[LaTeX] Applying MINIMAL protection (whitelist approach)...');

  // 1. Proteger blocos LaTeX display ($$...$$) ANTES de processar
  const latexBlocks: string[] = [];
  processedMarkdown = processedMarkdown.replace(/\$\$([^$]+)\$\$/g, (match, formula) => {
    const placeholder = `___LATEX_BLOCK_${latexBlocks.length}___`;
    latexBlocks.push(match);
    return placeholder;
  });

  // 2. Proteger fórmulas inline ($...$)
  const latexInline: string[] = [];
  processedMarkdown = processedMarkdown.replace(/\$([^$\n]+)\$/g, (match, formula) => {
    // Ignorar se for $$ (já protegido acima)
    if (formula.includes('$')) return match;
    const placeholder = `___LATEX_INLINE_${latexInline.length}___`;
    latexInline.push(match);
    return placeholder;
  });

  // 3. AGORA processar texto fora das fórmulas (após proteção) ✅ FASE 1
  // PHASE 4.5: Remove LaTeX de palavras comuns - VERSÃO FORTALECIDA
  console.log('[LaTeX] Removing LaTeX from common words (comprehensive)...');
  
  const commonWords = [
    'para', 'de', 'da', 'do', 'em', 'com', 'por', 'ao', 'um', 'uma', 
    'o', 'a', 'e', 'os', 'as', 'no', 'na', 'nos', 'nas', 'se', 'ou',
    'mais', 'mas', 'que', 'como', 'quando', 'onde', 'qual', 'quais'
  ];
  
  commonWords.forEach(word => {
    // FASE 2: Preservar espaços adjacentes para evitar palavras grudadas ✅
    // Pattern 1: $palavra$ (normal) - adicionar espaços
    processedMarkdown = processedMarkdown.replace(
      new RegExp(`\\$${word}\\$`, 'gi'), 
      ` ${word} ` // Espaços antes e depois
    );
    
    // Pattern 2: $palavra $$ (com espaço extra antes de $$)
    processedMarkdown = processedMarkdown.replace(
      new RegExp(`\\$${word}\\s+\\$\\$`, 'gi'), 
      ` ${word} `
    );
    
    // Pattern 3: $$palavra$$ (duplo em ambos os lados)
    processedMarkdown = processedMarkdown.replace(
      new RegExp(`\\$\\$${word}\\$\\$`, 'gi'), 
      ` ${word} `
    );
    
    // Pattern 4: $ palavra$ (com espaço no início)
    processedMarkdown = processedMarkdown.replace(
      new RegExp(`\\$\\s+${word}\\$`, 'gi'), 
      ` ${word} `
    );
  });
  
  // FASE 2: Normalizar espaços múltiplos após substituições ✅
  processedMarkdown = processedMarkdown.replace(/\s{2,}/g, ' ');
  
  console.log('[LaTeX] ✅ Common words cleaned (all patterns + spacing preserved)');
  
  // 4. Limpar APENAS texto fora das fórmulas
  // Remover apenas: emojis órfãos, tabs excessivos, quebras > 3 linhas
  processedMarkdown = processedMarkdown
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emojis
    .replace(/\t+/g, ' ')                    // Tabs
    .replace(/\n{4,}/g, '\n\n\n');          // Max 3 quebras
  
  // FASE 1: Adicionar correção de espaços em delimitadores LaTeX ✅
  console.log('[LaTeX] Fixing spacing around delimiters...');
  
  // Fix: $$ texto → $$texto (remover espaço após $$)
  processedMarkdown = processedMarkdown.replace(/\$\$\s+/g, '$$');
  processedMarkdown = processedMarkdown.replace(/\s+\$\$/g, '$$');
  
  // Fix: $ texto$ → $texto$ (inline)
  processedMarkdown = processedMarkdown.replace(/\$\s+([^$\n]+)/g, '$$$1');
  processedMarkdown = processedMarkdown.replace(/([^$\n]+)\s+\$/g, '$1$$');
  
  console.log('[LaTeX] ✅ Delimiter spacing corrected');

  // 5. FASE 1: Verificar se número de placeholders = número de fórmulas protegidas
  const expectedBlocks = (processedMarkdown.match(/___LATEX_BLOCK_\d+___/g) || []).length;
  const expectedInline = (processedMarkdown.match(/___LATEX_INLINE_\d+___/g) || []).length;
  
  if (expectedBlocks !== latexBlocks.length) {
    console.error(`[LaTeX] ⚠️ Block mismatch: ${expectedBlocks} placeholders, ${latexBlocks.length} formulas`);
  }
  if (expectedInline !== latexInline.length) {
    console.error(`[LaTeX] ⚠️ Inline mismatch: ${expectedInline} placeholders, ${latexInline.length} formulas`);
  }

  // 6. Restaurar fórmulas LaTeX intactas (FASE 1: Global regex fix) ✅
  latexBlocks.forEach((block, i) => {
    const regex = new RegExp(`___LATEX_BLOCK_${i}___`, 'g'); // 'g' = global - substitui TODAS as ocorrências
    processedMarkdown = processedMarkdown.replace(regex, block);
  });
  latexInline.forEach((formula, i) => {
    const regex = new RegExp(`___LATEX_INLINE_${i}___`, 'g'); // 'g' = global
    processedMarkdown = processedMarkdown.replace(regex, formula);
  });

  // FASE 1: Verificar se TODOS os placeholders foram restaurados ✅
  const remainingPlaceholders = processedMarkdown.match(/___LATEX_(BLOCK|INLINE)_\d+___/g);
  if (remainingPlaceholders && remainingPlaceholders.length > 0) {
    console.error(`[LaTeX] ❌ CRITICAL: ${remainingPlaceholders.length} placeholders not restored!`);
    console.error('[LaTeX] Unreplaced:', remainingPlaceholders.slice(0, 10)); // Show first 10
    
    // Fallback: Remove placeholders órfãos
    processedMarkdown = processedMarkdown.replace(/___LATEX_(BLOCK|INLINE)_\d+___/g, '[FORMULA ERROR]');
  } else {
    console.log('[LaTeX] ✅ All placeholders successfully restored');
  }

  console.log('[LaTeX] ✅ Protection complete - LaTeX preserved');

  // PHASE 4.7: Final validation - detect remaining LaTeX errors
  console.log('[LaTeX] Final validation check...');

  const suspiciousPatterns = [
    /\$[a-z]{2,10}\$/gi,  // $palavra$ (lowercase only = likely common word)
    /\$\s+[^$]+\s+\$/g,   // $ texto $ (spaces around = likely error)
    /\$\$\s{2,}/g,        // $$  (double spaces after $$)
  ];

  let foundIssues = 0;
  suspiciousPatterns.forEach((pattern, idx) => {
    const matches = processedMarkdown.match(pattern);
    if (matches && matches.length > 0) {
      console.warn(`[LaTeX] ⚠️ Pattern ${idx + 1} found ${matches.length} suspicious matches:`, matches.slice(0, 5));
      foundIssues += matches.length;
    }
  });

  if (foundIssues > 10) {
    console.error(`[LaTeX] ❌ CRITICAL: ${foundIssues} potential LaTeX errors remain!`);
  }

  // FASE 2: Detectar palavras suspeitamente longas (texto corrompido) ✅
  const longWords = processedMarkdown.match(/[a-záàâãéêíóôõúçñ]{30,}/gi);
  if (longWords && longWords.length > 0) {
    console.error('[LaTeX] ⚠️ Suspected text corruption detected (words > 30 chars):');
    longWords.slice(0, 5).forEach(word => console.error(`  - "${word.substring(0, 50)}..."`));
  }

  console.log('[LaTeX] ✅ Validation complete');

  // FASE 4.3: Minimal Mermaid diagram normalization (simplified) ✅
  console.log('[Mermaid] Applying minimal normalization...');
  
  processedMarkdown = processedMarkdown.replace(
    /```mermaid([\s\S]*?)```/g,
    (match, content) => {
      const trimmed = content.trim();
      return `\`\`\`mermaid\n${trimmed}\n\`\`\``;
    }
  );
  
  console.log('[Mermaid] ✅ Mermaid blocks normalized (line breaks only)');

  // FASE 5: AI-Powered Final LaTeX Correction ✅ FASE 6 - DESABILITADO
  // NOTA: Fase desabilitada para evitar correções excessivas que podem introduzir novos erros
  console.log('[AI] ⏭️ AI correction DISABLED (Phase 6 - preventing over-correction)');
  
  /*
  // Código original comentado - pode ser reativado após validação das Fases 1-4
  console.log('[AI] Initiating Gemini-powered LaTeX correction...');

  try {
    const aiCorrectionPrompt = `Você é um especialista em LaTeX e markdown científico. Corrija APENAS os erros de sintaxe LaTeX no markdown abaixo, seguindo estas regras:

REGRAS CRÍTICAS:
1. Remova TODOS os padrões $$$$, $$$, deixando apenas $$ para display ou $ para inline
2. Corrija \\ldot para \\dot
3. Substitua TODOS os \\text{} por \\mathrm{} em unidades (kg, m/s, kJ, etc)
4. Remova "(verificar sintaxe)" se aparecer
5. Corrija subscripts quebrados: Q_{vapor} → Q_{\\text{vapor}}
6. NÃO altere o conteúdo, estrutura ou significado
7. NÃO adicione explicações, retorne APENAS o markdown corrigido

Markdown:
${processedMarkdown}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'Você é um corretor de sintaxe LaTeX. Corrija erros sem alterar conteúdo.' 
          },
          { role: 'user', content: aiCorrectionPrompt }
        ],
        temperature: 0.1,
        max_tokens: 16000,
      }),
    });

    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      const correctedMarkdown = aiData.choices[0].message.content;
      
      // Validação de segurança (80%-120% do tamanho original)
      const lengthRatio = correctedMarkdown.length / processedMarkdown.length;
      
      if (lengthRatio >= 0.8 && lengthRatio <= 1.2) {
        // Contar erros antes e depois
        const errorsBefore = (processedMarkdown.match(/\$\$\$/g) || []).length;
        const errorsAfter = (correctedMarkdown.match(/\$\$\$/g) || []).length;
        
        processedMarkdown = correctedMarkdown;
        console.log(`[AI] ✅ Correction applied - Errors reduced: ${errorsBefore} → ${errorsAfter}`);
      } else {
        console.warn(`[AI] ⚠️ Correction rejected (length ${lengthRatio.toFixed(2)}x)`);
      }
    } else {
      const errorText = await aiResponse.text();
      console.warn('[AI] ⚠️ API error:', aiResponse.status, errorText);
    }
  } catch (error) {
    console.error('[AI] ❌ Correction failed:', error);
  }
  */

  // FASE 6 (renumerada): Final LaTeX Quality Check ✅ FASE 8
  console.log('[LaTeX] Running COMPREHENSIVE final quality check...');

  const criticalErrors = [
    { pattern: /\$\$\$\$+/g, name: 'Quadruple dollar signs', severity: 'CRITICAL' },
    { pattern: /\$\$\$/g, name: 'Triple dollar signs', severity: 'CRITICAL' },
    { pattern: /\\ldot\{/g, name: 'Invalid \\ldot command', severity: 'HIGH' },
    { pattern: /\(verificar sintaxe\)/gi, name: 'Error message in text', severity: 'HIGH' },
    { pattern: /\$[a-z]{2,8}\$/g, name: 'Orphaned common words in math', severity: 'MEDIUM' },
  ];

  let totalErrors = 0;
  const errorReport: string[] = [];

  criticalErrors.forEach(({ pattern, name, severity }) => {
    const matches = processedMarkdown.match(pattern);
    if (matches && matches.length > 0) {
      totalErrors += matches.length;
      errorReport.push(`[${severity}] ${name}: ${matches.length} occurrences`);
      console.warn(`[LaTeX] ⚠️ ${name}: ${matches.length} found`);
    }
  });

  // FASE 8: Validações adicionais de qualidade
  // Check 1: LaTeX incompleto
  const openDollars = (processedMarkdown.match(/\$/g) || []).length;
  if (openDollars % 2 !== 0) {
    totalErrors++;
    errorReport.push('[CRITICAL] Unmatched LaTeX delimiters (odd number of $)');
    console.error('[LaTeX] ❌ CRITICAL: Unmatched LaTeX delimiters');
  }

  // Check 2: Diagramas sem tipo
  const emptyMermaidBlocks = (processedMarkdown.match(/```mermaid\s*\n\s*\n/g) || []).length;
  if (emptyMermaidBlocks > 0) {
    errorReport.push(`[WARNING] ${emptyMermaidBlocks} Mermaid diagrams without type`);
    console.warn(`[Mermaid] ⚠️ ${emptyMermaidBlocks} diagrams without type declaration`);
  }
  
  // Check 3 (NEW): Placeholders não restaurados ✅ FASE 8
  const orphanedPlaceholders = (processedMarkdown.match(/___LATEX_(BLOCK|INLINE)_\d+___/g) || []).length;
  if (orphanedPlaceholders > 0) {
    totalErrors += orphanedPlaceholders;
    errorReport.push(`[CRITICAL] ${orphanedPlaceholders} orphaned LaTeX placeholders`);
    console.error(`[LaTeX] ❌ CRITICAL: ${orphanedPlaceholders} unrestored placeholders`);
  }
  
  // Check 4 (NEW): Espaços extras em delimitadores ✅ FASE 8
  const spacedDelimiters = (processedMarkdown.match(/\$\$\s+|\s+\$\$/g) || []).length;
  if (spacedDelimiters > 0) {
    errorReport.push(`[WARNING] ${spacedDelimiters} spacing issues in LaTeX delimiters`);
    console.warn(`[LaTeX] ⚠️ ${spacedDelimiters} spacing issues around $$`);
  }

  // Check 5: Diversidade de diagramas (meta de qualidade)
  const flowchartCount = (processedMarkdown.match(/```mermaid\s*\n\s*flowchart/gi) || []).length;
  const totalMermaidCount = (processedMarkdown.match(/```mermaid/gi) || []).length;
  const diagramDiversityRatio = totalMermaidCount > 0 ? (totalMermaidCount - flowchartCount) / totalMermaidCount : 0;
  
  if (totalMermaidCount > 3 && diagramDiversityRatio < 0.3) {
    console.warn(`[Mermaid] ⚠️ Low diagram diversity: ${Math.round(diagramDiversityRatio * 100)}% non-flowchart (target: 30%+)`);
    errorReport.push(`[INFO] Low diagram diversity: Consider using sequenceDiagram, classDiagram, or erDiagram`);
  }

  if (totalErrors > 0) {
    console.error(`[QA] ❌ QUALITY CHECK FAILED: ${totalErrors} critical errors remain`);
    console.error('[QA] Error Report:\n' + errorReport.join('\n'));
  } else {
    console.log('[QA] ✅ Quality check passed - no critical errors');
    if (errorReport.length > 0) {
      console.log('[QA] ℹ️ Recommendations:\n' + errorReport.join('\n'));
    }
  }
    
    processedMarkdown = processedMarkdown.replace(/\n{3,}/g, '\n\n'); // Remove excess blank lines
    
    // Validate
    const validation = validateMarkdown(processedMarkdown);
    
    // Calculate content distribution
    const totalContentLength = bookBasedContent.length + practicalContext.length;
    metrics.bookContentPercentage = totalContentLength > 0 
      ? Math.round((bookBasedContent.length / totalContentLength) * 100)
      : 100; // 100% if no web content
    metrics.webContentPercentage = 100 - metrics.bookContentPercentage;
    
    console.log(`[Quality] Content distribution: ${metrics.bookContentPercentage}% books, ${metrics.webContentPercentage}% web`);
    console.log(`[Quality] Books identified: ${metrics.booksIdentified}`);
    console.log(`[Quality] Web sources: ${sourcesUsed.length}`);
    
    if (validation.warnings.length > 0) {
      console.warn('[Validation] Warnings:', validation.warnings);
    }
    
    // Count metrics
    metrics.markdownLength = processedMarkdown.length;
    metrics.mermaidCount = (processedMarkdown.match(/```mermaid/g) || []).length;
    metrics.latexCount = (processedMarkdown.match(/\$\$/g) || []).length / 2;
    
    // === PHASE 5: SAVE TO DATABASE ===
    console.log('\n=== PHASE 5: SAVE TO DATABASE ===');
    await updateJobProgress(supabase, jobId, 93, 'Salvando material...');
    
    await supabase
      .from('lectures')
      .update({
        material_didatico_v2: processedMarkdown,
        updated_at: new Date().toISOString()
      })
      .eq('id', lectureId);
    
    // Complete job
    metrics.generationTimeMs = Date.now() - startTime;
    metrics.success = true;
    
    const jobMetadata = {
      warnings: validation.warnings,
      identifiedBooks: metrics.identifiedBooks,
      bookContentPercentage: metrics.bookContentPercentage,
      webContentPercentage: metrics.webContentPercentage,
      sourcesUsed: sourcesUsed.slice(0, 10), // Top 10 sources
      avgTrustScore: sourcesUsed.length > 0 
        ? (sourcesUsed.reduce((sum, s) => sum + s.trustScore, 0) / sourcesUsed.length).toFixed(2)
        : 'N/A'
    };
    
    await supabase
      .from('material_v2_jobs')
      .update({
        status: 'COMPLETED',
        progress: 100,
        progress_step: `Concluído! (${metrics.bookContentPercentage}% livros, ${metrics.webContentPercentage}% web)`,
        result: processedMarkdown.substring(0, 500) + '...',
        metadata: jobMetadata,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);
    
    await logTelemetry(supabase, jobId, lectureId, metrics);
    
    console.log(`\n✅ Job ${jobId} completed successfully in ${(metrics.generationTimeMs / 1000).toFixed(1)}s`);
    console.log(`📚 Final stats: ${metrics.booksIdentified} books, ${sourcesUsed.length} web sources`);
    console.log(`📊 Distribution: ${metrics.bookContentPercentage}% books / ${metrics.webContentPercentage}% web\n`);
    
  } catch (error: any) {
    console.error(`❌ Job ${jobId} failed:`, error);
    
    metrics.generationTimeMs = Date.now() - startTime;
    metrics.success = false;
    metrics.errorType = error.message.split(':')[0]; // Extract error type
    
    let userMessage = 'Erro ao gerar material. Tente novamente.';
    
    if (error.message.includes('RATE_LIMITED')) {
      userMessage = 'Limite de requisições atingido. Aguarde alguns minutos.';
    } else if (error.message.includes('NO_CREDITS')) {
      userMessage = 'Créditos insuficientes. Contate o administrador.';
    } else if (error.message.includes('MISSING_KEY')) {
      userMessage = 'Configuração pendente. Contate o administrador.';
    } else if (error.message.includes('timeout')) {
      userMessage = 'Tempo esgotado. Verifique sua conexão e tente novamente.';
    }
    
    await supabase
      .from('material_v2_jobs')
      .update({
        status: 'FAILED',
        error_message: userMessage,
        metadata: { technical_error: error.message },
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);
    
    await logTelemetry(supabase, jobId, lectureId, metrics);
  }
}

// ==========================================
// HTTP Handler with Global Timeout
// ==========================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // ✅ PHASE 2: Global 3-minute timeout
  const timeoutPromise = new Promise<Response>((_, reject) => {
    setTimeout(() => reject(new Error('TIMEOUT')), 180000);
  });

  const mainHandler = async (): Promise<Response> => {
    try {
      const { lectureId } = await req.json();

      if (!lectureId) {
        return new Response(
          JSON.stringify({ error: 'lectureId é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate auth
      const authHeader = req.headers.get('authorization');
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Não autenticado' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Token inválido' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify ownership
      const { data: lecture, error: lectureError } = await supabase
        .from('lectures')
        .select('id, title, teacher_id')
        .eq('id', lectureId)
        .single();

      if (lectureError || !lecture || lecture.teacher_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Aula não encontrada ou sem permissão' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create job
      const { data: job, error: jobError } = await supabase
        .from('material_v2_jobs')
        .insert({
          lecture_id: lectureId,
          teacher_id: user.id,
          status: 'PENDING',
          progress: 0,
        })
        .select()
        .single();

      if (jobError || !job) {
        throw new Error('Falha ao criar job');
      }

      // Start async processing (don't await)
      processGenerationJob(job.id, lectureId, lecture.title).catch((err) => {
        console.error('[Async Job] Unhandled error:', err);
      });

      return new Response(
        JSON.stringify({ success: true, jobId: job.id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error: any) {
      console.error('[Handler] Error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  };

  try {
    return await Promise.race([mainHandler(), timeoutPromise]);
  } catch (error: any) {
    if (error.message === 'TIMEOUT') {
      return new Response(
        JSON.stringify({ error: 'Tempo esgotado. A requisição levou mais de 3 minutos.' }),
        { status: 408, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    throw error;
  }
});
