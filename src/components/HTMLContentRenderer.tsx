/**
 * ⚠️ DEPRECATED - LEGACY SUPPORT ONLY
 * 
 * This component renders sanitized HTML content from older lectures.
 * New materials use RichMaterialRenderer with markdown format.
 * 
 * **DO NOT REMOVE** - Required for backward compatibility with:
 * - Old HTML-based lecture materials
 * - Legacy content created before markdown migration
 * 
 * Status: Active but deprecated - only for existing HTML materials
 * Migration: All new content uses markdown-based rendering
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
