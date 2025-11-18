/**
 * EditorBubbleMenu - Floating formatting toolbar
 * Phase 2: Fixed list buttons, Phase 3: Added text color picker
 */

import React, { useState } from 'react';
import { Editor } from '@tiptap/react';
import { 
  Bold, Italic, Underline, Highlighter, 
  MessageSquare, Image as ImageIcon,
  ListOrdered, List, Palette, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
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

// Phase 3: Text Color Palette
const textColors = [
  { color: '#000000', label: 'Preto' },
  { color: '#dc2626', label: 'Vermelho' },
  { color: '#2563eb', label: 'Azul' },
  { color: '#16a34a', label: 'Verde' },
  { color: '#ea580c', label: 'Laranja' },
  { color: '#9333ea', label: 'Roxo' },
  { color: '#ec4899', label: 'Rosa' },
  { color: '#6b7280', label: 'Cinza' },
];

export const EditorBubbleMenu: React.FC<EditorBubbleMenuProps> = ({ editor }) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [commentText, setCommentText] = useState('');

  if (!editor) return null;

  const handleHighlight = (color: string) => {
    editor.chain().focus().setCustomHighlight({ color }).run();
    setShowColorPicker(false);
  };

  const handleTextColor = (color: string) => {
    editor.chain().focus().setColor(color).run();
    setShowTextColorPicker(false);
  };

  const handleRemoveTextColor = () => {
    editor.chain().focus().unsetColor().run();
    setShowTextColorPicker(false);
  };

  const handleAddComment = () => {
    setShowCommentDialog(true);
  };

  const handleSaveComment = () => {
    if (!commentText.trim()) {
      toast.error('Digite um comentário');
      return;
    }

    const commentId = `comment-${Date.now()}`;
    
    // Apply comment highlight mark to selected text
    editor.chain().focus().setCommentHighlight(commentId).run();
    
    // Create post-it via plugin
    const { from } = editor.state.selection;
    const postIt = {
      id: commentId,
      commentId: commentId,
      content: commentText,
      position: from,
      createdAt: Date.now(),
    };

    // Dispatch to post-it plugin
    const tr = editor.state.tr.setMeta('postItPlugin', {
      action: 'add',
      postIt,
    });
    editor.view.dispatch(tr);

    toast.success('Comentário adicionado!');
    setShowCommentDialog(false);
    setCommentText('');
  };

  const handleImageUpload = () => {
    const url = window.prompt('URL da imagem:');
    if (url) {
      editor.chain().focus().setEnhancedImage({ src: url }).run();
    }
  };

  return (
    <>
      <div className="flex items-center gap-1 bg-background/95 backdrop-blur-xl border border-border rounded-lg shadow-lg p-1">
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

        {/* Phase 2: Lists - Fixed with .run() */}
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
            <div className="flex gap-1">
              {highlightColors.map(({ color, label }) => (
                <button
                  key={color}
                  onClick={() => handleHighlight(color)}
                  className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  title={label}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Phase 3: Text Color Picker */}
        <Popover open={showTextColorPicker} onOpenChange={setShowTextColorPicker}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <Palette className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2">
            <div className="grid grid-cols-4 gap-2">
              {textColors.map(({ color, label }) => (
                <button
                  key={color}
                  onClick={() => handleTextColor(color)}
                  className="h-8 w-8 rounded border-2 border-gray-200 hover:border-gray-400 transition-colors"
                  style={{ backgroundColor: color }}
                  title={label}
                />
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemoveTextColor}
              className="w-full mt-2 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Remover Cor
            </Button>
          </PopoverContent>
        </Popover>

        {/* Comment */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAddComment}
          className="h-8 w-8 p-0"
          title="Adicionar comentário"
        >
          <MessageSquare className="h-4 w-4" />
        </Button>

        {/* Add Image */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleImageUpload}
          className="h-8 w-8 p-0"
          title="Adicionar imagem"
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
      </div>

      {/* Comment Dialog */}
      <Dialog open={showCommentDialog} onOpenChange={setShowCommentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Comentário</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Digite seu comentário..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCommentDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveComment}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};