/**
 * EditorBubbleMenu - Floating formatting toolbar
 * Appears on text selection with formatting options
 */

import React, { useState } from 'react';
import { Editor } from '@tiptap/react';
import { 
  Bold, Italic, Underline, Highlighter, 
  MessageSquare, Palette, Image as ImageIcon,
  ListOrdered, List
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface EditorBubbleMenuProps {
  editor: Editor;
}

const highlightColors = [
  { color: '#fef3c7', label: 'Amarelo' },
  { color: '#fce7f3', label: 'Rosa' },
  { color: '#dbeafe', label: 'Azul' },
  { color: '#d1fae5', label: 'Verde' },
  { color: '#fee2e2', label: 'Vermelho' },
  { color: '#e0e7ff', label: 'Roxo' },
];

export const EditorBubbleMenu: React.FC<EditorBubbleMenuProps> = ({ editor }) => {
  const [showColorPicker, setShowColorPicker] = useState(false);

  if (!editor) return null;

  const handleHighlight = (color: string) => {
    editor.chain().focus().setCustomHighlight({ color }).run();
    setShowColorPicker(false);
  };

  const handleAddComment = () => {
    const commentId = `comment-${Date.now()}`;
    editor.chain().focus().setCommentHighlight(commentId).run();
    // TODO: Open post-it creation modal
  };

  const handleImageUpload = () => {
    const url = window.prompt('URL da imagem:');
    if (url) {
      editor.chain().focus().setEnhancedImage({ src: url }).run();
    }
  };

  return (
    <div className="flex items-center gap-1 bg-white/95 backdrop-blur-xl border border-border rounded-lg shadow-lg p-1">
      {/* Text Formatting */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={cn(
          'h-8 w-8 p-0',
          editor.isActive('bold') && 'bg-primary text-primary-foreground'
        )}
      >
        <Bold className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={cn(
          'h-8 w-8 p-0',
          editor.isActive('italic') && 'bg-primary text-primary-foreground'
        )}
      >
        <Italic className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={cn(
          'h-8 w-8 p-0',
          editor.isActive('underline') && 'bg-primary text-primary-foreground'
        )}
      >
        <Underline className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Lists */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={cn(
          'h-8 w-8 p-0',
          editor.isActive('bulletList') && 'bg-primary text-primary-foreground'
        )}
      >
        <List className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={cn(
          'h-8 w-8 p-0',
          editor.isActive('orderedList') && 'bg-primary text-primary-foreground'
        )}
      >
        <ListOrdered className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Highlight with color picker */}
      <Popover open={showColorPicker} onOpenChange={setShowColorPicker}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-8 w-8 p-0',
              editor.isActive('customHighlight') && 'bg-primary text-primary-foreground'
            )}
          >
            <Highlighter className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2">
          <div className="grid grid-cols-3 gap-2">
            {highlightColors.map(({ color, label }) => (
              <button
                key={color}
                onClick={() => handleHighlight(color)}
                className="w-8 h-8 rounded border-2 border-border hover:border-primary transition-all"
                style={{ backgroundColor: color }}
                title={label}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Comment/Post-It */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleAddComment}
        className="h-8 w-8 p-0"
      >
        <MessageSquare className="h-4 w-4" />
      </Button>

      {/* Image Upload */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleImageUpload}
        className="h-8 w-8 p-0"
      >
        <ImageIcon className="h-4 w-4" />
      </Button>
    </div>
  );
};
