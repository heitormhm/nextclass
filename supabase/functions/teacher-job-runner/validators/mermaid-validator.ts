/**
 * Mermaid diagram validation and fixing utilities
 */

export interface MermaidValidationResult {
  valid: boolean;
  errors: string[];
}

export interface MermaidFixResult {
  valid: boolean;
  fixed: string;
  errors: string[];
}

/**
 * Validate Mermaid syntax (basic check)
 */
export function validateMermaidDiagrams(materialDidatico: string): MermaidValidationResult {
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

/**
 * Validate Mermaid structure (detailed check without modifications)
 */
export function validateMermaidStructure(code: string): MermaidValidationResult {
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
 * Apply basic Mermaid fixes without breaking valid code
 */
export function applyBasicMermaidFixes(code: string): string {
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

/**
 * Validate and fix Mermaid syntax with fallback
 */
export async function validateAndFixMermaidSyntax(
  code: string,
  jobId: string = 'manual'
): Promise<MermaidFixResult> {
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
      console.log('[Mermaid Validator] 🤖 Critical errors detected, AI fix recommended');
    }
  }
  
  // Aplicar correções básicas
  fixed = applyBasicMermaidFixes(fixed);
  
  // Validação final
  const finalValidation = validateMermaidStructure(fixed);
  
  if (!finalValidation.valid) {
    console.error('[Mermaid Validator] ❌ Invalid - Errors:', finalValidation.errors.length);
    console.warn('[Mermaid Validator] Full errors:', finalValidation.errors);
  } else {
    console.log('[Mermaid Validator] ✅ Valid - Errors: 0');
  }
  
  return {
    valid: finalValidation.valid,
    fixed,
    errors: finalValidation.errors
  };
}
