/**
 * EditorContextMenu - Right-click context menu for editor
 * Provides all formatting options on right-click
 */

import React from 'react';
import { Editor } from '@tiptap/react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
  ContextMenuShortcut,
} from '@/components/ui/context-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Bold, Italic, MessageSquare, ImageIcon, 
  Undo, Redo, List, ListOrdered, Highlighter, Palette, Type
} from 'lucide-react';
import { CalloutGallery } from './CalloutGallery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface EditorContextMenuProps {
  editor: Editor | null;
  children: React.ReactNode;
}

export const EditorContextMenu: React.FC<EditorContextMenuProps> = ({
  editor,
  children,
}) => {
  const { user } = useAuth();
  const [showCalloutGallery, setShowCalloutGallery] = React.useState(false);
  const [isUploadingImage, setIsUploadingImage] = React.useState(false);

  if (!editor) {
    return <>{children}</>;
  }

  const isMac = typeof window !== 'undefined' && /Mac|iPhone|iPod|iPad/i.test(navigator.platform);
  const mod = isMac ? 'Cmd' : 'Ctrl';

  const handleImageUpload = async () => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
        toast.error('Imagem muito grande. Máximo 5MB.');
        return;
      }

      setIsUploadingImage(true);
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { data, error } = await supabase.storage
          .from('annotation-images')
          .upload(filePath, file);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('annotation-images')
          .getPublicUrl(filePath);

        editor.commands.setEnhancedImage({ 
          src: publicUrl, 
          alt: file.name || 'Imagem da anotação',
          caption: ''
        });

        toast.success('Imagem inserida com sucesso!');
      } catch (error) {
        console.error('Error uploading image:', error);
        toast.error('Erro ao fazer upload da imagem');
      } finally {
        setIsUploadingImage(false);
      }
    };

    input.click();
  };

  const textColors = [
    { name: 'Preto', value: '#000000' },
    { name: 'Vermelho', value: '#dc2626' },
    { name: 'Azul', value: '#2563eb' },
    { name: 'Verde', value: '#16a34a' },
    { name: 'Laranja', value: '#ea580c' },
    { name: 'Roxo', value: '#9333ea' },
    { name: 'Rosa', value: '#ec4899' },
    { name: 'Cinza', value: '#6b7280' },
  ];

  const highlightColors = [
    { name: 'Amarelo', value: '#fef08a' },
    { name: 'Verde', value: '#bbf7d0' },
    { name: 'Azul', value: '#bfdbfe' },
    { name: 'Rosa', value: '#fbcfe8' },
    { name: 'Roxo', value: '#e9d5ff' },
    { name: 'Laranja', value: '#fed7aa' },
  ];

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent className="w-64">
          {/* Text Formatting */}
          <ContextMenuItem
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor.can().chain().focus().toggleBold().run()}
          >
            <Bold className="h-4 w-4 mr-2" />
            Negrito
            <ContextMenuShortcut>{mod}+B</ContextMenuShortcut>
          </ContextMenuItem>
          
          <ContextMenuItem
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={!editor.can().chain().focus().toggleItalic().run()}
          >
            <Italic className="h-4 w-4 mr-2" />
            Itálico
            <ContextMenuShortcut>{mod}+I</ContextMenuShortcut>
          </ContextMenuItem>

          <ContextMenuSeparator />

          {/* Text Color */}
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <Palette className="h-4 w-4 mr-2" />
              Cor do Texto
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-48">
              {textColors.map((color) => (
                <ContextMenuItem
                  key={color.value}
                  onClick={() => editor.chain().focus().setColor(color.value).run()}
                >
                  <div
                    className="h-4 w-4 rounded border border-gray-300 mr-2"
                    style={{ backgroundColor: color.value }}
                  />
                  {color.name}
                </ContextMenuItem>
              ))}
              <ContextMenuSeparator />
              <ContextMenuItem
                onClick={() => editor.chain().focus().unsetColor().run()}
              >
                Remover Cor
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>

          {/* Highlight Color */}
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <Highlighter className="h-4 w-4 mr-2" />
              Destacar
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-48">
              {highlightColors.map((color) => (
                <ContextMenuItem
                  key={color.value}
                  onClick={() => editor.chain().focus().toggleHighlight({ color: color.value }).run()}
                >
                  <div
                    className="h-4 w-4 rounded border border-gray-300 mr-2"
                    style={{ backgroundColor: color.value }}
                  />
                  {color.name}
                </ContextMenuItem>
              ))}
              <ContextMenuSeparator />
              <ContextMenuItem
                onClick={() => editor.chain().focus().unsetHighlight().run()}
              >
                Remover Destaque
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>

          <ContextMenuSeparator />

          {/* Lists */}
          <ContextMenuItem
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className="h-4 w-4 mr-2" />
            Lista com Marcadores
            <ContextMenuShortcut>{mod}+Shift+8</ContextMenuShortcut>
          </ContextMenuItem>

          <ContextMenuItem
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="h-4 w-4 mr-2" />
            Lista Numerada
            <ContextMenuShortcut>{mod}+Shift+7</ContextMenuShortcut>
          </ContextMenuItem>

          <ContextMenuSeparator />

          {/* Insert Options */}
          <ContextMenuItem onClick={handleImageUpload} disabled={isUploadingImage}>
            <ImageIcon className="h-4 w-4 mr-2" />
            {isUploadingImage ? 'Enviando Imagem...' : 'Inserir Imagem'}
          </ContextMenuItem>

          <ContextMenuItem onClick={() => setShowCalloutGallery(true)}>
            <Type className="h-4 w-4 mr-2" />
            Inserir Caixa Pedagógica
          </ContextMenuItem>

          <ContextMenuSeparator />

          {/* History */}
          <ContextMenuItem
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().chain().focus().undo().run()}
          >
            <Undo className="h-4 w-4 mr-2" />
            Desfazer
            <ContextMenuShortcut>{mod}+Z</ContextMenuShortcut>
          </ContextMenuItem>

          <ContextMenuItem
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().chain().focus().redo().run()}
          >
            <Redo className="h-4 w-4 mr-2" />
            Refazer
            <ContextMenuShortcut>{mod}+Shift+Z</ContextMenuShortcut>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* Callout Gallery Dialog */}
      <Dialog open={showCalloutGallery} onOpenChange={setShowCalloutGallery}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Escolha o Tipo de Caixa Pedagógica</DialogTitle>
          </DialogHeader>
          <CalloutGallery
            editor={editor}
            onSelect={(type) => {
              editor.commands.setCalloutBox({ type });
              setShowCalloutGallery(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};
