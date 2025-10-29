/**
 * 🔄 CONVERSOR UNIFICADO: Markdown → Structured JSON
 * Usado por: Lectures (Deep Search) + Annotations (Improve Didactic)
 */

/**
 * Aggressive LaTeX fixing - removes corrupted placeholders and fixes syntax
 */
function aggressiveLatexFix(text: string): string {
  console.log('[AGGRESSIVE LaTeX Fix] 🔥 Fixing corrupted LaTeX...');
  
  let fixed = text;
  
  // 1. Remover placeholders corrompidos: ** 1$ **, ___LATEX_DOUBLE_2___, etc.
  fixed = fixed.replace(/\*\*\s*\d+\$\s*\*\*/g, '');
  fixed = fixed.replace(/___LATEX_DOUBLE_\d+___/g, '');
  fixed = fixed.replace(/___LATEX_SINGLE_\d+___/g, '');
  fixed = fixed.replace(/\*\*\s*\\\w+.*?\$\s*\*\*/g, (match) => {
    const formula = match.replace(/\*\*/g, '').replace(/\$/g, '').trim();
    return ` $$${formula}$$ `;
  });
  
  // Detectar e remover $ isolados com espaços
  fixed = fixed.replace(/\$\s+/g, '');
  fixed = fixed.replace(/\s+\$/g, '');
  
  // Detectar $ sem fechamento
  fixed = fixed.replace(/\$([^$\n]{1,50})(?!\$)/g, '$$$$1$$');
  
  // Remover variáveis de 1 letra isoladas FORA de LaTeX
  const parts = fixed.split('$$');
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      parts[i] = parts[i].replace(/\s([a-z])\s+/gi, ' ');
    }
  }
  fixed = parts.join('$$');
  
  // Completar fórmulas incompletas
  fixed = fixed.replace(
    /\b([A-Z][a-z]?)\s*=\s*([A-Z][a-z]?)\s*[-+]\s*([A-Z][a-z]?)/g,
    '$$$$1 = $$2 - $$3$$'
  );
  
  // 2. Detectar expressões matemáticas isoladas (sem $$)
  fixed = fixed.replace(
    /(?:^|\n|\s)(\\[A-Za-z]+(?:\{[^}]*\})?(?:\s*[=+\-*/^_]\s*\\?[A-Za-z0-9{}]+)+)/gm,
    (match, formula) => {
      if (!match.includes('$$')) {
        return match.replace(formula, ` $$${formula.trim()}$$ `);
      }
      return match;
    }
  );
  
  // 3. Converter $ simples para $$
  fixed = fixed.replace(/\$([^$\n]+?)\$/g, (match, content) => {
    if (match.startsWith('$$')) return match;
    return `$$${content}$$`;
  });
  
  // 4. Limpar espaços extras
  fixed = fixed.replace(/\s+\$\$/g, ' $$');
  fixed = fixed.replace(/\$\$\s+/g, '$$ ');
  
  console.log('[AGGRESSIVE LaTeX Fix] ✅ Completed aggressive fix');
  return fixed;
}

/**
 * Normalize LaTeX syntax - ensure proper delimiters and spacing
 */
function normalizeLatexSyntax(text: string): string {
  let normalized = text;
  
  // Normalizar $ expr $ → $$expr$$
  normalized = normalized.replace(/\$\s+(.+?)\s+\$/g, '$$$$1$$');
  
  // Garantir espaço antes e depois de $$
  normalized = normalized.replace(/([^\s])\$\$/g, '$1 $$');
  normalized = normalized.replace(/\$\$([^\s])/g, '$$ $1');
  
  return normalized;
}

interface ConversionOptions {
  jobId?: string;
  enableLatexFix?: boolean;
  enableMermaidValidation?: boolean;
  enableReferenceFormatting?: boolean;
  enableMarkdownToHtml?: boolean;
}

interface ConversionResult {
  success: boolean;
  data?: any;
  error?: string;
  warnings?: string[];
}

