import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { MaterialMermaidDiagram } from './MaterialMermaidDiagram';
import { MermaidErrorBoundary } from './MermaidErrorBoundary';

interface MaterialDidaticoRendererProps {
  markdown: string;
}


export const MaterialDidaticoRenderer: React.FC<MaterialDidaticoRendererProps> = ({ markdown }) => {
  // Calculate reading time
  const words = markdown.split(/\s+/).length;
  const readingTimeMin = Math.ceil(words / 200); // Average reading speed

  if (!markdown || markdown.trim().length === 0) {
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
        
        /* Better spacing for formulas */
        .material-didatico-content .katex-display {
          background: hsl(var(--muted));
          padding: 1.5rem;
          border-radius: 0.5rem;
          border-left: 4px solid hsl(var(--primary));
          margin: 2rem 0;
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
        rehypePlugins={[
          [rehypeKatex, {
            throwOnError: false,        // NÃO crashar em erros ✅ FASE 2
            errorColor: '#dc2626',      // Cor de erro visível
            strict: false,              // Aceitar LaTeX relaxado
            trust: true,                // Permitir comandos avançados
            fleqn: false,               // Centralizar equações
            displayMode: false,         // Auto-detectar modo
            output: 'html',             // HTML (não MathML)
            macros: {
              '\\RR': '\\mathbb{R}',    // Macros comuns
              '\\CC': '\\mathbb{C}',
              '\\vect': '\\mathbf{#1}'
            }
          }]
        ]}
        components={{
          // Handle code blocks (including Mermaid)
          code: ({ node, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const inline = !className;

            if (language === 'mermaid' && !inline) {
              return (
                <MermaidErrorBoundary key={`mermaid-${node?.position?.start?.line || Math.random()}`}>
                  <MaterialMermaidDiagram code={String(children).trim()} />
                </MermaidErrorBoundary>
              );
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
          // Style lists
          ul: ({ node, ...props }) => (
            <ul className="list-disc list-inside mb-4 space-y-2" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal list-inside mb-4 space-y-2" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="text-foreground/90" {...props} />
          ),
          // Style blockquotes with intelligent callout detection
          blockquote: ({ node, children, ...props }) => {
            const firstChild = node?.children?.[0] as any;
            const textContent = firstChild?.children?.[0]?.value || '';
            
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
            };

            let matchedCallout = null;
            for (const [title, style] of Object.entries(calloutTypes)) {
              if (textContent.startsWith(title)) {
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
        {markdown}
      </ReactMarkdown>
      </div>
    </div>
  );
};
