import React from 'react';
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
            // Extrair todo o conteúdo textual do blockquote de forma robusta
            const extractText = (node: any): string => {
              if (typeof node === 'string') return node;
              if (node?.props?.children) {
                if (Array.isArray(node.props.children)) {
                  return node.props.children.map(extractText).join('');
                }
                return extractText(node.props.children);
              }
              if (node?.children) {
                if (Array.isArray(node.children)) {
                  return node.children.map((child: any) => extractText(child)).join('');
                }
                return extractText(node.children);
              }
              if (node?.value) return node.value;
              return '';
            };
            
            const fullText = extractText(children);
            // Normalizar: remover markdown bold (**), dois pontos, espaços extras
            const normalizedText = fullText
              .trim()
              .replace(/\*\*/g, '')
              .replace(/:/g, '')
              .replace(/\s+/g, ' ');
            
            const calloutTypes: Record<string, { bgColor: string; borderColor: string; textColor: string; titleColor: string; icon: string }> = {
              '✏️ Conceito-Chave': {
                bgColor: 'bg-purple-200/90 dark:bg-purple-900/50',
                borderColor: 'border-purple-600 border-l-4',
                textColor: 'text-gray-800 dark:text-gray-200',
                titleColor: 'text-purple-800 dark:text-purple-200',
                icon: '✏️',
              },
              '🤔 Pergunta para Reflexão': {
                bgColor: 'bg-purple-200/90 dark:bg-purple-900/50',
                borderColor: 'border-purple-700 border-l-4',
                textColor: 'text-gray-800 dark:text-gray-200',
                titleColor: 'text-purple-800 dark:text-purple-200',
                icon: '🤔',
              },
              '💡 Dica Importante': {
                bgColor: 'bg-yellow-200/90 dark:bg-yellow-900/50',
                borderColor: 'border-yellow-600 border-l-4',
                textColor: 'text-gray-800 dark:text-gray-200',
                titleColor: 'text-yellow-800 dark:text-yellow-200',
                icon: '💡',
              },
              '⚠️ Atenção': {
                bgColor: 'bg-orange-200/90 dark:bg-orange-900/50',
                borderColor: 'border-orange-600 border-l-4',
                textColor: 'text-gray-800 dark:text-gray-200',
                titleColor: 'text-orange-800 dark:text-orange-200',
                icon: '⚠️',
              },
              '🔬 Exemplo Prático': {
                bgColor: 'bg-blue-200/90 dark:bg-blue-900/50',
                borderColor: 'border-blue-600 border-l-4',
                textColor: 'text-gray-800 dark:text-gray-200',
                titleColor: 'text-blue-800 dark:text-blue-200',
                icon: '🔬',
              },
              '📊 Resumo Executivo': {
                bgColor: 'bg-green-200/90 dark:bg-green-900/50',
                borderColor: 'border-green-600 border-l-4',
                textColor: 'text-gray-800 dark:text-gray-200',
                titleColor: 'text-green-800 dark:text-green-200',
                icon: '📊',
              },
              '🏭 Aplicação Profissional': {
                bgColor: 'bg-indigo-200/90 dark:bg-indigo-900/50',
                borderColor: 'border-indigo-600 border-l-4',
                textColor: 'text-gray-800 dark:text-gray-200',
                titleColor: 'text-indigo-800 dark:text-indigo-200',
                icon: '🏭',
              },
              '✍️ Exercício Rápido': {
                bgColor: 'bg-lime-200/90 dark:bg-lime-900/50',
                borderColor: 'border-lime-600 border-l-4',
                textColor: 'text-gray-800 dark:text-gray-200',
                titleColor: 'text-lime-800 dark:text-lime-200',
                icon: '✍️',
              },
              '❌ Erro Comum': {
                bgColor: 'bg-red-200/90 dark:bg-red-900/50',
                borderColor: 'border-red-600 border-l-4',
                textColor: 'text-gray-800 dark:text-gray-200',
                titleColor: 'text-red-800 dark:text-red-200',
                icon: '❌',
              },
              '🔍 Aprofundamento': {
                bgColor: 'bg-violet-200/90 dark:bg-violet-900/50',
                borderColor: 'border-violet-600 border-l-4',
                textColor: 'text-gray-800 dark:text-gray-200',
                titleColor: 'text-violet-800 dark:text-violet-200',
                icon: '🔍',
              },
              '🎓 Citação do Especialista': {
                bgColor: 'bg-gray-200/90 dark:bg-gray-900/50',
                borderColor: 'border-gray-600 border-l-4',
                textColor: 'text-gray-800 dark:text-gray-200',
                titleColor: 'text-gray-800 dark:text-gray-200',
                icon: '🎓',
              },
              '🔗 Conexão com Outros Conceitos': {
                bgColor: 'bg-cyan-200/90 dark:bg-cyan-900/50',
                borderColor: 'border-cyan-600 border-l-4',
                textColor: 'text-gray-800 dark:text-gray-200',
                titleColor: 'text-cyan-800 dark:text-cyan-200',
                icon: '🔗',
              },
            };

            // ESTRATÉGIA 1: Buscar match exato no texto normalizado (sem pontuação)
            let matchedCallout = null;
            for (const [title, style] of Object.entries(calloutTypes)) {
              const normalizedTitle = title.replace(/\s+/g, ' ').replace(/:/g, '');
              if (normalizedText.includes(normalizedTitle) || normalizedText.startsWith(normalizedTitle)) {
                matchedCallout = { title, ...style };
                break;
              }
            }
            
            // ESTRATÉGIA 2: Fallback - buscar apenas pelo emoji no início
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
              return (
                <div 
                  className={`${matchedCallout.bgColor} ${matchedCallout.borderColor} rounded-lg p-6 my-6 shadow-lg transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5`}
                  style={{
                    borderLeftWidth: '4px',
                    borderLeftStyle: 'solid'
                  }}
                >
                  <div className="flex items-start gap-4">
                    <span className="text-3xl flex-shrink-0 mt-1">{matchedCallout.icon}</span>
                    <div className="flex-1">
                      <p className={`font-bold text-lg ${matchedCallout.titleColor} mb-3 tracking-tight`}>
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

            return (
              <blockquote className="border-l-4 border-primary pl-4 italic my-4 text-muted-foreground" {...props}>
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