/**
 * Converte Markdown em texto para HTML inline
 */
function convertMarkdownToHTML(text: string): string {
  if (!text || typeof text !== 'string') return text;
  
  return text
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/__(.+?)__/g, '<u>$1</u>')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\\([*_#])/g, '$1');
}

/**
 * Valida e sanitiza Mermaid diagrams
 */
function sanitizeMermaidDiagram(mermaid: string, blockIndex: number, jobId?: string): any {
  const originalLength = mermaid.length;
  let sanitized = mermaid;
  
  // 1. Validar tipo de diagrama
  const validTypes = /^(graph|flowchart|mindmap|gantt)\s/m;
  if (!sanitized.match(validTypes)) {
    console.warn(`[Mermaid] ⚠️ Bloco ${blockIndex}: Tipo inválido - REMOVENDO`);
    return {
      tipo: 'paragrafo',
      texto: '<em class="text-muted-foreground">⚠️ Diagrama removido (tipo inválido)</em>'
    };
  }
  
  // 2. Substituir setas Unicode
  sanitized = sanitized
    .replace(/→/g, '-->')
    .replace(/←/g, '<--')
    .replace(/↔/g, '<-->')
    .replace(/⇒/g, '==>')
    .replace(/⇐/g, '<==')
    .replace(/⇔/g, '<==>');
  
  // 3. Remover caracteres matemáticos problemáticos
  sanitized = sanitized
    .replace(/[×÷±≈≠≤≥∞∫∂∑∏√]/g, ' ')
    .replace(/[²³⁴⁵⁶⁷⁸⁹⁰]/g, '')
    .replace(/[₀₁₂₃₄₅₆₇₈₉]/g, '');
  
  // 4. Simplificar labels complexos
  sanitized = sanitized
    .replace(/\[([^\]]*?)(P\/γ|V²\/2g|ρgh|[A-Z]\/[A-Z]|²\/\d)([^\]]*?)\]/g, '[Fórmula]')
    .replace(/\[([^\]]*?)\(([^)]*?)\)([^\]]*?)\]/g, '[$1 - $2 $3]')
    .replace(/\d+\/\d+/g, 'ratio');
  
  // 5. Limpar espaços e caracteres de controle
  sanitized = sanitized
    .replace(/\s+/g, ' ')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim();
  
  if (sanitized.length !== originalLength && jobId) {
    console.log(`[Mermaid] Bloco ${blockIndex}: Sanitizado (${originalLength} → ${sanitized.length} chars)`);
  }
  
  // 6. Verificação final
  const problematicPatterns = [
    /[→←↔⇒⇐⇔]/,
    /[²³⁴⁵⁶⁷⁸⁹⁰₀₁₂₃₄₅₆₇₈₉]/,
    /\[[^\]]*?\([^\)]*?\([^\)]*?\)/
  ];
  
  for (const pattern of problematicPatterns) {
    if (sanitized.match(pattern)) {
      console.warn(`[Mermaid] ⚠️ Bloco ${blockIndex}: Ainda com erros - REMOVENDO`);
      return {
        tipo: 'paragrafo',
        texto: '<em class="text-muted-foreground">⚠️ Diagrama removido por conter sintaxe incompatível</em>'
      };
    }
  }
  
  return { definicao_mermaid: sanitized };
}

/**
 * Formata referências bibliográficas
 */
