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
  const fixedReport = await fixLatexErrors(preprocessedReport, jobId);

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
  const structuredJSON = await convertMarkdownToStructuredJSON(fixedReport, 'Material Didático');
  
  // ETAPA 4: Save structured JSON
  const { error: updateError } = await supabase
    .from('lectures')
    .update({
      structured_content: {
        ...existingContent,
        material_didatico: JSON.stringify(structuredJSON)
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
        'ieee.org',
        'ieeexplore.ieee.org',
        'sciencedirect.com',
        'springer.com',
        'springerlink.com',
        'researchgate.net',
        'doi.org',
        '.edu',
        'nature.com',
        'science.org',
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
      
      // ✅ CRITÉRIOS DE REJEIÇÃO
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
    
    const refValidation = validateReferences(report);
    if (!refValidation.valid) {
      console.warn(`[Job ${job.id}] ⚠️ Reference quality issues:`, refValidation.errors);
      // NÃO bloquear, apenas avisar
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
      const response = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(question)}&count=5`,
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
            content: `Você é Mia, professora de engenharia especializada em criar material didático acadêmico de alta qualidade.

**Informações do Professor:**
- Nome: ${teacherName || 'Professor'}

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
- "graphTDA[...]" (tipo colado no node)
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

# 🎓 SISTEMA DE REFERÊNCIAS (OBRIGATÓRIO)

**Durante o texto:**
- Cite fontes inline: "...conforme demonstrado por Smith et al. [1]"
- Use numeração sequencial: [1], [2], [3]

**Seção final "Fontes e Referências":**
\`\`\`
## 7. Fontes e Referências

[1] Título completo do artigo/livro - Autor(es), Ano
[2] Nome da fonte - URL completa
[3] Título do paper - Revista/Conferência, Volume, Páginas
\`\`\`

# 📚 REQUISITOS DE FONTES

**PRIORIZE (70% das citações):**
- IEEE Xplore, ScienceDirect, SpringerLink
- Livros-texto de engenharia (ex: Çengel, Incropera)
- Normas técnicas (ABNT, ISO)
- Periódicos acadêmicos revisados por pares

**EVITE CITAR:**
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
4. Seja **tecnicamente preciso** e pedagogicamente **engajador**`
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
 * Valida e corrige sintaxe Mermaid antes de salvar
 */
function validateAndFixMermaidSyntax(code: string): { valid: boolean; fixed: string; errors: string[] } {
  const errors: string[] = [];
  let fixed = code.trim();
  
  console.log('[Mermaid Validator] 🔍 Checking syntax...');
  
  // 0. ✅ FASE 2: Corrigir LINHA INTEIRA de graph com tipo colado
  // Ex: "graphTDA["Identificar Sistema"]" → "graph TD\n    A["Identificar Sistema"]"
  fixed = fixed.replace(/^graphTD([A-Z]+)\[([^\]]*)\]/gm, (match, nodeName, label) => {
    console.log(`[Fix] Full line detected: "${match}"`);
    console.log(`[Fix] → nodeName: "${nodeName}", label: "${label}"`);
    
    // Extrair tipo de diagrama (TD/LR/TB/BT) se estiver colado no início
    // Ex: "graphTDA[...]" → tipo = "TD", nodeName = "A"
    const typeMatch = nodeName.match(/^(TD|LR|TB|BT)(.*)$/);
    
    if (typeMatch) {
      const [, graphType, restOfName] = typeMatch;
      const actualNode = restOfName || 'A';
      
      // Verificar se label tem aspas
      const hasQuotes = label.includes('"') || label.includes("'");
      const cleanLabel = label.replace(/^["']|["']$/g, ''); // Remover aspas nas pontas
      
      console.log(`[Fix] Corrected to: graph ${graphType}\\n    ${actualNode}["${cleanLabel}"]`);
      return `graph ${graphType}\n    ${actualNode}["${cleanLabel}"]`;
    }
    
    // Fallback: não conseguiu extrair tipo
    console.warn(`[Fix] Could not extract graph type from: ${match}`);
    return `graph TD\n    ${nodeName}["${label}"]`;
  });

  // Corrigir casos onde graph já tem espaço mas tipo está colado no node
  // Ex: "graph TDA[...]" → "graph TD\n    A[...]"
  fixed = fixed.replace(/^graph\s+([A-Z]{2,})([A-Z]+)\[([^\]]*)\]/gm, (match, type, nodeName, label) => {
    // Se type é TD/LR/TB/BT válido
    if (['TD', 'LR', 'TB', 'BT'].includes(type)) {
      const hasQuotes = label.includes('"') || label.includes("'");
      const cleanLabel = label.replace(/^["']|["']$/g, '');
      console.log(`[Fix] Space-separated corrected: graph ${type}\\n    ${nodeName}["${cleanLabel}"]`);
      return `graph ${type}\n    ${nodeName}["${cleanLabel}"]`;
    }
    
    // Se não, o tipo está colado (ex: TDA)
    const graphType = type.slice(0, 2); // TD
    const restNode = type.slice(2) + nodeName; // A + resto
    const cleanLabel = label.replace(/^["']|["']$/g, '');
    return `graph ${graphType}\n    ${restNode}["${cleanLabel}"]`;
  });

  // Corrigir subgraph sem espaço
  // Ex: "subgraphSistema[...]" → "subgraph Sistema\n    A[...]"
  fixed = fixed.replace(/^subgraph([A-Z]\w+)\[/gm, (match, name) => {
    return `subgraph ${name}\n    A[`;
  });
  
  // 1. Corrigir caracteres proibidos em nomes de métodos/atributos
  // Ex: +trocaMassa() → trocaMassa()
  fixed = fixed.replace(/\+(\w+)\(/g, '$1(');
  
  // 2. Corrigir espaços em definições de classe
  // Ex: "class Sistema Fechado" → "class SistemaFechado"
  fixed = fixed.replace(/class\s+([A-Z]\w+)\s+([A-Z]\w+)/g, (match, word1, word2) => {
    return `class ${word1}${word2}`;
  });
  
  // 3. Corrigir espaços em nomes de nós/classes (ex: "Sistema Fechado" → "SistemaFechado")
  fixed = fixed.replace(/(\w+)\s+(\w+)(?=\s*[\[\{:])/g, '$1$2');
  
  // 4. Remover caracteres especiais em labels que não estão entre aspas
  fixed = fixed.replace(/([^"'\[])(\+)(\w+)/g, '$1$3');
  
  // 5. Corrigir sintaxe de subgrafos (subgraph deve ter nome sem espaços)
  fixed = fixed.replace(/subgraph\s+([^[\n]+)\s+([A-Z]\w+)/g, (match, word1, word2) => {
    const combinedName = word1.trim().replace(/\s+/g, '') + word2;
    return `subgraph ${combinedName}`;
  });
  
  // 6. Garantir que labels com caracteres especiais/acentos estejam entre aspas
  fixed = fixed.replace(/\[([^\]]*[áéíóúâêôãõçÁÉÍÓÚÂÊÔÃÕÇ][^\]]*)\]/gi, (match, content) => {
    if (content.includes('"') || content.includes("'")) return match;
    return `["${content}"]`;
  });
  
  // 7. Corrigir atributos de classe com espaços (ex: +energia_total E → +energia_total)
  if (fixed.includes('classDiagram')) {
    // Remover texto após espaço em linhas de atributos/métodos
    fixed = fixed.replace(/^\s*([\+\-\#\~])(\w+)\s+([A-Z]\w+)$/gm, '$1$2');
    // Remover espaços em nomes de classes (ex: "Sistema Fechado" → "SistemaFechado")
    fixed = fixed.replace(/class\s+(\w+)\s+(\w+)/g, 'class $1$2');
  }
  
  // 8. Corrigir sintaxe de relacionamentos em classDiagrams
  if (fixed.includes('classDiagram')) {
    // Garantir que relacionamentos não tenham espaços nos nomes
    fixed = fixed.replace(/(\w+)\s+(\w+)\s*(--|\.\.|\*--|o--)/g, '$1$2 $3');
  }
  
  // 9. Validar estrutura básica
  if (!fixed.includes('graph') && !fixed.includes('classDiagram') && !fixed.includes('sequenceDiagram') && !fixed.includes('gantt')) {
    errors.push('Tipo de diagrama não reconhecido');
    return { valid: false, fixed, errors };
  }
  
  // ✅ FASE 1: Validação estrita de sintaxe básica
  if (fixed.includes('graph')) {
    // DEVE ter: "graph TD" ou "graph LR" com espaço
    if (!fixed.match(/^graph\s+(TD|LR|TB|BT)\s/m)) {
      errors.push('Sintaxe inválida: "graph" deve ser seguido de TD/LR/TB/BT e espaço');
    }
    
    // DEVE ter pelo menos um nó: A[...]
    if (!fixed.match(/[A-Z]\[/)) {
      errors.push('Nenhum nó encontrado (formato: A[Label])');
    }
  }

  if (fixed.includes('classDiagram')) {
    // DEVE ter pelo menos uma declaração de classe
    if (!fixed.match(/class\s+\w+/)) {
      errors.push('Nenhuma classe definida em classDiagram');
    }
  }
  
  // 10. Validar nodes (não podem ter espaços sem aspas)
  const nodeRegex = /(\w+)\s+([A-Z]\w+)\s*\[/g;
  const matches = fixed.match(nodeRegex);
  if (matches) {
    matches.forEach(match => {
      const fixedMatch = match.replace(/\s+/g, '');
      fixed = fixed.replace(match, fixedMatch);
    });
  }
  
  // 11. Verificar linhas vazias excessivas
  fixed = fixed.replace(/\n\n+/g, '\n');
  
  // 12. Validar fechamentos de blocos
  const openBraces = (fixed.match(/\{/g) || []).length;
  const closeBraces = (fixed.match(/\}/g) || []).length;
  
  if (openBraces !== closeBraces) {
    errors.push(`Parênteses desbalanceados: ${openBraces} { vs ${closeBraces} }`);
  }
  
  // ✅ FASE 3: Validações OBRIGATÓRIAS - verificar código ORIGINAL, não fixado
  const criticalErrors = [
    // Detectar no código ORIGINAL (antes de fixes)
    code.match(/graph[A-Z]{3,}\[/), // graphTDA[, graphLRA[, etc.
    code.match(/graph[A-Z]{2}[A-Z]+\[/), // graphTDA[, graph TD A[ (sem quebra)
    code.match(/subgraph[A-Z]+\[/), // subgraphNome[
    // Verificar se, APÓS os fixes, ainda não tem tipo correto
    (!fixed.match(/^graph\s+(TD|LR|TB|BT)\s+/m) && fixed.includes('graph')),
  ];

  // Adicionar detecção de tags HTML em labels (comum quando AI gera <br/>)
  if (code.includes('<br/>') || code.includes('<br>')) {
    errors.push('CRITICAL: Tags HTML detectadas em código Mermaid (usar \\n)');
  }

  if (criticalErrors.some(Boolean)) {
    errors.push('CRITICAL: Estrutura Mermaid inválida - sintaxe incorreta detectada no código ORIGINAL');
    console.error('[Mermaid Validator] CRITICAL errors in ORIGINAL code:', {
      originalCode: code.substring(0, 150),
      fixedCode: fixed.substring(0, 150),
      hasGraphWithoutProperSpacing: !!code.match(/graph[A-Z]{2,}\[/),
      hasSubgraphIssue: !!code.match(/subgraph[A-Z]+\[/),
      hasHTMLTags: code.includes('<br'),
    });
  }
  
  const valid = errors.length === 0;
  console.log(`[Mermaid Validator] ${valid ? '✅ Valid' : '❌ Invalid'} - Errors: ${errors.length}`);
  
  if (!valid) {
    console.warn('[Mermaid Validator] Full errors:', errors);
    console.warn('[Mermaid Validator] Original vs Fixed:', {
      original: code.substring(0, 200),
      fixed: fixed.substring(0, 200)
    });
  }
  
  return { valid, fixed, errors };
}

// Convert Markdown to Structured JSON (for StructuredContentRenderer - same logic as TeacherAnnotations)
async function convertMarkdownToStructuredJSON(markdown: string, title: string): Promise<any> {
  console.log('[convertToStructured] 🔄 Converting markdown to structured JSON...');
  
  // ✅ FASE 4: AGGRESSIVE LaTeX Fix - EXECUTAR ANTES da normalização normal
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
      
      // ✅ VALIDATE AND FIX Mermaid syntax
      const validation = validateAndFixMermaidSyntax(mermaidCode);
      
      if (!validation.valid) {
        // ✅ FASE 7: Log detalhado de debug Mermaid
        console.warn('[convertToStructured] ⚠️ Mermaid validation failed:', {
          errors: validation.errors,
          originalCodePreview: mermaidCode.substring(0, 150),
          fixedCodePreview: validation.fixed.substring(0, 150),
        });
        
        // ✅ CHAMAR AI FIX
        console.log('[convertToStructured] 🤖 Calling AI to fix Mermaid...');
        
        // ✅ CHAMAR EDGE FUNCTION para correção com AI
        try {
          const fixResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/fix-mermaid-diagram`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
            },
            body: JSON.stringify({
              brokenCode: mermaidCode,
              context: title,
              strategy: 'Fix sintaxe mantendo estrutura original',
              attempt: 1
            })
          });
          
          if (fixResponse.ok) {
            const { fixedCode } = await fixResponse.json();
            console.log('[convertToStructured] ✅ AI fixed Mermaid code');
            
            // Re-validar código corrigido
            const revalidation = validateAndFixMermaidSyntax(fixedCode);
            if (revalidation.valid) {
              mermaidCode = revalidation.fixed;
            } else {
              mermaidCode = fixedCode; // Usar mesmo se não passar validação estrita
            }
          } else {
            console.error('[convertToStructured] ❌ AI fix failed, using placeholder');
            conteudo.push({
              tipo: 'caixa_de_destaque',
              titulo: '📊 Diagrama Visual',
              texto: 'Um diagrama foi planejado mas requer ajustes técnicos.'
            });
            continue;
          }
        } catch (err) {
          console.error('[convertToStructured] ❌ AI fix error:', err);
          conteudo.push({
            tipo: 'caixa_de_destaque',
            titulo: '📊 Diagrama Visual',
            texto: 'Um diagrama foi planejado mas requer ajustes técnicos.'
          });
          continue;
        }
      } else {
        // Use FIXED code
        mermaidCode = validation.fixed;
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
        descricao: 'Representação visual do conceito'
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