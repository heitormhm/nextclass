/**
 * EditorBubbleMenu - Floating formatting toolbar
 * Appears on text selection with formatting options
 */

import React, { useState } from 'react';
import { Editor } from '@tiptap/react';
import { 
  Bold, Italic, Underline, Highlighter, 
  MessageSquare, Image as ImageIcon,
  ListOrdered, List, Palette, X, Undo, Redo, Type
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { CalloutGallery } from './CalloutGallery';
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
  const [showCalloutGallery, setShowCalloutGallery] = useState(false);
  
  // PHASE 3: Font size state
  const [fontSize, setFontSize] = useState(16);

  if (!editor) return null;

  const handleHighlight = (color: string) => {
    editor.chain().focus().setCustomHighlight({ color }).run();
    setShowColorPicker(false);
  };

  const handleTextColor = (color: string) => {
    console.log('✅ PHASE 3: Text color applied:', color);
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

  // PHASE 3: Font size handler
  const handleFontSizeChange = (value: number[]) => {
    const size = value[0];
    setFontSize(size);
    console.log('✅ PHASE 2: Font size changed to', size);
    editor.chain().focus().setMark('textStyle', { fontSize: `${size}px` }).run();
  };

  return (
    <>
      <div className="flex items-center gap-1.5 bg-background/95 backdrop-blur-xl border border-border rounded-lg shadow-lg shadow-purple-500/10 p-1">
        {/* Text Formatting */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn(
            'h-8 w-8 p-0 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2',
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
            'h-8 w-8 p-0 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2',
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
            'h-8 w-8 p-0 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2',
            editor.isActive('underline') && 'bg-primary text-primary-foreground'
          )}
        >
          <Underline className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-0.5" />

        {/* PHASE 3: Font Size Slider - Replaces H1/H2/H3 buttons */}
        <div className="flex items-center gap-1.5 px-1.5 min-w-[120px]">
          <Type className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Slider
            value={[fontSize]}
            onValueChange={handleFontSizeChange}
            min={12}
            max={48}
            step={2}
            className="w-16"
          />
          <span className="text-[10px] leading-tight text-muted-foreground w-7 text-center shrink-0">
            {fontSize}px
          </span>
        </div>

        <div className="w-px h-6 bg-border mx-0.5" />

        {/* PHASE 3: Fixed list commands with proper chaining */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            console.log('✅ PHASE 3: Bullet list toggle');
            editor.chain().focus().toggleBulletList().run();
          }}
          className={cn(
            'h-8 w-8 p-0 rounded-lg transition-all duration-200',
            'hover:scale-105 hover:shadow-md active:scale-95',
            editor.isActive('bulletList') && 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-md'
          )}
        >
          <List className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            console.log('✅ PHASE 3: Numbered list toggle');
            editor.chain().focus().toggleOrderedList().run();
          }}
          className={cn(
            'h-8 w-8 p-0 rounded-lg transition-all duration-200',
            'hover:scale-105 hover:shadow-md active:scale-95',
            editor.isActive('orderedList') && 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-md'
          )}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-0.5" />

        {/* Highlight with color picker */}
        <Popover open={showColorPicker} onOpenChange={setShowColorPicker}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-8 w-8 p-0 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2',
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
                  className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-1"
                  style={{ backgroundColor: color }}
                  title={label}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Add Comment */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAddComment}
          className="h-8 w-8 p-0 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2"
          title="Adicionar comentário"
        >
          <MessageSquare className="h-4 w-4" />
        </Button>

        {/* Add Image */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleImageUpload}
          className="h-8 w-8 p-0 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2"
          title="Adicionar imagem"
        >
          <ImageIcon className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-0.5" />

        {/* PHASE 8: Undo/Redo */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="h-8 w-8 p-0 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 disabled:opacity-50"
          title="Desfazer"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="h-8 w-8 p-0 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 disabled:opacity-50"
          title="Refazer"
        >
          <Redo className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-0.5" />

        {/* PHASE 8: Callout insertion */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowCalloutGallery(true)}
          className="h-8 w-8 p-0 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2"
          title="Inserir caixa pedagógica"
        >
          <MessageSquare className="h-4 w-4" />
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
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Escreva seu comentário aqui..."
              className="min-h-[120px] resize-none"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCommentDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveComment} disabled={!commentText.trim()}>
              Adicionar
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* PHASE 8: Callout Gallery Dialog */}
    <Dialog open={showCalloutGallery} onOpenChange={setShowCalloutGallery}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Inserir Caixa Pedagógica</DialogTitle>
        </DialogHeader>
        <CalloutGallery
          editor={editor}
          onSelect={() => setShowCalloutGallery(false)}
        />
      </DialogContent>
    </Dialog>
  </>
);
};