function formatReferences(refs: string[] | string): string[] {
  let refArray: string[] = [];
  
  if (typeof refs === 'string') {
    refArray = refs.split(/(?=\[\d+\])/).filter(r => r.trim());
  } else if (Array.isArray(refs)) {
    refArray = refs;
  }
  
  return refArray.map(ref => {
    let formatted = ref.trim();
    
    formatted = formatted
      .replace(/(\[\d+\])\s*/g, '<br><br>$1 ')
      .replace(/\s*-\s*URL:/gi, '<br>- URL: ')
      .replace(/\s*-\s*Autor:/gi, '<br>- Autor: ')
      .replace(/(\(PDF\)|\[PDF\])/gi, '$1<br>')
      .replace(/(<br\s*\/?>){3,}/gi, '<br><br>')
      .replace(/(https?:\/\/[^\s<]+)\s*(\[\d+\])/gi, '$1<br><br>$2')
      .replace(/(<br\s*\/?>)+$/gi, '')
      .replace(/^(<br\s*\/?>)+/, '');
    
    return formatted.endsWith('<br><br>') ? formatted : formatted + '<br><br>';
  });
}

/**
 * Processa blocos recursivamente para converter markdown em HTML
 */
function processBlocksRecursively(block: any, options: ConversionOptions): any {
  if (!block) return block;
  
  if (Array.isArray(block)) {
    return block.map(b => processBlocksRecursively(b, options));
  }
  
  if (typeof block !== 'object') {
    return block;
  }
  
  const processed: any = {};
  
  for (const [key, value] of Object.entries(block)) {
    if (['texto', 'titulo', 'descricao', 'content', 'trigger'].includes(key) && typeof value === 'string') {
      let htmlValue = options.enableMarkdownToHtml 
        ? convertMarkdownToHTML(value) 
        : value;
      
      if (options.enableReferenceFormatting && htmlValue.match(/\[\d+\]/)) {
        htmlValue = htmlValue
          .replace(/(\[\d+\])\s*/g, '<br><br>$1 ')
          .replace(/\s*-\s*URL:/gi, '<br>- URL: ')
          .replace(/\s*-\s*Autor:/gi, '<br>- Autor: ')
          .replace(/(\(PDF\)|\[PDF\])/gi, '$1<br>')
          .replace(/(<br\s*\/?>){3,}/gi, '<br><br>')
          .replace(/(https?:\/\/[^\s<]+)\s*(\[\d+\])/gi, '$1<br><br>$2')
          .trim();
      }
      
      processed[key] = htmlValue;
    }
    else if (key === 'itens' && Array.isArray(value)) {
      if (options.enableReferenceFormatting) {
        processed[key] = formatReferences(value);
      } else {
        processed[key] = value.map(item => 
          typeof item === 'string' && options.enableMarkdownToHtml
            ? convertMarkdownToHTML(item)
            : processBlocksRecursively(item, options)
        );
      }
    }
    else if (typeof value === 'object' && value !== null) {
      processed[key] = processBlocksRecursively(value, options);
    }
    else {
      processed[key] = value;
    }
  }
  
  return processed;
}

/**
 * 🎯 FUNÇÃO PRINCIPAL: Converter Markdown para JSON Estruturado
 */
