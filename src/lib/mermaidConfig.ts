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
    securityLevel: 'loose', // ✅ FASE 4.1: Necessário para LaTeX nativo (conforme PDF página 8)
    
    flowchart: { 
      useMaxWidth: true,
      htmlLabels: true, // ✅ Necessário para LaTeX
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
  } as any); // Type assertion para permitir futuras extensões

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
 * FASE 4.1: autoFixMermaidCode REMOVIDO ✅
 * 
 * Conforme recomendação do PDF "Mermaid_LaTeX_KaTeX_Gráficos_Matemáticos_HTML",
 * correções automáticas causam mais problemas do que resolvem.
 * Deixar Mermaid.js lidar com sua própria sintaxe nativamente.
 * 
 * NOTA: Esta função foi completamente removida para evitar interferência
 * com o parsing nativo do Mermaid.js, especialmente ao lidar com LaTeX.
 */

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
