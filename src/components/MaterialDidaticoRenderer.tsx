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
            // 🔵 FASE 1: Log blockquote recebido
            console.log('🔵 [Blockquote] Recebido:', { node, children, props });
            
            // 🔧 FASE 1: Extrair texto usando React API para lidar com ReactNode
            const extractText = (node: ReactNode): string => {
              console.log('🔎 [extractText] Processando:', {
                type: typeof node,
                isArray: Array.isArray(node),
                isValidElement: isValidElement(node),
                constructor: node?.constructor?.name
              });

              // Caso 1: String direta
              if (typeof node === 'string') {
                console.log('✅ [extractText] String encontrada:', node);
                return node;
              }
              
              // Caso 2: Número
              if (typeof node === 'number') {
                console.log('✅ [extractText] Número encontrado:', node);
                return String(node);
              }
              
              // Caso 3: null, undefined, boolean
              if (node == null || typeof node === 'boolean') {
                return '';
              }
              
              // Caso 4: Array de React children
              if (Array.isArray(node)) {
                console.log('📦 [extractText] Array com', node.length, 'elementos');
                return node.map(extractText).join('');
              }
              
              // Caso 5: React Element válido (componente, tag HTML, etc)
              if (isValidElement(node)) {
                console.log('🔄 [extractText] React Element válido, acessando children');
                const children = (node.props as any)?.children;
                if (children != null) {
                  return extractText(children);
                }
                return '';
              }
              
              // Caso 6: Children API do React (usado por react-markdown)
              try {
                const childrenArray = Children.toArray(node);
                console.log('🔄 [extractText] Usando Children.toArray, encontrados', childrenArray.length, 'elementos');
                return childrenArray.map(extractText).join('');
              } catch (error) {
                console.warn('⚠️ [extractText] Erro ao processar Children.toArray:', error);
                return '';
              }
            };
            
            const fullText = extractText(children);
            
            // 🟢 FASE 3: Log texto extraído + validação crítica
            console.log('🟢 [Blockquote] Texto extraído:', { 
              fullText, 
              length: fullText.length,
              first100: fullText.substring(0, 100),
              isEmpty: !fullText || fullText.trim().length === 0,
              childrenType: typeof children,
              childrenIsArray: Array.isArray(children),
              childrenConstructor: children?.constructor?.name
            });

            // 🛡️ VALIDAÇÃO CRÍTICA: Se texto vazio, abortar e mostrar erro detalhado
            if (!fullText || fullText.trim().length === 0) {
              console.error('🔴 [CRÍTICO] extractText() retornou vazio!');
              console.error('🔴 Children raw:', children);
              console.error('🔴 Children stringified:', JSON.stringify(children, null, 2));
              
              return (
                <blockquote className="border-l-4 border-red-600 bg-red-50 dark:bg-red-950 pl-4 pr-4 py-3 my-4">
                  <div className="text-xs font-bold text-red-600 mb-2">
                    🔴 ERRO CRÍTICO: extractText() retornou vazio
                  </div>
                  <div className="text-sm text-red-700 dark:text-red-300 space-y-2">
                    <p><strong>Tipo de children:</strong> {typeof children}</p>
                    <p><strong>É array:</strong> {Array.isArray(children) ? 'Sim' : 'Não'}</p>
                    <p><strong>Constructor:</strong> {children?.constructor?.name || 'N/A'}</p>
                  </div>
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                      Ver estrutura completa de children
                    </summary>
                    <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto">
                      {JSON.stringify(children, null, 2)}
                    </pre>
                  </details>
                </blockquote>
              );
            }
            
            // Normalizar: remover markdown bold (**), dois pontos, espaços extras
            const normalizedText = fullText
              .trim()
              .replace(/\*\*/g, '')
              .replace(/:/g, '')
              .replace(/\s+/g, ' ');
            
            // 🟡 FASE 1: Log texto normalizado
            console.log('🟡 [Blockquote] Texto normalizado:', {
              normalizedText,
              first100: normalizedText.substring(0, 100)
            });
            
            const calloutTypes: Record<string, { 
              bgColor: string; 
              bgColorDark: string;
              borderColorHex: string; 
              textColor: string; 
              titleColor: string; 
              icon: string;
            }> = {
              '✏️ Conceito-Chave': {
                bgColor: 'rgba(243, 232, 255, 0.9)', // purple-200/90
                bgColorDark: 'rgba(88, 28, 135, 0.5)', // purple-900/50
                borderColorHex: '#9333ea', // purple-600
                textColor: 'text-gray-800 dark:text-gray-200',
                titleColor: 'text-purple-800 dark:text-purple-200',
                icon: '✏️',
              },
              '🤔 Pergunta para Reflexão': {
                bgColor: 'rgba(243, 232, 255, 0.9)', // purple-200/90
                bgColorDark: 'rgba(88, 28, 135, 0.5)', // purple-900/50
                borderColorHex: '#7c3aed', // purple-700
                textColor: 'text-gray-800 dark:text-gray-200',
                titleColor: 'text-purple-800 dark:text-purple-200',
                icon: '🤔',
              },
              '💡 Dica Importante': {
                bgColor: 'rgba(254, 243, 199, 0.9)', // yellow-200/90
                bgColorDark: 'rgba(113, 63, 18, 0.5)', // yellow-900/50
                borderColorHex: '#ca8a04', // yellow-600
                textColor: 'text-gray-800 dark:text-gray-200',
                titleColor: 'text-yellow-800 dark:text-yellow-200',
                icon: '💡',
              },
              '⚠️ Atenção': {
                bgColor: 'rgba(254, 215, 170, 0.9)', // orange-200/90
                bgColorDark: 'rgba(124, 45, 18, 0.5)', // orange-900/50
                borderColorHex: '#ea580c', // orange-600
                textColor: 'text-gray-800 dark:text-gray-200',
                titleColor: 'text-orange-800 dark:text-orange-200',
                icon: '⚠️',
              },
              '🔬 Exemplo Prático': {
                bgColor: 'rgba(219, 234, 254, 0.9)', // blue-200/90
                bgColorDark: 'rgba(30, 58, 138, 0.5)', // blue-900/50
                borderColorHex: '#2563eb', // blue-600
                textColor: 'text-gray-800 dark:text-gray-200',
                titleColor: 'text-blue-800 dark:text-blue-200',
                icon: '🔬',
              },
              '📊 Resumo Executivo': {
                bgColor: 'rgba(209, 250, 229, 0.9)', // green-200/90
                bgColorDark: 'rgba(20, 83, 45, 0.5)', // green-900/50
                borderColorHex: '#059669', // green-600
                textColor: 'text-gray-800 dark:text-gray-200',
                titleColor: 'text-green-800 dark:text-green-200',
                icon: '📊',
              },
              '🏭 Aplicação Profissional': {
                bgColor: 'rgba(224, 231, 255, 0.9)', // indigo-200/90
                bgColorDark: 'rgba(49, 46, 129, 0.5)', // indigo-900/50
                borderColorHex: '#4f46e5', // indigo-600
                textColor: 'text-gray-800 dark:text-gray-200',
                titleColor: 'text-indigo-800 dark:text-indigo-200',
                icon: '🏭',
              },
              '✍️ Exercício Rápido': {
                bgColor: 'rgba(236, 252, 203, 0.9)', // lime-200/90
                bgColorDark: 'rgba(54, 83, 20, 0.5)', // lime-900/50
                borderColorHex: '#65a30d', // lime-600
                textColor: 'text-gray-800 dark:text-gray-200',
                titleColor: 'text-lime-800 dark:text-lime-200',
                icon: '✍️',
              },
              '❌ Erro Comum': {
                bgColor: 'rgba(254, 202, 202, 0.9)', // red-200/90
                bgColorDark: 'rgba(127, 29, 29, 0.5)', // red-900/50
                borderColorHex: '#dc2626', // red-600
                textColor: 'text-gray-800 dark:text-gray-200',
                titleColor: 'text-red-800 dark:text-red-200',
                icon: '❌',
              },
              '🔍 Aprofundamento': {
                bgColor: 'rgba(237, 233, 254, 0.9)', // violet-200/90
                bgColorDark: 'rgba(76, 29, 149, 0.5)', // violet-900/50
                borderColorHex: '#7c3aed', // violet-600
                textColor: 'text-gray-800 dark:text-gray-200',
                titleColor: 'text-violet-800 dark:text-violet-200',
                icon: '🔍',
              },
              '🎓 Citação do Especialista': {
                bgColor: 'rgba(229, 231, 235, 0.9)', // gray-200/90
                bgColorDark: 'rgba(17, 24, 39, 0.5)', // gray-900/50
                borderColorHex: '#4b5563', // gray-600
                textColor: 'text-gray-800 dark:text-gray-200',
                titleColor: 'text-gray-800 dark:text-gray-200',
                icon: '🎓',
              },
              '🔗 Conexão com Outros Conceitos': {
                bgColor: 'rgba(207, 250, 254, 0.9)', // cyan-200/90
                bgColorDark: 'rgba(22, 78, 99, 0.5)', // cyan-900/50
                borderColorHex: '#0891b2', // cyan-600
                textColor: 'text-gray-800 dark:text-gray-200',
                titleColor: 'text-cyan-800 dark:text-cyan-200',
                icon: '🔗',
              },
            };

            // ESTRATÉGIA 1: Buscar match exato no texto normalizado (sem pontuação)
            let matchedCallout = null;
            for (const [title, style] of Object.entries(calloutTypes)) {
              const normalizedTitle = title.replace(/\s+/g, ' ').replace(/:/g, '');
              // 🔍 FASE 1: Log tentativa de match
              console.log('🔍 [Strategy 1] Testando:', { 
                title, 
                normalizedTitle, 
                match: normalizedText.includes(normalizedTitle) || normalizedText.startsWith(normalizedTitle)
              });
              if (normalizedText.includes(normalizedTitle) || normalizedText.startsWith(normalizedTitle)) {
                console.log('✅ [Strategy 1] MATCH encontrado!', title);
                matchedCallout = { title, ...style };
                break;
              }
            }
            
            // ESTRATÉGIA 2: Fallback - buscar apenas pelo emoji no início
            if (!matchedCallout) {
              console.log('⚠️ [Strategy 2] Fallback para emoji detection...');
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
                // 🔍 FASE 1: Log tentativa de match por emoji
                console.log('🔍 [Strategy 2] Testando emoji:', { 
                  emoji, 
                  title, 
                  startsWithEmoji: normalizedText.startsWith(emoji)
                });
                if (normalizedText.startsWith(emoji)) {
                  console.log('✅ [Strategy 2] EMOJI MATCH!', emoji);
                  matchedCallout = { title, ...calloutTypes[title] };
                  break;
                }
              }
            }

            // 🎯 FASE 1: Log resultado da detecção
            console.log('🎯 [Blockquote] Resultado da detecção:', {
              matchedCallout: matchedCallout ? 'FOUND' : 'NOT FOUND',
              title: matchedCallout?.title,
              willRenderAsCallout: !!matchedCallout
            });

            if (matchedCallout) {
              // Extrair tipo do callout para data-attribute
              const calloutType = matchedCallout.title
                .replace(matchedCallout.icon, '')
                .trim()
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '') // Remove acentos
                .replace(/\s+/g, '-');
              
              // 🐛 DEBUG: Log detecção de callout
              console.log('[Callout Debug] Detectado:', {
                originalText: fullText.substring(0, 100),
                normalizedText: normalizedText.substring(0, 100),
                matchedTitle: matchedCallout.title,
                calloutType,
                className: `callout-${calloutType}`
              });
              
              // 🆕 FASE 2: Forçar estilos inline como backup
              const inlineStyles: React.CSSProperties = {
                background: matchedCallout.bgColor,
                borderLeft: `4px solid ${matchedCallout.borderColorHex}`,
                borderRadius: '0.75rem',
                padding: '1.5rem',
                margin: '1.5rem 0',
                boxShadow: `0 4px 12px ${matchedCallout.borderColorHex}40`, // 40 = 25% opacity in hex
              };

              // 🎨 FASE 1: Log estilos aplicados
              console.log('🎨 [Callout] Renderizando com:', {
                calloutType,
                className: `callout-${calloutType}`,
                bgColor: matchedCallout.bgColor,
                inlineStyles
              });
              
              return (
                <div 
                  data-callout-type={calloutType}
                  className={`callout-${calloutType} rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5`}
                  style={inlineStyles} // 🆕 FORÇAR estilos inline
                >
                  <div className="flex items-start gap-4">
                    <span className="text-3xl flex-shrink-0 mt-1">{matchedCallout.icon}</span>
                    <div className="flex-1">
                      <p className="font-bold text-lg mb-3 tracking-tight" style={{ color: matchedCallout.titleColor.includes('dark:') ? undefined : matchedCallout.titleColor }}>
                        {matchedCallout.title.replace(matchedCallout.icon, '').trim()}
                      </p>
                      <div className={`${matchedCallout.textColor} leading-relaxed callout-content`}>
                        {children}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            // 🟥 FASE 3: Fallback com indicador visual de erro
            console.warn('❌ [Blockquote] NÃO foi detectado como callout. Renderizando blockquote padrão.');
            console.warn('❌ [Blockquote] Texto que falhou:', fullText?.substring(0, 200));

            return (
              <blockquote 
                className="border-l-4 border-red-500 pl-4 italic my-4 text-muted-foreground bg-red-50 dark:bg-red-950" 
                {...props}
              >
                <div className="text-xs text-red-600 dark:text-red-400 font-bold mb-2">
                  ⚠️ CALLOUT NÃO DETECTADO (debug mode)
                </div>
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
