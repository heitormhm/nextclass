/**
 * 📊 MERMAID RENDERING ENGINE
 * Comprehensive Mermaid.js configuration with native LaTeX support
 * Based on official PDF guide: "Guia Definitivo para a Integração de Mermaid.js com LaTeX/KaTeX"
 * 
 * PDF Reference: Pages 5-14 (Complete Integration Guide)
 */

import mermaid from 'mermaid';
import type { MermaidConfig } from 'mermaid';

let isInitialized = false;
let initializationAttempts = 0;
const MAX_INIT_ATTEMPTS = 3;

/**
 * COMPREHENSIVE MERMAID CONFIGURATION
 * Following PDF recommendations for production-grade LaTeX integration
 */
export const MERMAID_PRODUCTION_CONFIG: MermaidConfig = {
  // Core initialization (PDF pg 5)
  startOnLoad: false,         // Manual control (PDF pg 12)
  theme: 'default',
  logLevel: 'error',          // Suppress noise, log only errors
  
  // CRITICAL: LaTeX Support (PDF pg 8)
  securityLevel: 'loose',     // REQUIRED for LaTeX (PDF pg 8: "NECESSÁRIO para LaTeX")
  
  // Native KaTeX integration (PDF pg 8)
  // @ts-ignore - katex property may not exist in type definitions
  katex: {
    delimiters: [
      { left: '$$', right: '$$', display: true },   // Display mode
      { left: '$', right: '$', display: false }     // Inline mode
    ]
  } as any,
  
  // Cross-browser consistency (PDF pg 7)
  // @ts-ignore - Property may not exist in older type definitions
  forceLegacyMathML: true,    // RECOMMENDED for consistency (PDF pg 7)
  legacyMathML: true,         // Fallback for older browsers
  
  // Diagram-specific configs
  flowchart: { 
    useMaxWidth: true,
    htmlLabels: true,         // REQUIRED for LaTeX (PDF pg 8)
    curve: 'basis',
    padding: 20,
    nodeSpacing: 50,
    rankSpacing: 50,
  },
  
  sequence: { 
    useMaxWidth: true,
    wrap: true,
    width: 150,
    height: 65,
    boxMargin: 10,
    diagramMarginX: 50,
    diagramMarginY: 10,
  },
  
  gantt: {
    useMaxWidth: true,
    fontSize: 14,
    numberSectionStyles: 4,
    axisFormat: '%Y-%m-%d',
  },
  
  class: {
    useMaxWidth: true,
  },
  
  state: {
    useMaxWidth: true,
  },
  
  er: {
    useMaxWidth: true,
  },
  
  // Visual theme (Engineering/Physics focus)
  themeVariables: {
    fontSize: '16px',
    fontFamily: 'Inter, "Segoe UI", system-ui, sans-serif',
    
    // Purple theme for diagrams (user request)
    primaryColor: '#f3e5f5',          // Light purple background
    primaryTextColor: '#1e293b',       // Dark slate text
    primaryBorderColor: '#9333ea',     // Purple-600 border
    
    lineColor: '#9333ea',              // Purple connections
    secondaryColor: '#e1f5fe',         // Light blue for secondary nodes
    tertiaryColor: '#f1f8e9',          // Light green for tertiary
    
    nodeBorder: '#9333ea',
    nodeTextColor: '#1e293b',
    clusterBkg: '#faf5ff',            // Very light purple for clusters
    clusterBorder: '#9333ea',
    
    edgeLabelBackground: '#ffffff',
    lineWidth: 2,
  }
} as const;

/**
 * Initialize Mermaid with production configuration
 * Safe to call multiple times - only initializes once
 * 
 * PDF Reference: Page 5-6 (Initialization Best Practices)
 */
export const initializeMermaid = (): boolean => {
  if (isInitialized) {
    console.log('[MermaidEngine] Already initialized');
    return true;
  }
  
  if (initializationAttempts >= MAX_INIT_ATTEMPTS) {
    console.error('[MermaidEngine] ❌ Max initialization attempts reached');
    return false;
  }
  
  try {
    initializationAttempts++;
    
    // Verify document is in standards mode (PDF pg 5)
    if (!document.doctype || document.compatMode !== 'CSS1Compat') {
      console.warn('[MermaidEngine] ⚠️ Document not in standards mode!');
      console.warn('[MermaidEngine] Ensure <!DOCTYPE html> is present');
    }
    
    // Verify KaTeX CSS is loaded (PDF pg 5 - CRITICAL)
    const katexCSSLoaded = verifyKatexCSSDependency();
    if (!katexCSSLoaded) {
      console.error('[MermaidEngine] ❌ CRITICAL: KaTeX CSS não carregado!');
      console.error('[MermaidEngine] Adicione ao index.html: <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">');
      // Continue initialization but warn user
    }
    
    mermaid.initialize(MERMAID_PRODUCTION_CONFIG);
    
    isInitialized = true;
    console.log('[MermaidEngine] ✅ Initialized with native LaTeX support');
    console.log('[MermaidEngine] securityLevel: loose, htmlLabels: true, forceLegacyMathML: true');
    
    return true;
  } catch (error) {
    console.error('[MermaidEngine] ❌ Initialization failed:', error);
    return false;
  }
};

