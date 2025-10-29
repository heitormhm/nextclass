/**
 * Extracts and renders the "Referências" section from markdown
 * with purple gradient styling
 */
import React from 'react';
import { ExternalLink } from 'lucide-react';

interface MarkdownReferencesRendererProps {
  markdown: string;
}

export const MarkdownReferencesRenderer: React.FC<MarkdownReferencesRendererProps> = ({ markdown }) => {
  // Extract references section
  const referencesMatch = markdown.match(/#{1,2}\s*Referências([\s\S]*?)(?=\n#{1,2}\s|\n*$)/i);
  
  if (!referencesMatch) {
    return null;
  }
  
  const referencesText = referencesMatch[1];
  
  // Parse references (format: 1. **Author (Year)** - Title)
  const referenceRegex = /(\d+)\.\s*\*\*(.*?)\*\*\s*-\s*(.*?)(?:\n\s*-\s*URL:\s*(https?:\/\/[^\s]+))?(?:\n\s*-\s*Type:\s*([^\n]+))?/gi;
  const references: Array<{
    number: string;
    author: string;
    title: string;
    url?: string;
    type?: string;
  }> = [];
  
  let match;
  while ((match = referenceRegex.exec(referencesText)) !== null) {
    references.push({
      number: match[1],
      author: match[2].trim(),
      title: match[3].trim(),
      url: match[4]?.trim(),
      type: match[5]?.trim()
    });
  }
  
  if (references.length === 0) {
    return null;
  }
  
  return (
    <div className="mt-12 pt-8 border-t-4 border-primary">
      <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent flex items-center gap-2">
        <ExternalLink className="h-8 w-8 text-primary" />
        Referências
      </h2>
      <div className="space-y-4">
        {references.map((ref) => (
          <div 
            key={ref.number} 
            className="bg-gradient-to-br from-primary/5 to-primary/10 border-l-4 border-primary p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
                {ref.number}
              </span>
              <div className="flex-1">
                <p className="font-bold text-foreground mb-1">
                  {ref.author} - <span className="font-normal">{ref.title}</span>
                </p>
                {ref.url && (
                  <a 
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:text-primary/80 hover:underline flex items-center gap-1 break-all"
                  >
                    <ExternalLink className="h-3 w-3 flex-shrink-0" />
                    {ref.url}
                  </a>
                )}
                {ref.type && (
                  <span className="inline-block mt-2 px-2 py-1 bg-primary/20 text-primary text-xs rounded-full font-medium">
                    {ref.type}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
