/**
 * PedagogicalEditor - Main Tiptap editor component
 * Central editor for teacher annotations following "Document of Canvases" architecture
 */

import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu as TiptapBubbleMenu } from '@tiptap/extension-bubble-menu';
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
    extensions: [
      ...getPedagogicalExtensions(),
      TiptapBubbleMenu.configure({
        element: document.createElement('div'),
      }),
    ],
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

  if (!editor) {
    return null;
  }

  return (
    <div className={cn('pedagogical-editor-wrapper relative', className)}>
      {/* Bubble Menu - appears when text is selected */}
      {editor && (
        <div className="bubble-menu-wrapper">
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
        
        /* Bubble Menu Positioning */
        .bubble-menu-wrapper {
          position: absolute;
          z-index: 50;
          pointer-events: auto;
        }
        
        .tippy-box[data-theme~='bubble-menu'] {
          background: transparent;
          border: none;
        }
      `}</style>
    </div>
  );
};
