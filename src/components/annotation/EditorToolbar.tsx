/**
 * EditorToolbar - Main formatting and action toolbar
 * Provides quick access to formatting, AI actions, voice, and save
 */

import React from 'react';
import { Editor } from '@tiptap/react';
import { 
  Bold, Italic, List, ListOrdered, 
  Highlighter, MessageSquare, ImageIcon, 
  Mic, Undo, Redo, Save, FileDown, Type, Palette
} from 'lucide-react';
import { CalloutGallery } from './CalloutGallery';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
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
  const isMobile = useIsMobile();
  const [showCalloutGallery, setShowCalloutGallery] = React.useState(false);
  
  // PHASE 3: Font size state
  const [fontSize, setFontSize] = React.useState(16);

  // Log phase implementation status
  React.useEffect(() => {
    console.log('✅ PHASE 1: Callout boxes - emojis only, no icons');
    console.log('✅ PHASE 2: Text size slider - fontSize extension added');
    console.log('✅ PHASE 3: Color palette & lists - commands fixed');
    console.log('✅ PHASE 4: AI floating button - gradient pink with shimmer');
    console.log('✅ PHASE 5: Purple background - 20% transparency');
    console.log('✅ PHASE 6: UI polish - enhanced animations & styling');
  }, []);

  if (!editor) return null;

  const handleInsertCallout = () => {
    setShowCalloutGallery(true);
  };

  // PHASE 3: Font size handler
  const handleFontSizeChange = (value: number[]) => {
    const size = value[0];
    setFontSize(size);
    console.log('✅ PHASE 2: Font size changed to', size);
    editor.chain().focus().setMark('textStyle', { fontSize: `${size}px` }).run();
  };

  // Separator component for visual grouping
  const ToolbarDivider = () => (
    <div className="h-8 w-px bg-gradient-to-b from-transparent via-gray-300 to-transparent mx-1" />
  );

  return (
    <>
      <TooltipProvider>
        <div className={cn(
          'flex flex-wrap items-center gap-1.5 p-3 bg-white/95 backdrop-blur-xl border-b shadow-sm',
          'sticky top-16 z-30 transition-all',
          isMobile && 'justify-center',
          focusMode && 'opacity-0 pointer-events-none h-0 p-0 overflow-hidden'
        )}>
          
          {/* GROUP 1: Text Formatting */}
          <div className="flex items-center gap-1 px-1.5 bg-gray-50/50 rounded-lg">
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    console.log('✅ PHASE 6: Bold toggle');
                    editor.chain().focus().toggleBold().run();
                  }}
                  className={cn(
                    'h-11 w-11 rounded-xl transition-all duration-200',
                    'hover:scale-105 hover:shadow-lg active:scale-95',
                    'focus-visible:ring-2 focus-visible:ring-offset-2',
                    editor.isActive('bold') && 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-md scale-105'
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
                  onClick={() => {
                    console.log('✅ PHASE 6: Italic toggle');
                    editor.chain().focus().toggleItalic().run();
                  }}
                  className={cn(
                    'h-11 w-11 rounded-xl transition-all duration-200',
                    'hover:scale-105 hover:shadow-lg active:scale-95',
                    'focus-visible:ring-2 focus-visible:ring-offset-2',
                    editor.isActive('italic') && 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-md scale-105'
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
                    'h-11 w-11',
                    editor.isActive('customHighlight') && 'bg-primary text-primary-foreground'
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
          <div className="flex items-center gap-2 px-1.5 bg-gray-50/50 rounded-lg min-w-[180px]">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                  <Type className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Slider
                    value={[fontSize]}
                    onValueChange={handleFontSizeChange}
                    min={12}
                    max={48}
                    step={2}
                    className="w-24"
                  />
                  <span className="text-xs text-muted-foreground w-10 text-center shrink-0">
                    {fontSize}px
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>Tamanho do Texto (12-48px)</TooltipContent>
            </Tooltip>
          </div>

          <ToolbarDivider />

          {/* GROUP 3: Text Color */}
          <div className="flex items-center gap-1 px-1.5 bg-gray-50/50 rounded-lg">
            <Popover>
              <PopoverTrigger asChild>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-11 w-11"
                    >
                      <Palette className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Cor do Texto</TooltipContent>
                </Tooltip>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2">
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
          <div className="flex items-center gap-1 px-1.5 bg-gray-50/50 rounded-lg">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                  className={cn(
                    'h-11 w-11',
                    editor.isActive('bulletList') && 'bg-primary text-primary-foreground'
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
                    'h-11 w-11',
                    editor.isActive('orderedList') && 'bg-primary text-primary-foreground'
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
          <div className="flex items-center gap-1 px-1.5 bg-gray-50/50 rounded-lg">
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
          </div>

          <ToolbarDivider />

          {/* GROUP 6: History (Undo/Redo) */}
          <div className="flex items-center gap-1 px-1.5 bg-gray-50/50 rounded-lg">
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

          {/* GROUP 7: Actions */}
          <div className="flex items-center gap-1 px-1.5 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg">
            <Button
              variant={isListening ? 'destructive' : 'ghost'}
              size="sm"
              onClick={onToggleVoice}
              className={cn(
                'h-10 w-10',
                isListening && 'animate-pulse'
              )}
            >
              <Mic className="h-4 w-4" />
            </Button>

            {/* PHASE 7: AI actions removed - now in separate AIActionsPanel */}

            <Button
              variant="ghost"
              size="sm"
              onClick={onExportPDF}
              className="h-10 px-3"
            >
              <FileDown className="h-4 w-4 mr-2" />
              PDF
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={onSave}
              disabled={isSaving}
              className="h-10 px-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              {isSaving ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </>
              )}
            </Button>
          </div>
        </div>
      </TooltipProvider>

      {/* PHASE 7: AI Actions Sheet removed - now in separate AIActionsPanel component */}

      {/* Phase 5C: Rich Callout Gallery Dialog */}
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
