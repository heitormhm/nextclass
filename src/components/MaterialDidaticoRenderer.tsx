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
  if (!markdown || markdown.trim().length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Nenhum material didático gerado ainda.</p>
      </div>
    );
  }

  return (
    <div className="prose prose-lg max-w-none dark:prose-invert material-didatico-content">
      <style>{`
        .material-didatico-content .katex-error {
          color: #dc2626 !important;
          font-weight: bold;
          background: #fee2e2;
          padding: 0.2em 0.4em;
          border-radius: 0.25em;
          border: 1px dashed #dc2626;
        }
        .material-didatico-content .katex-error::after {
          content: " ⚠️";
          font-size: 0.9em;
        }
        .material-didatico-content code {
          color: inherit;
          background: rgba(0,0,0,0.05);
          padding: 0.1em 0.3em;
          border-radius: 0.25em;
          font-family: 'Courier New', monospace;
        }
      `}</style>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
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
            <h1 className="text-3xl font-bold mt-8 mb-4 text-foreground" {...props} />
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
            
            const calloutTypes: Record<string, { bgColor: string; borderColor: string; textColor: string; icon: string }> = {
              '✏️ Conceito-Chave': {
                bgColor: 'bg-purple-100/80 dark:bg-purple-950/30',
                borderColor: 'border-purple-500',
                textColor: 'text-purple-900 dark:text-purple-300',
                icon: '✏️',
              },
              '🤔 Pergunta para Reflexão': {
                bgColor: 'bg-purple-100/80 dark:bg-purple-950/30',
                borderColor: 'border-purple-600',
                textColor: 'text-purple-900 dark:text-purple-300',
                icon: '🤔',
              },
              '💡 Dica Importante': {
                bgColor: 'bg-yellow-100/80 dark:bg-yellow-950/30',
                borderColor: 'border-yellow-500',
                textColor: 'text-yellow-900 dark:text-yellow-300',
                icon: '💡',
              },
              '⚠️ Atenção': {
                bgColor: 'bg-orange-100/80 dark:bg-orange-950/30',
                borderColor: 'border-orange-500',
                textColor: 'text-orange-900 dark:text-orange-300',
                icon: '⚠️',
              },
              '🔬 Exemplo Prático': {
                bgColor: 'bg-blue-100/80 dark:bg-blue-950/30',
                borderColor: 'border-blue-500',
                textColor: 'text-blue-900 dark:text-blue-300',
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
                <div className={`${matchedCallout.bgColor} ${matchedCallout.borderColor} border-l-4 rounded-r-lg p-4 my-6 shadow-sm`}>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0">{matchedCallout.icon}</span>
                    <div className="flex-1">
                      <p className={`font-bold ${matchedCallout.textColor} mb-2`}>
                        {matchedCallout.title.replace(matchedCallout.icon, '').trim()}
                      </p>
                      <div className="text-gray-700 dark:text-gray-300">
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
  );
};
