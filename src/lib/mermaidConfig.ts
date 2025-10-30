/**
 * 🎨 GLOBAL MERMAID CONFIGURATION
 * 
 * Single source of truth for Mermaid initialization to prevent conflicts
 * between multiple Mermaid components (MermaidDiagram, MaterialMermaidDiagram).
 * 
 * ✅ PHASE 3: Resolve initialization conflicts
 */

import mermaid from 'mermaid';

let isInitialized = false;

/**
 * Initialize Mermaid with comprehensive configuration
 * Safe to call multiple times - only initializes once
 */
export const initializeMermaid = () => {
  if (isInitialized) {
    return;
  }

  mermaid.initialize({ 
    theme: 'default',
    logLevel: 'error',
    startOnLoad: false,
    securityLevel: 'loose',        // CRÍTICO: necessário para LaTeX ✅ FASE 3
    
    flowchart: { 
      useMaxWidth: true,
      htmlLabels: true,             // CRÍTICO: necessário para LaTeX
      curve: 'basis',
      padding: 20,
    },
    sequence: { 
      useMaxWidth: true,
      wrap: true,
      width: 150,
      height: 50,
      boxMargin: 10,
    },
    gantt: {
      useMaxWidth: true,
      fontSize: 14,
      numberSectionStyles: 4,
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
    themeVariables: {
      fontSize: '18px',
      fontFamily: 'Inter, system-ui, sans-serif',
      primaryColor: '#f3e5f5',
      primaryTextColor: '#1e293b',
      primaryBorderColor: '#7c3aed',
      lineColor: '#7c3aed',
      secondaryColor: '#e1f5fe',
      tertiaryColor: '#f1f8e9',
      nodeBorder: '#7c3aed',
      nodeTextColor: '#1e293b',
      lineWidth: 2,
    }
  });

  isInitialized = true;
  console.log('[Mermaid Config] ✅ Global initialization complete');
};

/**
 * Sanitize Mermaid code - remove markdown fences
 */
export const sanitizeMermaidCode = (code: string): string => {
  if (!code || code.trim().length < 10) {
    console.warn('[Mermaid] Code too short or empty');
    return '';
  }

  let sanitized = code.trim()
    .replace(/^```mermaid\s*/i, '')
    .replace(/^```\s*$/, '')
    .replace(/```$/, '');

  return sanitized.trim();
};

/**
 * Automatically fix common Mermaid syntax issues
 */
export const autoFixMermaidCode = (code: string): string => {
  let fixed = code;
  
  // Fix 1: Substituir caracteres matemáticos especiais por texto ASCII
  const mathCharReplacements: Record<string, string> = {
    'Δ': 'Delta',
    'Σ': 'Sigma',
    'ṁ': 'm_dot',
    'Q̇': 'Q_dot',
    'Ẇ': 'W_dot',
    'α': 'alpha',
    'β': 'beta',
    'γ': 'gamma',
    'θ': 'theta',
    'μ': 'mu',
    'π': 'pi',
    'ω': 'omega',
    '°': 'deg',
    '±': '+/-',
    '≈': '~=',
    '≤': '<=',
    '≥': '>=',
    '∞': 'infinity',
    '∂': 'd',
    '∫': 'integral',
  };
  
  // Aplicar substituições dentro de labels [texto]
  fixed = fixed.replace(/\[([^\]]+)\]/g, (match, content) => {
    let sanitized = content;
    for (const [char, replacement] of Object.entries(mathCharReplacements)) {
      sanitized = sanitized.replaceAll(char, replacement);
    }
    
    // Truncar labels muito longos (>45 chars)
    if (sanitized.length > 45) {
      sanitized = sanitized.substring(0, 42) + '...';
    }
    
    // Remover parênteses em labels
    if (sanitized.includes('(') || sanitized.includes(')')) {
      sanitized = sanitized.replace(/\(/g, '').replace(/\)/g, '');
    }
    
    return `[${sanitized}]`;
  });
  
  // Fix 2: Add space after diagram type
  fixed = fixed.replace(/^(graph|flowchart)([A-Z]{2})/gm, '$1 $2');
  
  // Fix 3: Remove unnecessary quotes in labels
  fixed = fixed.replace(/\["([^"]+)"\]/g, '[$1]');
  
  // Fix 4: Escape special characters in labels (< >)
  fixed = fixed.replace(/\[([^\]]*[<>].*?)\]/g, (match, content) => {
    return `["${content.replace(/"/g, "'")}"]`;
  });
  
  // Fix 5: Add semicolons at end of lines (optional but helps)
  const lines = fixed.split('\n');
  fixed = lines.map(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.includes('```') && !trimmed.match(/^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitGraph|mindmap)/)) {
      return trimmed.endsWith(';') ? line : line + ';';
    }
    return line;
  }).join('\n');
  
  return fixed;
};

/**
 * Inject CSS to suppress Mermaid error messages
 * Call once at app initialization
 */
export const injectMermaidErrorSuppression = () => {
  if (document.getElementById('mermaid-error-suppression')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'mermaid-error-suppression';
  style.innerHTML = `
    .error-icon,
    .error-text,
    [id*="mermaid-error"],
    [class*="error"]:has(svg),
    svg text:contains("Syntax error"),
    svg text:contains("version 10.9.4") {
      display: none !important;
      visibility: hidden !important;
    }
  `;
  
  document.head.appendChild(style);
  console.log('[Mermaid Config] ✅ Error suppression CSS injected');
};
