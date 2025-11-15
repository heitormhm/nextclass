import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { getRehypeKatexPlugin } from '@/lib/textRenderingEngine';
import { useIsMobile, useIsTablet } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface MobileResponsiveMarkdownProps {
  content: string;
  className?: string;
}

export const MobileResponsiveMarkdown: React.FC<MobileResponsiveMarkdownProps> = ({ 
  content, 
  className 
}) => {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const rehypeKatex = getRehypeKatexPlugin();

  return (
    <div className={cn(
      "prose prose-sm max-w-none prose-gray break-words",
      (isMobile || isTablet) ? "w-full overflow-x-hidden" : "overflow-x-auto",
      className
    )}>
      <style>{`
        /* 📱 MOBILE-SPECIFIC TEXT RENDERING FIX */
        @media (max-width: 1023px) {
          .prose {
            max-width: 100% !important;
            width: 100% !important;
            overflow-wrap: break-word !important;
            word-wrap: break-word !important;
            word-break: break-word !important;
          }
          
          .prose p,
          .prose li,
          .prose div,
          .prose span,
          .prose code,
          .prose pre,
          .prose h1,
          .prose h2,
          .prose h3,
          .prose h4,
          .prose strong {
            max-width: 100% !important;
            overflow-wrap: break-word !important;
            word-break: break-word !important;
          }
          
          .prose pre {
            overflow-x: auto !important;
            white-space: pre-wrap !important;
            font-size: 0.75rem !important;
          }
          
          .prose table {
            display: block !important;
            overflow-x: auto !important;
            max-width: 100% !important;
          }
          
          /* Force LaTeX to wrap on mobile */
          .prose .math-display,
          .prose .math-inline {
            max-width: 100% !important;
            overflow-x: auto !important;
            font-size: 0.85em !important;
          }
          
          /* JSON/code blocks */
          .prose pre > code {
            font-size: 0.75rem !important;
          }
        }
      `}</style>
      
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h2: ({node, ...props}) => (
            <h2 className="text-xl font-bold mt-6 mb-3 text-gray-900 dark:text-white pb-2 border-b-2 border-purple-200 dark:border-purple-800" {...props} />
          ),
          h3: ({node, ...props}) => (
            <h3 className="text-lg font-semibold mt-4 mb-2 text-gray-800 dark:text-gray-100 flex items-center gap-2" {...props} />
          ),
          p: ({node, children, ...props}) => {
            const text = String(children);
            if (text.startsWith('> **')) {
              const match = text.match(/^> \*\*(.+?):\*\* (.+)$/);
              if (match) {
                const [, title, content] = match;
                const bgColors: { [key: string]: string } = {
                  'Nota': 'bg-yellow-50 border-yellow-300',
                  'Atenção': 'bg-red-50 border-red-300',
                  'Dica': 'bg-blue-50 border-blue-300',
                  'Exemplo': 'bg-green-50 border-green-300'
                };
                const colorClass = bgColors[title] || 'bg-gray-50 border-gray-300';
                
                return (
                  <div className={`my-3 p-3 rounded-lg border-l-4 ${colorClass}`}>
                    <span className="font-bold text-sm">{title}:</span>{' '}
                    <span className="text-sm">{content}</span>
                  </div>
                );
              }
            }
            return <p className="mb-2 text-foreground leading-relaxed" {...props}>{children}</p>;
          },
          strong: ({node, ...props}) => <strong className="font-bold text-foreground" {...props} />,
          div: ({node, className, ...props}: any) => {
            if (className === 'math math-display') {
              return (
                <div 
                  className={cn(
                    "my-4 text-center",
                    (isMobile || isTablet) ? "overflow-x-auto max-w-full" : "overflow-x-auto"
                  )} 
                  {...props} 
                />
              );
            }
            return <div className={cn(className, "max-w-full")} {...props} />;
          },
          span: ({node, className, ...props}: any) => {
            if (className === 'math math-inline') {
              return <span className="mx-1" {...props} />;
            }
            return <span className={className} {...props} />;
          },
          code: ({node, inline, className, children, ...props}: any) => {
            if (!inline) {
              return (
                <code className={cn("text-xs block", className)} {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-800 rounded text-xs font-mono" {...props}>
                {children}
              </code>
            );
          },
          pre: ({node, ...props}) => (
            <pre className="bg-gray-100 dark:bg-gray-900 p-3 rounded-lg overflow-x-auto my-3" {...props} />
          ),
          ul: ({node, ...props}) => (
            <ul className="space-y-1 ml-4 my-2 list-disc" {...props} />
          ),
          ol: ({node, ...props}) => (
            <ol className="space-y-1 ml-4 my-2 list-decimal" {...props} />
          ),
          li: ({node, ...props}) => (
            <li className="text-foreground" {...props} />
          ),
          table: ({node, ...props}) => (
            <div className="overflow-x-auto max-w-full my-4">
              <table className="min-w-full border-collapse" {...props} />
            </div>
          ),
          blockquote: ({node, ...props}) => (
            <blockquote className="border-l-4 border-gray-300 dark:border-gray-700 pl-4 py-2 my-3 italic text-gray-700 dark:text-gray-300" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
