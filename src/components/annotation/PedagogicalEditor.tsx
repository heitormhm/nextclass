/**
 * PedagogicalEditor - Main Tiptap editor component
 * Central editor for teacher annotations following "Document of Canvases" architecture
 */

import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { getPedagogicalExtensions } from '@/tiptap/extensions';
import { EditorBubbleMenu } from './EditorBubbleMenu';
import { cn } from '@/lib/utils';

interface PedagogicalEditorProps {
  content: string;
  onChange: (html: string) => void;
  editable?: boolean;
  className?: string;
}

export const PedagogicalEditor: React.FC<PedagogicalEditorProps> = ({
  content,
  onChange,
  editable = true,
  className,
}) => {
  const editor = useEditor({
    extensions: getPedagogicalExtensions(),
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
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
    <div className={cn('pedagogical-editor-wrapper', className)}>
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
      `}</style>
    </div>
  );
};
