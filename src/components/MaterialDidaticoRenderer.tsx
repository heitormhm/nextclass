import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import mermaid from 'mermaid';
import 'katex/dist/katex.min.css';

interface MaterialDidaticoRendererProps {
  markdown: string;
}

// Simplified Mermaid component for inline rendering
const InlineMermaidDiagram = ({ code }: { code: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = React.useState<boolean>(false);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!ref.current || !code) return;

      try {
        // Clean code
        const cleanCode = code.trim()
          .replace(/^```mermaid\s*/i, '')
          .replace(/```$/g, '')
          .trim();

        if (cleanCode.length < 10) {
          setError(true);
          return;
        }

        // Initialize Mermaid
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

        const uniqueId = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(uniqueId, cleanCode);

        if (ref.current) {
          ref.current.innerHTML = svg;
        }

        setError(false);
      } catch (err) {
        console.error('[MaterialDidatico] Mermaid render error:', err);
        setError(true);
      }
    };

    renderDiagram();
  }, [code]);

  if (error) {
    return (
      <div className="bg-muted/30 p-4 rounded-lg border border-border my-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span>📊</span>
          <span className="text-sm">Diagrama temporariamente indisponível</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-muted/30 p-4 rounded-lg border border-border my-4 w-full overflow-x-auto">
      <div
        ref={ref}
        className="mermaid-diagram-container flex justify-center items-center min-h-[200px]"
      />
    </div>
  );
};

export const MaterialDidaticoRenderer: React.FC<MaterialDidaticoRendererProps> = ({ markdown }) => {
  if (!markdown || markdown.trim().length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Nenhum material didático gerado ainda.</p>
      </div>
    );
  }

  return (
    <div className="prose prose-lg max-w-none dark:prose-invert">
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
              return <InlineMermaidDiagram code={String(children).trim()} />;
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
          h2: ({ node, ...props }) => (
            <h2 className="text-2xl font-bold mt-6 mb-3 text-foreground border-b pb-2" {...props} />
          ),
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
          // Style blockquotes
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-primary pl-4 italic my-4 text-muted-foreground" {...props} />
          ),
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