/**
 * CRITICAL DEPENDENCY CHECK (PDF pg 5)
 * "O Mermaid.js inclui o motor JavaScript do KaTeX, mas não a sua folha de estilos (CSS)"
 */
const verifyKatexCSSDependency = (): boolean => {
  const katexCSSLoaded = Array.from(document.styleSheets).some(sheet => 
    sheet.href && sheet.href.includes('katex')
  );
  
  if (!katexCSSLoaded) {
    console.error('[MermaidEngine] ⚠️ CRITICAL: KaTeX CSS not detected!');
    console.error('[MermaidEngine] LaTeX formulas in diagrams may not render correctly');
    console.error('[MermaidEngine] Include: <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">');
  } else {
    console.log('[MermaidEngine] ✅ KaTeX CSS detected');
  }
  
  return katexCSSLoaded;
};

/**
 * Normaliza encoding UTF-8 e remove caracteres problemáticos
 * Fallback para quando Mermaid falha com caracteres especiais
 */
export const normalizeMermaidEncoding = (code: string): string => {
  // Opção 1: Manter acentos (recomendado)
  // Apenas garantir que está em UTF-8 válido
  let normalized = code.normalize('NFC');  // Canonical decomposition
  
  // Remover caracteres de controle inválidos
  normalized = normalized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  
  return normalized;
};

/**
 * FASE 2: Sanitizar underscores em classDiagram
 * ClassDiagram do Mermaid v10.9.4 NÃO suporta underscores em atributos
 */
const sanitizeClassDiagramUnderscores = (code: string): string => {
  // Detectar se é classDiagram
  if (!/^classDiagram/m.test(code)) {
    return code; // Não é classDiagram, não precisa sanitizar
  }
  
  console.log('[MermaidEngine] 🔧 Sanitizando underscores em classDiagram...');
  
  // Substituir underscores em valores de atributos e métodos
  // Pattern: +Atributo_Com_Underscore : tipo
  let sanitized = code.replace(/([+\-#~]\s*)([A-Za-z_]+)(\s*:\s*[A-Za-z]+)/g, (match, prefix, attrName, suffix) => {
    if (attrName.includes('_')) {
      const cleaned = attrName.replace(/_/g, ' ');
      console.log(`[MermaidEngine]   "${attrName}" → "${cleaned}"`);
      return `${prefix}${cleaned}${suffix}`;
    }
    return match;
  });
  
  // Também substituir em labels de classes [Nome_Com_Underscore]
  sanitized = sanitized.replace(/class\s+([A-Za-z_]+)\s*{/g, (match, className) => {
    if (className.includes('_')) {
      const cleaned = className.replace(/_/g, '');
      console.log(`[MermaidEngine]   Class "${className}" → "${cleaned}"`);
      return `class ${cleaned} {`;
    }
    return match;
  });
  
  console.log('[MermaidEngine] ✅ ClassDiagram sanitization complete');
  return sanitized;
};

/**
 * Simple sanitization - remove markdown fences only
 * NO automatic fixes (causes more problems than it solves - PDF pg 13)
 * FASE 2: Integrar sanitização de underscores em classDiagram
 */
export const sanitizeMermaidCode = (code: string): string => {
  if (!code || code.trim().length < 5) {
    console.warn('[MermaidEngine] Code too short or empty');
    return '';
  }

  let sanitized = code.trim()
    .replace(/^```mermaid\s*/i, '')
    .replace(/```$/gm, '')
    .trim();
  
  // ✅ Normalizar encoding
  sanitized = normalizeMermaidEncoding(sanitized);
  
  // ✅ FASE 2: Sanitizar underscores em classDiagram
  sanitized = sanitizeClassDiagramUnderscores(sanitized);
  
  return sanitized;
};

/**
 * Validate Mermaid syntax (basic structural checks)
 * FASE 1: Corrigir validação para não aplicar regras de subgraph em classDiagram
 */
export const validateMermaidSyntax = (code: string): {
  isValid: boolean;
  issues: string[];
  warnings: string[];
} => {
  const issues: string[] = [];
  const warnings: string[] = [];
  
  // Basic checks
  if (!code || code.trim().length < 10) {
    issues.push('Code too short (minimum 10 characters)');
    return { isValid: false, issues, warnings };
  }
  
  // Check 1: Has diagram type declaration
  const diagramTypes = /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|journey|gitGraph|mindmap|timeline|quadrantChart|requirementDiagram|C4Context)/m;
  if (!diagramTypes.test(code)) {
    issues.push('Missing or invalid diagram type declaration');
  }

  // ✅ FASE 1: Detectar tipo de diagrama ANTES de validar
  const diagramTypeMatch = code.match(/^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|journey|gitGraph|mindmap|timeline|quadrantChart|requirementDiagram|C4Context)/m);
  const diagramType = diagramTypeMatch ? diagramTypeMatch[1] : 'unknown';

  // ✅ NEW Check 2: Verificar encoding UTF-8
  const hasInvalidChars = /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(code);
  if (hasInvalidChars) {
    issues.push('Invalid control characters detected (encoding issue)');
  }

  // ✅ FASE 1 FIX: Só validar subgraph/end para flowchart e graph
  // ClassDiagram NÃO usa subgraphs!
  if (diagramType === 'flowchart' || diagramType === 'graph') {
    const subgraphStarts = (code.match(/^\s*subgraph\s+/gm) || []).length;
    const subgraphEnds = (code.match(/^\s*end\s*$/gm) || []).length;
    if (subgraphStarts > subgraphEnds) {
      issues.push(`${subgraphStarts - subgraphEnds} subgraph(s) sem 'end'`);
    } else if (subgraphEnds > subgraphStarts) {
      issues.push(`${subgraphEnds - subgraphStarts} 'end' sem subgraph correspondente`);
    }
  }

  // ✅ NEW Check 4: Labels com caracteres especiais não escapados
  const problematicLabels = code.match(/\[[^\]]*[áéíóúâêîôûãõç][^\]]*\]/gi);
  if (problematicLabels && problematicLabels.length > 0) {
    warnings.push(`${problematicLabels.length} labels com acentos (podem causar problemas)`);
  }

  // ✅ NEW Check 5: Linhas muito longas (podem causar timeout)
  const longLines = code.split('\n').filter(line => line.length > 200);
  if (longLines.length > 0) {
    warnings.push(`${longLines.length} linhas muito longas (>200 chars)`);
  }
  
  // Check 6: Detect LaTeX in diagram
  const hasLatex = /\$\$.*?\$\$|\$.*?\$/g.test(code);
  if (hasLatex) {
    warnings.push('LaTeX detected - ensure KaTeX CSS is loaded');
  }
  
  // Check 7: Check for underscores (common issue - user's Q_combustao example)
  const hasUnderscores = /_/.test(code);
  if (hasUnderscores) {
    warnings.push('Underscores detected - valid in labels but may need quotes in some contexts');
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    warnings
  };
};

