/**
 * EditorToolbar - Main formatting and action toolbar
 * Provides quick access to formatting, AI actions, voice, and save
 */

import React from 'react';
import { Editor } from '@tiptap/react';
import { 
  Bold, Italic, List, ListOrdered, 
  Highlighter, MessageSquare, ImageIcon, 
  Mic, Undo, Redo, Save, FileDown, Type, Palette, ImagePlus
} from 'lucide-react';
import { CalloutGallery } from './CalloutGallery';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface EditorToolbarProps {
  editor: Editor | null;
  isListening: boolean;
  onToggleVoice: () => void;
  onSave: () => void;
  onExportPDF: () => void;
  onAIAction: (action: string) => void;
  isSaving: boolean;
  focusMode?: boolean;
  onToggleFocusMode?: () => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  editor,
  isListening,
  onToggleVoice,
  onSave,
  onExportPDF,
  onAIAction,
  isSaving,
  focusMode = false,
  onToggleFocusMode,
}) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [showCalloutGallery, setShowCalloutGallery] = React.useState(false);
  const [isUploadingImage, setIsUploadingImage] = React.useState(false);
  
  // Font size state
  const [fontSize, setFontSize] = React.useState(16);
  
  // Accordion state for mobile - "text" and "actions" expanded by default
  const [accordionValue, setAccordionValue] = React.useState<string[]>(['text', 'actions']);

  if (!editor) return null;

  const handleInsertCallout = () => {
    setShowCalloutGallery(true);
  };

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

        editor.chain().focus().setEnhancedImage({ 
          src: publicUrl, 
          alt: file.name || 'Imagem da anotação',
          caption: ''
        }).run();

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

  const handleFontSizeChange = (value: number[]) => {
    const size = value[0];
    setFontSize(size);
    editor.chain().focus().setMark('textStyle', { fontSize: `${size}px` }).run();
  };

  // Separator component for visual grouping
  const ToolbarDivider = () => (
    <div className="h-8 w-px bg-gradient-to-b from-transparent via-gray-300 to-transparent mx-0.5" />
  );

  // Mobile Accordion Layout
  if (isMobile) {
    return (
      <>
        <TooltipProvider>
          <div className={cn(
            'sticky top-16 z-30 bg-white/95 backdrop-blur-xl rounded-2xl border-b-2 border-white/20 shadow-lg mb-3 overflow-hidden',
            'transition-all duration-300',
            focusMode && 'opacity-0 pointer-events-none h-0 p-0'
          )}>
            <Accordion 
              type="multiple" 
              value={accordionValue} 
              onValueChange={setAccordionValue}
              className="w-full"
            >
              {/* Category 1: Text Formatting */}
              <AccordionItem value="text" className="border-b border-white/20">
                <AccordionTrigger className="px-4 py-3 hover:bg-purple-50/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">✍️</span>
                    <span className="text-sm font-semibold">Formatação de Texto</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="flex flex-wrap items-center gap-2 justify-center">
                    {/* Bold */}
                    <Tooltip delayDuration={200}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => editor.chain().focus().toggleBold().run()}
                          className={cn(
                            'h-11 w-11 rounded-xl transition-all duration-200',
                            'hover:scale-110 hover:shadow-[0_0_20px_rgba(59,130,246,0.5)] active:scale-95',
                            editor.isActive('bold') && 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-[0_0_20px_rgba(147,51,234,0.6)] scale-105'
                          )}
                        >
                          <Bold className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Negrito (Ctrl+B)</TooltipContent>
                    </Tooltip>

                    {/* Italic */}
                    <Tooltip delayDuration={200}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => editor.chain().focus().toggleItalic().run()}
                          className={cn(
                            'h-11 w-11 rounded-xl transition-all duration-200',
                            'hover:scale-110 hover:shadow-[0_0_20px_rgba(59,130,246,0.5)] active:scale-95',
                            editor.isActive('italic') && 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-[0_0_20px_rgba(147,51,234,0.6)] scale-105'
                          )}
                        >
                          <Italic className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Itálico (Ctrl+I)</TooltipContent>
                    </Tooltip>

                    {/* Highlight with Color Picker */}
                    <Popover>
                      <Tooltip delayDuration={200}>
                        <TooltipTrigger asChild>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cn(
                                'h-11 w-11 rounded-xl transition-all duration-200',
                                'hover:scale-110 hover:shadow-[0_0_20px_rgba(251,191,36,0.5)] active:scale-95',
                                editor.isActive('customHighlight') && 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-[0_0_20px_rgba(251,191,36,0.6)] scale-105'
                              )}
                            >
                              <Highlighter className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                        </TooltipTrigger>
                        <TooltipContent>Destacar Texto</TooltipContent>
                      </Tooltip>
                      <PopoverContent className="w-auto p-2 z-[100]" sideOffset={8}>
                        <div className="flex gap-1 flex-wrap max-w-[200px]">
                          {[
                            { color: '#fef3c7', label: 'Amarelo' },
                            { color: '#fce7f3', label: 'Rosa' },
                            { color: '#dbeafe', label: 'Azul' },
                            { color: '#d1fae5', label: 'Verde' },
                            { color: '#fee2e2', label: 'Vermelho' },
                            { color: '#e0e7ff', label: 'Roxo' },
                          ].map(({ color, label }) => (
                            <button
                              key={color}
                              onClick={() => {
                                editor.chain().focus().setCustomHighlight({ color }).run();
                              }}
                              className="h-8 w-8 rounded border-2 border-gray-200 hover:border-gray-400 transition-colors"
                              style={{ backgroundColor: color }}
                              title={label}
                            />
                          ))}
                        </div>
                        <Button
                          onClick={() => editor.chain().focus().unsetCustomHighlight().run()}
                          variant="outline"
                          size="sm"
                          className="w-full mt-2"
                        >
                          Remover Destaque
                        </Button>
                      </PopoverContent>
                    </Popover>

                    <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent my-2" />

                    {/* Font Size Slider */}
                    <div className="flex items-center gap-2 w-full px-2">
                      <Type className="h-4 w-4 text-gray-600" />
                      <Slider
                        value={[fontSize]}
                        onValueChange={handleFontSizeChange}
                        min={12}
                        max={48}
                        step={2}
                        className="flex-1"
                      />
                      <span className="text-xs font-medium text-gray-600 min-w-[40px] text-right">
                        {fontSize}px
                      </span>
                    </div>

                    <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent my-2" />

                    {/* Color Picker */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-11 w-11 rounded-xl hover:scale-110 hover:shadow-lg active:scale-95 transition-all"
                        >
                          <Palette className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-3" align="center">
                        <div className="space-y-3">
                          <p className="text-sm font-medium text-gray-700">Cor do Texto</p>
                          <div className="grid grid-cols-4 gap-2">
                            {[
                              { color: '#000000', label: 'Preto' },
                              { color: '#dc2626', label: 'Vermelho' },
                              { color: '#2563eb', label: 'Azul' },
                              { color: '#16a34a', label: 'Verde' },
                              { color: '#ea580c', label: 'Laranja' },
                              { color: '#9333ea', label: 'Roxo' },
                              { color: '#ec4899', label: 'Rosa' },
                              { color: '#6b7280', label: 'Cinza' },
                            ].map(({ color, label }) => (
                              <Tooltip key={color}>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => editor.chain().focus().setColor(color).run()}
                                    className={cn(
                                      'h-10 w-10 rounded-lg border-2 transition-all hover:scale-110 active:scale-95',
                                      editor.isActive('textStyle', { color }) 
                                        ? 'border-gray-900 ring-2 ring-offset-2 ring-gray-400'
                                        : 'border-gray-200 hover:border-gray-400'
                                    )}
                                    style={{ backgroundColor: color }}
                                    aria-label={label}
                                  />
                                </TooltipTrigger>
                                <TooltipContent>{label}</TooltipContent>
                              </Tooltip>
                            ))}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => editor.chain().focus().unsetColor().run()}
                            className="w-full text-xs"
                          >
                            Remover Cor
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Category 2: Lists & Structure */}
              <AccordionItem value="lists" className="border-b border-white/20">
                <AccordionTrigger className="px-4 py-3 hover:bg-blue-50/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📝</span>
                    <span className="text-sm font-semibold">Listas e Estrutura</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="flex flex-wrap items-center gap-2 justify-center">
                    {/* Bullet List */}
                    <Tooltip delayDuration={200}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => editor.chain().focus().toggleBulletList().run()}
                          className={cn(
                            'h-11 w-11 rounded-xl transition-all duration-200',
                            'hover:scale-110 hover:shadow-lg active:scale-95',
                            editor.isActive('bulletList') && 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-[0_0_20px_rgba(34,197,94,0.6)] scale-105'
                          )}
                        >
                          <List className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Lista com Marcadores</TooltipContent>
                    </Tooltip>

                    {/* Ordered List */}
                    <Tooltip delayDuration={200}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => editor.chain().focus().toggleOrderedList().run()}
                          className={cn(
                            'h-11 w-11 rounded-xl transition-all duration-200',
                            'hover:scale-110 hover:shadow-lg active:scale-95',
                            editor.isActive('orderedList') && 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-[0_0_20px_rgba(34,197,94,0.6)] scale-105'
                          )}
                        >
                          <ListOrdered className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Lista Numerada</TooltipContent>
                    </Tooltip>

                    <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent my-2" />

                    {/* Undo */}
                    <Tooltip delayDuration={200}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => editor.chain().focus().undo().run()}
                          disabled={!editor.can().undo()}
                          className="h-11 w-11 rounded-xl hover:scale-110 hover:shadow-lg active:scale-95 transition-all disabled:opacity-30"
                        >
                          <Undo className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Desfazer (Ctrl+Z)</TooltipContent>
                    </Tooltip>

                    {/* Redo */}
                    <Tooltip delayDuration={200}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => editor.chain().focus().redo().run()}
                          disabled={!editor.can().redo()}
                          className="h-11 w-11 rounded-xl hover:scale-110 hover:shadow-lg active:scale-95 transition-all disabled:opacity-30"
                        >
                          <Redo className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Refazer (Ctrl+Y)</TooltipContent>
                    </Tooltip>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Category 3: Pedagogical Boxes */}
              <AccordionItem value="boxes" className="border-b border-white/20">
                <AccordionTrigger className="px-4 py-3 hover:bg-orange-50/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📦</span>
                    <span className="text-sm font-semibold">Caixas Pedagógicas</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="flex flex-col gap-2">
                    <Tooltip delayDuration={200}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleInsertCallout}
                          className={cn(
                            'h-11 px-4 rounded-xl transition-all duration-200',
                            'bg-gradient-to-br from-orange-400 to-amber-500 text-white border-0',
                            'hover:from-orange-500 hover:to-amber-600 hover:scale-105 hover:shadow-lg',
                            'active:scale-95'
                          )}
                        >
                          <ImageIcon className="h-4 w-4 mr-2" />
                          <span className="text-sm font-medium">Inserir Caixa</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Inserir Caixa Pedagógica</TooltipContent>
                    </Tooltip>

                    <Tooltip delayDuration={200}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleImageUpload}
                          disabled={isUploadingImage}
                          className={cn(
                            'h-11 px-4 rounded-xl transition-all duration-200',
                            'bg-gradient-to-br from-blue-400 to-indigo-500 text-white border-0',
                            'hover:from-blue-500 hover:to-indigo-600 hover:scale-105 hover:shadow-lg',
                            'active:scale-95',
                            isUploadingImage && 'opacity-70'
                          )}
                        >
                          {isUploadingImage ? (
                            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          ) : (
                            <ImagePlus className="h-4 w-4 mr-2" />
                          )}
                          <span className="text-sm font-medium">
                            {isUploadingImage ? 'Enviando...' : 'Inserir Imagem'}
                          </span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{isUploadingImage ? 'Enviando imagem...' : 'Inserir Imagem'}</TooltipContent>
                    </Tooltip>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Category 4: Actions & Recording - Always visible */}
              <AccordionItem value="actions">
                <AccordionTrigger className="px-4 py-3 hover:bg-green-50/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🎙️</span>
                    <span className="text-sm font-semibold">Ações e Gravação</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="flex items-center gap-2 justify-center">
                    {/* Voice Input */}
                    <Tooltip delayDuration={200}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={onToggleVoice}
                          className={cn(
                            'h-11 w-11 rounded-xl transition-all duration-200',
                            'hover:scale-110 active:scale-95',
                            isListening 
                              ? 'bg-red-100 text-red-600 animate-pulse hover:bg-red-200' 
                              : 'hover:bg-gray-100'
                          )}
                        >
                          <Mic className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {isListening ? 'Parar Gravação' : 'Iniciar Gravação de Voz'}
                      </TooltipContent>
                    </Tooltip>

                    {/* Save Button */}
                    <Tooltip delayDuration={200}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={onSave}
                          disabled={isSaving}
                          className={cn(
                            'h-11 px-4 rounded-xl transition-all duration-200',
                            'bg-gradient-to-r from-green-500 to-emerald-600 text-white',
                            'hover:from-green-600 hover:to-emerald-700 hover:scale-105 hover:shadow-lg',
                            'active:scale-95',
                            'disabled:opacity-50'
                          )}
                        >
                          <Save className="h-4 w-4 mr-2" />
                          <span className="text-sm font-medium">
                            {isSaving ? 'Salvando...' : 'Salvar'}
                          </span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Salvar Anotação</TooltipContent>
                    </Tooltip>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </TooltipProvider>

        {/* Callout Gallery Dialog */}
        <Dialog open={showCalloutGallery} onOpenChange={setShowCalloutGallery}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Escolha uma Caixa Pedagógica</DialogTitle>
            </DialogHeader>
            <CalloutGallery 
              onSelect={(type) => {
                editor.chain().focus().insertContent({
                  type: 'calloutBox',
                  attrs: { type },
                }).run();
                setShowCalloutGallery(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Desktop Layout (Original)
  return (
    <>
      <TooltipProvider>
        <div className={cn(
          'flex flex-wrap items-center gap-1.5 p-3 bg-white/95 backdrop-blur-xl rounded-2xl border-b-2 border-white/20 shadow-lg mb-3',
          'sticky top-16 z-30 transition-all duration-300',
          focusMode && 'opacity-0 pointer-events-none h-0 p-0 overflow-hidden'
        )}>
          
          {/* GROUP 1: Text Formatting */}
          <div className="flex items-center gap-1 px-1.5 bg-gray-50/50 rounded-lg animate-fade-in" style={{ animationDelay: '50ms' }}>
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  className={cn(
                    'h-11 w-11 rounded-xl transition-all duration-200',
                    'hover:scale-110 hover:shadow-[0_0_20px_rgba(59,130,246,0.5)] active:scale-95',
                    'focus-visible:ring-2 focus-visible:ring-offset-2',
                    editor.isActive('bold') && 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-[0_0_20px_rgba(147,51,234,0.6)] scale-105'
                  )}
                >
                  <Bold className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Negrito (Ctrl+B)</TooltipContent>
            </Tooltip>
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  className={cn(
                    'h-11 w-11 rounded-xl transition-all duration-200',
                    'hover:scale-110 hover:shadow-[0_0_20px_rgba(59,130,246,0.5)] active:scale-95',
                    'focus-visible:ring-2 focus-visible:ring-offset-2',
                    editor.isActive('italic') && 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-[0_0_20px_rgba(147,51,234,0.6)] scale-105'
                  )}
                >
                  <Italic className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Itálico (Ctrl+I)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleCustomHighlight({ color: '#fef3c7' }).run()}
                  className={cn(
                    'h-11 w-11 rounded-xl transition-all duration-200',
                    'hover:scale-110 hover:shadow-[0_0_20px_rgba(251,191,36,0.5)] active:scale-95',
                    editor.isActive('customHighlight') && 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-[0_0_20px_rgba(251,191,36,0.6)] scale-105'
                  )}
                >
                  <Highlighter className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Destacar Texto</TooltipContent>
            </Tooltip>
          </div>

          <ToolbarDivider />

          {/* GROUP 2: Font Size */}
          <div className="flex items-center gap-1.5 px-1.5 bg-gray-50/50 rounded-lg min-w-[140px] animate-fade-in" style={{ animationDelay: '100ms' }}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5">
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
                  </TooltipTrigger>
                  <TooltipContent>Ajustar Tamanho do Texto</TooltipContent>
                </Tooltip>
          </div>

          <ToolbarDivider />

          {/* GROUP 3: Text Color */}
          <div className="flex items-center gap-1 px-1.5 bg-gray-50/50 rounded-lg animate-fade-in" style={{ animationDelay: '150ms' }}>
            <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-11 w-11">
                      <Palette className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-3">
                    <div className="grid grid-cols-4 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => editor.chain().focus().setColor('#000000').run()}
                        className="h-8 w-8 p-0"
                        style={{ backgroundColor: '#000000' }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => editor.chain().focus().setColor('#dc2626').run()}
                        className="h-8 w-8 p-0"
                        style={{ backgroundColor: '#dc2626' }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => editor.chain().focus().setColor('#2563eb').run()}
                        className="h-8 w-8 p-0"
                        style={{ backgroundColor: '#2563eb' }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => editor.chain().focus().setColor('#16a34a').run()}
                        className="h-8 w-8 p-0"
                        style={{ backgroundColor: '#16a34a' }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => editor.chain().focus().setColor('#ea580c').run()}
                        className="h-8 w-8 p-0"
                        style={{ backgroundColor: '#ea580c' }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => editor.chain().focus().setColor('#9333ea').run()}
                        className="h-8 w-8 p-0"
                        style={{ backgroundColor: '#9333ea' }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => editor.chain().focus().setColor('#ec4899').run()}
                        className="h-8 w-8 p-0"
                        style={{ backgroundColor: '#ec4899' }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => editor.chain().focus().setColor('#6b7280').run()}
                        className="h-8 w-8 p-0"
                        style={{ backgroundColor: '#6b7280' }}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => editor.chain().focus().unsetColor().run()}
                      className="w-full mt-2"
                    >
                      Remover Cor
                    </Button>
              </PopoverContent>
            </Popover>
          </div>

          <ToolbarDivider />

          {/* GROUP 4: Lists */}
          <div className="flex items-center gap-1 px-1.5 bg-gray-50/50 rounded-lg animate-fade-in" style={{ animationDelay: '200ms' }}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                  className={cn(
                    'h-11 w-11 rounded-xl transition-all duration-200',
                    'hover:scale-110 hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] active:scale-95',
                    editor.isActive('bulletList') && 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.6)] scale-105'
                  )}
                >
                  <List className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Lista com Marcadores</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}
                  className={cn(
                    'h-11 w-11 rounded-xl transition-all duration-200',
                    'hover:scale-110 hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] active:scale-95',
                    editor.isActive('orderedList') && 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.6)] scale-105'
                  )}
                >
                  <ListOrdered className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Lista Numerada</TooltipContent>
            </Tooltip>
          </div>

          <ToolbarDivider />

          {/* GROUP 5: Insert */}
          <div className="flex items-center gap-1 px-1.5 bg-gray-50/50 rounded-lg animate-fade-in" style={{ animationDelay: '250ms' }}>
            <Tooltip>
              <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleInsertCallout}
                      className="h-11 px-3 gap-2"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span className="hidden sm:inline">Inserir Caixa</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Inserir Caixa Pedagógica</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleImageUpload}
                      disabled={isUploadingImage}
                      className="h-11 px-3 gap-2"
                    >
                      {isUploadingImage ? (
                        <div className="h-4 w-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <ImagePlus className="h-4 w-4" />
                      )}
                      <span className="hidden sm:inline">
                        {isUploadingImage ? 'Enviando...' : 'Imagem'}
                      </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isUploadingImage ? 'Enviando imagem...' : 'Inserir Imagem'}</TooltipContent>
            </Tooltip>
          </div>

          <ToolbarDivider />

          {/* GROUP 6: History (Undo/Redo) */}
          <div className="flex items-center gap-1 px-1.5 bg-gray-50/50 rounded-lg animate-fade-in" style={{ animationDelay: '300ms' }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().undo().run()}
                  disabled={!editor.can().undo()}
                  className="h-10 w-10"
                >
                  <Undo className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().redo().run()}
                  disabled={!editor.can().redo()}
                  className="h-10 w-10"
                >
              <Redo className="h-4 w-4" />
            </Button>
          </div>

          <ToolbarDivider />

          {/* GROUP 7: Actions - Essential (Always visible) */}
          <div className="flex items-center gap-1 px-1.5 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg border border-pink-200/50 animate-fade-in" style={{ animationDelay: '350ms' }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleVoice}
              className={cn(
                'h-11 px-3 gap-2',
                isListening && 'bg-red-100 text-red-600 animate-pulse'
              )}
            >
              <Mic className="h-4 w-4" />
              {!isMobile && <span className="hidden sm:inline">{isListening ? 'Gravando' : 'Voz'}</span>}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onSave}
              disabled={isSaving}
              className={cn(
                'h-11 px-3 gap-2 rounded-xl transition-all duration-200',
                'bg-gradient-to-r from-green-500 to-emerald-600 text-white',
                'hover:from-green-600 hover:to-emerald-700 hover:scale-105 hover:shadow-[0_0_20px_rgba(34,197,94,0.6)]',
                'active:scale-95',
                'disabled:opacity-50'
              )}
            >
              {isSaving ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {!isMobile && <span className="hidden sm:inline">Salvar</span>}
                </>
              )}
            </Button>
          </div>
        </div>
      </TooltipProvider>

      <Dialog open={showCalloutGallery} onOpenChange={setShowCalloutGallery}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Escolha um tipo de caixa pedagógica</DialogTitle>
          </DialogHeader>
          <CalloutGallery
            onSelect={(type: string) => {
              editor?.commands.setCalloutBox({ type });
              setShowCalloutGallery(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};
