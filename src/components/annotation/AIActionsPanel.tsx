/**
 * AIActionsPanel - PHASE 7: Separate AI Actions Panel
 * Floating panel (desktop) or sheet (mobile) for AI-powered content tools
 */

import React, { useState } from 'react';
import { 
  Sparkles, BookOpen, Lightbulb, GraduationCap,
  Check, FileText, Wand2, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
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
    onAction(actionId);
    setIsOpen(false);
  };

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            className="fixed right-4 bottom-24 z-40 h-14 w-14 rounded-full shadow-lg bg-gradient-to-br from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white border-0"
          >
            <Sparkles className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[75vh] rounded-t-3xl">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-pink-600" />
              Ações com IA
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-3 overflow-y-auto max-h-[calc(75vh-80px)]">
            {aiActions.map((action) => (
              <Button
                key={action.id}
                variant="outline"
                onClick={() => handleAction(action.id)}
                className="w-full h-auto py-4 px-4 justify-start hover:bg-accent/50"
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

  return (
    <Card className="fixed right-4 top-32 w-80 shadow-2xl z-30 border-2">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-pink-600" />
          Ações com IA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {aiActions.map((action) => (
          <Button
            key={action.id}
            variant="ghost"
            onClick={() => handleAction(action.id)}
            className="w-full justify-start h-auto py-3 hover:bg-accent"
          >
            <action.icon className={cn('h-5 w-5 mr-3 shrink-0', action.color)} />
            <div className="text-left">
              <div className="font-medium text-sm">{action.label}</div>
              <div className="text-xs text-muted-foreground">{action.description}</div>
            </div>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
};
