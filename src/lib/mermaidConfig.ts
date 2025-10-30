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
    securityLevel: 'loose',
    flowchart: { 
      useMaxWidth: true,
      htmlLabels: true,
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
      fontSize: '16px',
      fontFamily: 'Inter, system-ui, sans-serif',
      primaryColor: '#f3e5f5',
      primaryTextColor: '#000',
      primaryBorderColor: '#7c3aed',
      lineColor: '#7c3aed',
      secondaryColor: '#e1f5fe',
      tertiaryColor: '#f1f8e9',
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
