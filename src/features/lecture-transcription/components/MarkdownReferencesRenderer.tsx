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
  
  // Parse individual references - NEW FORMAT
  // Format: [1] Author, T. D. (2018). Title of Work. Publisher. URL
  // Format: [1] Source. (Year). Title. URL
  const referenceRegex = /\[(\d+)\]\s+([^.\n]+?)\.\s+\((\d{4})\)\.\s+([^.\n]+?)\.(?:\s+([^.\n]+?)\.)?(?:\s+(https?:\/\/[^\s\n]+))?/gi;
  const references: Array<{
    number: string;
    author: string;
    year: string;
    title: string;
    publisher?: string;
    url?: string;
  }> = [];
  
  let match;
  while ((match = referenceRegex.exec(referencesText)) !== null) {
    references.push({
      number: match[1],
      author: match[2].trim(),
      year: match[3],
      title: match[4].trim(),
      publisher: match[5]?.trim(),
      url: match[6]?.trim()
    });
  }
  
  console.log('[References] Parsed', references.length, 'references');
  
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
        {references.map((ref, index) => (
          <div 
            key={`ref-${index}-${ref.number}`}
            id={`ref-${ref.number}`}
            className="bg-gradient-to-br from-primary/5 to-primary/10 border-l-4 border-primary p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
                {ref.number}
              </span>
              <div className="flex-1">
                <p className="text-foreground mb-1">
                  <span className="font-bold">{ref.author}</span> ({ref.year}). <span className="italic">{ref.title}</span>
                  {ref.publisher && <span className="text-muted-foreground">. {ref.publisher}</span>}
                </p>
                {ref.url && ref.url.trim() !== '' && (
                  <a 
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:text-primary/80 hover:underline flex items-center gap-1 break-all mt-2"
                  >
                    <ExternalLink className="h-3 w-3 flex-shrink-0" />
                    {ref.url}
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