interface RenderMetadata {
  renderTimeMs: number;
  hasLatex: boolean;
  diagramType: string;
  codeLength: number;
}

/**
 * Render with timeout protection
 * PDF Reference: Page 12 (Dynamic Rendering API)
 */
export const renderMermaidWithTimeout = async (
  code: string,
  timeoutMs: number = 10000
): Promise<{ svg: string | null; error: string | null; metadata: RenderMetadata }> => {
  const startTime = performance.now();
  
  try {
    // Validate before rendering
    const validation = validateMermaidSyntax(code);
    if (!validation.isValid) {
      console.warn('[MermaidEngine] Validation warnings:', validation.issues);
    }
    
    if (validation.warnings.length > 0) {
      validation.warnings.forEach(w => console.warn(`[MermaidEngine] ⚠️ ${w}`));
    }
    
    const uniqueId = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    const renderPromise = mermaid.render(uniqueId, code);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('RenderTimeout')), timeoutMs)
    );
    
    const { svg } = await Promise.race([renderPromise, timeoutPromise]);
    
    const renderTime = performance.now() - startTime;
    
    return { 
      svg, 
      error: null,
      metadata: {
        renderTimeMs: renderTime,
        hasLatex: /\$\$.*?\$\$|\$.*?\$/g.test(code),
        diagramType: code.match(/^(graph|flowchart|sequence|class|state|er|gantt|pie|journey)/)?.[0] || 'unknown',
        codeLength: code.length
      }
    };
  } catch (err: any) {
    const renderTime = performance.now() - startTime;
    
    let errorType = 'unknown_error';
    if (err.message === 'RenderTimeout') {
      errorType = 'timeout';
    } else if (err.message?.includes('Parse error') || err.message?.includes('Syntax error')) {
      errorType = 'syntax_error';
    }
    
    return { 
      svg: null, 
      error: errorType,
      metadata: {
        renderTimeMs: renderTime,
        hasLatex: false,
        diagramType: 'unknown',
        codeLength: code.length
      }
    };
  }
};

/**
 * Get debug link for Mermaid Live Editor
 * PDF Reference: Page 13 (External debugging tools)
 */
export const getMermaidLiveEditorLink = (code: string): string => {
  try {
    const encoded = btoa(encodeURIComponent(code).replace(/%([0-9A-F]{2})/g, (_, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    }));
    return `https://mermaid.live/edit#pako:${encoded}`;
  } catch {
    // Fallback: strip non-ASCII and encode
    const ascii = code.replace(/[^\x00-\x7F]/g, '');
    return `https://mermaid.live/edit#pako:${btoa(ascii)}`;
  }
};
