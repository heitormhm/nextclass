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
  
  // Substituir frases comuns que referenciam diagramas
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
        
        /* Better heading hierarchy */
        .material-didatico-content h2 {
          margin-top: 3rem !important;
          margin-bottom: 1.5rem !important;
          padding-bottom: 0.5rem;
          border-bottom: 2px solid hsl(var(--primary) / 0.2);
          font-size: 1.75rem !important;
          font-weight: 700 !important;
          color: hsl(var(--foreground));
          scroll-margin-top: 60px;
        }
        
        .material-didatico-content h3 {
          margin-top: 2rem !important;
          margin-bottom: 1rem !important;
          font-size: 1.35rem !important;
          font-weight: 600 !important;
          color: hsl(var(--foreground));
          background: linear-gradient(120deg, hsl(var(--primary) / 0.05) 0%, transparent 100%);
          padding: 0.5rem 1rem;
          border-left: 3px solid hsl(var(--primary) / 0.5);
          border-radius: 0.25rem;
          scroll-margin-top: 60px;
        }
        
        .material-didatico-content h4 {
          margin-top: 1.5rem !important;
          margin-bottom: 0.75rem !important;
          font-size: 1.15rem !important;
          font-weight: 600 !important;
          color: hsl(var(--foreground));
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

            // Buscar match no texto completo (mais robusto)
            let matchedCallout = null;
            for (const [title, style] of Object.entries(calloutTypes)) {
              if (fullText.includes(title) || fullText.startsWith(title)) {
                matchedCallout = { title, ...style };
                break;
              }
            }

            if (matchedCallout) {
              return (
                <div className={`${matchedCallout.bgColor} ${matchedCallout.borderColor} rounded-r-lg p-4 my-6 shadow-sm`}>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0">{matchedCallout.icon}</span>
                    <div className="flex-1">
                      <p className={`font-extrabold text-lg ${matchedCallout.titleColor} mb-2`}>
                        {matchedCallout.title.replace(matchedCallout.icon, '').trim()}
                      </p>
                      <div className={matchedCallout.textColor}>
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
