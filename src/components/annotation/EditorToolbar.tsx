/**
 * EditorToolbar - Main formatting and action toolbar
 * Phase 5B: Enhanced with tooltips, better grouping, and visual hierarchy
 */

import React from 'react';
import { Editor } from '@tiptap/react';
import { 
  Bold, Italic, List, ListOrdered, 
  Highlighter, MessageSquare, ImageIcon, 
  Mic, Undo, Redo, Save, FileDown,
  Sparkles, BookOpen, Lightbulb, GraduationCap,
  Plus, Eye, EyeOff
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

  const handleInsertImage = () => {
    const url = window.prompt('URL da imagem:');
    if (url) {
      editor.chain().focus().setEnhancedImage({ src: url }).run();
    }
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

          {/* Insert Group - Phase 5C: Rich Callout Gallery */}
          <div className="flex items-center gap-1 border-r border-border pr-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleInsertCallout}
                  className="h-11 px-3 gap-2"
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-xs hidden md:inline">Caixa Pedagógica</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Inserir Caixa Pedagógica (12 tipos)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleInsertImage}
                  className="h-11 w-11"
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Inserir Imagem</TooltipContent>
            </Tooltip>
          </div>

          {/* History Group */}
          <div className="flex items-center gap-1 border-r border-border pr-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().undo().run()}
                  disabled={!editor.can().undo()}
                  className="h-11 w-11"
                >
                  <Undo className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Desfazer (Ctrl+Z)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().redo().run()}
                  disabled={!editor.can().redo()}
                  className="h-11 w-11"
                >
                  <Redo className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refazer (Ctrl+Y)</TooltipContent>
            </Tooltip>
          </div>

          {/* AI Actions (Mobile: Sheet, Desktop: Dropdown) */}
          {isMobile ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAISheet(true)}
              className="h-11 px-3 gap-2 bg-gradient-to-br from-pink-400 to-pink-600 text-white border-0 hover:from-pink-500 hover:to-pink-700"
            >
              <Sparkles className="h-4 w-4" />
              <span className="text-xs">Formatar com IA</span>
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-11 px-3 gap-2 bg-gradient-to-br from-pink-400 to-pink-600 text-white border-0 hover:from-pink-500 hover:to-pink-700"
                >
                  <Sparkles className="h-4 w-4" />
                  <span className="text-xs">Formatar com IA</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuLabel>✍️ Correção</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleAIAction('grammar')}>
                  Corrigir erros gramaticais
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>📖 Modificação de Conteúdo</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleAIAction('expand')}>
                  Expandir conteúdo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAIAction('summarize')}>
                  Resumir conteúdo
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>📚 Ferramentas Pedagógicas</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleAIAction('lesson_plan')}>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Gerar Plano de Aula
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAIAction('activity')}>
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Gerar Atividade Avaliativa
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Actions Group */}
          <div className="flex items-center gap-1 ml-auto">
            {/* Phase 5E: Focus Mode Toggle */}
            {onToggleFocusMode && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onToggleFocusMode}
                    className="h-11 w-11"
                  >
                    {focusMode ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {focusMode ? 'Sair do Modo Foco' : 'Modo Foco'}
                </TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleVoice}
                  className={cn(
                    'h-11 w-11',
                    isListening && 'bg-red-100 text-red-600 animate-pulse'
                  )}
                >
                  <Mic className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isListening ? 'Parar Gravação' : 'Gravar Áudio'}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  onClick={onSave}
                  disabled={isSaving}
                  className="h-11 px-4 gap-2"
                >
                  <Save className="h-4 w-4" />
                  <span className="text-sm hidden md:inline">
                    {isSaving ? 'Salvando...' : 'Salvar'}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Salvar Anotação (Ctrl+S)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onExportPDF}
                  className="h-11 px-4 gap-2"
                >
                  <FileDown className="h-4 w-4" />
                  <span className="text-sm hidden md:inline">PDF</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Exportar como PDF</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </TooltipProvider>

      {/* Phase 5D: AI Actions Sheet for Mobile */}
      <Sheet open={showAISheet} onOpenChange={setShowAISheet}>
        <SheetContent side="bottom" className="h-[75vh] rounded-t-3xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-pink-500" />
              Formatar com IA
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto space-y-3 py-4 px-6">
            {/* Correction Section */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">✍️ Correção</h3>
              <Button
                variant="outline"
                onClick={() => handleAIAction('grammar')}
                className="w-full justify-start h-12 text-base"
              >
                Corrigir erros gramaticais
              </Button>
            </div>

            {/* Content Modification Section */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">📖 Modificação de Conteúdo</h3>
              <Button
                variant="outline"
                onClick={() => handleAIAction('expand')}
                className="w-full justify-start h-12 text-base"
              >
                Expandar conteúdo
              </Button>
              <Button
                variant="outline"
                onClick={() => handleAIAction('summarize')}
                className="w-full justify-start h-12 text-base"
              >
                Resumir conteúdo
              </Button>
            </div>

            {/* Pedagogical Tools Section */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">📚 Ferramentas Pedagógicas</h3>
              <Button
                variant="outline"
                onClick={() => handleAIAction('lesson_plan')}
                className="w-full justify-start h-12 text-base"
              >
                <BookOpen className="h-5 w-5 mr-3 text-blue-600" />
                Gerar Plano de Aula
              </Button>
              <Button
                variant="outline"
                onClick={() => handleAIAction('activity')}
                className="w-full justify-start h-12 text-base"
              >
                <Lightbulb className="h-5 w-5 mr-3 text-orange-600" />
                Gerar Atividade Avaliativa
              </Button>
              <Button
                variant="outline"
                onClick={() => handleAIAction('material')}
                className="w-full justify-start h-12 text-base"
              >
                <GraduationCap className="h-5 w-5 mr-3 text-purple-600" />
                Gerar Material Educativo
              </Button>
            </div>
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