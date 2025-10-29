/**
 * Rich Material Renderer
 * Renders educational markdown with LaTeX, Mermaid, callouts, and formatting
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { MermaidDiagram } from '@/components/MermaidDiagram';
import { MermaidErrorBoundary } from '@/components/MermaidErrorBoundary';
import { MarkdownReferencesRenderer } from './MarkdownReferencesRenderer';
import 'katex/dist/katex.min.css';

interface RichMaterialRendererProps {
  markdown: string;
}

export const RichMaterialRenderer: React.FC<RichMaterialRendererProps> = ({ markdown }) => {
  return (
    <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-purple-700 prose-li:text-foreground prose-a:text-primary hover:prose-a:text-primary/80">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          [rehypeKatex, {
            throwOnError: false,
            errorColor: '#cc0000',
            strict: false
          }]
        ]}
        components={{
          // Custom H2 styling (purple gradient)
          h2: ({node, ...props}) => (
            <h2 
              className="text-3xl font-bold mt-10 mb-6 pb-3 border-b-4 border-purple-500 bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent"
              {...props} 
            />
          ),
          
          // Custom H3 styling
          h3: ({node, ...props}) => (
            <h3 
              className="text-2xl font-bold mt-8 mb-4 text-purple-700 flex items-center gap-2 before:content-['▸'] before:text-purple-500"
              {...props} 
            />
          ),
          
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
          
          // Mermaid diagrams (code blocks with language="mermaid")
          code: ({node, className, children, ...props}: any) => {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : null;
            const inline = !className;
            
            if (!inline && language === 'mermaid') {
              const code = String(children).replace(/\n$/, '');
              return (
                <MermaidErrorBoundary>
                  <MermaidDiagram
                    code={code}
                    title="Diagrama"
                    description="Representação visual do conceito"
                    icon="📊"
                  />
                </MermaidErrorBoundary>
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
          
          // Strong text (purple color)
          strong: ({node, ...props}) => (
            <strong className="font-bold text-purple-700" {...props} />
          ),
          
          // Lists with purple markers
          ul: ({node, ...props}) => (
            <ul className="list-disc list-inside space-y-2 my-4 marker:text-purple-500" {...props} />
          ),
          
          ol: ({node, ...props}) => (
            <ol className="list-decimal list-inside space-y-2 my-4 marker:text-purple-500" {...props} />
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
      
      {/* Render references section separately with custom styling */}
      <MarkdownReferencesRenderer markdown={markdown} />
    </div>
  );
};
