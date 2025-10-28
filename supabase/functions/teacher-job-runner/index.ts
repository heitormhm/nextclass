import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function sanitizeJSON(text: string): string {
  return text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim();
}

// Validate Mermaid syntax
function validateMermaidDiagrams(materialDidatico: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const mermaidBlocks = materialDidatico.match(/```mermaid\n([\s\S]*?)```/g) || [];
  
  console.log(`[Validation] Found ${mermaidBlocks.length} Mermaid blocks`);
  
  mermaidBlocks.forEach((block, index) => {
    const code = block.replace(/```mermaid\n|```$/g, '').trim();
    
    // Check 1: Must start with valid diagram type
    if (!code.match(/^(graph|flowchart|sequenceDiagram|stateDiagram-v2|classDiagram)/)) {
      errors.push(`Block ${index + 1}: Invalid diagram type`);
    }
    
    // Check 2: No unicode arrows
    if (code.match(/[→←↔⇒⇐⇔]/)) {
      errors.push(`Block ${index + 1}: Contains unicode arrows (→←↔⇒⇐⇔) - use ASCII (-->, <--, <-->)`);
    }
    
    // Check 3: No problematic chars in labels
    const labelsMatch = code.match(/\[([^\]]+)\]/g);
    if (labelsMatch) {
      labelsMatch.forEach(label => {
        if (label.match(/[Δ∆αβγθλμπσω]/)) {
          errors.push(`Block ${index + 1}: Greek letters in label "${label}" - use spelled names (Delta, Alpha, etc.)`);
        }
      });
    }
    
    // Check 4: Node IDs must be alphanumeric
    const nodeIdMatch = code.match(/^\s*([A-Z0-9_]+)\[/gm);
    if (nodeIdMatch) {
      nodeIdMatch.forEach(nodeId => {
        const id = nodeId.trim().replace(/\[.*/, '');
        if (id.match(/[^A-Z0-9]/)) {
          errors.push(`Block ${index + 1}: Invalid node ID "${id}" - use only A-Z and 0-9`);
        }
      });
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Preprocess Mermaid blocks before saving (add stable keys, validate)
async function preprocessMermaidBlocks(markdown: string, jobId: string): Promise<string> {
  const mermaidBlocks = markdown.match(/```mermaid\n([\s\S]*?)```/g) || [];
  
  console.log(`[Job ${jobId}] 🎨 Preprocessing ${mermaidBlocks.length} Mermaid blocks`);
  
  let processedMarkdown = markdown;
  
  for (let i = 0; i < mermaidBlocks.length; i++) {
    const originalBlock = mermaidBlocks[i];
    const code = originalBlock.replace(/```mermaid\n|```$/g, '').trim();
    
    // Validar sintaxe
    const validation = validateMermaidDiagrams(originalBlock);
    
    if (!validation.valid) {
      console.warn(`[Job ${jobId}] ⚠️ Mermaid block ${i + 1} invalid:`, validation.errors);
      
      // Substituir por placeholder visual
      const placeholder = `\n\n<div class="bg-amber-50 border-2 border-amber-300 rounded-lg p-4 my-4">
  <div class="flex items-center gap-2 mb-2">
    <span class="text-2xl">📊</span>
    <strong class="text-amber-900">Diagrama Visual</strong>
  </div>
  <p class="text-sm text-amber-700">Este diagrama está temporariamente indisponível e será adicionado em breve.</p>
</div>\n\n`;
      
      processedMarkdown = processedMarkdown.replace(originalBlock, placeholder);
    } else {
      console.log(`[Job ${jobId}] ✅ Mermaid block ${i + 1} validated`);
      
      // Adicionar hash estável para key React
      const stableHash = `mermaid-${i}-${code.substring(0, 50).replace(/[^a-zA-Z0-9]/g, '')}`;
      processedMarkdown = processedMarkdown.replace(
        originalBlock,
        `\n\n<!-- MERMAID:${stableHash} -->\n${originalBlock}\n<!-- /MERMAID -->\n\n`
      );
    }
  }
  
  console.log(`[Job ${jobId}] ✅ Mermaid preprocessing complete`);
  return processedMarkdown;
}

// ============================================================================
// FASE 1 (REFATORADA): Sanitização Segura de JSON - Object-Based
// ============================================================================
function finalContentSanitization(structuredContent: any, jobId: string): any {
  console.log(`[Job ${jobId}] [Safe Sanitization] 🛡️ Validating structured content...`);
  
  try {
    // Approach: trabalhar com o objeto diretamente, não com string
    const sanitized = safeSanitizeObject(structuredContent, jobId);
    
    // Validar que ainda é JSON válido
    const testStr = JSON.stringify(sanitized);
    JSON.parse(testStr); // Vai lançar erro se inválido
    
    console.log(`[Job ${jobId}] [Safe Sanitization] ✅ Content validated successfully`);
    return sanitized;
    
  } catch (err) {
    console.error(`[Job ${jobId}] [Safe Sanitization] ❌ Validation failed:`, err);
    throw new Error(`Safe sanitization failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

/**
 * FASE 1: Sanitização recursiva baseada em objetos (preserva estrutura JSON)
 */
function safeSanitizeObject(obj: any, jobId: string, depth: number = 0): any {
  if (depth > 50) {
    console.warn(`[Job ${jobId}] Max recursion depth reached`);
    return obj;
  }
  
  // Se é string, sanitizar conteúdo
  if (typeof obj === 'string') {
    return sanitizeTextSafely(obj);
  }
  
  // Se é array, sanitizar cada elemento
  if (Array.isArray(obj)) {
    return obj.map(item => safeSanitizeObject(item, jobId, depth + 1));
  }
  
  // Se é objeto, sanitizar cada propriedade
  if (obj !== null && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = safeSanitizeObject(value, jobId, depth + 1);
    }
    return sanitized;
  }
  
  // Outros tipos (number, boolean, null) passam direto
  return obj;
}

/**
 * Sanitiza texto sem quebrar estrutura JSON
 */
function sanitizeTextSafely(text: string): string {
  if (!text || text.length === 0) return text;
  
  let cleaned = text;
  
  // 1. Remover placeholders LaTeX corrompidos
  cleaned = cleaned.replace(/___LATEX_(DOUBLE|SINGLE)_\d+___/g, '');
  
  // 2. Remover padrões de $ + números corrompidos (ex: "12$ ", "$ 34")
  cleaned = cleaned.replace(/\d+\s*\$\s*\d*/g, '');
  cleaned = cleaned.replace(/\$\s*\d+\s*/g, '');
  
  // 3. Remover variáveis isoladas APENAS se fora de contexto LaTeX
  // Padrão: " e " ou " a " sem estar em $$...$$
  const parts = cleaned.split('$$');
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) { // Partes fora de $$
      // Remover variáveis isoladas de 1 letra
      parts[i] = parts[i].replace(/\s([a-z])\s+([a-z])\s+([a-z])\s/gi, ' ');
    }
  }
  cleaned = parts.join('$$');
  
  // 4. Garantir que comandos LaTeX estão dentro de $$
  // Detectar \command fora de $$ e envolver
  const latexCommands = /\\(Delta|sum|int|frac|times|cdot|alpha|beta|gamma|theta|lambda|pi|sigma)/g;
  const outsideLatex = cleaned.split('$$').filter((_, i) => i % 2 === 0).join(' ');
  
  if (latexCommands.test(outsideLatex)) {
    // Envolver comandos soltos
    cleaned = cleaned.replace(
      /([^$])(\\(?:Delta|sum|int|frac|times|cdot|alpha|beta|gamma|theta|lambda|pi|sigma)(?:\{[^}]*\}|\[[^\]]*\])*)/g,
      '$1$$$$2$$'
    );
  }
  
  // 5. Limpar espaços excessivos (sem afetar LaTeX)
  cleaned = cleaned.replace(/\s{3,}/g, '  ');
  
  return cleaned.trim();
}

// Fix common LaTeX errors in markdown content
async function fixLatexErrors(markdown: string, jobId: string): Promise<string> {
  console.log(`[Job ${jobId}] 🔧 Fixing LaTeX errors...`);
  
  let fixed = markdown;
  
  // Fix 1: CdotB malformed → C × B
  fixed = fixed.replace(/C\s*dot\s*B/gi, 'C × B');
  fixed = fixed.replace(/([A-Z])\\cdot([A-Z])/g, '$1 \\times $2');
  
  // Fix 2: Multiplication with \cdot → \times (unless it's vector dot product)
  fixed = fixed.replace(/(\d+)\s*\\cdot\s*(\d+)/g, '$1 \\times $2');
  
  // Fix 3: Formulas without $$ → add delimiters
  fixed = fixed.replace(/(?<!\$)\\frac\{([^}]+)\}\{([^}]+)\}(?!\$)/g, '$$\\frac{$1}{$2}$$');
  
  // Fix 4: Ensure proper spacing around inline math
  fixed = fixed.replace(/\$\$([^\$]+)\$\$/g, ' $$\$1$$ ');
  
  console.log(`[Job ${jobId}] ✅ LaTeX errors fixed`);
  return fixed;
}

/**
 * FASE 7: Calcular métricas de qualidade do material gerado
 */
function calculateQualityMetrics(structuredJSON: any, report: string, jobId: string): any {
  console.log(`[Job ${jobId}] [Quality Metrics] 📊 Calculating content quality...`);
  
  // 1. Contar fórmulas LaTeX
  const latexMatches = report.match(/\$\$[^$]+\$\$/g) || [];
  const validLatex = latexMatches.filter(formula => {
    // Verificar se não é placeholder
    return !formula.includes('___LATEX_') && !formula.match(/\d+\$/);
  }).length;
  
  // 2. Contar diagramas Mermaid
  const mermaidBlocks = structuredJSON.conteudo?.filter((b: any) => 
    ['fluxograma', 'diagrama', 'cronograma_gantt'].includes(b.tipo) && b.definicao_mermaid
  ) || [];
  const placeholders = structuredJSON.conteudo?.filter((b: any) => 
    b.tipo === 'caixa_de_destaque' && b.titulo?.includes('Diagrama')
  ) || [];
  
  // 3. Analisar referências
  const referencesBlock = structuredJSON.conteudo?.find((b: any) => 
    b.tipo === 'referencias' || b.titulo?.toLowerCase().includes('referências')
  );
  
  const refText = referencesBlock?.texto || JSON.stringify(referencesBlock?.lista || []);
  const allRefs = refText.match(/https?:\/\/[^\s)]+/g) || [];
  const academicDomains = ['.edu', '.gov', 'scielo', 'ieee', 'springer', 'elsevier', '.ac.uk'];
  const academicRefs = allRefs.filter((ref: string) => 
    academicDomains.some(domain => ref.includes(domain))
  );
  
  const academicPercentage = allRefs.length > 0 
    ? (academicRefs.length / allRefs.length) * 100 
    : 0;
  
  // 4. Contar palavras
  const wordCount = report
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .split(/\s+/)
    .filter(w => w.length > 0).length;
  
  const metrics = {
    latex: {
      total: latexMatches.length,
      valid: validLatex,
      percentage: latexMatches.length > 0 ? (validLatex / latexMatches.length) * 100 : 100
    },
    mermaid: {
      total: mermaidBlocks.length + placeholders.length,
      rendered: mermaidBlocks.length,
      placeholders: placeholders.length,
      percentage: mermaidBlocks.length + placeholders.length > 0
        ? (mermaidBlocks.length / (mermaidBlocks.length + placeholders.length)) * 100
        : 100
    },
    references: {
      total: allRefs.length,
      academic: academicRefs.length,
      percentage: academicPercentage
    },
    content: {
      wordCount,
      meetsMinimum: wordCount >= 3000,
      isIdeal: wordCount >= 4000 && wordCount <= 6000
    },
    overallScore: 0 // Calculado abaixo
  };
  
  // 5. Calcular score geral (0-100)
  metrics.overallScore = Math.round(
    (metrics.latex.percentage * 0.25) +
    (metrics.mermaid.percentage * 0.25) +
    (metrics.references.percentage * 0.30) +
    (metrics.content.meetsMinimum ? 20 : 0)
  );
  
  console.log(`[Job ${jobId}] [Quality Metrics] ✅ Metrics calculated:`, {
    latex: `${validLatex}/${latexMatches.length} (${metrics.latex.percentage.toFixed(0)}%)`,
    mermaid: `${mermaidBlocks.length}/${mermaidBlocks.length + placeholders.length} (${metrics.mermaid.percentage.toFixed(0)}%)`,
    references: `${academicRefs.length}/${allRefs.length} (${academicPercentage.toFixed(0)}%)`,
    score: metrics.overallScore
  });
  
  return metrics;
}

// Helper function to update job progress
async function updateJobProgress(
  supabase: any,
  jobId: string,
  progress: number,
  message: string
) {
  console.log(`[Job ${jobId}] 📊 ${Math.round(progress * 100)}%: ${message}`);
  
  const { error } = await supabase
    .from('teacher_jobs')
    .update({
      progress,
      progress_message: message,
      updated_at: new Date().toISOString()
    })
    .eq('id', jobId);
    
  if (error) {
    console.error(`[Job ${jobId}] ❌ Failed to update progress:`, error);
  }
}

// Helper function to save report to lecture
async function saveReportToLecture(
  supabase: any,
  lectureId: string,
  report: string,
  jobId: string
) {
  const { data: lecture, error: lectureError } = await supabase
    .from('lectures')
    .select('structured_content')
    .eq('id', lectureId)
    .single();
  
  if (lectureError) {
    console.error(`[Job ${jobId}] ❌ Failed to fetch lecture:`, lectureError);
    throw new Error(`Failed to fetch lecture: ${lectureError.message}`);
  }

  const existingContent = lecture?.structured_content || {};

  // ETAPA 1: Preprocess Mermaid blocks (add stable keys, validate)
  console.log(`[Job ${jobId}] 🎨 Starting Mermaid preprocessing...`);
  const preprocessedReport = await preprocessMermaidBlocks(report, jobId);
  
  // ETAPA 1.5: Fix LaTeX errors
  let fixedReport = await fixLatexErrors(preprocessedReport, jobId);
  
  // ✅ FASE 3: Integrar Edge Function fix-latex-formulas
  console.log(`[Job ${jobId}] 🤖 Calling LaTeX AI corrector...`);
  
  try {
    const latexFixResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/fix-latex-formulas`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({
          content: fixedReport,
          jobId: jobId
        })
      }
    );

    if (latexFixResponse.ok) {
      const { correctedContent } = await latexFixResponse.json();
      fixedReport = correctedContent;
      console.log(`[Job ${jobId}] ✅ LaTeX AI correction complete`);
    } else {
      console.warn(`[Job ${jobId}] ⚠️ LaTeX AI correction failed, using regex fallback`);
    }
  } catch (aiError) {
    console.error(`[Job ${jobId}] ❌ LaTeX AI correction error:`, aiError);
    // Continuar com fallback (não bloquear)
  }

  // ETAPA 2: Validate material length (minimum 3000 words, excluding code blocks)
  const materialText = fixedReport.replace(/```[\s\S]*?```/g, ''); // Remove code blocks
  const wordCount = materialText.split(/\s+/).filter(word => word.length > 0).length;

  console.log(`[Job ${jobId}] 📏 Material word count: ${wordCount} words`);

  if (wordCount < 3000) {
    console.warn(`[Job ${jobId}] ⚠️ Material too short: ${wordCount} words (minimum: 3000)`);
    throw new Error(`Material didático muito curto (${wordCount} palavras). Mínimo exigido: 3000 palavras.`);
  }

  if (wordCount < 3500) {
    console.warn(`[Job ${jobId}] ⚠️ Material below ideal length: ${wordCount} words (ideal: 4000-5000)`);
  }

  console.log(`[Job ${jobId}] ✅ Material length validated: ${wordCount} words`);
  
  // ETAPA 3: Convert to structured JSON (for StructuredContentRenderer)
  console.log(`[Job ${jobId}] 🔄 Converting to structured JSON...`);
  let structuredJSON = await convertMarkdownToStructuredJSON(fixedReport, 'Material Didático');
  
  // ✅ FASE 1: SANITIZAÇÃO FINAL DO JSON antes de salvar
  structuredJSON = finalContentSanitization(structuredJSON, jobId);
  
  // ✅ FASE 7: Calcular métricas de qualidade
  const qualityMetrics = calculateQualityMetrics(structuredJSON, fixedReport, jobId);
  
  // ETAPA 4: Save structured JSON
  const { error: updateError } = await supabase
    .from('lectures')
    .update({
      structured_content: {
        ...existingContent,
        material_didatico: structuredJSON,  // ✅ FASE 1: Objeto direto (não stringificar)
        quality_metrics: qualityMetrics    // ✅ FASE 7: Adicionar métricas
      },
      updated_at: new Date().toISOString()
    })
    .eq('id', lectureId);
  
  if (updateError) {
    console.error(`[Job ${jobId}] ❌ Failed to update lecture:`, updateError);
    throw new Error(`Failed to update lecture: ${updateError.message}`);
  }
  
  console.log(`[Job ${jobId}] ✅ Preprocessed report saved to lecture`);
}

// Process deep search for lecture material
async function processLectureDeepSearch(job: any, supabase: any, lovableApiKey: string) {
  const { lectureId, lectureTitle, tags, userId, teacherName } = job.input_payload;
  
  if (!lectureId || !lectureTitle) {
    throw new Error('Invalid job payload: missing required fields (lectureId or lectureTitle)');
  }
  
  console.log(`[Job ${job.id}] 🚀 Deep Search starting for lecture: ${lectureTitle}`);
  console.log(`[Job ${job.id}] 👤 Teacher name: ${teacherName || 'Not provided'}`);

  const braveApiKey = Deno.env.get('BRAVE_SEARCH_API_KEY');
  if (!braveApiKey) {
    await updateJobProgress(supabase, job.id, 0, 'Erro: BRAVE_SEARCH_API_KEY não configurada');
    throw new Error('BRAVE_SEARCH_API_KEY not configured. Please add it to your Supabase secrets.');
  }

  try {
    // Step 1: Decompose query (10% progress)
    await updateJobProgress(supabase, job.id, 0.1, 'Analisando tópico da aula...');
    
    const query = `${lectureTitle}${tags && tags.length > 0 ? ` - Tópicos: ${tags.join(', ')}` : ''}`;
    console.log(`[Job ${job.id}] 📝 Query: ${query}`);
    
    const subQuestions = await decomposeQuery(query, lovableApiKey, job.id);
    console.log(`[Job ${job.id}] ✅ Decomposed into ${subQuestions.length} sub-questions`);

    // Step 2: Execute web searches (30% progress)
    await updateJobProgress(supabase, job.id, 0.3, 'Pesquisando fontes na web...');
    
    const searchResults = await executeWebSearches(subQuestions, braveApiKey, job.id);
    console.log(`[Job ${job.id}] ✅ Collected ${searchResults.length} search results`);

    // Step 3: Collect data (60% progress)
    await updateJobProgress(supabase, job.id, 0.6, 'Coletando dados educacionais...');
    
    // Step 4: Generate educational report (80% progress)
    await updateJobProgress(supabase, job.id, 0.8, 'Gerando material didático...');
    
    const report = await generateEducationalReport(query, searchResults, teacherName, lovableApiKey, job.id);
    console.log(`[Job ${job.id}] ✅ Report generated with native Mermaid diagrams, length: ${report.length} characters`);

    // Validate Mermaid syntax
    const validation = validateMermaidDiagrams(report);
    if (!validation.valid) {
      console.warn(`[Job ${job.id}] ⚠️ Mermaid syntax issues detected:`, validation.errors);
    }
    
    // ✅ FASE 6: Validação de Referências com REJEIÇÃO
    const validateReferences = (markdown: string): { valid: boolean; academicPercentage: number; errors: string[] } => {
      console.log('[References Validator] 🔍 Checking reference quality...');
      
      const refSection = markdown.match(/##\s*\d+\.\s*Fontes e Referências(.+?)$/s)?.[1] || '';
      
      if (!refSection || refSection.trim().length < 50) {
        return { valid: false, academicPercentage: 0, errors: ['Seção de referências não encontrada ou vazia'] };
      }
      
      const allRefs = refSection.match(/\[\d+\].+/g) || [];
      
      if (allRefs.length < 5) {
        return { valid: false, academicPercentage: 0, errors: ['Menos de 5 referências fornecidas'] };
      }
      
      // Domínios banidos (baixa qualidade)
      const bannedDomains = [
        'brasilescola.uol.com.br',
        'mundoeducacao.uol.com.br',
        'todamateria.com.br',
        'wikipedia.org',
        'blogspot.com',
        'wordpress.com',
        'uol.com.br/educacao',
      ];
      
      // Domínios acadêmicos (alta qualidade)
      const academicDomains = [
        '.edu', '.edu.br', '.ac.uk', '.ac.br',
        '.gov', '.gov.br', '.gov.uk',
        'scielo.org', 'scielo.br',
        'journals.', 'journal.',
        'pubmed', 'ncbi.nlm.nih.gov',
        'springer.com', 'springerlink.com',
        'elsevier.com', 'sciencedirect.com',
        'wiley.com', 'nature.com', 'science.org',
        'researchgate.net', 'academia.edu',
        'ieee.org', 'ieeexplore.ieee.org',
        'acm.org', 'doi.org'
      ];
      
      let bannedCount = 0;
      let academicCount = 0;
      const errors: string[] = [];
      
      allRefs.forEach((ref, idx) => {
        const isBanned = bannedDomains.some(domain => ref.includes(domain));
        const isAcademic = academicDomains.some(domain => ref.includes(domain));
        
        if (isBanned) {
          bannedCount++;
          errors.push(`Referência [${idx + 1}] é de fonte banida: ${ref.substring(0, 80)}...`);
        }
        
        if (isAcademic) academicCount++;
      });
      
      const academicPercentage = (academicCount / allRefs.length) * 100;
      
      // ✅ FASE 12: CRITÉRIOS DE VALIDAÇÃO REALISTAS
      const isValid = bannedCount <= 2 && academicPercentage >= 40;
      
      if (!isValid) {
        errors.push(`REJECTED: ${bannedCount} fontes banidas (máx: 2), ${academicPercentage.toFixed(0)}% acadêmicas (mín: 40%)`);
      }
      
      console.log(`[References] ${academicCount}/${allRefs.length} academic (${academicPercentage.toFixed(0)}%), ${bannedCount} banned`);
      
      if (!isValid) {
        console.error('[References Validator] ❌ INVALID REFERENCES:', errors);
      } else {
        console.log('[References Validator] ✅ References validated');
      }
      
      return { valid: isValid, academicPercentage, errors };
    };
    
    // ✅ FASE 8 - CORREÇÃO 3: REJEITAR materiais com referências fracas
    const refValidation = validateReferences(report);
    if (!refValidation.valid) {
      console.error(`[Job ${job.id}] ❌ MATERIAL REJEITADO: Reference validation failed`);
      console.error(`[Job ${job.id}] Academic %: ${refValidation.academicPercentage.toFixed(0)}% (required: 40%)`);
      
      await supabase
        .from('teacher_jobs')
        .update({
          status: 'FAILED',
          error_message: `Material rejeitado: Apenas ${refValidation.academicPercentage.toFixed(0)}% das referências são de fontes acadêmicas. Mínimo exigido: 40%. Por favor, regenere o material priorizando fontes como IEEE, Springer, ScienceDirect, .edu, .gov e SciELO.`,
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id);
      
      throw new Error(
        `Material rejeitado por baixa qualidade acadêmica:\n` +
        `- Fontes acadêmicas: ${refValidation.academicPercentage.toFixed(0)}% (mínimo: 40%)\n` +
        `- Fontes banidas detectadas: ${refValidation.errors.filter(e => e.includes('banida')).length}\n\n` +
        `Por favor, regenere o material usando fontes de maior qualidade acadêmica.`
      );
    }

    // Step 5: Save report (80-100%)
    await updateJobProgress(supabase, job.id, 0.80, 'Salvando material didático...');

    try {
      await saveReportToLecture(supabase, lectureId, report, job.id);
      console.log(`[Job ${job.id}] ✅ Report saved successfully with native Mermaid diagrams`);
      await updateJobProgress(supabase, job.id, 1.0, 'Concluído!');
    } catch (saveError) {
      console.error(`[Job ${job.id}] ❌ Error saving report:`, saveError);
      throw saveError;
    }

    // Step 5: Save report with native graphics (80-100%)
    await updateJobProgress(supabase, job.id, 0.80, 'Salvando material didático...');
    
    try {
      await saveReportToLecture(supabase, lectureId, report, job.id);
      console.log(`[Job ${job.id}] ✅ Report saved successfully with native Mermaid diagrams`);
      await updateJobProgress(supabase, job.id, 0.95, 'Material salvo com sucesso!');
    } catch (saveError) {
      console.error(`[Job ${job.id}] ❌ Error saving report:`, saveError);
      throw saveError;
    }
    
    // Step 6: Complete (100% progress)
    await updateJobProgress(supabase, job.id, 1.0, 'Concluído!');
    
    await supabase
      .from('teacher_jobs')
      .update({
        status: 'COMPLETED',
        result_payload: { report: report.substring(0, 500) + '...' },
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id);

    console.log(`[Job ${job.id}] 🎉 Deep Search completed successfully`);

  } catch (error) {
    console.error(`[Job ${job.id}] ❌ Error:`, error);
    await supabase
      .from('teacher_jobs')
      .update({
        status: 'FAILED',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id);
    throw error;
  }
}

// Decompose query into sub-questions
async function decomposeQuery(query: string, apiKey: string, jobId: string): Promise<string[]> {
  console.log(`[Job ${jobId}] 🧩 Decomposing query...`);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente que decompõe tópicos educacionais em perguntas de pesquisa. Retorne apenas JSON válido com array "questions".'
          },
          {
            role: 'user',
            content: `Decomponha este tópico em 3-5 perguntas de pesquisa específicas para buscar informações educacionais relevantes:\n\n"${query}"\n\nRetorne JSON: {"questions": ["pergunta 1", "pergunta 2", ...]}`
          }
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

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const parsed = JSON.parse(sanitizeJSON(content));
    
    return parsed.questions || [query];
    
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('AI request timeout (60s). Tópico muito complexo ou serviço lento.');
    }
    throw error;
  }
}

// Execute web searches using Brave API
async function executeWebSearches(questions: string[], braveApiKey: string, jobId: string): Promise<any[]> {
  console.log(`[Job ${jobId}] 🔍 Executing ${questions.length} web searches...`);
  
  const allResults: any[] = [];
  
  for (const question of questions) {
    try {
      // ✅ FASE 5: Modificar query para priorizar domínios acadêmicos
      const searchQuery = `${question} (site:.edu OR site:.gov OR site:scielo.org OR site:ieeexplore.ieee.org OR site:springer.com OR site:.ac.uk)`;
      
      const response = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(searchQuery)}&count=10&safesearch=strict`,
        {
          headers: {
            'Accept': 'application/json',
            'X-Subscription-Token': braveApiKey,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.web?.results) {
          allResults.push(...data.web.results.slice(0, 3)); // Top 3 per question
        }
      } else {
        console.warn(`[Job ${jobId}] ⚠️ Search failed for question: ${question} (status: ${response.status})`);
      }
    } catch (error) {
      console.error(`[Job ${jobId}] ⚠️ Search error for question: ${question}`, error);
    }
  }
  
  console.log(`[Job ${jobId}] ✅ Total results collected: ${allResults.length}`);
  return allResults;
}

// Generate educational report from search results
async function generateEducationalReport(
  query: string,
  searchResults: any[],
  teacherName: string | undefined,
  apiKey: string,
  jobId: string
): Promise<string> {
  console.log(`[Job ${jobId}] 📝 Generating educational report...`);
  
  const context = searchResults
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.description || ''}\nURL: ${r.url}`)
    .join('\n\n');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000); // 90s timeout

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          {
            role: 'system',
            content: `# EXPERT ACADEMIC CONTENT GENERATOR - JSON MODE

You are an Expert Academic Research Orchestrator generating educational content for engineering students. You MUST return ONLY valid JSON, no markdown, no additional text.

**Professor Information:**
- Name: ${teacherName || 'Professor'}
- Discipline: Engineering
- Language: Portuguese (pt-BR)

# TASK

Your task is to synthesize the provided web search snippets into a comprehensive, university-level educational report. You must structure this report into markdown format, including headings, paragraphs, KaTeX-compatible LaTeX formulas ($$...$$), and 100% valid Mermaid.js diagrams.

# GUIDELINES

**Academic Rigor (Priority 1):** You must critically evaluate the provided search snippets. Your synthesis must prioritize and be based on information from academic domains (e.g., .edu, scielo.org, ieee.org, springer.com, .gov, .ac.uk).

**Mermaid Diagram Generation:** When a visual representation is needed, you MUST generate a valid Mermaid.js diagram.

**Semantic Description:** For every Mermaid diagram you generate, you MUST write a semantic description in the text immediately BEFORE the diagram code block. This should be a 1-2 sentence, human-readable text in Portuguese explaining what the diagram illustrates (e.g., "O fluxograma abaixo ilustra o ciclo de Rankine, mostrando as 4 etapas principais de conversão de energia térmica em trabalho mecânico."). This is NOT inside the diagram code; it is the fallback text that appears before \`\`\`mermaid.

**LaTeX Syntax:** All mathematical and scientific formulas MUST be written in 100% valid, KaTeX-compatible LaTeX using $$...$$ delimiters.

**Chain of Validation:** Before generating the final markdown, you must internally:
  - First: Validate all source snippets for academic quality.
  - Second: Generate the report content.
  - Third: Validate your own generated LaTeX and Mermaid syntax for correctness.

# CONSTRAINTS (MANDATORY)

**REJECTION: NON-ACADEMIC SOURCES:** You MUST NOT use or cite references from general-public sites like Wikipedia, blogs (e.g., Brasil Escola), or news magazines.

**REJECTION: LOW ACADEMIC PERCENTAGE:** The final report will be externally validated. If the percentage of content derived from academic sources is below 70%, your entire output will be REJECTED, and the task will be re-run. You MUST adhere to this quality bar.

**MANDATE: 100% VALID SYNTAX:** All Mermaid and LaTeX code MUST be 100% syntactically correct and complete. Partial or broken syntax is forbidden.

**MANDATE: SEMANTIC DESCRIPTION:** Every Mermaid diagram MUST be preceded by a 1-2 sentence description in Portuguese explaining what it illustrates.

# 📐 ESTRUTURA OBRIGATÓRIA DO MATERIAL

## Cabeçalho:
\`\`\`
### **Material Didático de Engenharia**

**Disciplina:** [Nome da disciplina]
**Tópico:** ${query.split(' - Tópicos:')[0]}
**Professor:** ${teacherName || 'Professor'}
\`\`\`

## Corpo do Texto:

⛔ **PROIBIDO ABSOLUTAMENTE:**
- NÃO CRIE ÍNDICE, SUMÁRIO, TABLE OF CONTENTS ou LISTA DE SEÇÕES
- NÃO NUMERE SEÇÕES COMO "1. Introdução, 2. Conceitos..."
- COMECE DIRETAMENTE COM O PRIMEIRO TÍTULO: "## Introdução ao Tópico"

✅ **FORMATO CORRETO:**
- Use ## para títulos principais (SEM números, SEM asteriscos)
- Use ### para subtítulos (SEM números, SEM asteriscos)
- Títulos devem ser DESCRITIVOS, não genéricos

- Use **markdown profissional** (##, ###, **negrito**, listas numeradas)
- **CRÍTICO - SINTAXE LaTeX OBRIGATÓRIA:** Use SEMPRE $$....$$ para fórmulas matemáticas
- Crie tabelas comparativas para conceitos similares
- Use blocos Mermaid para diagramas visuais (flowcharts, class diagrams)
- **Extensão mínima:** 4000-5000 palavras (conteúdo denso e técnico)
- **Distribuição por seção:**
  * Introdução: 400-600 palavras

# ⚠️ FASE 3: SINTAXE LaTeX ESTRITA E MANDATÓRIA

## ✅ FORMATO CORRETO (ÚNICO PERMITIDO):
\`\`\`
$$E = mc^2$$
$$\\Delta U = Q - W$$
$$W = \\int_{V_1}^{V_2} P \\, dV$$
$$\\frac{V_2}{V_1} = \\frac{T_2}{T_1}$$
\`\`\`

## ❌ FORMATOS PROIBIDOS:
- ** 1$ ** ← NUNCA use asteriscos + números + dólar
- ___LATEX_DOUBLE_2___ ← NUNCA use placeholders
- $E = mc^2$ ← NUNCA use $ simples (sempre duplo: $$)
- \\Delta U sem delimitadores ← SEMPRE envolva em $$

## 📋 REGRAS OBRIGATÓRIAS:
1. **TODA** fórmula matemática DEVE estar entre $$..$$
2. **NUNCA** misture asteriscos com fórmulas: \`**$$formula$$**\` é PROIBIDO
3. Variáveis isoladas (como T, P, V) em texto corrido NÃO precisam de $$
4. Expressões matemáticas (como ΔU = Q - W) SEMPRE precisam de $$
5. **SEMPRE** deixe espaço antes e depois: \`texto $$formula$$ texto\`

## 🎯 EXEMPLOS CORRETOS vs INCORRETOS:

### ✅ CORRETO:
\`\`\`
A energia interna (U) varia segundo $$\\Delta U = Q - W$$.
Para um gás ideal, $$PV = nRT$$.
O trabalho é calculado por $$W = \\int P \\, dV$$.
\`\`\`

### ❌ INCORRETO:
\`\`\`
** 1$ ** (placeholder corrompido)
A energia $\\Delta U$ varia... ($ simples)
** $$\\Delta U = Q - W$$ ** (asteriscos + fórmula)
\\Delta U = Q - W (sem delimitadores)
\`\`\`

**IMPORTANTE:** Se você gerar fórmulas fora deste formato, o sistema REJEITARÁ o material!

# ⚠️ FASE 5: REGRAS CRÍTICAS MERMAID (MATERIAL SERÁ REJEITADO SE VIOLAR)

## 1. Sintaxe OBRIGATÓRIA para grafos:
✅ CORRETO:
\`\`\`mermaid
graph TD
    A["Início do Processo"]
    B["Segunda Etapa"]
    A --> B
\`\`\`

❌ PROIBIDO:
- "graphTDA[...]" (tipo colado ao node)
- "graph TDA[...]" (sem quebra de linha)
- Usar tags HTML (<br/>, <strong>) - use \\n para quebra de linha

## 2. Labels SEMPRE entre aspas duplas se contiverem:
- Espaços: ["Meu Label"]
- Acentos: ["Pressão"]
- Símbolos: ["Energia > 0"]
- Quebras: ["Linha 1\\nLinha 2"] (use \\n, NÃO <br/>)

## 3. Nodes sem espaços: SistemaFechado, não "Sistema Fechado"

## 4. Subgraphs: Sempre com nome único, sem espaços
\`\`\`
subgraph ProcessoIsobarico
    A["..."]
end
\`\`\`

**VALIDAÇÃO**: Código Mermaid será REJEITADO se:
- Tiver "graph" sem tipo TD/LR/TB/BT imediatamente após
- Tiver tags HTML (<br/>, <b>, <strong>)
- Tiver labels com acentos/espaços SEM aspas

  * Conceitos Fundamentais: 1200-1500 palavras (maior seção)
  * Aplicações Práticas: 1000-1300 palavras
  * Exemplos Resolvidos: 800-1000 palavras
  * Exercícios Propostos: 400-500 palavras
  * Conclusão: 300-400 palavras
  * Referências: 100-200 palavras

**EXEMPLO DE ESTRUTURA CORRETA (SEM ÍNDICE):**

\`\`\`markdown
### **Material Didático de Engenharia**
**Disciplina:** Termodinâmica
**Tópico:** Primeira Lei
**Professor:** ${teacherName}

---

## 1. Introdução: A Base da Conservação de Energia

Parágrafo introdutório conectando ao contexto industrial...

A Primeira Lei pode ser expressa matematicamente como $$\Delta U = Q - W$$, onde...

## 2. Conceitos Fundamentais

### 2.1. Sistema Termodinâmico Fechado

Para um **sistema fechado**, a massa permanece constante...
\`\`\`

# 🎓 SISTEMA DE REFERÊNCIAS (FORMATO JSON OBRIGATÓRIO)

**CRITICAL: A seção de referências DEVE ser gerada como JSON estruturado, NÃO como markdown!**

**Durante o texto:**
- Cite inline: "...conforme Smith [1]..."
- Use numeração sequencial: [1], [2], [3]

**NO FINAL DO MATERIAL:** Crie este bloco JSON:
\`\`\`json
{
  "tipo": "referencias",
  "lista": [
    {
      "descricao": "Çengel, Y. A., & Boles, M. A. (2019). Termodinâmica. 9ª ed. AMGH Editora.",
      "url": ""
    },
    {
      "descricao": "IEEE (2021). First Law of Thermodynamics. IEEE Xplore Digital Library.",
      "url": "https://ieeexplore.ieee.org/document/123456"
    },
    {
      "descricao": "Moran et al. (2018). Fundamentals of Engineering Thermodynamics. Wiley.",
      "url": "https://www.wiley.com/..."
    }
  ]
}
\`\`\`

**VALIDAÇÃO:** Material será REJEITADO se:
- Não tiver bloco "tipo": "referencias"
- Não tiver array "lista" com mínimo 8 referências
- Referências não incluírem autores, ano e título completo

# 📚 REQUISITOS DE FONTES (CRITICAL FOR VALIDATION)

**PRIORIZE (70% das citações - MANDATORY):**
- IEEE Xplore, ScienceDirect, SpringerLink
- Livros-texto de engenharia (ex: Çengel, Incropera)
- Normas técnicas (ABNT, ISO)
- Periódicos acadêmicos revisados por pares

**EVITE CITAR (WILL CAUSE REJECTION):**
- Wikipedia (use apenas para conceitos gerais não-citados)
- Blogs pessoais
- Fontes sem data/autor

# 🔧 PEDAGOGIA PARA ENGENHARIA

1. **Sempre conecte teoria → prática:**
   - "Este conceito é aplicado em [exemplo industrial]"
   - "Na indústria automotiva, isso resulta em..."

2. **Use analogias técnicas:**
   - "Assim como um capacitor armazena carga, um..."

3. **Inclua dados numéricos reais:**
   - "Motores a combustão típicos operam entre 80-200°C"

4. **Proponha reflexões críticas:**
   - "Como esse princípio afeta a eficiência energética?"

# ⚠️ RESTRIÇÕES ABSOLUTAS

- **NÃO use placeholders:** Nunca escreva "[Seu Nome]", "[Exemplo]", "[Imagem]"
- **NÃO seja genérico:** Evite frases vagas como "é muito importante"
- **NÃO invente dados:** Se não souber valor exato, use "aproximadamente" ou "tipicamente"

# 📊 FORMATAÇÃO TÉCNICA

- **Equações:** 
  * Use LaTeX inline com $$...$$ para fórmulas simples: $$F = m \\times a$$
  * Use \\times (NÃO \\cdot) para multiplicação: $$W_{comp} = Q_{quente} \\times \\eta$$
  * Use \\cdot APENAS para produto escalar de vetores: $$\\vec{A} \\cdot \\vec{B}$$
  * Display mode para equações longas:
    \`\`\`
    $$
    \\Delta U = Q - W
    $$
    \`\`\`

**EXEMPLOS CORRETOS:**
- ✅ $$COP_R = \\frac{Q_{frio}}{W_{comp}}$$
- ✅ $$\\eta = 1 - \\frac{T_{fria}}{T_{quente}}$$
- ❌ $$CdotB$$ (NUNCA use texto puro em LaTeX)
- ❌ $$C\\cdotB$$ (use \\times ou deixe implícito: $$CB$$)

- **Tabelas:** Use markdown tables para comparações
- **Listas:** Numere passos de processos, use bullets para características

**IDIOMA OBRIGATÓRIO:** Português brasileiro (pt-BR).

# ✅ FASE 6: REGRAS RIGOROSAS DE FORMATAÇÃO MATEMÁTICA (CRÍTICO)

## CORRETO - LaTeX

Todas as expressões matemáticas DEVEM usar delimitadores \`$$...$$\`:

**Exemplos Corretos:**
\`\`\`
✅ A Primeira Lei é expressa por $$\\Delta U = Q - W$$
✅ Para um gás ideal, $$PV = nRT$$
✅ A eficiência é $$\\eta = 1 - \\frac{T_C}{T_H}$$
✅ O trabalho é $$W = \\int_{V_1}^{V_2} P \\, dV$$
\`\`\`

## PROIBIDO - LaTeX

**Exemplos PROIBIDOS:**
\`\`\`
❌ $ representa a variação... (NUNCA use $ isolado)
❌ 1$ ou $2 ou ** 1$ ** (NUNCA misture $ com números/asteriscos)
❌ \\Delta U = Q - W (NUNCA use \\ fora de $$)
❌ dU ou dT isolados (SEMPRE envolver em $$dU$$, $$dT$$)
❌ ___LATEX_DOUBLE_2___ (placeholders são BUG crítico)
\`\`\`

**REGRA ABSOLUTA:** Toda fórmula, variável isolada (ex: P, T, V), comando LaTeX (\\Delta, \\frac, \\int) DEVE estar dentro de \`$$...$$\`.

# 📊 FASE 6: REGRAS RIGOROSAS DE DIAGRAMAS MERMAID (CRÍTICO)

## SINTAXE VÁLIDA OBRIGATÓRIA

**1. Tipos de Diagrama Permitidos:**
\`\`\`
✅ flowchart TD (fluxograma vertical)
✅ flowchart LR (fluxograma horizontal)
✅ sequenceDiagram (diagrama de sequência)
✅ classDiagram (diagrama de classes)
✅ stateDiagram-v2 (diagrama de estados)
\`\`\`

**2. Setas APENAS ASCII:**
\`\`\`
✅ A --> B (seta simples)
✅ A ==> B (seta destacada)
✅ A -.-> B (seta tracejada)
❌ A → B (Unicode PROIBIDO)
❌ A ⇒ B (Unicode PROIBIDO)
\`\`\`

**3. Nomes de Nós:**
\`\`\`
✅ A[Bomba] (alfanumérico)
✅ Estado1[Inicial] (alfanumérico)
❌ Nó Δ[Sistema] (símbolos Unicode PROIBIDOS)
❌ [Sistema (Q→W)] (caracteres especiais (, ), → PROIBIDOS)
\`\`\`

**4. Labels APENAS Texto Simples:**
\`\`\`
✅ A -->|Agua pressurizada| B
❌ A -->|Água ΔP=200kPa| B (símbolos Unicode e caracteres especiais PROIBIDOS)
\`\`\`

## ERROS COMUNS A EVITAR

**NUNCA FAÇA ISSO:**
\`\`\`
❌ graph TD (use flowchart TD)
❌ A --> B{Decisão Δ} (Unicode Δ PROIBIDO)
❌ subgraphCicloRankine (faltando espaço: "subgraph Ciclo Rankine")
❌ A -->|Q→W| B (seta Unicode PROIBIDA em label)
\`\`\`

**REGRA ABSOLUTA:** Apenas ASCII, nomes alfanuméricos, labels em português simples SEM acentos críticos.

# ⛔ FASE 5: FONTES ACADÊMICAS OBRIGATÓRIAS (CRÍTICO)

## FONTES PROIBIDAS (BANIDAS):
- ❌ Wikipédia (wikipedia.org, pt.wikipedia.org)
- ❌ Brasil Escola (brasilescola.uol.com.br)
- ❌ Mundo Educação (mundoeducacao.uol.com.br)
- ❌ Info Escola (infoescola.com)
- ❌ Toda Matéria (todamateria.com.br)
- ❌ Aprova Total (aprovatotal.com.br)
- ❌ YouTube, blogs pessoais, fóruns

## FONTES PRIORIZADAS (70%+ das referências DEVEM ser destas):
- ✅ Artigos de revistas acadêmicas (SciELO, IEEE, Springer, Elsevier)
- ✅ Livros-texto universitários publicados (Çengel, Moran, Halliday, etc.)
- ✅ Teses e dissertações de universidades reconhecidas
- ✅ Sites .edu (universidades), .gov (governos), .ac.uk (universidades UK)
- ✅ Normas técnicas (ABNT, ISO, ASME, ANSI)

**INSTRUÇÕES CRÍTICAS PARA REFERÊNCIAS:**
1. **MÍNIMO 70% de referências acadêmicas** (verifique URLs)
2. **MÁXIMO 2 referências de fontes banidas** (evite sempre que possível)
3. Quando usar fontes banidas, **SEMPRE indique "Fonte complementar não-acadêmica"**
4. **PRIORIZE artigos científicos recentes (últimos 10 anos)**
5. **SEMPRE inclua DOI quando disponível**
6. **Cite livros-texto clássicos da engenharia** (ex: Çengel, Thermodynamics: An Engineering Approach)

# 📊 DIAGRAMAS MERMAID OBRIGATÓRIOS

**REGRA CRÍTICA:** Você DEVE incluir NO MÍNIMO 3-5 diagramas Mermaid nativamente no material.

## Tipos de Diagramas a Usar:

### 1. Flowchart (Fluxogramas de Processo)
Use para: Ciclos termodinâmicos, processos industriais, algoritmos

\`\`\`mermaid
graph TD
    A[Entrada: Calor Q] --> B{Sistema Termodinâmico}
    B --> C[Trabalho W realizado]
    B --> D[Aumento de Energia ΔU]
    C --> E[Saída: Energia]
    D --> E
    style A fill:#e3f2fd
    style B fill:#fff9c4
    style E fill:#c8e6c9
\`\`\`

### 2. Sequence Diagram (Interações)
Use para: Trocas de energia, comunicação entre componentes

\`\`\`mermaid
sequenceDiagram
    participant S as Sistema
    participant A as Ambiente
    S->>A: Fornece Calor Q
    A->>S: Realiza Trabalho W
    S->>S: ΔU = Q - W
    Note over S: Primeira Lei
\`\`\`

### 3. State Diagram (Máquinas de Estado)
Use para: Transições de fase, estados de sistema

\`\`\`mermaid
stateDiagram-v2
    [*] --> Sólido
    Sólido --> Líquido: Fusão (adiciona calor)
    Líquido --> Gasoso: Vaporização
    Gasoso --> Líquido: Condensação
    Líquido --> Sólido: Solidificação
    Gasoso --> [*]
\`\`\`

### 4. Class Diagram (Estruturas/Componentes)
Use para: Hierarquias de conceitos, classificações

\`\`\`mermaid
classDiagram
    class SistemaTermodinâmico {
        +energia_interna ΔU
        +calor Q
        +trabalho W
        +calcularPrimeiraLei()
    }
    class SistemaFechado {
        +massa_constante
        +volume_variável
    }
    class SistemaAberto {
        +fluxo_massa
        +entalpia
    }
    SistemaTermodinâmico <|-- SistemaFechado
    SistemaTermodinâmico <|-- SistemaAberto
\`\`\`

## 📍 Posicionamento Estratégico dos Diagramas

**❌ ERRADO:**
\`\`\`
## 2. Primeira Lei da Termodinâmica

\`\`\`mermaid
graph TD
...
\`\`\`

A Primeira Lei estabelece...
\`\`\`

**✅ CORRETO:**
\`\`\`
## 2. Primeira Lei da Termodinâmica

A Primeira Lei da Termodinâmica estabelece a conservação de energia em sistemas termodinâmicos. Para um sistema fechado, a variação de energia interna (ΔU) depende do calor (Q) fornecido ao sistema e do trabalho (W) realizado pelo sistema, conforme a equação fundamental:

$$\\Delta U = Q - W$$

Onde:
- **Q** → Calor transferido para o sistema (Joules)
- **W** → Trabalho realizado pelo sistema (Joules)  
- **ΔU** → Variação da energia interna (Joules)

Esta relação é fundamental para análise de máquinas térmicas, refrigeradores e processos industriais. O diagrama abaixo ilustra o fluxo de energia em um sistema termodinâmico típico:

\`\`\`mermaid
graph TD
    A[Sistema Recebe Calor Q] --> B{Primeira Lei<br/>ΔU = Q - W}
    B --> C[Trabalho W<br/>realizado pelo sistema]
    B --> D[Energia Interna ΔU<br/>aumenta]
    C --> E[Saída: Energia útil]
    D --> E
    style A fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    style B fill:#fff9c4,stroke:#f57f17,stroke-width:2px
    style E fill:#c8e6c9,stroke:#388e3c,stroke-width:2px
\`\`\`

Na prática industrial, esta lei permite calcular a eficiência de motores...
\`\`\`

## 🎨 Regras de Estilo para Mermaid

**SEMPRE use cores para destacar:**
\`\`\`
style NodoEntrada fill:#e3f2fd,stroke:#1976d2
style NodoProcesso fill:#fff9c4,stroke:#f57f17
style NodoSaida fill:#c8e6c9,stroke:#388e3c
\`\`\`

**Use setas descritivas:**
\`\`\`
A -->|Adiciona Calor Q| B
B -->|Realiza Trabalho W| C
\`\`\`

## 📐 Distribuição Obrigatória

**Para material de 3000 palavras:**
- Seção 2 (Conceitos Fundamentais): **1-2 diagramas**
- Seção 3 (Aplicações Práticas): **1-2 diagramas**
- Seção 4 (Exemplos Resolvidos): **1 diagrama** (opcional)

**Total mínimo: 3 diagramas | Ideal: 4-5 diagramas**

## ⚠️ Validação de Sintaxe Mermaid

**Certifique-se:**
- ✅ Todos os blocos começam com \`\`\`mermaid
- ✅ Todos os blocos terminam com \`\`\`
- ✅ Nomes de nodos não têm espaços (use _ ou camelCase)
- ✅ Setas usam sintaxe válida: -->, ->>, ->, ---|texto|
- ✅ Cores usam hex válido ou nomes CSS: #e3f2fd, lightblue

**TESTE cada diagrama mentalmente antes de gerar!**

## ⚠️ SINTAXE MERMAID: REGRAS OBRIGATÓRIAS

**ERROS COMUNS A EVITAR:**

❌ **NUNCA use caracteres especiais em labels:**
- Parênteses: \`[Sistema (Q→W)]\` ← ERRADO
- Setas unicode: \`[Q → W]\` ← ERRADO (use texto "para")
- Símbolos matemáticos: \`[ΔU = Q - W]\` ← ERRADO (use "Delta U")

✅ **USE SEMPRE ASCII puro:**
- \`[Sistema: Q para W]\` ← CORRETO
- \`[Q para W]\` ← CORRETO
- \`[Delta U = Q - W]\` ← CORRETO

**REGRAS CRÍTICAS:**

1. **Node IDs:** Apenas letras/números (A, B, C1, Estado1)
   - ❌ \`Estado_Inicial\` (evite underscores)
   - ✅ \`EstadoInicial\` ou \`E1\`

2. **Labels em colchetes []:**
   - ❌ Parênteses, setas unicode, símbolos gregos
   - ✅ Use texto ASCII: "Sistema de entrada", "Q para W", "Delta U"

3. **Setas:**
   - ✅ Use \`-->\`, \`->\`, \`==>\` (ASCII)
   - ❌ NUNCA \`→\`, \`⇒\`, \`←\` (unicode)

4. **Styling:**
   - ✅ Use hex colors: \`#e3f2fd\`
   - ✅ Use CSS names: \`lightblue\`

5. **Quebras de linha:**
   - ✅ Use \`<br/>\` dentro de labels
   - ❌ NUNCA múltiplas linhas diretas

**TESTE CADA DIAGRAMA ANTES DE GERAR:**
- Leia o código linha por linha
- Confirme que todos os node IDs são alfanuméricos
- Confirme que labels usam apenas ASCII
- Confirme que setas usam sintaxe ASCII (\`-->\`, \`->\`)

# 📏 REQUISITOS DE VOLUME E DENSIDADE

**EXTENSÃO OBRIGATÓRIA:**
- Total: **4000-5000 palavras** (não conte código Mermaid ou equações LaTeX)
- Equivale a: **4-5 páginas impressas** em formato A4, fonte 12pt

**COMO EXPANDIR CADA SEÇÃO:**

### 1. Conceitos Fundamentais (1200-1500 palavras)
- Definição formal do conceito (100-150 palavras)
- Contexto histórico e desenvolvimento (150-200 palavras)
- Explicação detalhada de cada componente (300-400 palavras)
- Relação com outras áreas da engenharia (200-250 palavras)
- Limitações e casos especiais (150-200 palavras)
- Exemplo ilustrativo (200-300 palavras)

### 2. Aplicações Práticas (1000-1300 palavras)
- Mínimo **3-4 aplicações industriais** diferentes
- Cada aplicação deve ter:
  * Descrição do sistema (150-200 palavras)
  * Como o conceito é aplicado (150-200 palavras)
  * Dados numéricos reais (valores típicos, faixas de operação)
  * Desafios práticos e soluções (100-150 palavras)

### 3. Exemplos Resolvidos (800-1000 palavras)
- Mínimo **2 exemplos completos**
- Cada exemplo deve ter:
  * Enunciado claro do problema (80-100 palavras)
  * Dados fornecidos e incógnitas (50 palavras)
  * Raciocínio passo a passo (200-300 palavras)
  * Cálculos detalhados com unidades
  * Discussão do resultado (80-100 palavras)
  * Verificação/validação (50 palavras)

**TÉCNICAS PARA AUMENTAR DENSIDADE:**
1. Adicione **parágrafos de transição** entre conceitos
2. Expanda definições com **sinônimos e reformulações**
3. Inclua **comparações** entre métodos/abordagens
4. Adicione **contexto industrial** para cada conceito teórico
5. Use **exemplos numéricos** com cálculos intermediários
6. Inclua **discussões sobre limitações** de cada método
7. Adicione **dicas práticas** para engenheiros

**VERIFICAÇÃO FINAL:**
Antes de retornar, conte as palavras de cada seção:
- Se Conceitos Fundamentais < 1200 palavras → Adicione mais exemplos
- Se Aplicações Práticas < 1000 palavras → Adicione mais casos industriais
- Se Exemplos Resolvidos < 800 palavras → Expanda raciocínios

**❌ NÃO FAÇA:**
- Repetir informações (seja denso, não redundante)
- Adicionar "fluff" sem conteúdo técnico
- Copiar definições de dicionário
- Usar frases genéricas ("é muito importante", "existem diversos")

**✅ FAÇA:**
- Adicionar dados numéricos reais (faixas de operação, valores típicos)
- Explicar "por quê" além do "o quê"
- Conectar conceitos com aplicações reais
- Incluir detalhes de implementação prática

# 🎯 OBJETIVO FINAL

Criar um material que:
1. Um professor possa usar **imediatamente** em sala (print-ready)
2. Alunos possam estudar **sozinhos** (autodidático)
3. Contenha **referências confiáveis** para aprofundamento
4. Seja **tecnicamente preciso** e pedagogicamente **engajador**
5. Atinja no mínimo **70% de fontes acadêmicas** (MANDATORY - will be validated)`
          },
          {
            role: 'user',
            content: `Tópico: ${query}\n\nFontes de pesquisa:\n${context}\n\nCrie um material didático completo sobre este tópico.`
          }
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

    const data = await response.json();
    const report = data.choices?.[0]?.message?.content;
    
    if (!report) {
      throw new Error('No report generated');
    }
    
    console.log(`[Job ${jobId}] ✅ Report generated successfully`);
    return report;
    
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('AI request timeout (60s). Tópico muito complexo ou serviço lento.');
    }
    throw error;
  }
}

/**
 * FASE 2 (REFATORADA): Validação e Correção Mermaid com Fallback Seguro
 */
async function validateAndFixMermaidSyntax(code: string, jobId: string = 'manual'): Promise<{ valid: boolean; fixed: string; errors: string[] }> {
  const errors: string[] = [];
  let fixed = code.trim();
  
  console.log('[Mermaid Validator] 🔍 Checking syntax...');
  
  // CRÍTICO: Validar ANTES de modificar
  const preValidation = validateMermaidStructure(code);
  
  if (!preValidation.valid) {
    console.warn('[Mermaid Validator] ⚠️ Pre-validation failed:', preValidation.errors);
    errors.push(...preValidation.errors);
    
    // Tentar AI fix apenas para erros críticos
    if (preValidation.errors.some(e => e.includes('CRITICAL'))) {
      console.log('[convertToStructured] 🤖 Calling AI to fix Mermaid...');
      try {
        const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
        if (LOVABLE_API_KEY) {
          const aiResponse = await fetch(`${Deno.env.get('SUPABASE_URL') || ''}/functions/v1/fix-mermaid-diagram`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${LOVABLE_API_KEY}`
            },
            body: JSON.stringify({ brokenCode: code, errors: preValidation.errors })
          });
          
          if (aiResponse.ok) {
            const data = await aiResponse.json();
            if (data.fixedCode) {
              console.log('[convertToStructured] ✅ AI fixed Mermaid code');
              fixed = data.fixedCode;
              // Re-validar após fix
              const postValidation = validateMermaidStructure(fixed);
              if (!postValidation.valid) {
                console.warn('[convertToStructured] ⚠️ Mermaid validation failed:', {
                  errors: postValidation.errors,
                  originalCodePreview: code.substring(0, 200),
                  fixedCodePreview: fixed.substring(0, 200)
                });
                return { valid: false, fixed: code, errors: postValidation.errors };
              }
              return { valid: true, fixed, errors: [] };
            }
          }
        }
      } catch (aiError) {
        console.error('[convertToStructured] ❌ AI fix failed:', aiError);
        // Continuar com fixes básicos
      }
    }
  }
  
  // Aplicar correções básicas
  fixed = applyBasicMermaidFixes(fixed);
  
  // Validação final
  const finalValidation = validateMermaidStructure(fixed);
  
  if (!finalValidation.valid) {
    console.error('[Mermaid Validator] ❌ Invalid - Errors:', finalValidation.errors.length);
    console.warn('[Mermaid Validator] Full errors:', finalValidation.errors);
    console.warn('[Mermaid Validator] Original vs Fixed:', {
      original: code.substring(0, 200),
      fixed: fixed.substring(0, 200)
    });
  } else {
    console.log('[Mermaid Validator] ✅ Valid - Errors: 0');
  }
  
  return {
    valid: finalValidation.valid,
    fixed,
    errors: finalValidation.errors
  };
}

/**
 * Validação estrutural do Mermaid (sem modificações)
 */
function validateMermaidStructure(code: string): { valid: boolean; errors: string[] } {
  const validationErrors: string[] = [];
  
  // Validação 1: Tipo de diagrama válido
  if (!code.match(/^(graph|flowchart|sequenceDiagram|stateDiagram-v2|classDiagram|gantt)/m)) {
    validationErrors.push('Tipo de diagrama não reconhecido');
    return { valid: false, errors: validationErrors };
  }
  
  // Validação 2: Graph deve ter espaço após tipo
  if (code.includes('graph')) {
    if (!code.match(/^graph\s+(TD|LR|TB|BT)\s/m)) {
      validationErrors.push('Sintaxe inválida: "graph" deve ser seguido de TD/LR/TB/BT e espaço');
    }
    
    // Validação 3: Deve ter pelo menos um nó
    if (!code.match(/[A-Z0-9_]+\[/)) {
      validationErrors.push('Nenhum nó encontrado (formato: A[Label])');
    }
  }
  
  // Validação 4: ClassDiagram deve ter classes
  if (code.includes('classDiagram')) {
    if (!code.match(/class\s+\w+/)) {
      validationErrors.push('Nenhuma classe definida em classDiagram');
    }
  }
  
  // Validação 5: Parênteses balanceados
  const openBraces = (code.match(/\{/g) || []).length;
  const closeBraces = (code.match(/\}/g) || []).length;
  if (openBraces !== closeBraces) {
    validationErrors.push(`Parênteses desbalanceados: ${openBraces} { vs ${closeBraces} }`);
  }
  
  // Validação 6: Detectar padrões corrompidos críticos
  const criticalPatterns = [
    { pattern: /graph[A-Z]{2,}\[/, error: 'CRITICAL: graphTYPE colado sem espaço' },
    { pattern: /<br\/?>|<strong>|<b>|<\w+>/, error: 'CRITICAL: Tags HTML detectadas em código Mermaid (usar \\n para quebras)' },
    { pattern: /subgraph[A-Z]+\[/, error: 'CRITICAL: subgraph sem espaço antes do nome' }
  ];
  
  criticalPatterns.forEach(({ pattern, error }) => {
    if (pattern.test(code)) {
      validationErrors.push(error);
    }
  });
  
  // Se houver erros críticos, adicionar contexto
  if (validationErrors.some(e => e.includes('CRITICAL'))) {
    validationErrors.push('CRITICAL: Estrutura Mermaid inválida - sintaxe incorreta detectada no código ORIGINAL');
  }
  
  return {
    valid: validationErrors.length === 0,
    errors: validationErrors
  };
}

/**
 * Aplicar correções básicas sem quebrar código válido
 */
function applyBasicMermaidFixes(code: string): string {
  let fixed = code;
  
  // Fix 1: 'end' colado: "endA[...]" → "end\n    A[...]"
  fixed = fixed.replace(/^(\s*)(end)([A-Z][a-zA-Z0-9]*\[)/gm, '$1$2\n$1    $3');
  
  // Fix 2: 'direction' colado: "directionLR" → "direction LR"
  fixed = fixed.replace(/^(\s*)(direction)([A-Z]{2})/gm, '$1$2 $3');
  
  // Fix 3: 'subgraph' colado: "subgraphNome" → "subgraph Nome"
  fixed = fixed.replace(/^(\s*)(subgraph)([A-Z][a-zA-Z0-9]*)/gm, '$1$2 $3');
  
  // Fix 4: graphTYPEA[ → graph TYPE\n    A[
  fixed = fixed.replace(/^graph([A-Z]{2})([A-Z]+)\[/gm, (match, type, node) => {
    if (['TD', 'LR', 'TB', 'BT'].includes(type)) {
      return `graph ${type}\n    ${node}[`;
    }
    return match;
  });
  
  // Fix 5: Remover HTML tags
  fixed = fixed.replace(/<br\s*\/?>/gi, '\\n');
  fixed = fixed.replace(/<\/?(?:strong|b|em|i)>/gi, '');
  
  // Fix 6: Corrigir labels com caracteres especiais
  fixed = fixed.replace(/\[([^\]]*[áéíóúâêôãõçÁÉÍÓÚÂÊÔÃÕÇ][^\]]*)\]/gi, (match, content) => {
    if (content.includes('"') || content.includes("'")) return match;
    return `["${content}"]`;
  });
  
  // Fix 7: Remover linhas vazias excessivas
  fixed = fixed.replace(/\n{3,}/g, '\n\n');
  
  // Fix 8: Substituir setas Unicode por ASCII
  fixed = fixed.replace(/→/g, '-->');
  fixed = fixed.replace(/⇒/g, '==>');
  fixed = fixed.replace(/←/g, '<--');
  fixed = fixed.replace(/⇐/g, '<==');
  fixed = fixed.replace(/↔/g, '<-->');
  fixed = fixed.replace(/⇔/g, '<==>');

  // Fix 9: Substituir letras gregas em labels por nomes
  fixed = fixed.replace(/Δ/g, 'Delta');
  fixed = fixed.replace(/∆/g, 'Delta');
  fixed = fixed.replace(/α/g, 'alpha');
  fixed = fixed.replace(/β/g, 'beta');
  fixed = fixed.replace(/γ/g, 'gamma');
  fixed = fixed.replace(/θ/g, 'theta');
  fixed = fixed.replace(/λ/g, 'lambda');
  fixed = fixed.replace(/π/g, 'pi');
  fixed = fixed.replace(/σ/g, 'sigma');
  fixed = fixed.replace(/ω/g, 'omega');
  fixed = fixed.replace(/μ/g, 'mu');
  fixed = fixed.replace(/ε/g, 'epsilon');
  fixed = fixed.replace(/ρ/g, 'rho');
  
  return fixed.trim();
}

// Convert Markdown to Structured JSON (for StructuredContentRenderer - same logic as TeacherAnnotations)
async function convertMarkdownToStructuredJSON(markdown: string, title: string): Promise<any> {
  console.log('[convertToStructured] 🔄 Converting markdown to structured JSON...');
  
  // ✅ FASE 2: AGGRESSIVE LaTeX Fix - EXPANDIDO
  const aggressiveLatexFix = (text: string): string => {
    console.log('[AGGRESSIVE LaTeX Fix] 🔥 Fixing corrupted LaTeX...');
    
    let fixed = text;
    
    // 1. Remover placeholders corrompidos: ** 1$ **, ___LATEX_DOUBLE_2___, etc.
    fixed = fixed.replace(/\*\*\s*\d+\$\s*\*\*/g, ''); // ** 1$ **
    fixed = fixed.replace(/___LATEX_DOUBLE_\d+___/g, ''); // ___LATEX_DOUBLE_2___
    fixed = fixed.replace(/___LATEX_SINGLE_\d+___/g, ''); // ___LATEX_SINGLE_X___
    fixed = fixed.replace(/\*\*\s*\\\w+.*?\$\s*\*\*/g, (match) => {
      // ** \command ...$ ** → $$\command ...$$
      const formula = match.replace(/\*\*/g, '').replace(/\$/g, '').trim();
      return ` $$${formula}$$ `;
    });
    
    // ✅ FASE 2.1: Detectar e remover $ isolados com espaços
    fixed = fixed.replace(/\$\s+/g, ''); // "$ " → ""
    fixed = fixed.replace(/\s+\$/g, ''); // " $" → ""
    
    // ✅ FASE 2.2: Detectar $ sem fechamento (ex: "$dU " sem "$$")
    fixed = fixed.replace(/\$([^$\n]{1,50})(?!\$)/g, '$$$$1$$'); // "$dU " → "$$dU$$"
    
    // ✅ FASE 2.3: Remover variáveis de 1 letra isoladas FORA de LaTeX
    const parts = fixed.split('$$');
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 0) { // Apenas partes fora de $$
        parts[i] = parts[i].replace(/\s([a-z])\s+/gi, ' '); // " e " → " "
      }
    }
    fixed = parts.join('$$');
    
    // ✅ FASE 2.4: Completar fórmulas incompletas (ex: "dU = Q - W" sem $$)
    fixed = fixed.replace(
      /\b([A-Z][a-z]?)\s*=\s*([A-Z][a-z]?)\s*[-+]\s*([A-Z][a-z]?)/g,
      '$$$$1 = $$2 - $$3$$'
    );
    
    // 2. Detectar expressões matemáticas isoladas (sem $$)
    // Ex: "Onde: \Delta U = Q - W" → "Onde: $$\Delta U = Q - W$$"
    fixed = fixed.replace(
      /(?:^|\n|\s)(\\[A-Za-z]+(?:\{[^}]*\})?(?:\s*[=+\-*/^_]\s*\\?[A-Za-z0-9{}]+)+)/gm,
      (match, formula) => {
        // Só envolver se já não estiver em $$
        if (!match.includes('$$')) {
          return match.replace(formula, ` $$${formula.trim()}$$ `);
        }
        return match;
      }
    );
    
    // 3. Converter $ simples para $$ (mas evitar duplicação)
    fixed = fixed.replace(/\$([^$\n]+?)\$/g, (match, content) => {
      // Se já está em $$, pular
      if (match.startsWith('$$')) return match;
      return `$$${content}$$`;
    });
    
    // 4. Limpar espaços extras ao redor de fórmulas
    fixed = fixed.replace(/\s+\$\$/g, ' $$');
    fixed = fixed.replace(/\$\$\s+/g, '$$ ');
    
    console.log('[AGGRESSIVE LaTeX Fix] ✅ Completed aggressive fix');
    return fixed;
  };
  
  const aggressiveFixed = aggressiveLatexFix(markdown);
  
  // Normalizar sintaxe LaTeX
  const normalizeLatexSyntax = (text: string): string => {
    let normalized = text;
    
    // Normalizar $ expr $ → $$expr$$
    normalized = normalized.replace(/\$\s+(.+?)\s+\$/g, '$$$$1$$');
    
    // Garantir espaço antes e depois de $$
    normalized = normalized.replace(/([^\s])\$\$/g, '$1 $$');
    normalized = normalized.replace(/\$\$([^\s])/g, '$$ $1');
    
    return normalized;
  };
  
  const latexNormalized = normalizeLatexSyntax(aggressiveFixed);
  
  // ✅ FASE 7: Logging detalhado de conversão
  console.log('[convertToStructured] 📊 Conversion Summary:', {
    markdownLength: latexNormalized.length,
    hasLaTeX: latexNormalized.includes('$$'),
    hasMermaid: latexNormalized.includes('```mermaid'),
    mermaidCount: (latexNormalized.match(/```mermaid/g) || []).length,
    latexCount: (latexNormalized.match(/\$\$/g) || []).length / 2,
  });
  
  // PRÉ-PROCESSAMENTO: Limpar markdown APÓS normalizar LaTeX
  let cleanedMarkdown = latexNormalized
    // 1. Normalizar LaTeX: $ expr $ → $$expr$$
    .replace(/\$\s+(.+?)\s+\$/g, '$$$$1$$')
    // 2. ✅ FASE 1: Remover TODOS os asteriscos de títulos
    .replace(/^(#{1,4})\s*(.+)$/gm, (match, hashes, content) => {
      const cleanContent = content.replace(/\*\*/g, '').trim();
      return `${hashes} ${cleanContent}`;
    })
    // 3. Limpar linhas com apenas "---"
    .replace(/^-{3,}$/gm, '');
  
  const lines = cleanedMarkdown.split('\n');
  const conteudo: any[] = [];
  let currentParagraph = '';
  let skipUntilSection = false; // Flag to skip index/table of contents
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (line.length === 0) {
      if (currentParagraph) {
        conteudo.push({ tipo: 'paragrafo', texto: currentParagraph.trim() });
        currentParagraph = '';
      }
      continue;
    }
    
    // ⛔ DETECT AND SKIP INDEX/TABLE OF CONTENTS
    if (line.match(/^(Índice|##\s*Índice|Sumário|##\s*Sumário|Table of Contents)/i)) {
      console.warn('[convertToStructured] ⚠️ Index detected, skipping until next section');
      skipUntilSection = true;
      continue;
    }
    
    // If we're skipping index, wait for next h2 heading
    if (skipUntilSection) {
      if (line.startsWith('## ') && !line.match(/índice|sumário|table of contents/i)) {
        skipUntilSection = false; // Resume processing
      } else {
        continue; // Skip index lines
      }
    }
    
    // Markdown separator (---)
    if (line.match(/^-{3,}$/)) {
      if (currentParagraph) {
        conteudo.push({ tipo: 'paragrafo', texto: currentParagraph.trim() });
        currentParagraph = '';
      }
      continue;
    }
    
    // H2 headings (## ) - ✅ FASE 1: Remover TODOS os asteriscos
    if (line.startsWith('## ')) {
      if (currentParagraph) {
        conteudo.push({ tipo: 'paragrafo', texto: currentParagraph.trim() });
        currentParagraph = '';
      }
      const cleanTitle = line
        .replace('## ', '')
        .replace(/\*\*/g, '') // Remove TODOS os asteriscos
        .trim();
      conteudo.push({ tipo: 'h2', texto: cleanTitle });
      continue;
    }
    
    // H3 headings (### ) - NORMALIZE TO H2 for compatibility + ✅ FASE 1
    if (line.startsWith('### ')) {
      if (currentParagraph) {
        conteudo.push({ tipo: 'paragrafo', texto: currentParagraph.trim() });
        currentParagraph = '';
      }
      const cleanTitle = line
        .replace('### ', '')
        .replace(/\*\*/g, '') // Remove TODOS os asteriscos
        .trim();
      conteudo.push({ tipo: 'h2', texto: cleanTitle });
      continue;
    }
    
    // H4 headings (#### ) - NORMALIZE TO H2 + ✅ FASE 1
    if (line.startsWith('#### ')) {
      if (currentParagraph) {
        conteudo.push({ tipo: 'paragrafo', texto: currentParagraph.trim() });
        currentParagraph = '';
      }
      const cleanTitle = line
        .replace('#### ', '')
        .replace(/^\*\*|\*\*$/g, '')
        .trim();
      conteudo.push({ tipo: 'h2', texto: cleanTitle });
      continue;
    }
    
    // Mermaid diagrams
    if (line.startsWith('```mermaid')) {
      if (currentParagraph) {
        conteudo.push({ tipo: 'paragrafo', texto: currentParagraph.trim() });
        currentParagraph = '';
      }
      
      let mermaidCode = '';
      i++; // Skip ```mermaid line
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        mermaidCode += lines[i] + '\n';
        i++;
      }
      
      // ✅ VALIDATE AND FIX Mermaid syntax (await corrigido)
      const validation = await validateAndFixMermaidSyntax(mermaidCode);
      
      if (!validation.valid) {
        console.warn('[convertToStructured] ⚠️ Mermaid validation failed:', {
          errors: validation.errors,
          originalCodePreview: mermaidCode.substring(0, 150),
        });
        
        // ✅ FASE 4: ESTRATÉGIA 1 - Tentar AI Fix
        try {
          const fixResponse = await fetch(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/fix-mermaid-diagram`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
              },
              body: JSON.stringify({
                brokenCode: mermaidCode,
                context: 'Engineering educational material',
                strategy: 'Fix syntax errors, ensure ASCII arrows, remove special chars',
                attempt: 1
              }),
              signal: AbortSignal.timeout(10000) // 10s timeout
            }
          );

          if (fixResponse.ok) {
            const { fixedCode } = await fixResponse.json();
            const revalidation = validateMermaidStructure(fixedCode);
            
            if (revalidation.valid) {
              console.log('[convertToStructured] ✅ Mermaid fixed by AI');
              mermaidCode = fixedCode;
            } else {
              throw new Error('AI fix did not pass validation');
            }
          } else {
            throw new Error(`AI fix HTTP ${fixResponse.status}`);
          }
        } catch (aiError) {
          console.error('[convertToStructured] ❌ AI fix failed:', aiError);
          
          // ✅ FASE 8 - CORREÇÃO 4: Fallback Enriquecido com Descrição Semântica
          console.log('[convertToStructured] 📝 Using enriched semantic fallback for Mermaid');
          
          // Extrair informação semântica mais rica do código Mermaid quebrado
          const diagramTypeMatch = mermaidCode.match(/^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|gantt)/);
          const diagramType = diagramTypeMatch ? diagramTypeMatch[1] : 'diagram';
          
          // Extrair nós e labels
          const nodes = mermaidCode.match(/\[([^\]]+)\]/g) || [];
          const nodeLabels = nodes.map(n => n.replace(/[\[\]"']/g, '').trim());
          
          // Extrair conexões (-->, ---, etc)
          const connections = mermaidCode.match(/--[>-]/g) || [];
          
          // Construir descrição semântica rica
          let semanticDescription = '';
          
          if (nodeLabels.length > 0) {
            const nodeList = nodeLabels.slice(0, 5).join(', ');
            const moreNodes = nodeLabels.length > 5 ? ` e outros ${nodeLabels.length - 5} elementos` : '';
            
            semanticDescription = `Este diagrama de tipo ${diagramType} ilustra a relação entre: ${nodeList}${moreNodes}`;
            
            if (connections.length > 0) {
              semanticDescription += `. Contém ${connections.length} conexão(ões) mostrando o fluxo e as interdependências entre os conceitos`;
            }
          } else {
            // Fallback genérico se não conseguir extrair nós
            const typeNames: Record<string, string> = {
              'graph': 'grafo conceitual',
              'flowchart': 'fluxograma de processo',
              'sequenceDiagram': 'diagrama de sequência temporal',
              'classDiagram': 'diagrama de classes e estruturas',
              'stateDiagram': 'diagrama de estados',
              'gantt': 'cronograma de atividades'
            };
            semanticDescription = `Representação visual do tipo ${typeNames[diagramType] || diagramType} relacionada ao tópico da aula`;
          }
          
          console.log(`[convertToStructured] 📝 Generated semantic description: "${semanticDescription.substring(0, 100)}..."`);
          
          conteudo.push({
            tipo: 'caixa_de_destaque',
            titulo: `📊 Diagrama ${diagramType} (renderização temporariamente indisponível)`,
            texto: semanticDescription
          });
          continue;
        }
      } else {
        // Use FIXED code
        mermaidCode = validation.fixed;
      }
      
      // ✅ FASE 10.2: EXTRAIR SEMANTIC DESCRIPTION PARA DIAGRAMAS VÁLIDOS
      const diagramTypeMatch = mermaidCode.match(/^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|gantt)/);
      const diagramType = diagramTypeMatch ? diagramTypeMatch[1] : 'diagram';
      
      const nodes = mermaidCode.match(/\[([^\]]+)\]/g) || [];
      const nodeLabels = nodes.map(n => n.replace(/[\[\]"']/g, '').trim());
      const connections = mermaidCode.match(/--[>-]/g) || [];
      
      let semanticDescription = '';
      if (nodeLabels.length > 0) {
        const nodeList = nodeLabels.slice(0, 5).join(', ');
        const moreNodes = nodeLabels.length > 5 ? ` e outros ${nodeLabels.length - 5} elementos` : '';
        semanticDescription = `Este diagrama de tipo ${diagramType} ilustra a relação entre: ${nodeList}${moreNodes}`;
        if (connections.length > 0) {
          semanticDescription += `. Contém ${connections.length} conexão(ões) mostrando o fluxo e as interdependências entre os conceitos`;
        }
      } else {
        const typeNames: Record<string, string> = {
          'graph': 'grafo conceitual',
          'flowchart': 'fluxograma de processo',
          'sequenceDiagram': 'diagrama de sequência temporal',
          'classDiagram': 'diagrama de classes e estruturas',
          'stateDiagram': 'diagrama de estados',
          'gantt': 'cronograma de atividades'
        };
        semanticDescription = `Representação visual do tipo ${typeNames[diagramType] || diagramType} relacionada ao tópico da aula`;
      }
      
      // Detect correct diagram type
      let tipo = 'diagrama';
      let titulo = '📊 Diagrama Visual';
      
      const trimmedCode = mermaidCode.trim();
      if (trimmedCode.startsWith('graph TD') || trimmedCode.startsWith('graph LR')) {
        tipo = 'fluxograma';
        titulo = '📊 Fluxograma';
      } else if (trimmedCode.startsWith('gantt')) {
        tipo = 'cronograma_gantt';
        titulo = '📅 Cronograma';
      } else if (trimmedCode.includes('sequenceDiagram')) {
        tipo = 'diagrama';
        titulo = '🔄 Diagrama de Sequência';
      } else if (trimmedCode.includes('stateDiagram')) {
        tipo = 'diagrama';
        titulo = '🔀 Diagrama de Estados';
      } else if (trimmedCode.includes('classDiagram')) {
        tipo = 'diagrama';
        titulo = '📐 Diagrama de Classes';
      }
      
      conteudo.push({
        tipo: tipo,
        definicao_mermaid: mermaidCode.trim(),
        titulo: titulo,
        descricao: semanticDescription // ✅ USAR semanticDescription extraída
      });
      continue;
    }
    
    // Blockquotes (callouts)
    if (line.startsWith('> ')) {
      if (currentParagraph) {
        conteudo.push({ tipo: 'paragrafo', texto: currentParagraph.trim() });
        currentParagraph = '';
      }
      
      let blockText = line.replace('> ', '');
      const titleMatch = blockText.match(/\*\*(.+?)\*\*/);
      
      if (titleMatch) {
        const titulo = titleMatch[1];
        const texto = blockText.replace(/\*\*(.+?)\*\*/, '').trim();
        
        // Detect if it's a post-it note
        const lowerText = texto.toLowerCase();
        if (titulo.includes('💡') || titulo.includes('⚠️') || titulo.includes('🤔') || titulo.includes('🌍')) {
          conteudo.push({
            tipo: 'post_it',
            texto: texto || titulo
          });
        } else {
          conteudo.push({
            tipo: 'caixa_de_destaque',
            titulo: titulo.replace(/[📌💡⚠️🤔🌍]/g, '').trim(),
            texto: texto
          });
        }
      } else {
        conteudo.push({
          tipo: 'post_it',
          texto: blockText
        });
      }
      continue;
    }
    
    // Regular paragraphs - accumulate consecutive lines
    if (!line.startsWith('#') && !line.startsWith('```') && !line.startsWith('|') && !line.startsWith('---')) {
      // Skip if line looks like index item (starts with number or bullet)
      if (skipUntilSection || line.match(/^\d+\.\s+/) || line.match(/^\*\s+\d+\./)) {
        continue;
      }
      
      currentParagraph += (currentParagraph ? ' ' : '') + line;
    }
  }
  
  // Add final paragraph if exists
  if (currentParagraph.trim()) {
    conteudo.push({ tipo: 'paragrafo', texto: currentParagraph.trim() });
  }
  
  // Filter empty or very short blocks (< 10 chars)
  const blocosFiltrados = conteudo.filter(bloco => {
    if (!bloco.texto && !bloco.definicao_mermaid) return false;
    if (bloco.texto && bloco.texto.length < 10) return false;
    return true;
  });
  
  console.log(`[convertToStructured] ✅ Converted to ${blocosFiltrados.length} valid blocks (filtered ${conteudo.length - blocosFiltrados.length} empty blocks)`);
  
  return {
    titulo_geral: title,
    conteudo: blocosFiltrados
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId } = await req.json();
    if (!jobId) {
      console.error('[teacher-job-runner] ❌ No jobId provided');
      return new Response(JSON.stringify({ error: 'jobId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[teacher-job-runner] 🔄 Processing job: ${jobId}`);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch job
    const { data: job, error: jobError } = await supabaseAdmin
      .from('teacher_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      console.error(`[teacher-job-runner] ❌ Job not found: ${jobId}`, jobError);
      return new Response(JSON.stringify({ error: 'Job not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Job ${jobId}] ✅ Found: ${job.job_type} | Status: ${job.status} | Lecture: ${job.lecture_id}`);

    // Update status to PROCESSING
    await supabaseAdmin
      .from('teacher_jobs')
      .update({ status: 'PROCESSING', updated_at: new Date().toISOString() })
      .eq('id', jobId);

    console.log(`[Job ${jobId}] 🔄 Status updated to PROCESSING`);

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Handle GENERATE_LECTURE_DEEP_SEARCH job type
    if (job.job_type === 'GENERATE_LECTURE_DEEP_SEARCH') {
      console.log(`[Job ${jobId}] 🔍 Processing GENERATE_LECTURE_DEEP_SEARCH`);
      await processLectureDeepSearch(job, supabaseAdmin, lovableApiKey);
      return new Response(
        JSON.stringify({ success: true, message: 'Deep search job completed' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Handle GENERATE_QUIZ and GENERATE_FLASHCARDS
    const { title, transcript, tags } = job.input_payload;

    let systemPrompt = '';
    let userPrompt = '';

    if (job.job_type === 'GENERATE_QUIZ') {
      const lectureTags = job.input_payload.tags || [];
      const tagsText = lectureTags.length > 0 ? lectureTags.join(', ') : 'Não especificadas';
      
      systemPrompt = `Você é um assistente especializado em criar questões de múltipla escolha para avaliação em cursos de engenharia, seguindo rigorosamente a Taxonomia de Bloom.

INSTRUÇÕES CRÍTICAS:
1. **PRIORIZAÇÃO DE CONTEÚDO**: 
   - 70% das questões devem focar no TÍTULO e TAGS da aula
   - 30% podem usar detalhes complementares da transcrição
2. Responda em português brasileiro
3. Retorne APENAS JSON válido, sem markdown
4. Crie 10 questões de múltipla escolha
5. Cada questão deve ter 4 alternativas (A, B, C, D)
6. Identifique corretamente a alternativa correta
7. Classifique cada questão segundo Bloom

NÍVEIS DE BLOOM (distribuição recomendada):
- 3 questões: Conhecimento (definições, conceitos básicos do título)
- 3 questões: Compreensão (explicações, interpretações das tags)
- 2 questões: Aplicação (uso prático, exemplos)
- 2 questões: Análise (comparações, relações)

FORMATO JSON:
{
  "questions": [
    {
      "question": "Texto da pergunta clara e objetiva",
      "options": {
        "A": "Texto alternativa A",
        "B": "Texto alternativa B",
        "C": "Texto alternativa C",
        "D": "Texto alternativa D"
      },
      "correctAnswer": "A",
      "bloomLevel": "Aplicação",
      "explanation": "Explicação detalhada (2-3 frases)"
    }
  ]
}`;

      userPrompt = `# CONTEXTO PRINCIPAL (PRIORIDADE MÁXIMA - 70% das questões)
Título da Aula: "${title}"
Tags da Aula: ${tagsText}

# INSTRUÇÕES
Gere 10 questões focadas PRINCIPALMENTE no título e tags acima. Use a transcrição apenas para detalhes complementares.

# TRANSCRIÇÃO DA AULA (usar apenas 30% para detalhes)
${transcript}

IMPORTANTE: Retorne APENAS o JSON, sem texto adicional.`;

    } else if (job.job_type === 'GENERATE_FLASHCARDS') {
      const lectureTags = job.input_payload.tags || [];
      const tagsText = lectureTags.length > 0 ? lectureTags.join(', ') : 'Não especificadas';
      
      systemPrompt = `Você é um assistente especializado em criar flashcards educacionais para cursos de engenharia.

INSTRUÇÕES CRÍTICAS:
1. **PRIORIZAÇÃO DE CONTEÚDO**:
   - 70% dos flashcards devem focar no TÍTULO e TAGS da aula
   - 30% podem usar detalhes complementares da transcrição
2. Responda em português brasileiro
3. Retorne APENAS JSON válido, sem markdown
4. Crie 15 flashcards
5. Cada flashcard deve ter frente (pergunta/conceito) e verso (resposta/explicação)
6. Inclua tags relevantes para organização (usar tags da aula quando possível)

TIPOS DE FLASHCARDS (distribuição recomendada):
- 5 flashcards: Definições (conceitos-chave do título)
- 5 flashcards: Explicações (relacionadas às tags)
- 5 flashcards: Aplicações (exemplos práticos)

REGRAS:
- Front: Sempre uma pergunta direta (max 100 caracteres)
- Back: Resposta concisa e objetiva (max 200 caracteres)
- Tags: 2-3 tags por card (usar tags da aula quando possível)

FORMATO JSON:
{
  "cards": [
    {
      "front": "Pergunta clara e direta",
      "back": "Resposta concisa e objetiva",
      "tags": ["tag1", "tag2"]
    }
  ]
}`;

      userPrompt = `# CONTEXTO PRINCIPAL (PRIORIDADE MÁXIMA - 70% dos flashcards)
Título da Aula: "${title}"
Tags da Aula: ${tagsText}

# INSTRUÇÕES
Gere 15 flashcards focados PRINCIPALMENTE no título e tags acima. Use a transcrição apenas para detalhes complementares.

# TRANSCRIÇÃO DA AULA (usar apenas 30% para detalhes)
${transcript}

IMPORTANTE: Retorne APENAS o JSON, sem texto adicional.`;
    }

    console.log(`[Job ${jobId}] 🤖 Calling Lovable AI with 60s timeout...`);

    // Call Lovable AI with 60s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    let aiResponse;
    try {
      aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
        }),
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('AI request timed out after 60 seconds');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }

    console.log(`[Job ${jobId}] ✅ AI response status: ${aiResponse.status}`);

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error(`[Job ${jobId}] ❌ AI API error: ${aiResponse.status}`, errorText);
      
      if (aiResponse.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (aiResponse.status === 402) {
        throw new Error('Payment required. Please add credits to your Lovable AI workspace.');
      }
      throw new Error(`AI API error: ${aiResponse.status} ${errorText}`);
    }

    const aiData = await aiResponse.json();
    console.log(`[Job ${jobId}] 📦 AI response received, parsing content...`);

    const content = aiData.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No content in AI response');
    }

    const sanitized = sanitizeJSON(content);
    console.log(`[Job ${jobId}] 🧹 Content sanitized, parsing JSON...`);

    const parsedData = JSON.parse(sanitized);

    // Validate structure
    if (job.job_type === 'GENERATE_QUIZ') {
      if (!parsedData.questions || !Array.isArray(parsedData.questions)) {
        throw new Error('Invalid quiz structure: missing questions array');
      }
      
      console.log(`[Job ${jobId}] ✅ Quiz validated: ${parsedData.questions.length} questions`);

      // Save to teacher_quizzes table
      const { error: insertError } = await supabaseAdmin
        .from('teacher_quizzes')
        .insert({
          lecture_id: job.lecture_id,
          teacher_id: job.teacher_id,
          title: title || 'Quiz sem título',
          questions: parsedData.questions
        });

      if (insertError) {
        console.error(`[Job ${jobId}] ❌ Failed to save quiz:`, insertError);
        throw new Error(`Failed to save quiz: ${insertError.message}`);
      }

    } else if (job.job_type === 'GENERATE_FLASHCARDS') {
      if (!parsedData.cards || !Array.isArray(parsedData.cards)) {
        throw new Error('Invalid flashcards structure: missing cards array');
      }
      
      console.log(`[Job ${jobId}] ✅ Flashcards validated: ${parsedData.cards.length} cards`);

      // Save to teacher_flashcards table
      const { error: insertError } = await supabaseAdmin
        .from('teacher_flashcards')
        .insert({
          lecture_id: job.lecture_id,
          teacher_id: job.teacher_id,
          title: title || 'Flashcards sem título',
          cards: parsedData.cards
        });

      if (insertError) {
        console.error(`[Job ${jobId}] ❌ Failed to save flashcards:`, insertError);
        throw new Error(`Failed to save flashcards: ${insertError.message}`);
      }
    }

    // Update job status to COMPLETED
    await supabaseAdmin
      .from('teacher_jobs')
      .update({
        status: 'COMPLETED',
        result_payload: parsedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    console.log(`[Job ${jobId}] 🎉 Job completed successfully`);

    return new Response(
      JSON.stringify({ success: true, message: 'Job completed successfully' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[teacher-job-runner] ❌ Error:', errorMessage);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});