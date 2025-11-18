/**
 * EditorToolbar - Main formatting and action toolbar
 * Provides quick access to formatting, AI actions, voice, and save
 */

import React from 'react';
import { Editor } from '@tiptap/react';
import { 
  Bold, Italic, List, ListOrdered, 
  Highlighter, MessageSquare, ImageIcon, 
  Mic, Undo, Redo, Save, FileDown,
  Sparkles, BookOpen, Lightbulb, GraduationCap,
  Plus, Eye, EyeOff, Palette, Heading1, Heading2, 
  Heading3, Type
} from 'lucide-react';
import { CalloutGallery } from './CalloutGallery';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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
  const [showAISheet, setShowAISheet] = React.useState(false);
  const [showCalloutGallery, setShowCalloutGallery] = React.useState(false);

  if (!editor) return null;

  const handleAIAction = (action: string) => {
    onAIAction(action);
    setShowAISheet(false);
  };

  const handleInsertCallout = () => {
    setShowCalloutGallery(true);
  };

  return (
    <>
      <TooltipProvider>
        <div className={cn(
          'flex flex-wrap items-center gap-2 p-3 bg-white/95 backdrop-blur-xl border-b shadow-sm',
          'sticky top-16 z-30 transition-all',
          isMobile && 'justify-center',
          focusMode && 'opacity-0 pointer-events-none h-0 p-0 overflow-hidden'
        )}>
          {/* Phase 5B: Enhanced Toolbar with Tooltips */}
          
          {/* Text Formatting Group */}
          <div className="flex items-center gap-1 border-r border-border pr-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  className={cn(
                    'h-11 w-11',
                    editor.isActive('bold') && 'bg-primary text-primary-foreground'
                  )}
                >
                  <Bold className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Negrito (Ctrl+B)</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  className={cn(
                    'h-11 w-11',
                    editor.isActive('italic') && 'bg-primary text-primary-foreground'
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

          {/* Heading/Text Size Group - Phase 3 */}
          <div className="flex items-center gap-1 border-r border-border pr-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                  className={cn(
                    'h-11 w-11',
                    editor.isActive('heading', { level: 1 }) && 'bg-primary text-primary-foreground'
                  )}
                >
                  <Heading1 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Título 1 (Ctrl+Alt+1)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                  className={cn(
                    'h-11 w-11',
                    editor.isActive('heading', { level: 2 }) && 'bg-primary text-primary-foreground'
                  )}
                >
                  <Heading2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Título 2 (Ctrl+Alt+2)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                  className={cn(
                    'h-11 w-11',
                    editor.isActive('heading', { level: 3 }) && 'bg-primary text-primary-foreground'
                  )}
                >
                  <Heading3 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Título 3 (Ctrl+Alt+3)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().setParagraph().run()}
                  className={cn(
                    'h-11 w-11',
                    editor.isActive('paragraph') && 'bg-primary text-primary-foreground'
                  )}
                >
                  <Type className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Parágrafo Normal</TooltipContent>
            </Tooltip>
          </div>

          {/* Text Color Picker - Phase 2 */}
          <div className="flex items-center gap-1 border-r border-border pr-2">
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

          {/* Lists Group */}
          <div className="flex items-center gap-1 border-r border-border pr-2">
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

        {/* Insert Callout Button - Phase 5 */}
        <div className="flex items-center gap-1 border-r pr-2">
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

        {/* Undo/Redo Group */}
        <div className="flex items-center gap-1 border-r pr-2">
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

        {/* Actions Group */}
        <div className="flex items-center gap-1">
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

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAISheet(true)}
            className="h-10 px-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:from-pink-600 hover:to-purple-700"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            IA
          </Button>

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
            className="h-10 px-3"
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

      {/* AI Actions Sheet (Mobile) */}
      <Sheet open={showAISheet} onOpenChange={setShowAISheet}>
        <SheetContent className="h-[75vh] rounded-t-3xl flex flex-col">
          <SheetHeader className="pb-4 flex-shrink-0">
            <SheetTitle>Ações com IA</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto space-y-3 py-4 px-6">
            <Button
              variant="outline"
              className="w-full justify-start h-12 text-base"
              onClick={() => handleAIAction('grammar')}
            >
              <span className="mr-3">✍️</span>
              Corrigir erros gramaticais
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start h-12 text-base"
              onClick={() => handleAIAction('expand')}
            >
              <span className="mr-3">📖</span>
              Expandir conteúdo selecionado
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start h-12 text-base"
              onClick={() => handleAIAction('summarize')}
            >
              <span className="mr-3">📝</span>
              Resumir conteúdo
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start h-12 text-base"
              onClick={() => handleAIAction('lesson_plan')}
            >
              <BookOpen className="h-5 w-5 mr-3 text-blue-600" />
              Gerar Plano de Aula
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start h-12 text-base"
              onClick={() => handleAIAction('activity')}
            >
              <Lightbulb className="h-5 w-5 mr-3 text-orange-600" />
              Gerar Atividade Avaliativa
            </Button>
          </div>
        </SheetContent>
      </Sheet>

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
