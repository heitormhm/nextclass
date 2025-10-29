/**
 * Rich Material Renderer
 * Renders educational markdown with LaTeX, Mermaid, callouts, and formatting
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { katexOptions } from '@/utils/katexConfig';
import { MermaidDiagram } from '@/components/MermaidDiagram';
import { MermaidErrorBoundary } from '@/components/MermaidErrorBoundary';
import { MarkdownReferencesRenderer } from './MarkdownReferencesRenderer';
import 'katex/dist/katex.min.css';

interface RichMaterialRendererProps {
  markdown: string;
}

export const RichMaterialRenderer: React.FC<RichMaterialRendererProps> = ({ markdown }) => {
  const scrollToReference = (refNumber: string) => {
    const element = document.getElementById(`ref-${refNumber}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('highlight-flash');
      setTimeout(() => element.classList.remove('highlight-flash'), 2000);
    }
  };

  // Process inline citations [1], [2] as superscript
  const processCitations = (children: React.ReactNode): React.ReactNode => {
    if (typeof children === 'string') {
      const parts = children.split(/(\[\d+\])/g);
      return parts.map((part, i) => {
        const match = part.match(/\[(\d+)\]/);
        if (match) {
          return (
            <sup
              key={`cite-${i}`}
              className="inline-block ml-0.5 px-1 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-medium cursor-pointer hover:bg-purple-200 transition-colors align-super"
              onClick={() => scrollToReference(match[1])}
            >
              {match[1]}
            </sup>
          );
        }
        return part;
      });
    }
    return children;
  };

  return (
    <div className="prose prose-sm max-w-none overflow-x-hidden break-words [overflow-wrap:anywhere] prose-headings:text-foreground prose-p:text-foreground prose-strong:text-purple-700 prose-li:text-foreground prose-a:text-primary hover:prose-a:text-primary/80 [&_.katex-display]:bg-purple-50 [&_.katex-display]:p-4 [&_.katex-display]:rounded-lg [&_.katex-display]:my-4 [&_.katex-display]:border [&_.katex-display]:border-purple-200 [&_.katex-display]:overflow-x-auto [&_.katex-display]:max-w-full [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_code]:break-all [&_code]:whitespace-pre-wrap">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, {
          ...katexOptions,
          errorCallback: (err: Error, errStr: string) => {
            console.error('[KaTeX] Render error:', err.message);
            return `[LaTeX Error: ${errStr}]`;
          }
        }]]}
        components={{
          // ✅ PHASE 3: Paragraphs with citation processing + subtitle detection
          p: ({ node, children, ...props }) => {
            // Extract text content to check if it's a subtitle
            const extractText = (child: any): string => {
              if (typeof child === 'string') return child;
              if (Array.isArray(child)) return child.map(extractText).join('');
              if (child?.props?.children) return extractText(child.props.children);
              return String(child);
            };
            const textContent = extractText(children).trim();
            
            // Detect if this paragraph is actually an example subtitle (plain text, not in <strong>)
            const isSubtitle = /^(Enunciado|Dados Fornecidos|Raciocínio|Discussão|Solução|Resposta|Análise):?\s*$/i.test(textContent);
            
            if (isSubtitle) {
              return (
                <h4 className="text-lg font-semibold text-purple-700 dark:text-purple-300 mt-6 mb-3 border-l-4 border-purple-400 pl-3">
                  {children}
                </h4>
              );
            }
            
            // Normal paragraph: process citations
            const processedChildren = React.Children.map(children, (child) => processCitations(child));
            return (
              <p className="my-4 leading-relaxed text-foreground" {...props}>
                {processedChildren}
              </p>
            );
          },
          
          // Custom H2 styling (purple gradient)
          h2: ({node, ...props}) => (
            <h2 
              className="text-3xl font-bold mt-10 mb-6 pb-3 border-b-4 border-purple-500 bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent"
              {...props} 
            />
          ),
          
          // Custom H3 styling - PHASE 3: Arrow only for main titles, NOT for bold subtitles
          h3: ({node, children, ...props}) => {
            // Extract text for analysis
            const extractText = (child: any): string => {
              if (typeof child === 'string') return child;
              if (Array.isArray(child)) return child.map(extractText).join('');
              if (child?.props?.children) return extractText(child.props.children);
              return String(child);
            };
            const text = extractText(children);
            
            // PHASE 3: Expanded regex to detect **bold** markdown subtitles
            // Match patterns like "**Enunciado:**", "**Raciocínio**", etc.
            const isSubtitle = /^(\*\*)?[\s]*(Enunciado|Dados Fornecidos|Dados|Incógnita|Raciocínio|Discussão|Verificação|Calculadora|Identificar|Formular|Comparar|Solução|Resposta|Análise|Balanço de Energia para Sistemas Fechados)[\s]*(:)?[\s]*(\*\*)?$/i.test(text);
            
            if (isSubtitle) {
              // No arrow, simple style for example subtitles
              return (
                <h4 className="text-lg font-semibold text-purple-700 dark:text-purple-300 mt-6 mb-3 border-l-4 border-purple-400 pl-3" {...props}>
                  {children}
                </h4>
              );
            }
            
            // Main title: with arrow
            return (
              <h3 className="text-2xl font-bold mt-8 mb-4 text-purple-700 flex items-center gap-2 before:content-['▸'] before:text-purple-500" {...props}>
                {children}
              </h3>
            );
          },
          
          // Purple callout boxes (blockquotes with special syntax)
          blockquote: ({node, children, ...props}) => {
            // ✅ PHASE 3: Fix text extraction from React children
            const extractText = (child: any): string => {
              if (typeof child === 'string') return child;
              if (Array.isArray(child)) return child.map(extractText).join('');
              if (child?.props?.children) return extractText(child.props.children);
              return String(child);
            };
            const content = extractText(children);
            
            // ✅ PHASE 3: Trim whitespace before checking emoji
            if (content.trim().match(/^(🔑|💡|⚠️|🤔|🌍)/)) {
              let bgColor = 'from-purple-50 to-purple-100';
              let borderColor = 'border-purple-600';
              let textColor = 'text-purple-900';
              
              if (content.startsWith('⚠️')) {
                bgColor = 'from-red-100 to-red-200';
                borderColor = 'border-red-500';
                textColor = 'text-red-900';
              } else if (content.startsWith('💡')) {
                bgColor = 'from-purple-100 to-purple-200';
                borderColor = 'border-purple-500';
                textColor = 'text-purple-900';
              } else if (content.startsWith('🤔')) {
                bgColor = 'from-indigo-100 to-indigo-200';
                borderColor = 'border-indigo-500';
                textColor = 'text-indigo-900';
              } else if (content.startsWith('🌍')) {
                bgColor = 'from-blue-100 to-blue-200';
                borderColor = 'border-blue-500';
                textColor = 'text-blue-900';
              }
              
              return (
                <div className={`bg-gradient-to-br ${bgColor} border-l-4 ${borderColor} p-6 rounded-xl shadow-lg my-6`}>
                  <div className={`${textColor} leading-relaxed`}>
                    {children}
                  </div>
                </div>
              );
            }
            
            // Default blockquote
            return (
              <blockquote 
                className="border-l-4 border-gray-300 pl-4 italic text-gray-700 my-4"
                {...props}
              >
                {children}
              </blockquote>
            );
          },
          
          // ✅ NEW: Detect example subtitles rendered as <strong>
          strong: ({ children, ...props }) => {
            const content = String(children);
            
            // Detect if it's an example subtitle (Enunciado, Raciocínio, etc.)
            const isExampleSubtitle = /^(Enunciado|Dados Fornecidos|Raciocínio|Discussão|Solução|Resposta|Análise):?\s*$/i.test(content);
            
            if (isExampleSubtitle) {
              return (
                <h4 className="text-lg font-semibold text-purple-700 dark:text-purple-300 mt-4 mb-2">
                  {content}
                </h4>
              );
            }
            
            // Default: purple bold text
            return <strong className="font-bold text-purple-700" {...props}>{children}</strong>;
          },
          
          // ✅ PHASE 2: Mermaid placeholders (rendered separately by TwoPhaseRenderer)
          code: ({node, className, children, ...props}: any) => {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : null;
            const inline = !className;
            
            if (!inline && language === 'mermaid') {
              // Show placeholder (diagrams rendered separately by TwoPhaseRenderer)
              return (
                <div className="bg-purple-50 border-2 border-dashed border-purple-300 rounded-lg p-4 my-4">
                  <p className="text-sm text-purple-600">
                    📊 Diagrama será carregado na seção de diagramas visuais...
                  </p>
                </div>
              );
            }
            
            // Inline code (purple background)
            if (inline) {
              return (
                <code 
                  className="bg-purple-100 px-2 py-1 rounded text-sm font-mono text-purple-700"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            
            // Code blocks
            return (
              <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto my-4">
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            );
          },
          
          // Lists with purple markers - PHASE 3: Fixed spacing (removed space-y-2)
          ul: ({node, ...props}) => (
            <ul className="list-disc list-inside my-4 marker:text-purple-500" {...props} />
          ),
          
          ol: ({node, ...props}) => (
            <ol className="list-decimal list-inside my-4 marker:text-purple-500" {...props} />
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
};
