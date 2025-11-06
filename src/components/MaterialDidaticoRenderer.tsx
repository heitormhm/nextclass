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
    <div>
      <div className="prose prose-lg max-w-none dark:prose-invert material-didatico-content pt-6">
        <style>{`
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
        
        /* ===== 🎨 CALLOUT SYSTEM (12 TIPOS COM CORES FIXAS) - CLASSES GLOBAIS ===== */
        .callout-conceito-chave {
          background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%) !important;
          border-left: 4px solid #9333ea !important;
          border-radius: 0.75rem !important;
          padding: 1.5rem !important;
          margin: 1.5rem 0 !important;
          box-shadow: 0 4px 12px rgba(147, 51, 234, 0.15) !important;
        }
        
        .dark .callout-conceito-chave {
          background: linear-gradient(135deg, #581c87 0%, #6b21a8 100%) !important;
          border-left-color: #a855f7 !important;
          opacity: 0.95 !important;
        }
        
        .callout-pergunta-para-reflexao {
          background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%) !important;
          border-left: 4px solid #7c3aed !important;
          border-radius: 0.75rem !important;
          padding: 1.5rem !important;
          margin: 1.5rem 0 !important;
          box-shadow: 0 4px 12px rgba(124, 58, 237, 0.15) !important;
        }
        
        .dark .callout-pergunta-para-reflexao {
          background: linear-gradient(135deg, #581c87 0%, #6b21a8 100%) !important;
          border-left-color: #a855f7 !important;
          opacity: 0.95 !important;
        }
        
        .callout-dica-importante {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%) !important;
          border-left: 4px solid #ca8a04 !important;
          border-radius: 0.75rem !important;
          padding: 1.5rem !important;
          margin: 1.5rem 0 !important;
          box-shadow: 0 4px 12px rgba(202, 138, 4, 0.15) !important;
        }
        
        .dark .callout-dica-importante {
          background: linear-gradient(135deg, #713f12 0%, #854d0e 100%) !important;
          border-left-color: #fbbf24 !important;
          opacity: 0.95 !important;
        }
        
        .callout-atencao {
          background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%) !important;
          border-left: 4px solid #ea580c !important;
          border-radius: 0.75rem !important;
          padding: 1.5rem !important;
          margin: 1.5rem 0 !important;
          box-shadow: 0 4px 12px rgba(234, 88, 12, 0.15) !important;
        }
        
        .dark .callout-atencao {
          background: linear-gradient(135deg, #7c2d12 0%, #9a3412 100%) !important;
          border-left-color: #fb923c !important;
          opacity: 0.95 !important;
        }
        
        .callout-exemplo-pratico {
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%) !important;
          border-left: 4px solid #2563eb !important;
          border-radius: 0.75rem !important;
          padding: 1.5rem !important;
          margin: 1.5rem 0 !important;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15) !important;
        }
        
        .dark .callout-exemplo-pratico {
          background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%) !important;
          border-left-color: #60a5fa !important;
          opacity: 0.95 !important;
        }
        
        .callout-resumo-executivo {
          background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%) !important;
          border-left: 4px solid #059669 !important;
          border-radius: 0.75rem !important;
          padding: 1.5rem !important;
          margin: 1.5rem 0 !important;
          box-shadow: 0 4px 12px rgba(5, 150, 105, 0.15) !important;
        }
        
        .dark .callout-resumo-executivo {
          background: linear-gradient(135deg, #14532d 0%, #166534 100%) !important;
          border-left-color: #34d399 !important;
          opacity: 0.95 !important;
        }
        
        .callout-aplicacao-profissional {
          background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%) !important;
          border-left: 4px solid #4f46e5 !important;
          border-radius: 0.75rem !important;
          padding: 1.5rem !important;
          margin: 1.5rem 0 !important;
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.15) !important;
        }
        
        .dark .callout-aplicacao-profissional {
          background: linear-gradient(135deg, #312e81 0%, #3730a3 100%) !important;
          border-left-color: #818cf8 !important;
          opacity: 0.95 !important;
        }
        
        .callout-exercicio-rapido {
          background: linear-gradient(135deg, #ecfccb 0%, #d9f99d 100%) !important;
          border-left: 4px solid #65a30d !important;
          border-radius: 0.75rem !important;
          padding: 1.5rem !important;
          margin: 1.5rem 0 !important;
          box-shadow: 0 4px 12px rgba(101, 163, 13, 0.15) !important;
        }
        
        .dark .callout-exercicio-rapido {
          background: linear-gradient(135deg, #365314 0%, #3f6212 100%) !important;
          border-left-color: #a3e635 !important;
          opacity: 0.95 !important;
        }
        
        .callout-erro-comum {
          background: linear-gradient(135deg, #fecaca 0%, #fca5a5 100%) !important;
          border-left: 4px solid #dc2626 !important;
          border-radius: 0.75rem !important;
          padding: 1.5rem !important;
          margin: 1.5rem 0 !important;
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.15) !important;
        }
        
        .dark .callout-erro-comum {
          background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%) !important;
          border-left-color: #f87171 !important;
          opacity: 0.95 !important;
        }
        
        .callout-aprofundamento {
          background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%) !important;
          border-left: 4px solid #7c3aed !important;
          border-radius: 0.75rem !important;
          padding: 1.5rem !important;
          margin: 1.5rem 0 !important;
          box-shadow: 0 4px 12px rgba(124, 58, 237, 0.15) !important;
        }
        
        .dark .callout-aprofundamento {
          background: linear-gradient(135deg, #4c1d95 0%, #5b21b6 100%) !important;
          border-left-color: #a78bfa !important;
          opacity: 0.95 !important;
        }
        
        .callout-citacao-do-especialista {
          background: linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%) !important;
          border-left: 4px solid #4b5563 !important;
          border-radius: 0.75rem !important;
          padding: 1.5rem !important;
          margin: 1.5rem 0 !important;
          box-shadow: 0 4px 12px rgba(75, 85, 99, 0.15) !important;
        }
        
        .dark .callout-citacao-do-especialista {
          background: linear-gradient(135deg, #111827 0%, #1f2937 100%) !important;
          border-left-color: #9ca3af !important;
          opacity: 0.95 !important;
        }
        
        .callout-conexao-com-outros-conceitos {
          background: linear-gradient(135deg, #cffafe 0%, #a5f3fc 100%) !important;
          border-left: 4px solid #0891b2 !important;
          border-radius: 0.75rem !important;
          padding: 1.5rem !important;
          margin: 1.5rem 0 !important;
          box-shadow: 0 4px 12px rgba(8, 145, 178, 0.15) !important;
        }
        
        .dark .callout-conexao-com-outros-conceitos {
          background: linear-gradient(135deg, #164e63 0%, #155e75 100%) !important;
          border-left-color: #22d3ee !important;
          opacity: 0.95 !important;
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
        
        /* Base styles only - NO HOVER RULES */
        .callout-container {
          isolation: isolate;
          transition: all 0.3s ease-out;
        }
        
        .callout-emoji {
          display: inline-block;
          transition: transform 0.3s ease-out;
        }
        
        .callout-copy-btn {
          transition: opacity 0.2s ease-out;
        }
        
        /* Accessibility: respect reduced motion preference */
        @media (prefers-reduced-motion: reduce) {
          .callout-container,
          .callout-emoji,
          .callout-copy-btn {
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
