import React, { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface SyntaxHighlightedEditorProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  validationErrors?: Array<{ line: number; message: string }>;
  className?: string;
}

export const SyntaxHighlightedEditor: React.FC<SyntaxHighlightedEditorProps> = ({
  value,
  onChange,
  onKeyDown,
  validationErrors = [],
  className
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Sync scroll between textarea and highlight layer
  const handleScroll = () => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  // Apply syntax highlighting
  const highlightSyntax = (text: string): string => {
    if (!text) return '';

    let highlighted = text;

    // Escape HTML
    highlighted = highlighted
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Highlight markers with specific colors
    const markerPatterns = [
      { pattern: /(\[CALLOUT-INFO\])(.*?)(\[\/CALLOUT-INFO\])/gs, bg: 'bg-blue-100/80', text: 'text-blue-700', tag: 'text-blue-600' },
      { pattern: /(\[CALLOUT-WARNING\])(.*?)(\[\/CALLOUT-WARNING\])/gs, bg: 'bg-yellow-100/80', text: 'text-yellow-800', tag: 'text-yellow-600' },
      { pattern: /(\[CALLOUT-SUCCESS\])(.*?)(\[\/CALLOUT-SUCCESS\])/gs, bg: 'bg-green-100/80', text: 'text-green-700', tag: 'text-green-600' },
      { pattern: /(\[CALLOUT-ERROR\])(.*?)(\[\/CALLOUT-ERROR\])/gs, bg: 'bg-red-100/80', text: 'text-red-700', tag: 'text-red-600' },
      { pattern: /(\[POSTIT-YELLOW\])(.*?)(\[\/POSTIT-YELLOW\])/gs, bg: 'bg-yellow-200/80', text: 'text-yellow-900', tag: 'text-yellow-700' },
      { pattern: /(\[COLOR-RED\])(.*?)(\[\/COLOR-RED\])/gs, bg: 'bg-red-50/50', text: 'text-red-600', tag: 'text-red-500' },
      { pattern: /(\[COLOR-BLUE\])(.*?)(\[\/COLOR-BLUE\])/gs, bg: 'bg-blue-50/50', text: 'text-blue-600', tag: 'text-blue-500' },
      { pattern: /(\[COLOR-GREEN\])(.*?)(\[\/COLOR-GREEN\])/gs, bg: 'bg-green-50/50', text: 'text-green-600', tag: 'text-green-500' },
      { pattern: /(\[DIAGRAM-MERMAID\])(.*?)(\[\/DIAGRAM-MERMAID\])/gs, bg: 'bg-purple-100/80', text: 'text-purple-700', tag: 'text-purple-600' },
      { pattern: /(\[CHART-BARS\])(.*?)(\[\/CHART-BARS\])/gs, bg: 'bg-teal-100/80', text: 'text-teal-700', tag: 'text-teal-600' },
      { pattern: /(\[ACCORDION title="[^"]*"\])(.*?)(\[\/ACCORDION\])/gs, bg: 'bg-indigo-100/80', text: 'text-indigo-700', tag: 'text-indigo-600' },
    ];

    markerPatterns.forEach(({ pattern, bg, text, tag }) => {
      highlighted = highlighted.replace(pattern, (match, open, content, close) => {
        return `<span class="${bg} ${text} px-1 rounded"><span class="${tag} font-semibold">${open}</span>${content}<span class="${tag} font-semibold">${close}</span></span>`;
      });
    });

    // Highlight headings
    highlighted = highlighted.replace(/^(###\s+.+)$/gm, '<span class="text-purple-700 font-bold text-lg">$1</span>');
    highlighted = highlighted.replace(/^(##\s+.+)$/gm, '<span class="text-purple-800 font-bold text-xl">$1</span>');
    highlighted = highlighted.replace(/^(#\s+.+)$/gm, '<span class="text-purple-900 font-bold text-2xl">$1</span>');

    // Highlight list markers
    highlighted = highlighted.replace(/^(\[LIST-BULLET\])/gm, '<span class="text-orange-600 font-semibold">$1</span>');
    highlighted = highlighted.replace(/^(\[LIST-NUMBER\])/gm, '<span class="text-orange-600 font-semibold">$1</span>');
    highlighted = highlighted.replace(/^(\s*[-•]\s)/gm, '<span class="text-orange-500">$1</span>');
    highlighted = highlighted.replace(/^(\s*\d+\.\s)/gm, '<span class="text-orange-500">$1</span>');

    return highlighted;
  };

  const highlightedHtml = highlightSyntax(value);

  // Get line number for current cursor position
  const getCurrentLine = (): number => {
    if (!textareaRef.current) return 1;
    const text = textareaRef.current.value.substring(0, textareaRef.current.selectionStart);
    return text.split('\n').length;
  };

  const [currentLine, setCurrentLine] = useState(1);

  useEffect(() => {
    const updateLine = () => setCurrentLine(getCurrentLine());
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.addEventListener('click', updateLine);
      textarea.addEventListener('keyup', updateLine);
      return () => {
        textarea.removeEventListener('click', updateLine);
        textarea.removeEventListener('keyup', updateLine);
      };
    }
  }, [value]);

  return (
    <div className={cn("relative", className)}>
      {/* Syntax highlighted background */}
      <div
        ref={highlightRef}
        className="absolute inset-0 pointer-events-none overflow-auto whitespace-pre-wrap break-words font-mono text-sm leading-relaxed p-4"
        style={{
          color: 'transparent',
        }}
        dangerouslySetInnerHTML={{ __html: highlightedHtml }}
      />

      {/* Actual textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onScroll={handleScroll}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={cn(
          "relative w-full h-full bg-transparent font-mono text-sm leading-relaxed p-4 resize-none",
          "text-foreground caret-primary",
          "focus:outline-none",
          "selection:bg-primary/20"
        )}
        style={{
          color: 'inherit',
          caretColor: 'hsl(var(--primary))',
        }}
        spellCheck={false}
        aria-label="Annotation editor with syntax highlighting"
      />

      {/* Status bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-muted/95 backdrop-blur-sm border-t border-border px-4 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground">
            Line {currentLine}
          </span>
          {validationErrors.length > 0 && (
            <span className="text-destructive font-medium">
              ❌ {validationErrors.length} error{validationErrors.length !== 1 ? 's' : ''}
            </span>
          )}
          {validationErrors.length === 0 && (
            <span className="text-green-600 font-medium">✅ No errors</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isFocused && (
            <span className="text-muted-foreground">Ctrl+S to save</span>
          )}
        </div>
      </div>
    </div>
  );
};
