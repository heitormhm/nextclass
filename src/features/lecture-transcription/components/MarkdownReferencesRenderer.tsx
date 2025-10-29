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
  // Extract the Referencias section - flexible regex for variations
  const referencesMatch = markdown.match(
    /#{1,6}\s*(?:Referências|Referencias|REFERÊNCIAS|Refer[eê]ncias|Bibliografia)([\s\S]*?)(?=\n#{1,6}\s|$)/i
  );
  
  if (!referencesMatch) {
    // Debug: Check if word exists but regex failed
    if (markdown.toLowerCase().includes('referência')) {
      console.warn('[References] Found word "referências" but regex failed to match section');
      const idx = markdown.toLowerCase().lastIndexOf('referência');
      console.warn('[References] Context:', markdown.substring(idx - 50, idx + 200));
    } else {
      console.warn('[References] No references section found in markdown');
    }
    return null;
  }
  
  console.log('[References] Found section with', referencesMatch[1].length, 'characters');
  
  const referencesText = referencesMatch[1];
  
  // Parse individual references - support multiple formats
  // Formats: "1. **Author** - Title" or "[1] Author - Title" or "1) Author - Title"
  const referenceRegex = /(?:(\d+)[\.\)]\s*|\[(\d+)\]\s*)\**(.*?)\**\s*[-–—]\s*(.*?)(?:\n\s*[-•]\s*(?:URL|Link):\s*(https?:\/\/[^\s\n]+))?(?:\n\s*[-•]\s*(?:Type|Tipo):\s*([^\n]+))?/gi;
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
      number: match[1] || match[2],  // Support both numbered formats
      author: match[3].trim(),
      title: match[4].trim(),
      url: match[5]?.trim(),
      type: match[6]?.trim()
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
