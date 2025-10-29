/**
 * ⚠️ PHASE 6: DEPRECATED - LEGACY ONLY
 * This component is no longer used in the material generation flow.
 * New materials use RichMaterialRenderer for markdown rendering.
 * Kept only for backward compatibility with old HTML-based materials.
 */

import DOMPurify from 'dompurify';

interface HTMLContentRendererProps {
  htmlContent: string;
  className?: string;
}

/**
 * Component for rendering sanitized HTML content
 * Used for displaying educational materials generated as HTML
 */
export const HTMLContentRenderer: React.FC<HTMLContentRendererProps> = ({
  htmlContent,
  className = ''
}) => {
  // Sanitize HTML to prevent XSS attacks
  const sanitizedHTML = DOMPurify.sanitize(htmlContent, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'a', 'code', 'pre', 'blockquote', 'div', 'span',
      'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'id', 'src', 'alt', 'style']
  });
  
  return (
    <div 
      className={`prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-li:text-foreground prose-a:text-primary hover:prose-a:text-primary/80 ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
    />
  );
};
