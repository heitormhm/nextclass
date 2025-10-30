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
  const [scrollProgress, setScrollProgress] = React.useState(0);

  // Calculate reading time
  const words = markdown.split(/\s+/).length;
  const readingTimeMin = Math.ceil(words / 200); // Average reading speed

  // Add scroll listener for progress tracking (window-based) with debounce
  React.useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const handleScroll = () => {
      clearTimeout(timeoutId);
      
      timeoutId = setTimeout(() => {
        const windowHeight = window.innerHeight;
        const docHeight = document.documentElement.scrollHeight;
        const scrollTop = window.scrollY;
        const progress = (scrollTop / (docHeight - windowHeight)) * 100;
        setScrollProgress(Math.min(progress, 100));
      }, 50); // Debounce de 50ms
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  if (!markdown || markdown.trim().length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Nenhum material didático gerado ainda.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Fixed Reading Progress Indicator - Enhanced Visibility */}
      <div className="fixed top-0 left-0 right-0 bg-primary/10 backdrop-blur-lg z-[100] border-b-2 border-primary/30 py-2 px-6 shadow-lg">
        <div className="flex items-center justify-between text-sm font-medium text-foreground mb-2">
          <span className="flex items-center gap-2">
            <span className="text-lg">📖</span>
            <span>Leitura: ~{readingTimeMin} min</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="text-lg">📊</span>
            <span>Progresso: {Math.round(scrollProgress)}%</span>
          </span>
        </div>
        <div className="w-full h-1.5 bg-muted/70 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary via-primary/80 to-primary/60 transition-all duration-300 shadow-sm"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>
      </div>

      <div className="prose prose-lg max-w-none dark:prose-invert material-didatico-content pt-24">
        <style>{`
  .material-didatico-content .katex-error {
    color: #dc2626 !important;
    font-weight: bold;
    background: #fee2e2;
    padding: 0.2em 0.4em;
    border-radius: 0.25em;
    border: 1px dashed #dc2626;
    cursor: help;
  }
  .material-didatico-content .katex-error::before {
    content: "⚠️ LaTeX Error: ";
    font-size: 0.9em;
  }
  .material-didatico-content .katex-error::after {
    content: " (verificar sintaxe)";
    font-size: 0.8em;
    font-style: italic;
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
              <h1 className="text-3xl font-bold mt-2 mb-4 text-foreground" {...props} />
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
    </div>
  );
};
