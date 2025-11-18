/**
 * PedagogicalEditor - Main Tiptap editor component
 * Central editor for teacher annotations following "Document of Canvases" architecture
 */

import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { getPedagogicalExtensions } from '@/tiptap/extensions';
import { EditorBubbleMenu } from './EditorBubbleMenu';
import { EditorContextMenu } from './EditorContextMenu';
import { cn } from '@/lib/utils';
import { convertLegacyToTiptap, isStructuredJSON } from '@/utils/annotation/legacyMigration';

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

  // Optimized content loading with legacy format support
  useEffect(() => {
    if (!editor) return;
    
    const currentContent = editor.getHTML();
    
    console.group('📝 PedagogicalEditor Content Loading');
    console.log('Content type:', typeof content);
    console.log('Content length:', content?.length);
    console.log('Content preview:', typeof content === 'string' ? content.substring(0, 150) : 'Not a string');
    
    // Handle different content formats
    let processedContent = '';
    
    if (!content) {
      processedContent = '';
    } else if (typeof content === 'string') {
      // PHASE 1: Check if it's legacy structured JSON FIRST
      if (isStructuredJSON(content)) {
        console.log('✅ Detected legacy structured JSON format');
        const tiptapJson = convertLegacyToTiptap(content);
        if (tiptapJson) {
          console.log('✅ Successfully converted to Tiptap format');
          editor.commands.setContent(tiptapJson);
          console.groupEnd();
          return;
        }
      }
      
      // Then check if it's already Tiptap JSON
      if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
        try {
          const parsed = JSON.parse(content);
          if (parsed.type === 'doc' && parsed.content) {
            console.log('✅ Detected Tiptap JSON format');
            editor.commands.setContent(parsed);
            console.groupEnd();
            return;
          }
        } catch {
          // Not valid JSON, continue to HTML/markdown handling
        }
      }
      
      // PHASE 4: Check for markdown patterns
      if (content.includes('##') || content.includes('**') || content.includes('_')) {
        console.log('⚠️ Detected potential markdown content (treating as HTML)');
      }
      
      // Finally treat as HTML or plain text
      processedContent = content;
    } else if (typeof content === 'object') {
      // Direct Tiptap JSON object
      console.log('✅ Direct Tiptap JSON object');
      editor.commands.setContent(content);
      console.groupEnd();
      return;
    }
    
    console.log('📄 Final processed content length:', processedContent.length);
    console.groupEnd();
    
    // Only update if different
    if (currentContent !== processedContent) {
      editor.commands.setContent(processedContent);
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
      
      {/* Context Menu - wraps editor content */}
      <EditorContextMenu editor={editor}>
        <EditorContent editor={editor} className="tiptap-editor" />
      </EditorContextMenu>
      
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