export async function convertMarkdownToStructuredJSON(
  markdown: string,
  title: string,
  options: ConversionOptions = {}
): Promise<ConversionResult> {
  const jobId = options.jobId || 'no-id';
  const warnings: string[] = [];
  
  console.log(`[Converter ${jobId}] 🔄 Starting conversion...`);
  console.log(`[Converter ${jobId}] 📊 Input: ${markdown.length} chars`);
  
  try {
    // ETAPA 1: LaTeX fixes (opcional)
    let processedMarkdown = markdown;
    if (options.enableLatexFix) {
      const fixed = aggressiveLatexFix(markdown);
      processedMarkdown = normalizeLatexSyntax(fixed);
    }
    
    // ETAPA 2: Limpar formatação de headings
    processedMarkdown = processedMarkdown.replace(/^(#{1,4})\s*(.+)$/gm, (match, hashes, content) => {
      return `${hashes} ${content.replace(/\*\*/g, '').trim()}`;
    });
    
    // ETAPA 3: Parse linha por linha
    const lines = processedMarkdown.split('\n');
    const conteudo: any[] = [];
    let currentParagraph = '';
    let currentList: string[] = [];
    
    let parsedBlocks = 0;
    
    const finalizeParagraph = () => {
      if (currentParagraph.trim()) {
        conteudo.push({
          tipo: 'paragrafo',
          texto: currentParagraph.trim()
        });
        console.log(`[Converter ${jobId}] ✅ Finalized paragraph (${currentParagraph.length} chars)`);
        currentParagraph = '';
        parsedBlocks++;
      }
    };
    
    const finalizeList = () => {
      if (currentList.length > 0) {
        conteudo.push({
          tipo: 'lista',
          itens: currentList.map(item => item.trim())
        });
        currentList = [];
      }
    };
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // ✅ FASE 1: Log a cada 50 linhas
      if (i % 50 === 0) {
        console.log(`[Converter ${jobId}] Progress: Line ${i}/${lines.length}, Blocks: ${conteudo.length}`);
      }
      
      if (!trimmedLine) {
        finalizeParagraph();
        finalizeList();
        continue;
      }
      
      // Headings
      if (trimmedLine.startsWith('## ')) {
        finalizeParagraph();
        finalizeList();
        conteudo.push({
          tipo: 'h2',
          texto: trimmedLine.replace('## ', '').replace(/\*\*/g, '').trim()
        });
        continue;
      }
      
      if (trimmedLine.startsWith('### ')) {
        finalizeParagraph();
        finalizeList();
        conteudo.push({
          tipo: 'h3',
          texto: trimmedLine.replace('### ', '').replace(/\*\*/g, '').trim()
        });
        continue;
      }
      
      if (trimmedLine.startsWith('#### ')) {
        finalizeParagraph();
        finalizeList();
        conteudo.push({
          tipo: 'h4',
          texto: trimmedLine.replace('#### ', '').replace(/\*\*/g, '').trim()
        });
        continue;
      }
      
      // Mermaid diagrams
      if (trimmedLine.startsWith('```mermaid')) {
        finalizeParagraph();
        finalizeList();
        
        let mermaidCode = '';
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          mermaidCode += lines[i] + '\n';
          i++;
        }
        
        if (options.enableMermaidValidation) {
          const sanitized = sanitizeMermaidDiagram(mermaidCode, conteudo.length, jobId);
          if (sanitized.tipo === 'paragrafo') {
            warnings.push(`Diagrama ${conteudo.length} removido por sintaxe inválida`);
          }
          conteudo.push(sanitized);
        } else {
          conteudo.push({
            tipo: 'diagrama',
            definicao_mermaid: mermaidCode.trim()
          });
        }
        continue;
      }
      
      // Lists
      if (/^[\-\*•]\s+/.test(trimmedLine)) {
        finalizeParagraph();
        currentList.push(trimmedLine.replace(/^[\-\*•]\s+/, ''));
        continue;
      }
      
      // Highlight boxes
      if (trimmedLine.startsWith('> ') || /^\*\*[A-Z][^:]+:\*\*/.test(trimmedLine)) {
        finalizeParagraph();
        finalizeList();
        conteudo.push({
          tipo: 'caixa_de_destaque',
          texto: trimmedLine.replace(/^> /, '').trim()
        });
        continue;
      }
      
      // Normal text
      if (!trimmedLine.startsWith('#') && !trimmedLine.startsWith('```')) {
        if (currentList.length > 0) finalizeParagraph();
        
        if (!currentParagraph) {
          currentParagraph = trimmedLine;
        } else {
          // ✅ FASE 2: Detectar fim natural de parágrafo (letra maiúscula + tamanho)
          const shouldBreak = /^[A-Z]/.test(trimmedLine) && currentParagraph.length > 150;
          
          if (shouldBreak) {
            finalizeParagraph();
            currentParagraph = trimmedLine;
          } else {
            currentParagraph += ' ' + trimmedLine;
          }
        }
        
        // Forçar finalização a cada ~400 chars
        if (currentParagraph.length > 400) {
          finalizeParagraph();
        }
      }
    }
    
    finalizeParagraph();
    finalizeList();
    
    // ✅ FASE 1: Logging após parsing
    console.log(`[Converter ${jobId}] 📊 Parsing completed:`, {
      inputLines: lines.length,
      parsedBlocks,
      outputBlocks: conteudo.length,
      isEmpty: conteudo.length === 0,
    });
    
    // ✅ FASE 2: Fallback MELHORADO - Ativa SEMPRE que array vazio
    if (conteudo.length === 0) {
      console.warn(`[Converter ${jobId}] ⚠️ Parsing returned empty array`);
      console.log(`[Converter ${jobId}] Markdown stats:`, {
        length: markdown.length,
        lines: markdown.split('\n').length,
        paragraphs: markdown.split('\n\n').length,
        words: markdown.split(/\s+/).length,
      });
      
      // Tentar chunking por parágrafos duplo-newline
      const chunks = markdown.split(/\n\n+/).filter(c => c.trim().length > 50);
      
      if (chunks.length > 0) {
        console.log(`[Converter ${jobId}] ✅ Fallback chunking: ${chunks.length} chunks created`);
        return {
          success: true,
          data: {
            titulo_geral: title,
            conteudo: chunks.map(chunk => ({
              tipo: 'paragrafo',
              texto: chunk.trim()
            }))
          },
          warnings: [`Usou fallback chunking (${chunks.length} parágrafos)`]
        };
      }
      
      // Se markdown muito curto para chunks, dividir por linhas simples
      const lines = markdown.split(/\n+/).filter(l => l.trim().length > 20);
      
      if (lines.length > 0) {
        console.log(`[Converter ${jobId}] ✅ Fallback line-split: ${lines.length} lines`);
        return {
          success: true,
          data: {
            titulo_geral: title,
            conteudo: lines.map(line => ({
              tipo: 'paragrafo',
              texto: line.trim()
            }))
          },
          warnings: [`Usou fallback por linhas (${lines.length} parágrafos)`]
        };
      }
      
      // Último recurso: salvar markdown inteiro como um bloco
      if (markdown.length > 0) {
        console.warn(`[Converter ${jobId}] ⚠️ Using last resort: single block`);
        return {
          success: true,
          data: {
            titulo_geral: title,
            conteudo: [{
              tipo: 'paragrafo',
              texto: markdown
            }]
          },
          warnings: ['Usou fallback de bloco único']
        };
      }
      
      // Se realmente vazio, FALHAR
      console.error(`[Converter ${jobId}] ❌ FATAL: Markdown input is empty`);
      return {
        success: false,
        error: 'Markdown de entrada está vazio'
      };
    }
    
    // ETAPA 5: Validação de JSON aninhado
    conteudo.forEach((bloco, index) => {
      if (bloco.texto && typeof bloco.texto === 'string' && bloco.texto.trim().startsWith('{')) {
        console.error(`[Converter ${jobId}] ❌ CRITICAL: Nested JSON at block ${index}`);
        throw new Error('Invalid JSON nesting detected');
      }
    });
    
    // ETAPA 6: Processar blocos
    let structuredData = {
      titulo_geral: title,
      conteudo
    };
    
    if (options.enableMarkdownToHtml || options.enableReferenceFormatting) {
      structuredData = processBlocksRecursively(structuredData, options);
    }
    
    // ETAPA 7: Logging final
    console.log(`[Converter ${jobId}] ✅ Success: ${structuredData.conteudo.length} blocks`);
    
    const blockTypes = structuredData.conteudo.reduce((acc: any, bloco) => {
      acc[bloco.tipo] = (acc[bloco.tipo] || 0) + 1;
      return acc;
    }, {});
    console.log(`[Converter ${jobId}] 📊 Block types:`, blockTypes);
    
    return {
      success: true,
      data: structuredData,
      warnings: warnings.length > 0 ? warnings : undefined
    };
    
  } catch (error: any) {
    console.error(`[Converter ${jobId}] ❌ Conversion failed:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}
