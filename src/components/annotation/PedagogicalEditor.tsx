/**
 * PedagogicalEditor - Main Tiptap editor component
 * Central editor for teacher annotations following "Document of Canvases" architecture
 */

import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { getPedagogicalExtensions } from '@/tiptap/extensions';
import { EditorBubbleMenu } from './EditorBubbleMenu';
import { cn } from '@/lib/utils';

interface PedagogicalEditorProps {
  content: string;
  onChange: (html: string) => void;
  editable?: boolean;
  className?: string;
  onEditorReady?: (editor: any) => void;
}

export const PedagogicalEditor: React.FC<PedagogicalEditorProps> = ({
  content,
  onChange,
  editable = true,
  className,
  onEditorReady,
}) => {
  const editor = useEditor({
    extensions: getPedagogicalExtensions(),
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onCreate: ({ editor }) => {
      if (onEditorReady) {
        onEditorReady(editor);
      }
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm sm:prose lg:prose-lg xl:prose-xl',
          'focus:outline-none',
          'min-h-[400px] max-w-none',
          'px-4 py-3',
        ),
      },
    },
  });

  // PHASE 1: Update editor content when prop changes
  useEffect(() => {
    if (!editor || !content) return;
    
    // Only update if content is different to prevent infinite loops
    const currentContent = editor.getHTML();
    
    // Ensure content is a string before comparison
    const contentStr = typeof content === 'string' ? content : '';
    if (currentContent !== contentStr && contentStr.trim() !== '') {
      editor.commands.setContent(contentStr);
    }
  }, [content, editor]);

  // Update bubble menu position on selection
  useEffect(() => {
    if (!editor) return;

    const updateBubbleMenuPosition = () => {
      const { from, to } = editor.state.selection;
      const hasSelection = from !== to;
      
      const bubbleMenuContainer = document.querySelector('.bubble-menu-container') as HTMLElement;
      if (bubbleMenuContainer) {
        bubbleMenuContainer.style.display = hasSelection ? 'block' : 'none';
        
        if (hasSelection) {
          // Position the bubble menu above the selection
          const coords = editor.view.coordsAtPos(from);
          bubbleMenuContainer.style.top = `${coords.top - 60}px`;
          bubbleMenuContainer.style.left = `${coords.left}px`;
        }
      }
    };

    editor.on('selectionUpdate', updateBubbleMenuPosition);
    editor.on('update', updateBubbleMenuPosition);

    return () => {
      editor.off('selectionUpdate', updateBubbleMenuPosition);
      editor.off('update', updateBubbleMenuPosition);
    };
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className={cn('pedagogical-editor-wrapper relative', className)}>
      {/* Bubble Menu - positioned absolutely */}
      {editor && (
        <div className="bubble-menu-container" style={{ position: 'fixed', display: 'none', zIndex: 50 }}>
          <EditorBubbleMenu editor={editor} />
        </div>
      )}
      
      <EditorContent editor={editor} className="tiptap-editor" />
      
      {/* Global styles for Tiptap content */}
      <style>{`
        .tiptap {
          @apply text-foreground;
        }
        
        .tiptap p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          @apply text-muted-foreground float-left h-0 pointer-events-none;
        }

        .tiptap .callout-box {
          @apply my-4;
        }

        .tiptap .comment-highlight {
          @apply transition-all cursor-pointer;
        }

        .tiptap .comment-highlight:hover {
          @apply shadow-sm;
        }

        .tiptap img {
          @apply max-w-full h-auto rounded-lg;
        }

        .tiptap mark {
          @apply px-1 py-0.5 rounded;
        }
        
        /* Bubble Menu container */
        .bubble-menu-container > div {
          pointer-events: auto;
        }
      `}</style>
    </div>
  );
};
