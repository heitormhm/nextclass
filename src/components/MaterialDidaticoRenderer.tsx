import React, { Children, isValidElement, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { getRehypeKatexPlugin } from '@/lib/textRenderingEngine';
// Mermaid components removed - using expanded callout system instead

interface MaterialDidaticoRendererProps {
  markdown: string;
}


export const MaterialDidaticoRenderer: React.FC<MaterialDidaticoRendererProps> = ({ markdown }) => {
  // Pre-processar markdown para remover referências a diagramas obsoletos
  let processedMarkdown = markdown;
  
  // Substituir frases comuns que referenciam diagramas e comandos problemáticos
  const diagramReferences = [
    { pattern: /O diagrama (a seguir|abaixo) (mostra|organiza|ilustra|apresenta)/gi, 
      replacement: 'A estrutura a seguir organiza' },
    { pattern: /```mermaid[\s\S]*?```/g, 
      replacement: '_[Diagrama visual removido - consulte a descrição textual]_' },
    { pattern: /Conforme (mostrado|ilustrado) no diagrama/gi, 
      replacement: 'Conforme descrito' },
    { pattern: /O fluxograma (mostra|ilustra)/gi, 
      replacement: 'O processo descrito' },
    { pattern: /no diagrama (acima|abaixo)/gi,
      replacement: 'conforme descrito' },
  ];
  
  diagramReferences.forEach(({ pattern, replacement }) => {
    processedMarkdown = processedMarkdown.replace(pattern, replacement);
  });
  
  // Calculate reading time
  const words = processedMarkdown.split(/\s+/).length;
  const readingTimeMin = Math.ceil(words / 200); // Average reading speed

  if (!processedMarkdown || processedMarkdown.trim().length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Nenhum material didático gerado ainda.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden" style={{boxSizing: 'border-box'}}>
      <div className="material-didatico-content pt-6" style={{width: '100%', maxWidth: '100%', overflowX: 'hidden', boxSizing: 'border-box'}}>
        <style>{`
        /* ===== 📱 RESPONSIVE CONTAINER FIXES ===== */
        .material-didatico-content {
          max-width: 100%;
          width: 100%;
          box-sizing: border-box;
          overflow-wrap: break-word;
          word-wrap: break-word;
        }

        .material-didatico-content * {
          max-width: 100%;
          box-sizing: border-box;
        }

        .material-didatico-content p,
        .material-didatico-content li,
        .material-didatico-content div {
          overflow-wrap: break-word;
          word-wrap: break-word;
          word-break: break-word;
        }

        .material-didatico-content code {
          color: inherit;
          background: rgba(0,0,0,0.05);
          padding: 0.1em 0.3em;
          border-radius: 0.25em;
          font-family: 'Courier New', monospace;
        }
        
        /* Enhanced UX Styles */
        .material-didatico-content {
          scroll-behavior: smooth;
        }
        
        /* ===== 🔒 MOBILE: FORCE 100% WIDTH - NUCLEAR OPTION ===== */
        @media (max-width: 767px) {
          /* LAYER 1: Container constraints */
          .material-didatico-content,
          div.material-didatico-content,
          .material-didatico-content.pt-6 {
            max-width: 100vw !important;
            width: 100% !important;
            padding-left: 0.75rem !important;
            padding-right: 0.75rem !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            box-sizing: border-box !important;
            overflow-x: hidden !important;
            overflow-wrap: break-word !important;
          }
          
          /* LAYER 2: ALL child elements MUST respect viewport (EXCEPT callout internals) */
          .material-didatico-content *:not([data-callout-type] *):not([data-callout-type]),
          .material-didatico-content > *:not([data-callout-type]),
          .material-didatico-content * > *:not([data-callout-type] *) {
            max-width: 100% !important;
            box-sizing: border-box !important;
            overflow-wrap: break-word !important;
            word-wrap: break-word !important;
          }
          
          /* LAYER 3: Text elements - Smart word breaking */
          .material-didatico-content p:not([data-callout-type] *),
          .material-didatico-content li:not([data-callout-type] *),
          .material-didatico-content div:not([data-callout-type] *):not([data-callout-type]),
          .material-didatico-content span:not([data-callout-type] *),
          .material-didatico-content h1:not([data-callout-type] *),
          .material-didatico-content h2:not([data-callout-type] *),
          .material-didatico-content h3:not([data-callout-type] *),
          .material-didatico-content h4:not([data-callout-type] *),
          .material-didatico-content h5:not([data-callout-type] *),
          .material-didatico-content h6:not([data-callout-type] *),
          .material-didatico-content blockquote:not([data-callout-type]) {
            max-width: 100% !important;
            overflow-wrap: break-word !important;
            word-wrap: break-word !important;
            hyphens: auto !important;
            -webkit-hyphens: auto !important;
            -ms-hyphens: auto !important;
          }
          
          /* LAYER 4: Callouts - constrain to viewport WITHOUT overriding inline styles */
          .material-didatico-content [data-callout-type] {
            max-width: 100% !important;
            width: 100% !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            box-sizing: border-box !important;
            display: block !important;
          }

          /* Callout internal structure protection */
          .material-didatico-content [data-callout-type] > div {
            display: flex !important;
            align-items: start !important;
            gap: 0.75rem !important;
          }

          .material-didatico-content [data-callout-type] .callout-content {
            flex: 1 !important;
            min-width: 0 !important;
            overflow-wrap: break-word !important;
            word-wrap: break-word !important;
          }
          
          /* LAYER 5: Long words/URLs/Code - break aggressively (ONLY for these elements) */
          .material-didatico-content a,
          .material-didatico-content code:not(pre code) {
            overflow-wrap: anywhere !important;
            word-break: break-all !important;
            max-width: 100% !important;
            display: inline-block !important;
          }

          /* Exception: links inside callouts use softer breaking */
          .material-didatico-content [data-callout-type] a {
            word-break: break-word !important;
          }

          
          .material-didatico-content h2 {
            font-size: 1.5rem !important;
            line-height: 2rem !important;
            margin-top: 2rem !important;
            margin-bottom: 1rem !important;
          }
          
          .material-didatico-content h3 {
            font-size: 1.25rem !important;
            line-height: 1.75rem !important;
            margin-top: 1.5rem !important;
            margin-bottom: 0.75rem !important;
            padding: 0.5rem 1rem;
          }
          
          .material-didatico-content h4 {
            font-size: 1.125rem !important;
            line-height: 1.5rem !important;
            margin-top: 1.25rem !important;
            margin-bottom: 0.5rem !important;
          }
          
          .material-didatico-content p:not([data-callout-type] *),
          .material-didatico-content li:not([data-callout-type] *) {
            font-size: 0.95rem !important;
            line-height: 1.6rem !important;
            margin-bottom: 1rem !important;
          }
          
          .material-didatico-content ul,
          .material-didatico-content ol {
            margin: 1rem 0 !important;
            font-size: 0.95rem !important;
          }
          
          .material-didatico-content code {
            word-break: break-all;
            overflow-wrap: anywhere;
          }
          
          .material-didatico-content pre {
            overflow-x: auto;
            max-width: 100%;
          }
          
          /* Mobile-specific callout adjustments */
          .material-didatico-content [data-callout-type] {
            font-size: 0.875rem !important;
            line-height: 1.5rem !important;
            margin: 1rem 0 !important;
          }

          .material-didatico-content [data-callout-type] .callout-content p {
            font-size: 0.875rem !important;
            line-height: 1.5rem !important;
            margin-bottom: 0.75rem !important;
          }

          .material-didatico-content [data-callout-type] .callout-content p:last-child {
            margin-bottom: 0 !important;
          }
          
          .material-didatico-content .katex-display {
            padding: 1rem 1.5rem !important;
            margin: 1.5rem auto !important;
            max-width: 100% !important;
            overflow-x: auto !important;
          }
          
          .material-didatico-content .katex-display .katex {
            font-size: 1em !important;
          }
        }
        
        /* Highlight important terms */
        .material-didatico-content strong {
          background: linear-gradient(120deg, hsl(var(--accent) / 0.2) 0%, hsl(var(--accent) / 0.1) 100%);
          padding: 0.1em 0.2em;
          border-radius: 0.2em;
        }
        
        /* ===== 📐 ENHANCED DISPLAY FORMULAS (Pink boxes matching callouts) ===== */
        .material-didatico-content .katex-display {
          background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%);
          padding: 1.5rem 2rem;
          border-radius: 0.75rem;
          border-left: 4px solid #db2777;
          box-shadow: 0 4px 12px rgba(219, 39, 119, 0.15);
          margin: 2rem auto;
          max-width: 90%;
          text-align: center;
          opacity: 0.8;
        }
        
        .dark .material-didatico-content .katex-display {
          background: linear-gradient(135deg, #831843 0%, #9f1239 100%);
          border-left-color: #f472b6;
          box-shadow: 0 4px 12px rgba(244, 114, 182, 0.2);
          opacity: 0.3;
        }
        
        .material-didatico-content .katex-display .katex {
          font-size: 1.2em;
          color: #831843;
        }
        
        .dark .material-didatico-content .katex-display .katex {
          color: #fce7f3;
        }
        
        
        /* ===== 📚 DESIGN SYSTEM - TYPOGRAPHY HIERARCHY ===== */
        .material-didatico-content h2 {
          margin-top: 3rem !important;
          margin-bottom: 1.5rem !important;
          padding-bottom: 0.75rem;
          border-bottom: 3px solid hsl(var(--primary) / 0.3);
          font-size: 2rem !important;
          font-weight: 700 !important;
          line-height: 2.5rem !important;
          color: hsl(var(--foreground));
          scroll-margin-top: 80px;
          transition: padding-left 0.2s ease;
        }
        
        .material-didatico-content h2:hover {
          padding-left: 0.5rem;
        }
        
        .material-didatico-content h3 {
          margin-top: 2.5rem !important;
          margin-bottom: 1.25rem !important;
          font-size: 1.5rem !important;
          font-weight: 600 !important;
          line-height: 2rem !important;
          color: hsl(var(--foreground));
          background: linear-gradient(120deg, hsl(var(--primary) / 0.08) 0%, transparent 100%);
          padding: 0.75rem 1.25rem;
          border-left: 4px solid hsl(var(--primary) / 0.6);
          border-radius: 0.375rem;
          scroll-margin-top: 80px;
          transition: padding-left 0.2s ease;
        }
        
        .material-didatico-content h3:hover {
          padding-left: 1.5rem;
        }
        
        .material-didatico-content h4 {
          margin-top: 2rem !important;
          margin-bottom: 1rem !important;
          font-size: 1.25rem !important;
          font-weight: 600 !important;
          line-height: 1.75rem !important;
          color: hsl(var(--foreground));
        }
        
        /* ===== 📝 DESIGN SYSTEM - TEXT ELEMENTS ===== */
        .material-didatico-content p {
          font-size: 1.125rem !important;
          line-height: 1.875rem !important;
          margin-bottom: 1.25rem !important;
        }
        
        .material-didatico-content ul,
        .material-didatico-content ol {
          margin: 1.5rem 0 !important;
        }
        
        .material-didatico-content ul li::marker {
          color: hsl(var(--primary));
          font-size: 1.2em;
        }
        
        .material-didatico-content ol li::marker {
          color: hsl(var(--primary));
          font-weight: 700;
        }
        
        /* ===== 🎨 CALLOUT SYSTEM STYLING ===== */
        .material-didatico-content blockquote {
          margin: 0 !important;
          padding: 0 !important;
          border: none !important;
        }
        
        /* Prevent list items inside callouts from having wrong indentation */
        .material-didatico-content .callout-content ul,
        .material-didatico-content .callout-content ol {
          margin-left: 1.5rem !important;
          margin-top: 0.75rem !important;
          margin-bottom: 0.5rem !important;
        }
        
        .material-didatico-content .callout-content li {
          padding-left: 0.25rem !important;
          margin-bottom: 0.5rem !important;
        }
        
        /* Fix paragraph spacing inside callouts */
        .material-didatico-content .callout-content p {
          margin-bottom: 0.75rem !important;
        }
        
        .material-didatico-content .callout-content p:last-child {
          margin-bottom: 0 !important;
        }
        
        /* Ensure code blocks inside callouts are properly formatted */
        .material-didatico-content .callout-content code {
          font-size: 0.9em !important;
          padding: 0.15em 0.4em !important;
        }
        
        .material-didatico-content .callout-content pre {
          margin: 0.75rem 0 !important;
          padding: 0.75rem 1rem !important;
        }
        
        /* ===== 🖨️ PRINT OPTIMIZATION ===== */
        @media print {
          .material-didatico-content {
            font-size: 11pt;
            line-height: 1.5;
          }
          
          .material-didatico-content h2 {
            page-break-after: avoid;
            break-after: avoid;
          }
          
          .material-didatico-content h3,
          .material-didatico-content h4 {
            page-break-after: avoid;
            break-after: avoid;
          }
          
          /* Evitar quebra de página dentro de callouts */
          .material-didatico-content [data-callout-type],
          .material-didatico-content blockquote {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          /* Garantir que cores sejam impressas */
          .material-didatico-content [data-callout-type] {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            color-adjust: exact;
          }
          
          /* Ajustar fórmulas LaTeX para impressão */
          .material-didatico-content .katex-display {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          /* Ocultar elementos interativos */
          button, input, textarea, .no-print {
            display: none !important;
          }
        }
        
        /* Dark mode support for callouts */
        .dark .material-didatico-content [data-callout-type] {
          background-color: var(--callout-bg-dark);
        }
        
        /* Static styles only - ABSOLUTELY NO TRANSITIONS */
        .callout-container {
          isolation: isolate;
        }
        
        .callout-emoji {
          display: inline-block;
        }
        
        /* Accessibility: respect reduced motion preference */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[getRehypeKatexPlugin()]}
        components={{
          // Handle code blocks (including Mermaid)
          code: ({ node, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const inline = !className;

            if (language === 'mermaid' && !inline) {
              // Mermaid removed - should not appear in new content
              console.warn('[MaterialDidaticoRenderer] ⚠️ Mermaid block found but rendering disabled');
              return null;
            }

            if (inline) {
              return (
                <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono" {...props}>
                  {children}
                </code>
              );
            }

            return (
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto my-4">
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            );
          },
          // Style tables
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-6">
              <table className="min-w-full divide-y divide-border border border-border" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead className="bg-muted" {...props} />
          ),
          tbody: ({ node, ...props }) => (
            <tbody className="divide-y divide-border bg-background" {...props} />
          ),
          th: ({ node, ...props }) => (
            <th className="px-4 py-3 text-left text-sm font-semibold" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="px-4 py-3 text-sm" {...props} />
          ),
          // Style headings
            h1: ({ node, ...props }) => (
              <h1 className="text-3xl font-bold mt-0 mb-3 text-foreground" {...props} />
            ),
          h2: ({ node, children, ...props }) => {
            const hasEmoji = /^[\p{Emoji}]/u.test(String(children));
            return (
              <h2 
                className={`text-2xl font-bold mt-6 mb-3 border-b pb-2 ${
                  hasEmoji ? 'text-purple-900 dark:text-purple-300 border-purple-300' : 'text-foreground border-border'
                }`} 
                {...props}
              >
                {children}
              </h2>
            );
          },
          h3: ({ node, ...props }) => (
            <h3 className="text-xl font-semibold mt-5 mb-2 text-foreground" {...props} />
          ),
          h4: ({ node, ...props }) => (
            <h4 className="text-lg font-semibold mt-4 mb-2 text-foreground" {...props} />
          ),
          // Style paragraphs
          p: ({ node, ...props }) => (
            <p className="mb-4 leading-relaxed text-foreground/90" {...props} />
          ),
          // Style lists - FIXED: list-outside para melhor alinhamento visual
          ul: ({ node, ...props }) => (
            <ul className="list-disc list-outside ml-6 mb-4 space-y-2" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal list-outside ml-6 mb-4 space-y-2" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="text-foreground/90 pl-2" {...props} />
          ),
          // Style blockquotes with intelligent callout detection
          blockquote: ({ node, children, ...props }) => {
            // Extract text using React API to handle ReactNode
            const extractText = (node: ReactNode): string => {
              if (typeof node === 'string') return node;
              if (typeof node === 'number') return String(node);
              if (node == null || typeof node === 'boolean') return '';
              
              if (Array.isArray(node)) {
                return node.map(extractText).join('');
              }
              
              if (isValidElement(node)) {
                const children = (node.props as any)?.children;
                if (children != null) {
                  return extractText(children);
                }
                return '';
              }
              
              try {
                const childrenArray = Children.toArray(node);
                return childrenArray.map(extractText).join('');
              } catch {
                return '';
              }
            };
            
            // Helper function to remove callout title from text - String-based approach
  const removeCalloutTitleFromChildren = (children: ReactNode, titleToRemove: string, iconToRemove: string): ReactNode => {
    // Extract full text from children
    const fullText = extractText(children);
    
    // Clean the title (remove emoji)
    const cleanTitle = titleToRemove.replace(iconToRemove, '').trim();
    
    // Create regex pattern to find title at the beginning (case-insensitive)
    const titlePattern = new RegExp(
      `^\\s*${iconToRemove.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}?\\s*${cleanTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:?\\s*`,
      'i'
    );
    
    // Remove the title from the beginning of the text
    const textWithoutTitle = fullText.replace(titlePattern, '').trim();
    
    // If title wasn't found or text is empty, return original
    if (textWithoutTitle === fullText || !textWithoutTitle) {
      return children;
    }
    
    // Return cleaned text (React renders strings directly)
    return textWithoutTitle;
  };
            
            const fullText = extractText(children);
            
            if (!fullText || fullText.trim().length === 0) {
              return (
                <blockquote className="border-l-4 border-red-600 bg-red-50 dark:bg-red-950 pl-4 pr-4 py-3 my-4">
                  <div className="text-xs font-bold text-red-600 mb-2">
                    🔴 ERRO: Conteúdo vazio
                  </div>
                </blockquote>
              );
            }
            
            const normalizedText = fullText
              .trim()
              .replace(/\*\*/g, '')
              .replace(/:/g, '')
              .replace(/\s+/g, ' ');
            
            const calloutTypes: Record<string, { 
              bgColor: string; 
              bgColorDark: string;
              borderColorHex: string; 
              textColor: string; 
              titleColor: string; 
              icon: string;
            }> = {
              '✏️ Conceito-Chave': {
                bgColor: 'rgba(243, 232, 255, 0.9)',
                bgColorDark: 'rgba(88, 28, 135, 0.5)',
                borderColorHex: '#9333ea',
                textColor: 'text-gray-800 dark:text-gray-200',
                titleColor: 'text-purple-800 dark:text-purple-200',
                icon: '✏️',
              },
              '🤔 Pergunta para Reflexão': {
                bgColor: 'rgba(243, 232, 255, 0.9)',
                bgColorDark: 'rgba(88, 28, 135, 0.5)',
                borderColorHex: '#7c3aed',
                textColor: 'text-gray-800 dark:text-gray-200',
                titleColor: 'text-purple-800 dark:text-purple-200',
                icon: '🤔',
              },
              '💡 Dica Importante': {
                bgColor: 'rgba(254, 243, 199, 0.9)',
                bgColorDark: 'rgba(113, 63, 18, 0.5)',
                borderColorHex: '#ca8a04',
                textColor: 'text-gray-800 dark:text-gray-200',
                titleColor: 'text-yellow-800 dark:text-yellow-200',
                icon: '💡',
              },
              '⚠️ Atenção': {
                bgColor: 'rgba(254, 215, 170, 0.9)',
                bgColorDark: 'rgba(124, 45, 18, 0.5)',
                borderColorHex: '#ea580c',
                textColor: 'text-gray-800 dark:text-gray-200',
                titleColor: 'text-orange-800 dark:text-orange-200',
                icon: '⚠️',
              },
              '🔬 Exemplo Prático': {
                bgColor: 'rgba(219, 234, 254, 0.9)',
                bgColorDark: 'rgba(30, 58, 138, 0.5)',
                borderColorHex: '#2563eb',
                textColor: 'text-gray-800 dark:text-gray-200',
                titleColor: 'text-blue-800 dark:text-blue-200',
                icon: '🔬',
              },
              '📊 Resumo Executivo': {
                bgColor: 'rgba(209, 250, 229, 0.9)',
                bgColorDark: 'rgba(20, 83, 45, 0.5)',
                borderColorHex: '#059669',
                textColor: 'text-gray-800 dark:text-gray-200',
                titleColor: 'text-green-800 dark:text-green-200',
                icon: '📊',
              },
              '🏭 Aplicação Profissional': {
                bgColor: 'rgba(224, 231, 255, 0.9)',
                bgColorDark: 'rgba(49, 46, 129, 0.5)',
                borderColorHex: '#4f46e5',
                textColor: 'text-gray-800 dark:text-gray-200',
                titleColor: 'text-indigo-800 dark:text-indigo-200',
                icon: '🏭',
              },
              '✍️ Exercício Rápido': {
                bgColor: 'rgba(236, 252, 203, 0.9)',
                bgColorDark: 'rgba(54, 83, 20, 0.5)',
                borderColorHex: '#65a30d',
                textColor: 'text-gray-800 dark:text-gray-200',
                titleColor: 'text-lime-800 dark:text-lime-200',
                icon: '✍️',
              },
              '❌ Erro Comum': {
                bgColor: 'rgba(254, 202, 202, 0.9)',
                bgColorDark: 'rgba(127, 29, 29, 0.5)',
                borderColorHex: '#dc2626',
                textColor: 'text-gray-800 dark:text-gray-200',
                titleColor: 'text-red-800 dark:text-red-200',
                icon: '❌',
              },
              '🔍 Aprofundamento': {
                bgColor: 'rgba(237, 233, 254, 0.9)',
                bgColorDark: 'rgba(76, 29, 149, 0.5)',
                borderColorHex: '#7c3aed',
                textColor: 'text-gray-800 dark:text-gray-200',
                titleColor: 'text-violet-800 dark:text-violet-200',
                icon: '🔍',
              },
              '🎓 Citação do Especialista': {
                bgColor: 'rgba(229, 231, 235, 0.9)',
                bgColorDark: 'rgba(17, 24, 39, 0.5)',
                borderColorHex: '#4b5563',
                textColor: 'text-gray-800 dark:text-gray-200',
                titleColor: 'text-gray-800 dark:text-gray-200',
                icon: '🎓',
              },
              '🔗 Conexão com Outros Conceitos': {
                bgColor: 'rgba(207, 250, 254, 0.9)',
                bgColorDark: 'rgba(22, 78, 99, 0.5)',
                borderColorHex: '#0891b2',
                textColor: 'text-gray-800 dark:text-gray-200',
                titleColor: 'text-cyan-800 dark:text-cyan-200',
                icon: '🔗',
              },
            };

            // STRATEGY 1: Match by title
            let matchedCallout = null;
            for (const [title, style] of Object.entries(calloutTypes)) {
              const normalizedTitle = title.replace(/\s+/g, ' ').replace(/:/g, '');
              if (normalizedText.includes(normalizedTitle) || normalizedText.startsWith(normalizedTitle)) {
                matchedCallout = { title, ...style };
                break;
              }
            }
            
            // STRATEGY 2: Fallback - emoji detection
            if (!matchedCallout) {
              const emojiMap: Record<string, string> = {
                '✏️': '✏️ Conceito-Chave',
                '🤔': '🤔 Pergunta para Reflexão',
                '💡': '💡 Dica Importante',
                '⚠️': '⚠️ Atenção',
                '🔬': '🔬 Exemplo Prático',
                '📊': '📊 Resumo Executivo',
                '🏭': '🏭 Aplicação Profissional',
                '✍️': '✍️ Exercício Rápido',
                '❌': '❌ Erro Comum',
                '🔍': '🔍 Aprofundamento',
                '🎓': '🎓 Citação do Especialista',
                '🔗': '🔗 Conexão com Outros Conceitos',
              };
              
              for (const [emoji, title] of Object.entries(emojiMap)) {
                if (normalizedText.startsWith(emoji)) {
                  matchedCallout = { title, ...calloutTypes[title] };
                  break;
                }
              }
            }

            if (matchedCallout) {
              const calloutType = matchedCallout.title
                .replace(matchedCallout.icon, '')
                .trim()
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, '-');
              
              const inlineStyles: React.CSSProperties = {
                background: matchedCallout.bgColor,
                borderLeft: `4px solid ${matchedCallout.borderColorHex}`,
                borderRadius: '0.75rem',
                padding: 'clamp(1rem, 3vw, 1.5rem)',
                margin: '1.5rem 0',
                boxShadow: `0 4px 12px ${matchedCallout.borderColorHex}40`,
              };

              const cleanedChildren = removeCalloutTitleFromChildren(children, matchedCallout.title, matchedCallout.icon);
              
              // Generate unique ID for this specific callout instance
              const calloutId = `callout-${Math.random().toString(36).substring(2, 9)}`;
              
      return (
        <div 
          data-callout-type={calloutType}
          data-callout-id={calloutId}
          className="callout-container rounded-lg shadow-lg animate-fade-in"
          style={inlineStyles}
          role="complementary"
          aria-label={`Callout: ${matchedCallout.title.replace(matchedCallout.icon, '').trim()}`}
        >
          <div className="flex items-start gap-3 md:gap-4 relative">
            <span 
              className="text-2xl md:text-3xl flex-shrink-0 mt-0.5 md:mt-1"
              data-callout-id={calloutId}
            >
              {matchedCallout.icon}
            </span>
            
            <div className="flex-1 min-w-0">
              <div className="border-b border-opacity-20 pb-2 mb-2 md:mb-3" style={{ borderColor: matchedCallout.borderColorHex }}>
                <p className="font-bold text-base md:text-lg tracking-tight break-words">
                  {matchedCallout.title.replace(matchedCallout.icon, '').trim()}
                </p>
              </div>
              
              <div className={`${matchedCallout.textColor} leading-relaxed text-sm md:text-base callout-content`}>
                {cleanedChildren}
              </div>
            </div>
          </div>
        </div>
      );
            }

            return (
              <blockquote 
                className="border-l-4 border-gray-400 pl-4 italic my-4 text-muted-foreground" 
                {...props}
              >
                {children}
              </blockquote>
            );
          },
          // Style links
          a: ({ node, ...props }) => (
            <a className="text-primary hover:underline font-medium" target="_blank" rel="noopener noreferrer" {...props} />
          ),
          // Style strong/bold
          strong: ({ node, ...props }) => (
            <strong className="font-bold text-foreground" {...props} />
          ),
          // Style emphasis/italic
          em: ({ node, ...props }) => (
            <em className="italic" {...props} />
          ),
        }}
      >
        {processedMarkdown}
      </ReactMarkdown>
      </div>
    </div>
  );
};
