/**
 * AIActionsPanel - PHASE 4: Floating Expandable AI Button
 * Beautiful gradient pink circle with shimmer effect that expands on click
 */

import React, { useState } from 'react';
import { 
  Sparkles, BookOpen, Lightbulb, GraduationCap,
  Check, FileText, Wand2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface AIActionsPanelProps {
  onAction: (action: string) => void;
}

const aiActions = [
  {
    id: 'grammar',
    icon: Check,
    label: 'Corrigir erros gramaticais',
    description: 'Revisa ortografia e gramática',
    color: 'text-green-600',
  },
  {
    id: 'expand',
    icon: BookOpen,
    label: 'Expandir conteúdo',
    description: 'Adiciona mais detalhes e exemplos',
    color: 'text-blue-600',
  },
  {
    id: 'summarize',
    icon: FileText,
    label: 'Resumir conteúdo',
    description: 'Condensa em pontos principais',
    color: 'text-purple-600',
  },
  {
    id: 'lesson_plan',
    icon: Lightbulb,
    label: 'Gerar Plano de Aula',
    description: 'Cria estrutura pedagógica completa',
    color: 'text-orange-600',
  },
  {
    id: 'activity',
    icon: GraduationCap,
    label: 'Gerar Atividade Avaliativa',
    description: 'Cria exercícios e questões',
    color: 'text-pink-600',
  },
];

export const AIActionsPanel: React.FC<AIActionsPanelProps> = ({ onAction }) => {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);

  const handleAction = (actionId: string) => {
    console.log('✅ PHASE 4: AI Action triggered:', actionId);
    onAction(actionId);
    setIsOpen(false);
  };

  // MOBILE VERSION: Sheet with floating button
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            className={cn(
              'fixed right-6 bottom-6 z-40',
              'h-16 w-16 rounded-full',
              'bg-gradient-to-br from-pink-400 via-pink-500 to-purple-600',
              'hover:from-pink-500 hover:via-pink-600 hover:to-purple-700',
              'shadow-2xl border-2 border-white/20',
              'transform transition-all duration-300 hover:scale-110',
              'animate-shimmer'
            )}
          >
            <Sparkles className="h-7 w-7 text-white animate-pulse" />
          </Button>
        </SheetTrigger>
        <SheetContent 
          side="bottom" 
          className="h-[75vh] rounded-t-3xl bg-white/95 backdrop-blur-2xl"
        >
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-pink-600" />
              Ações com IA
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-3 overflow-y-auto max-h-[calc(75vh-80px)] pr-2">
            {aiActions.map((action) => (
              <Button
                key={action.id}
                variant="outline"
                onClick={() => handleAction(action.id)}
                className={cn(
                  'w-full h-auto py-4 px-4 justify-start',
                  'hover:bg-accent/50 transition-all duration-200',
                  'border-2 hover:border-pink-200 hover:shadow-md'
                )}
              >
                <action.icon className={cn('h-5 w-5 mr-3 shrink-0', action.color)} />
                <div className="text-left">
                  <div className="font-semibold text-base">{action.label}</div>
                  <div className="text-xs text-muted-foreground">{action.description}</div>
                </div>
              </Button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // DESKTOP VERSION: Popover with floating button
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          className={cn(
            'fixed right-6 bottom-6 z-40',
            'h-16 w-16 rounded-full',
            'bg-gradient-to-br from-pink-400 via-pink-500 to-purple-600',
            'hover:from-pink-500 hover:via-pink-600 hover:to-purple-700',
            'shadow-2xl border-2 border-white/20 backdrop-blur-xl',
            'transform transition-all duration-300 hover:scale-110',
            'animate-shimmer'
          )}
        >
          <Sparkles className="h-7 w-7 text-white animate-pulse" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        side="left" 
        align="end"
        className="w-80 p-4 bg-white/95 backdrop-blur-2xl shadow-2xl rounded-2xl border-2 border-pink-200"
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-lg font-semibold mb-3">
            <Sparkles className="h-5 w-5 text-pink-600" />
            Ações com IA
          </div>
          {aiActions.map((action) => (
            <Button
              key={action.id}
              variant="outline"
              onClick={() => handleAction(action.id)}
              className={cn(
                'w-full h-auto py-3 px-3 justify-start',
                'hover:bg-accent transition-all duration-200',
                'border hover:border-pink-300 hover:shadow-md'
              )}
            >
              <action.icon className={cn('h-5 w-5 mr-3 shrink-0', action.color)} />
              <div className="text-left">
                <div className="font-medium text-sm">{action.label}</div>
                <div className="text-xs text-muted-foreground">{action.description}</div>
              </div>
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
