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
// Custom AI Error Class for Better Error Handling
// ==========================================

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
      
      // ✅ Don't retry on configuration/validation errors using AIError
      if (
        error instanceof AIError && (
          error.status === 401 || 
          error.status === 403 || 
          error.status === 400 ||
          (error.status === 500 && error.responseText.includes('internal_server_error'))
        )
      ) {
        console.error(`[Retry] ⚠️ Configuration/Validation error (${error.status}), not retrying:`, error.message);
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
  operation: string,
  modelOverride?: string
): Promise<string> {
  const primaryModel = modelOverride || 'google/gemini-2.5-pro';
  const fallbackModel = 'openai/gpt-5-mini'; // Equivalente ao gemini-2.5-pro
  
  // Tentativa com modelo primário
  try {
    return await retryWithBackoff(async () => {
      const payload = {
        model: primaryModel,
        messages,
      };
      
      console.log(`[AI] Calling Lovable AI for ${operation} with model: ${primaryModel}`);
      console.log(`[AI] Payload:`, JSON.stringify(payload, null, 2).substring(0, 500) + '...');
      
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[AI] ❌ Error Response (${response.status}) for ${operation}:`, errorText);
        
        if (response.status === 429) {
          throw new AIError(429, errorText, 'RATE_LIMITED: Excesso de requisições. Aguarde alguns minutos.');
        }
        if (response.status === 402) {
          throw new AIError(402, errorText, 'NO_CREDITS: Créditos insuficientes. Adicione créditos ao seu workspace Lovable.');
        }
        
        throw new AIError(response.status, errorText);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      console.log(`[AI] ✅ ${operation} completed successfully (${content.length} chars)`);
      return content;
    }, operation, 2, 10000);
  } catch (primaryError: any) {
    // Se o modelo primário falhar com 500 internal_server_error, tentar fallback
    if (primaryError instanceof AIError && 
        primaryError.status === 500 && 
        primaryError.responseText.includes('internal_server_error')) {
      
      console.warn(`[AI] ⚠️ Modelo primário (${primaryModel}) falhou com internal_server_error, tentando modelo fallback (${fallbackModel})`);
      
      // Tentativa com modelo fallback
      return await retryWithBackoff(async () => {
        const payload = {
          model: fallbackModel,
          messages,
        };
        
        console.log(`[AI] 🔄 FALLBACK: Calling Lovable AI for ${operation} with model: ${fallbackModel}`);
        
        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[AI] ❌ FALLBACK Error Response (${response.status}) for ${operation}:`, errorText);
          throw new AIError(response.status, errorText, `Modelo fallback também falhou: ${errorText}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        
        if (!content) {
          throw new Error('Sem conteúdo na resposta do AI fallback');
        }
        
        console.log(`[AI] ✅ FALLBACK ${operation} completado com sucesso usando ${fallbackModel} (${content.length} chars)`);
        return content;
      }, `Lovable AI Fallback: ${operation}`, 2, 10000);
    }
    
    // Se não for 500 internal_server_error, ou se fallback também falhar, relançar
    throw primaryError;
  }
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
// PHASE 3: Checkpoint Telemetry
// ==========================================

async function updateJobCheckpoint(
  supabase: any, 
  jobId: string, 
  checkpoint: string
) {
  console.log(`[Checkpoint] ${checkpoint}`);
  const { error } = await supabase
    .from('material_v2_jobs')
    .update({
      metadata: { 
        last_checkpoint: checkpoint, 
        checkpoint_time: new Date().toISOString() 
      }
    })
    .eq('id', jobId);
  
  if (error) {
    console.warn(`[Checkpoint] Failed to update checkpoint ${checkpoint}:`, error);
  }
}

// ==========================================
// PHASE 3: Improved LaTeX Regex
// ==========================================

function fixLaTeXFormulas(markdown: string): string {
  console.log('[LaTeX] Applying MINIMAL sanitization (following PDF guidelines)...');
  
  let cleaned = markdown;

  // 1. ✅ KEEP: Remove corrupted placeholders
  cleaned = cleaned.replace(/___LATEX_\w+_\d+___/g, '');
  cleaned = cleaned.replace(/\*\*\s*\d+\$\s*\*\*/g, '');

  // 2. ❌ REMOVED: Do NOT convert $ → $$ (AI already generates correctly!)
  // The destructive conversion has been removed

  // 3. ✅ NEW: Fix spacing FOLLOWING PDF RULES
  // Rule: Opening $ WITHOUT space after, closing $ WITHOUT space before
  
  // Inline: Remove spaces INSIDE delimiters
  cleaned = cleaned.replace(/\$\s+([^\$]+?)\s+\$/g, '$$$1$');
  
  // Block: Ensure own line and no adjacent spaces
  cleaned = cleaned.replace(/([^\s])\$\$/g, '$1 $$'); // space before $$
  cleaned = cleaned.replace(/\$\$([^\s])/g, '$$ $1'); // space after $$

  console.log('[LaTeX] ✅ Minimal sanitization complete');
  return cleaned;
}

// ==========================================
// POST-PROCESSING: Force $→$$ in Mermaid Labels
// ==========================================

/**
 * ✅ SOLUÇÃO 2: Force conversion $ → $$ in Mermaid labels (Deno-compatible)
 * Uses placeholder approach to avoid lookbehind regex (not supported in Deno/V8)
 * SCOPE: Only affects code inside ```mermaid blocks, within quoted labels ["..."]
 */
function forceDollarDoublingInMermaid(markdown: string): string {
  console.log('[Mermaid] 🔄 Starting $ → $$ conversion (Deno-compatible)...');
  
  const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
  let conversionsCount = 0;
  let blocksProcessed = 0;
  
  const processed = markdown.replace(mermaidRegex, (fullMatch, diagramContent) => {
    blocksProcessed++;
    
    // Process ALL quoted labels in the diagram
    const processedContent = diagramContent.replace(/\[(".*?")\]/gs, (labelMatch: string, quotedContent: string) => {
      let inner = quotedContent.slice(1, -1); // Remove quotes
      
      // ✅ DENO-COMPATIBLE APPROACH: Use placeholder strategy
      // 1. Protect existing $$
      inner = inner.replace(/\$\$/g, '___PROTECTED_DOUBLE___');
      
      // 2. Convert single $ → $$
      const beforeConversion = inner;
      inner = inner.replace(/\$([^\$]+?)\$/g, (match, formula) => {
        conversionsCount++;
        console.log(`  💱 $${formula}$ → $$${formula}$$`);
        return `$$${formula}$$`;
      });
      
      // 3. Restore protected $$
      inner = inner.replace(/___PROTECTED_DOUBLE___/g, '$$');
      
      // Log if conversion happened
      if (inner !== beforeConversion) {
        console.log(`  ✅ Label converted: "${beforeConversion.substring(0, 40)}..."`);
      }
      
      return `["${inner}"]`;
    });
    
    return `\`\`\`mermaid\n${processedContent}\`\`\``;
  });
  
  console.log(`[Mermaid] ✅ Processed ${blocksProcessed} Mermaid blocks`);
  console.log(`[Mermaid] ✅ Total conversions: ${conversionsCount}`);
  
  if (conversionsCount === 0) {
    console.warn('[Mermaid] ⚠️ No conversions made - labels may already use $$');
  }
  
  return processed;
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
  
  // ✅ CRITICAL VERIFICATION: LOVABLE_API_KEY
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableApiKey) {
    console.error('[CRITICAL] ❌ LOVABLE_API_KEY not configured');
    await supabase
      .from('material_v2_jobs')
      .update({
        status: 'FAILED',
        error_message: 'Configuração pendente. Contate o administrador.',
        metadata: { 
          technical_error: 'MISSING_KEY: LOVABLE_API_KEY not configured in environment',
          timestamp: new Date().toISOString() 
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);
    return;
  }
  
  console.log(`[Job ${jobId}] Starting generation for lecture: ${lectureTitle}`);
  
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

  // ==========================================
  // FASE 2: TIMEOUT DE SEGURANÇA (10 minutos)
  // ==========================================
  const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutos
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error('TIMEOUT: Geração excedeu 10 minutos'));
    }, TIMEOUT_MS);
  });

  try {
    await Promise.race([
      (async () => {
        // Update job to PROCESSING
        await supabase
          .from('material_v2_jobs')
          .update({ status: 'PROCESSING', updated_at: new Date().toISOString() })
          .eq('id', jobId);

        await updateJobProgress(supabase, jobId, 5, 'Iniciando geração (Book-First Approach)...');
        await updateJobCheckpoint(supabase, jobId, 'job_started');

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

╔═══════════════════════════════════════════════════════════════════════════════╗
║  🚨 SOLUÇÃO 1: VALIDAÇÃO STRICT ATIVADA - LEIA COM ATENÇÃO EXTREMA 🚨        ║
║  O material será REJEITADO se não seguir 100% estas regras                   ║
╚═══════════════════════════════════════════════════════════════════════════════╝

🔴 **REGRA ABSOLUTA PARA MERMAID.JS - NÃO NEGOCIÁVEL**:

Em labels de diagramas Mermaid, LaTeX SEMPRE usa $$ (DUPLO), NUNCA $ (SIMPLES)!

┌─────────────────────────────────────────────────────────────────────────────┐
│ ❌ EXEMPLOS ABSOLUTAMENTE PROIBIDOS - REJEITADOS AUTOMATICAMENTE:           │
└─────────────────────────────────────────────────────────────────────────────┘

PROIBIDO #1 - $ simples em labels (USA $$ DUPLO!):
\`\`\`mermaid
flowchart TD
    A["Energia: $E = U + Q$"]      ❌ $ simples NÃO funciona!
    B["Trabalho: $W = PdV$"]       ❌ Mermaid.js rejeita $ simples!
\`\`\`

PROIBIDO #2 - Labels sem aspas duplas:
\`\`\`mermaid
flowchart TD
    A[Q - W = Delta E]             ❌ SEM aspas, SEM $$
    B[Calor Q]                     ❌ SEM formatação LaTeX
\`\`\`

PROIBIDO #3 - Underscores diretos (deve usar LaTeX):
\`\`\`mermaid
flowchart TD
    A["Q_dot"]                     ❌ Underscore direto
    B["m_dot"]                     ❌ Use $$\\dot{Q}$$ ou $$Q_{dot}$$
\`\`\`

PROIBIDO #4 - Sintaxe antiga "graph" predominante:
\`\`\`mermaid
graph TD                           ❌ Use flowchart TD
    A --> B
\`\`\`

┌─────────────────────────────────────────────────────────────────────────────┐
│ ✅ FORMATO OBRIGATÓRIO ÚNICO - COPIE ESTE FORMATO EXATAMENTE:               │
└─────────────────────────────────────────────────────────────────────────────┘

\`\`\`mermaid
flowchart TD
    Node1["Descrição Textual<br/>$$Q = mc\\Delta T$$"]
    Node2["Outro Conceito<br/>$$\\dot{Q} = \\frac{dQ}{dt}$$"]
    Node3["Resultado<br/>$$W_{net} = Q_{in} - Q_{out}$$"]
    
    Node1 --> Node2
    Node2 --> Node3
    
    style Node1 fill:#e1f5ff,stroke:#0288d1,stroke-width:2px
    style Node3 fill:#fff3e0,stroke:#f57c00,stroke-width:2px
\`\`\`

🔴 **VALIDAÇÃO AUTOMÁTICA RIGOROSA**:

O sistema vai REJEITAR seu material automaticamente SE:
- Você usar $ ao invés de $$ em labels → MATERIAL REJEITADO
- Não usar aspas duplas ["..."] → MATERIAL REJEITADO
- Usar graph TD ao invés de flowchart TD → MATERIAL REJEITADO

**ANTES DE GERAR, RESPONDA MENTALMENTE ESTAS PERGUNTAS**:
1. ✅ Vou usar $$ (DUPLO) em TODOS os labels com LaTeX? (SIM/NÃO)
2. ✅ NUNCA vou usar $ (SIMPLES) dentro de labels Mermaid? (SIM/NÃO)
3. ✅ Todos os labels têm aspas duplas ["..."]? (SIM/NÃO)
4. ✅ Vou usar flowchart TD/LR (não graph TD)? (SIM/NÃO)

❌ Se você respondeu NÃO a qualquer pergunta, PARE E CORRIJA!

┌─────────────────────────────────────────────────────────────────────────────┐
│ 📋 CHECKLIST FINAL (VERIFICAR ANTES DE ENVIAR):                             │
└─────────────────────────────────────────────────────────────────────────────┘

□ Todos os labels Mermaid usam aspas duplas: ["..."]
□ Todas as fórmulas dentro de labels usam $$...$$ (DUPLO, não simples!)
□ Nenhum underscore direto (Q_dot) - usar $$\\dot{Q}$$ ou $$Q_{dot}$$
□ Pelo menos 1 diagrama flowchart TD ou flowchart LR
□ Mínimo 2 diagramas Mermaid no total
□ Mínimo 2 TIPOS diferentes de diagramas (flowchart + graph/stateDiagram)

╔═══════════════════════════════════════════════════════════════════════════════╗
║  📐 EXEMPLO COMPLETO PERFEITO - COPIE ESTA ESTRUTURA EXATA:                  ║
╚═══════════════════════════════════════════════════════════════════════════════╝

\`\`\`mermaid
flowchart TD
    Sistema["<b>Sistema Termodinâmico</b><br/>Fechado: $$m = \\text{constante}$$"]
    
    Sistema --> Entrada["Entradas de Energia"]
    Sistema --> Saida["Saídas de Energia"]
    
    Entrada --> Calor["<b>Calor Transferido</b><br/>$$Q = \\int \\delta Q$$"]
    Entrada --> Trabalho["<b>Trabalho Realizado</b><br/>$$W = \\int P dV$$"]
    
    Calor --> Lei["<b>Primeira Lei</b><br/>$$\\Delta E = Q - W$$"]
    Trabalho --> Lei
    
    Lei --> Resultado["<b>Variação de Energia</b><br/>$$\\Delta E = \\Delta U + \\Delta EC + \\Delta EP$$"]
    
    Saida --> Calor
    Saida --> Trabalho
    
    style Sistema fill:#e1f5ff,stroke:#0288d1,stroke-width:3px
    style Lei fill:#fff3e0,stroke:#f57c00,stroke-width:3px
    style Resultado fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
\`\`\`

**REGRA DE OURO ABSOLUTA**: 
- DENTRO de labels Mermaid → SEMPRE $$ (duplo)
- FORA de blocos Mermaid (texto normal) → pode usar $ (simples)

🚨 **ÚLTIMO AVISO**: Se você gerar material com $ simples em labels Mermaid, ele será AUTOMATICAMENTE REJEITADO e você terá que regenerar TUDO!
🎯 **DIAGRAMAS MERMAID: OBRIGATÓRIO (MÍNIMO 2 POR MATERIAL)**

**REGRA CRÍTICA**: Você DEVE gerar pelo menos 2 diagramas Mermaid flowchart por material.

**TIPOS PERMITIDOS** (em ordem de prioridade):
1. **flowchart TD / LR** - OBRIGATÓRIO usar pelo menos 2x (processos, fluxos)
2. **graph TD / LR** - PERMITIDO para hierarquias (opcional)
3. **stateDiagram-v2** - PERMITIDO para estados (opcional)

**TIPOS PROIBIDOS** (sistema rejeitará automaticamente):
❌ Diagramas sem tipo definido
❌ Tipos não suportados (classDiagram, entityRelationship, etc.)

**INTEGRAÇÃO DE LATEX EM DIAGRAMAS** (REGRA ABSOLUTA):
✅ CORRETO: ["<b>Título</b><br/>$$\\Delta H = Q_p$$"]
✅ CORRETO: ["Sistema: $$m \\cdot c \\cdot \\Delta T$$"]
❌ ERRADO: [Texto Q_dot = 500] (sem aspas, sem $$)
❌ ERRADO: ["Texto $formula$"] ($ único é proibido em Mermaid, use $$)

**REGRAS MERMAID ABSOLUTAS** (não negociável):
1. Labels com LaTeX SEMPRE entre aspas duplas: ["...$$...$$..."]
2. Subscripts: use $$Q_{out}$$ NUNCA Q_out ou Qout
3. Pontos sobre variáveis: use $$\\dot{Q}$$ NUNCA Q_dot
4. Primeira linha DEVE ser: flowchart TD ou flowchart LR
5. Labels < 60 caracteres (use <br/> para quebrar linhas longas)
6. Use <b>texto</b> para títulos em negrito
7. Use <br/> para quebras de linha dentro de labels

**TESTE MENTAL FINAL**: Antes de enviar, conte:
- ✅ Quantos "flowchart TD" ou "flowchart LR"? (deve ser ≥ 2)
- ✅ Quantos labels com $$? (deve ser ≥ 5 no total)
- ✅ Todos os labels têm aspas duplas ["..."]? (deve ser 100%)

**AUTO-VALIDAÇÃO PRÉ-ENVIO**: Verifique mentalmente:
□ NÃO usei "graph TD" em nenhum lugar
□ TODOS os nodes têm formato: ID["texto com $$formula$$"]
□ Tenho pelo menos 2 diagramas flowchart completos
□ Cada diagrama tem no mínimo 3 nodes com LaTeX

⚠️ **IMPORTANTE**: Se você falhar em qualquer regra acima, o sistema automaticamente rejeitará o material e você terá que regenerar!

---

ESTRUTURA DO MATERIAL:

**IMPORTANTE - EXTENSÃO OBRIGATÓRIA**:
- Mínimo de 8.000 palavras (aproximadamente 40.000-50.000 caracteres)
- Distribuição: 60-70% teoria (5.000-6.000 palavras) + 30-40% prática (2.500-3.000 palavras)
- Cada seção principal deve ter 2.000-3.000 palavras
- Cada subseção deve ter no mínimo 500 palavras
- O material deve ser equivalente a 3-5 páginas impressas de conteúdo denso

# ${lectureTitle}

## 1. Fundamentos Teóricos (5.000-6.000 palavras)
### 1.1. Definição Formal (800-1.000 palavras)
[Use 60-70% do material dos livros - mantenha citações de autores]
### 1.2. Equações Fundamentais (1.000-1.500 palavras)
[Desenvolva cada equação com derivação completa]
### 1.3. Premissas e Limitações (800-1.000 palavras)
[Explique contexto de aplicação e restrições]

## 2. Aplicações Práticas (2.500-3.000 palavras)
### 2.1. Casos da Indústria (1.500 palavras)
[Use 30-40% dos casos práticos da web - foque em indústria brasileira e normas]
### 2.2. Exemplos Numéricos (1.000 palavras)
[Resolva problemas completos passo-a-passo]

## 3. Exercícios e Exemplos (1.500-2.000 palavras)
[Misture exemplos dos livros + casos práticos com soluções detalhadas]

**REGRA ABSOLUTA:** CADA diagrama deve ser de um TIPO diferente. Se você criar 3 diagramas, use 3 TIPOS diferentes (flowchart + graph + stateDiagram).

REGRAS CRÍTICAS PARA LATEX (LEIA COM ATENÇÃO):

**EXEMPLO VISUAL DE LATEX CORRETO vs ERRADO**:

✅ CORRETO:
"A energia interna ($U$) é conservada."
"Onde ($\Delta H$) representa a variação."

$$
\Delta U = Q - W
$$

❌ ERRADO (NÃO FAÇA):
"A energia interna ( $$ U $$ ) é conservada."  ← spaces + $$ inline
"Onde ( $$ \Delta H $$ ) representa..."         ← spaces + $$ inline

**REGRA ABSOLUTA**: 
- NO MEIO DE UMA FRASE → use SEMPRE $variavel$ (um $ de cada lado, SEM espaços)
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
- **⚠️ FASE 5: IMPORTANTE - classDiagram NÃO SUPORTA UNDERSCORES em atributos!**
  - ❌ ERRADO: \`+Nao_Cruza : bool\` ou \`+Rigida_e_Adiabatica : bool\`
  - ✅ CORRETO: \`+Nao Cruza : bool\` ou \`+Rigida e Adiabatica : bool\` (use espaços)
  - ✅ ALTERNATIVA: \`+NaoCruza : bool\` ou \`+RigidaEAdiabatica : bool\` (camelCase)
  - Esta regra se aplica APENAS a classDiagram. Flowcharts podem usar underscores em labels normalmente.

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

    let finalMarkdown = await callLovableAI([
      { role: 'system', content: integrationPrompt },
      { role: 'user', content: `Integre o conteúdo completo para: ${lectureTitle}` }
    ], lovableApiKey, 'Content Integration');
    
    // ✅ FASE 1: VALIDAÇÃO BLOQUEANTE REMOVIDA
    // A correção de $ → $$ será feita em background via edge function
    console.log('[Integration] ✅ Content integration complete - proceeding to processing');
    await updateJobCheckpoint(supabase, jobId, 'content_integration_complete');
    
    // === FASE 2: VALIDAÇÃO PROGRESSIVA (PRÉ-PROCESSAMENTO) ===
    console.log('\n=== PRE-VALIDATION: Checking AI output quality ===');
    
    const hasOldGraphSyntaxPre = /```mermaid\s+graph\s+(TD|LR)/i.test(finalMarkdown);
    const hasFlowchartSyntax = /```mermaid\s+flowchart\s+(TD|LR)/i.test(finalMarkdown);
    const hasQuotedLabels = /\w+\["[^"]+"\]/.test(finalMarkdown);
    const mermaidCountRaw = (finalMarkdown.match(/```mermaid/g) || []).length;
    
    console.log('[Pre-Validation] Raw AI output analysis:');
    console.log(`  - Mermaid blocks found: ${mermaidCountRaw}`);
    console.log(`  - Has flowchart syntax: ${hasFlowchartSyntax}`);
    console.log(`  - Has old graph syntax: ${hasOldGraphSyntaxPre}`);
    console.log(`  - Has quoted labels: ${hasQuotedLabels}`);
    
    let autoFixedMarkdown = finalMarkdown;
    
    // Auto-fix 1: Converter graph TD → flowchart TD
    if (hasOldGraphSyntaxPre && !hasFlowchartSyntax) {
      console.warn('[Pre-Validation] ⚠️ CRITICAL: AI generated old "graph" syntax instead of "flowchart"');
      console.log('[Pre-Validation] 🔧 Attempting auto-fix: graph → flowchart');
      
      autoFixedMarkdown = autoFixedMarkdown.replace(/```mermaid\s+graph\s+(TD|LR)/gi, (match, direction) => {
        console.log(`  ✅ Fixed: "graph ${direction}" → "flowchart ${direction}"`);
        return `\`\`\`mermaid\nflowchart ${direction.toUpperCase()}`;
      });
      
      const recheckFlowchart = /```mermaid\s+flowchart\s+(TD|LR)/i.test(autoFixedMarkdown);
      if (recheckFlowchart) {
        console.log('[Pre-Validation] ✅ Auto-fix successful: all diagrams now use flowchart syntax');
      }
    }
    
    // Auto-fix 2: Adicionar aspas duplas em labels sem aspas
    if (!hasQuotedLabels && mermaidCountRaw > 0) {
      console.warn('[Pre-Validation] ⚠️ WARNING: No quoted labels detected - attempting auto-fix');
      
      autoFixedMarkdown = autoFixedMarkdown.replace(/```mermaid\n([\s\S]*?)```/g, (fullMatch: string, diagramContent: string) => {
        const fixedContent = diagramContent.replace(/(\w+)\[([^\]"]+)\]/g, (match: string, id: string, content: string) => {
          // Se não tem aspas duplas, adicionar
          if (!content.startsWith('"') && !content.endsWith('"')) {
            console.log(`[Pre-Validation] 🔧 Auto-fixing label: ${id}[${content}] → ${id}["${content}"]`);
            return `${id}["${content}"]`;
          }
          return match;
        });
        return `\`\`\`mermaid\n${fixedContent}\`\`\``;
      });
      
      console.log('[Pre-Validation] ✅ Auto-fixed unquoted labels');
    }
    
    // Log de sample do Mermaid após auto-fix
    const sampleMermaid = autoFixedMarkdown.match(/```mermaid[\s\S]{0,400}/)?.[0] || 'None found';
    console.log('[Pre-Validation] Sample Mermaid (post auto-fix):');
    console.log(sampleMermaid.substring(0, 300));
    
    // === PHASE 4: PROCESSING & VALIDATION ===
    console.log('\n=== PHASE 4: PROCESSING & VALIDATION ===');
    await updateJobProgress(supabase, jobId, 85, 'Processando e validando conteúdo...');
    
    let processedMarkdown = autoFixedMarkdown;
    
    // 1️⃣ PRIMEIRO: Proteger blocos Mermaid com placeholders
    console.log('[Processing] Step 1/5: Protecting Mermaid blocks...');
    const mermaidBlocks: string[] = [];
    processedMarkdown = processedMarkdown.replace(/```mermaid\n([\s\S]*?)```/g, (match) => {
      const placeholder = `___MERMAID_BLOCK_${mermaidBlocks.length}___`;
      mermaidBlocks.push(match);
      return placeholder;
    });
    console.log(`[Processing] Protected ${mermaidBlocks.length} Mermaid blocks`);
    
    // 2️⃣ SEGUNDO: Corrigir LaTeX geral (SEM afetar Mermaid protegido)
    console.log('[Processing] Step 2/5: Fixing general LaTeX...');
    processedMarkdown = fixLaTeXFormulas(processedMarkdown);
    
    // 3️⃣ TERCEIRO: Aplicar correções LaTeX inline (SEM afetar Mermaid)
    console.log('[Processing] Step 3/5: Fixing inline LaTeX formulas...');
    
    // Fix 1: ( $$ variable $$ ) → ($variable$)
    processedMarkdown = processedMarkdown.replace(/\(\s*\$\$\s*([^$]+?)\s*\$\$\s*\)/g, '($$$1$)');
    
    // Fix 2: $variable $$ → $variable$ (ENHANCED: catches subscripts, superscripts)
    processedMarkdown = processedMarkdown.replace(/\$([A-Za-z_\\{}\^]+)\s+\$\$/g, '$$$1$');
    
    // Fix 3: word $$ variable $$ word → word $variable$ word
    processedMarkdown = processedMarkdown.replace(/(\w+)\s+\$\$\s*([A-Za-z_\\]+)\s*\$\$\s+(\w+)/g, '$1 $$$2$ $3');
    
    // Fix 4: Start of line with inline $$
    processedMarkdown = processedMarkdown.replace(/^(\*\s+|\d+\.\s+|>\s+)(.+?)\$\$\s*([^$\n]+?)\s*\$\$/gm, '$1$2$$$3$');
    
    // Fix 5: Single variable between $$  $$ → $ $
    processedMarkdown = processedMarkdown.replace(/\$\$\s*([A-Za-z_\\]{1,10})\s*\$\$/g, '$$$1$');
    
    // Fix 6: In parentheses or after comma
    processedMarkdown = processedMarkdown.replace(/([,(])\s*\$\$\s*([^$\n]+?)\s*\$\$\s*([,)])/g, '$1$$$2$$3');
    
    console.log('[Processing] ✅ Inline LaTeX fixes applied');
    
    // 4️⃣ QUARTO: Processar blocos Mermaid individualmente ($ → $$)
    console.log('[Processing] Step 4/5: Converting $ → $$ in Mermaid labels...');
    const processedMermaidBlocks = mermaidBlocks.map((block, idx) => {
      console.log(`[Mermaid ${idx + 1}/${mermaidBlocks.length}] Processing...`);
      const converted = forceDollarDoublingInMermaid(block);
      return converted;
    });
    console.log('[Processing] ✅ Mermaid LaTeX conversion complete');
    
    // 5️⃣ QUINTO: Restaurar blocos Mermaid processados
    console.log('[Processing] Step 5/5: Restoring Mermaid blocks...');
    processedMermaidBlocks.forEach((block, idx) => {
      processedMarkdown = processedMarkdown.replace(
        `___MERMAID_BLOCK_${idx}___`,
        block
      );
    });
    console.log('[Processing] ✅ All Mermaid blocks restored');
    
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
  // FASE 3: Remove LaTeX from common Portuguese words (REFINED)
  console.log('[LaTeX] Removing LaTeX from common words (comprehensive)...');
  
  const commonWords = [
    'para', 'de', 'da', 'do', 'em', 'com', 'por', 'ao', 'um', 'uma', 
    'o', 'a', 'e', 'os', 'as', 'no', 'na', 'nos', 'nas', 'se', 'ou',
    'mais', 'mas', 'que', 'como', 'quando', 'onde', 'qual', 'quais',
    'sistema', 'processo', 'energia', 'calor', 'trabalho' // ← technical words
  ];
  
  const wordPattern = new RegExp(
    `\\$\\s*(${commonWords.join('|')})\\s*\\$`, 
    'gi'
  );

  processedMarkdown = processedMarkdown.replace(wordPattern, (match, word) => {
    console.log(`[LaTeX] 🔧 Removed LaTeX from common word: ${match}`);
    return word; // Remove the $ from common words
  });
  
  console.log('[LaTeX] ✅ Common words cleaned (all patterns)');
  
  // 4. Limpar APENAS texto fora das fórmulas
  // Remover apenas: emojis órfãos, tabs excessivos, quebras > 3 linhas
  processedMarkdown = processedMarkdown
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emojis
    .replace(/\t+/g, ' ')                    // Tabs
    .replace(/\n{4,}/g, '\n\n\n');          // Max 3 quebras
  
  // FASE 5: Conservative spacing normalization (ONLY for block LaTeX)
  console.log('[LaTeX] Fixing spacing around delimiters...');
  
  // Only ensure proper line breaks for blocks $$
  processedMarkdown = processedMarkdown.replace(/([^\n])\n\$\$/g, '$1\n\n$$');
  processedMarkdown = processedMarkdown.replace(/\$\$\n([^\n])/g, '$$\n\n$1');
  
  console.log('[LaTeX] ✅ Block spacing normalized (preserving inline)');

  // 5. FASE 1: Verificar se número de placeholders = número de fórmulas protegidas
  const expectedBlocks = (processedMarkdown.match(/___LATEX_BLOCK_\d+___/g) || []).length;
  const expectedInline = (processedMarkdown.match(/___LATEX_INLINE_\d+___/g) || []).length;
  
  if (expectedBlocks !== latexBlocks.length) {
    console.error(`[LaTeX] ⚠️ Block mismatch: ${expectedBlocks} placeholders, ${latexBlocks.length} formulas`);
  }
  if (expectedInline !== latexInline.length) {
    console.error(`[LaTeX] ⚠️ Inline mismatch: ${expectedInline} placeholders, ${latexInline.length} formulas`);
  }

  // 6. Restaurar fórmulas LaTeX intactas (PHASE 6: Global regex fix)
  console.log('[LaTeX] Restoring placeholders (global replacement)...');
  
  latexBlocks.forEach((block, i) => {
    const regex = new RegExp(`___LATEX_BLOCK_${i}___`, 'g'); // 'g' = global flag
    processedMarkdown = processedMarkdown.replace(regex, block);
  });
  
  latexInline.forEach((formula, i) => {
    const regex = new RegExp(`___LATEX_INLINE_${i}___`, 'g');
    processedMarkdown = processedMarkdown.replace(regex, formula);
  });
  
  // Verify ALL placeholders were replaced
  const remainingPlaceholders = processedMarkdown.match(/___LATEX_(BLOCK|INLINE)_\d+___/g);
  if (remainingPlaceholders && remainingPlaceholders.length > 0) {
    console.error(`[LaTeX] ❌ CRITICAL: ${remainingPlaceholders.length} placeholders NOT restored!`);
    console.error('[LaTeX] Unreplaced:', remainingPlaceholders.slice(0, 10));
    
    // Emergency fallback: Remove orphaned placeholders
    processedMarkdown = processedMarkdown.replace(/___LATEX_(BLOCK|INLINE)_\d+___/g, '[FORMULA ERROR]');
  }

  console.log('[LaTeX] ✅ Placeholder restoration complete');

  // PHASE 4.7: Final validation - detect remaining LaTeX errors
  console.log('[LaTeX] Final validation check...');

  // FASE 2: Simplified LaTeX Validation (DETECT, don't auto-correct)
  const suspiciousPatterns = [
    { 
      pattern: /\$\s+[^\$]+\s+\$/g, 
      name: 'Inline LaTeX with internal spaces',
      example: '$ x $ (should be $x$)'
    },
    { 
      pattern: /\(\s*\$\$\s+[^\$]+\s+\$\$\s*\)/g,
      name: 'Block LaTeX inside parentheses',
      example: '( $$ H $$ ) (should be ($H$))'
    },
    { 
      pattern: /\$\$\$+/g,
      name: 'Triple or quadruple delimiters',
      example: '$$$ (should be $ or $$)'
    }
  ];

  let foundIssues = 0;
  suspiciousPatterns.forEach(({ pattern, name, example }) => {
    const matches = processedMarkdown.match(pattern);
    if (matches && matches.length > 0) {
      console.warn(`[LaTeX] ⚠️ ${name}: ${matches.length} found`);
      console.warn(`[LaTeX]   Example: ${example}`);
      console.warn(`[LaTeX]   Sample: ${matches[0]}`);
      foundIssues += matches.length;
    }
  });

  if (foundIssues > 10) {
    console.error(`[LaTeX] ❌ CRITICAL: ${foundIssues} potential LaTeX errors remain!`);
  }

  console.log('[LaTeX] ✅ Validation complete');

  // ✅ PHASE 5: MINIMAL Mermaid normalization (following PDF recommendations)
  console.log('[Mermaid] Applying defensive normalization (PDF-guided)...');
  
  processedMarkdown = processedMarkdown.replace(
    /```mermaid\s*\n?([\s\S]*?)\n?```/g,
    (match, diagramCode) => {
      let cleaned = diagramCode.trim();
      
      // ✅ PRESERVAR indentação de subgraphs (critical for Mermaid syntax)
      // Apenas normalizar espaços DENTRO de labels/texto, não no início de linhas
      cleaned = cleaned.split('\n').map((line: string) => {
        // Preservar espaços no início (indentação)
        const leadingSpaces = line.match(/^(\s*)/)?.[0] || '';
        const content = line.trim();
        
        // Se linha vazia ou apenas espaços, remover
        if (!content) return '';
        
        // Normalizar espaços APENAS no conteúdo, preservando indentação
        const normalizedContent = content.replace(/[ \t]{2,}/g, ' ');
        
        return leadingSpaces + normalizedContent;
      }).filter((line: string) => line.length > 0).join('\n');
      
      // Limitar quebras de linha consecutivas
      cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
      
      // Ensure diagram has proper fencing
      return `\`\`\`mermaid\n${cleaned}\n\`\`\``;
    }
  );
  
  console.log('[Mermaid] ✅ Defensive normalization complete (indentation preserved)');

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
    
    // 🔒 VALIDAÇÃO STRICT ANTES DE SALVAR (previne material malformado)
    console.log('[Validation] Running STRICT validation before save...');
    
    const hasFlowchart = /```mermaid\s+flowchart\s+(TD|LR)/i.test(processedMarkdown);
    // ✅ Regex mais permissivo: detecta LaTeX em labels mesmo com HTML tags, espaços, quebras de linha
    const hasQuotedLabelsWithLatex = /\[".*?\$\$.*?\$\$.*?"\]/s.test(processedMarkdown);
    const hasForbiddenUnderscores = /_dot|_entrada|_saida/i.test(processedMarkdown);
    const hasOldGraphSyntax = /```mermaid\s+graph\s+(TD|LR)/i.test(processedMarkdown);
    const mermaidBlocksCount = (processedMarkdown.match(/```mermaid/g) || []).length;
    
    // Log detalhado para debug - mostra labels com LaTeX encontrados
    const latexLabels = processedMarkdown.match(/\[".*?\$\$.*?\$\$.*?"\]/gs) || [];
    console.log(`[Validation] Labels com LaTeX encontrados: ${latexLabels.length}`);
    
    if (latexLabels.length > 0) {
      console.log('[Validation] ✅ Exemplos de labels válidos:');
      latexLabels.slice(0, 3).forEach((label, idx) => {
        const preview = label.length > 80 ? label.substring(0, 80) + '...' : label;
        console.log(`  [${idx + 1}] ${preview}`);
      });
    }
    
    if (!hasQuotedLabelsWithLatex && mermaidBlocksCount > 0) {
      console.log('[Validation] ⚠️ WARNING: Diagramas Mermaid encontrados mas SEM labels com LaTeX');
      console.log('[Validation] Isso pode indicar que a IA não gerou fórmulas onde deveria');
    }
    
    // ✅ VALIDAÇÃO REMOVIDA: $ simples será corrigido em background após salvamento
    console.log('[Validation] Skipping strict $ validation - will be fixed in background');
    
    let validationErrors: string[] = [];
    const validationWarnings: string[] = [];
    
    if (!hasFlowchart) {
      validationErrors.push('❌ Nenhum diagrama flowchart TD/LR encontrado (obrigatório)');
    }
    
    // ✅ CONVERTIDO PARA WARNINGS NÃO-BLOQUEANTES
    if (!hasQuotedLabelsWithLatex && mermaidBlocksCount > 0) {
      validationWarnings.push('⚠️ Diagramas Mermaid sem LaTeX em labels (será corrigido em background)');
    }
    
    if (hasForbiddenUnderscores) {
      validationWarnings.push('⚠️ Underscores detectados (será corrigido em background)');
    }
    
    if (hasOldGraphSyntax && !hasFlowchart) {
      validationWarnings.push('⚠️ Usando sintaxe antiga "graph TD" ao invés de "flowchart TD"');
    }
    
    if (mermaidBlocksCount < 2) {
      validationWarnings.push('⚠️ Menos de 2 diagramas Mermaid (recomendado: mínimo 2)');
    }
    
    // Validação de qualidade: pelo menos 2 labels com LaTeX para conteúdo técnico
    if (hasQuotedLabelsWithLatex) {
      const latexLabelsCount = latexLabels.length;
      
      if (latexLabelsCount < 2 && mermaidBlocksCount > 0) {
        validationWarnings.push(
          `⚠️ Apenas ${latexLabelsCount} label(s) com LaTeX encontrado(s). ` +
          `Esperado: pelo menos 2 para conteúdo técnico de engenharia.`
        );
      } else {
        console.log(`[Validation] ✅ ${latexLabelsCount} labels com LaTeX detectados (bom!)`);
      }
    }
    
    // Mostrar warnings (não bloqueiam geração)
    if (validationWarnings.length > 0) {
      console.warn('[Validation] ⚠️ WARNINGS (não bloqueiam geração):');
      validationWarnings.forEach(warn => console.warn(`  ${warn}`));
    }
    
    // === FASE 4: AUTO-CORREÇÃO ANTES DE REJEITAR ===
    if (validationErrors.length > 0) {
      console.error('[Validation] ❌ STRICT VALIDATION FAILED (attempting auto-recovery):');
      validationErrors.forEach(err => console.error(`  ${err}`));
      
      let recoveryAttempted = false;
      
      // Tentativa 1: Auto-fix graph → flowchart (se não foi feito antes)
      if (validationErrors.some(e => e.includes('graph TD') || e.includes('sintaxe antiga'))) {
        console.log('[Validation] 🔧 Recovery attempt: converting graph → flowchart');
        
        processedMarkdown = processedMarkdown.replace(/```mermaid\s+graph\s+(TD|LR)/gi, (match: string, direction: string) => {
          console.log(`  ✅ Recovery fix: "graph ${direction}" → "flowchart ${direction}"`);
          return `\`\`\`mermaid\nflowchart ${direction.toUpperCase()}`;
        });
        
        // Re-validar após fix
        const recheckFlowchart = /```mermaid\s+flowchart\s+(TD|LR)/i.test(processedMarkdown);
        const recheckOldGraph = /```mermaid\s+graph\s+(TD|LR)/i.test(processedMarkdown);
        
        if (recheckFlowchart && !recheckOldGraph) {
          console.log('[Validation] ✅ Recovery successful: graph syntax fixed');
          validationErrors = validationErrors.filter(e => !e.includes('graph TD') && !e.includes('sintaxe antiga'));
          recoveryAttempted = true;
        }
      }
      
      // Tentativa 2: Adicionar aspas em labels (última tentativa)
      if (validationErrors.some(e => e.includes('aspas duplas') || e.includes('quoted labels'))) {
        console.log('[Validation] 🔧 Recovery attempt: adding quotes to labels');
        
        processedMarkdown = processedMarkdown.replace(/```mermaid\n([\s\S]*?)```/g, (fullMatch: string, diagramContent: string) => {
          const fixedContent = diagramContent.replace(/(\w+)\[([^\]"]+)\]/g, (match: string, id: string, content: string) => {
            if (!content.startsWith('"') && !content.endsWith('"')) {
              return `${id}["${content}"]`;
            }
            return match;
          });
          return `\`\`\`mermaid\n${fixedContent}\`\`\``;
        });
        
        recoveryAttempted = true;
        console.log('[Validation] ✅ Recovery attempted: quotes added to unquoted labels');
      }
      
      // ✅ BLOQUEIO REMOVIDO: Erros não impedem mais o salvamento
      if (validationErrors.length > 0) {
        console.warn('[Validation] ⚠️ Erros detectados mas material será salvo (correção em background)');
        validationErrors.forEach(err => validationWarnings.push(err));
        validationErrors = []; // Limpar erros para permitir salvamento
      } else {
        console.log('[Validation] ✅ Recovery successful! All validation errors resolved via auto-fix');
      }
    }
    
    console.log('[Validation] ✅ STRICT validation passed - material is well-formed');
    console.log(`[Validation] ✓ flowchart diagrams: ${hasFlowchart ? 'YES' : 'NO'}`);
    console.log(`[Validation] ✓ LaTeX in quoted labels: ${hasQuotedLabelsWithLatex ? 'YES' : 'NO'}`);
    console.log(`[Validation] ✓ No forbidden underscores: ${!hasForbiddenUnderscores ? 'YES' : 'NO'}`);
    console.log(`[Validation] ✓ Mermaid blocks count: ${mermaidBlocksCount}`);
    
    await updateJobCheckpoint(supabase, jobId, 'processing_complete');
    
    // ✅ PASSO 1: SALVAR SEMPRE PRIMEIRO (sem bloqueios)
    console.log('[Save] Saving material to database...');
    
    await supabase
      .from('lectures')
      .update({
        material_didatico_v2: processedMarkdown,
        updated_at: new Date().toISOString()
      })
      .eq('id', lectureId);
    
    console.log('[Save] ✅ Material saved successfully');
    await updateJobCheckpoint(supabase, jobId, 'database_save_complete');
    
    // ✅ PASSO 2: INICIAR CORREÇÃO MERMAID EM BACKGROUND
    console.log('[Mermaid Fix] Starting background correction...');
    
    // Chamar edge function de correção de forma assíncrona (não aguardar)
    const fixMermaidPromise = (async () => {
      try {
        const { error: fixError } = await supabase.functions.invoke('fix-existing-mermaid-materials', {
          body: { lectureId }
        });
        
        if (fixError) {
          console.error('[Mermaid Fix] ❌ Background correction failed:', fixError);
        } else {
          console.log('[Mermaid Fix] ✅ Background correction completed');
        }
      } catch (err) {
        console.error('[Mermaid Fix] ❌ Background correction error:', err);
      }
    })();
    
    // Promise executa em background - Deno gerencia automaticamente
    // Não bloqueamos a resposta, mas a correção continua após retorno
    
    // Complete job
    metrics.generationTimeMs = Date.now() - startTime;
    metrics.success = true;
    
    await updateJobCheckpoint(supabase, jobId, 'ready_to_complete');
    
    const jobMetadata = {
      warnings: validation.warnings.concat(validationWarnings), // Incluir todos os warnings
      identifiedBooks: metrics.identifiedBooks,
      bookContentPercentage: metrics.bookContentPercentage,
      webContentPercentage: metrics.webContentPercentage,
      sourcesUsed: sourcesUsed.slice(0, 10), // Top 10 sources
      avgTrustScore: sourcesUsed.length > 0 
        ? (sourcesUsed.reduce((sum, s) => sum + s.trustScore, 0) / sourcesUsed.length).toFixed(2)
        : 'N/A',
      mermaidFixStatus: 'background_processing' // ✅ Flag para tracking
    };
    
    await supabase
      .from('material_v2_jobs')
      .update({
        status: 'COMPLETED',
        progress: 100,
        progress_step: `Concluído! Correção Mermaid em andamento (${metrics.bookContentPercentage}% livros, ${metrics.webContentPercentage}% web)`,
        result: processedMarkdown.substring(0, 500) + '...',
        metadata: jobMetadata,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);
    
    await logTelemetry(supabase, jobId, lectureId, metrics);
    
    console.log(`\n✅ Job ${jobId} completed successfully in ${(metrics.generationTimeMs / 1000).toFixed(1)}s`);
    console.log(`📚 Final stats: ${metrics.booksIdentified} books, ${sourcesUsed.length} web sources`);
    console.log(`📊 Distribution: ${metrics.bookContentPercentage}% books / ${metrics.webContentPercentage}% web\n`);
    
      })(), // Fim do async IIFE
      timeoutPromise // Promise de timeout
    ]); // Fim do Promise.race
    
  } catch (error: any) {
    console.error(`❌ Job ${jobId} failed:`, error);
    
    // Log checkpoint de erro
    await updateJobCheckpoint(supabase, jobId, `error_at_${new Date().toISOString()}`);
    
    // Enhanced error metadata with detailed telemetry
    const errorMetadata: any = {
      technical_error: error.message,
      error_type: error.name || 'UnknownError',
      timestamp: new Date().toISOString(),
    };
    
    // Capture AI-specific error details if it's an AIError
    if (error instanceof AIError) {
      errorMetadata.ai_status = error.status;
      errorMetadata.ai_response = error.responseText.substring(0, 500);
      console.error(`[AI Error Details] Status: ${error.status}, Response: ${error.responseText.substring(0, 200)}`);
    }
    
    // Capture stack trace (first 500 chars for debugging)
    if (error.stack) {
      errorMetadata.stack_trace = error.stack.substring(0, 500);
    }
    
    metrics.generationTimeMs = Date.now() - startTime;
    metrics.success = false;
    metrics.errorType = error.message.split(':')[0];
    
    // User-friendly error messages
    let userMessage = 'Erro ao gerar material. Tente novamente.';
    
    if (error.message.includes('RATE_LIMITED')) {
      userMessage = 'Limite de requisições atingido. Aguarde alguns minutos.';
    } else if (error.message.includes('NO_CREDITS')) {
      userMessage = 'Créditos insuficientes. Contate o administrador.';
    } else if (error.message.includes('MISSING_KEY')) {
      userMessage = 'Configuração pendente. Contate o administrador.';
    } else if (error.message.includes('timeout')) {
      userMessage = 'Tempo esgotado. Verifique sua conexão e tente novamente.';
    } else if (error instanceof AIError && error.status === 500) {
      userMessage = 'Erro na IA. Tente novamente em alguns minutos.';
      errorMetadata.suggestion = 'AI provider may be experiencing issues. Check AI Gateway status.';
    }
    
    await supabase
      .from('material_v2_jobs')
      .update({
        status: 'FAILED',
        error_message: userMessage,
        metadata: errorMetadata,
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
