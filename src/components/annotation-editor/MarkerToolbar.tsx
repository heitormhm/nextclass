import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Type,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  StickyNote,
  Palette,
  List,
  ListOrdered,
  Image as DiagramIcon,
  BarChart3,
  ChevronDown,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MarkerToolbarProps {
  onInsertMarker: (marker: string) => void;
  onInsertTemplate: (template: string) => void;
  isMobile?: boolean;
}

export const MarkerToolbar: React.FC<MarkerToolbarProps> = ({
  onInsertMarker,
  onInsertTemplate,
  isMobile = false,
}) => {
  const textFormats = [
    { label: 'Título 1', marker: '# ', icon: Type, tooltip: 'Título principal' },
    { label: 'Título 2', marker: '## ', icon: Type, tooltip: 'Subtítulo' },
    { label: 'Título 3', marker: '### ', icon: Type, tooltip: 'Seção' },
  ];

  const callouts = [
    { label: 'Info', marker: '[CALLOUT-INFO]\nSeu texto aqui\n[/CALLOUT-INFO]', icon: AlertCircle, color: 'text-blue-600', tooltip: 'Caixa informativa' },
    { label: 'Aviso', marker: '[CALLOUT-WARNING]\nSeu texto aqui\n[/CALLOUT-WARNING]', icon: AlertTriangle, color: 'text-yellow-600', tooltip: 'Mensagem de alerta' },
    { label: 'Sucesso', marker: '[CALLOUT-SUCCESS]\nSeu texto aqui\n[/CALLOUT-SUCCESS]', icon: CheckCircle2, color: 'text-green-600', tooltip: 'Mensagem de sucesso' },
    { label: 'Erro', marker: '[CALLOUT-ERROR]\nSeu texto aqui\n[/CALLOUT-ERROR]', icon: XCircle, color: 'text-red-600', tooltip: 'Mensagem de erro' },
  ];

  const visualElements = [
    { label: 'Post-it', marker: '[POSTIT-YELLOW]\nSua nota aqui\n[/POSTIT-YELLOW]', icon: StickyNote, tooltip: 'Nota adesiva' },
    { label: 'Texto Vermelho', marker: '[COLOR-RED]Seu texto[/COLOR-RED]', icon: Palette, tooltip: 'Texto em vermelho' },
    { label: 'Texto Azul', marker: '[COLOR-BLUE]Seu texto[/COLOR-BLUE]', icon: Palette, tooltip: 'Texto em azul' },
    { label: 'Texto Verde', marker: '[COLOR-GREEN]Seu texto[/COLOR-GREEN]', icon: Palette, tooltip: 'Texto em verde' },
  ];

  const structures = [
    { label: 'Lista', marker: '[LIST-BULLET]\n- Item 1\n- Item 2\n- Item 3', icon: List, tooltip: 'Lista com marcadores' },
    { label: 'Lista Numerada', marker: '[LIST-NUMBER]\n1. Primeiro\n2. Segundo\n3. Terceiro', icon: ListOrdered, tooltip: 'Lista numerada' },
    { label: 'Diagrama', marker: '[DIAGRAM-MERMAID]\ngraph TD\n  A[Início] --> B[Fim]\n[/DIAGRAM-MERMAID]', icon: DiagramIcon, tooltip: 'Diagrama Mermaid (somente leitura)' },
    { label: 'Gráfico', marker: '[CHART-BARS]\n{"labels": ["A", "B"], "values": [10, 20]}\n[/CHART-BARS]', icon: BarChart3, tooltip: 'Gráfico de barras (somente leitura)' },
  ];

  const templates = [
    {
      name: 'Notas de Estudo',
      content: `# [Nome do Tópico]

[CALLOUT-INFO]
Conceito Chave: [Preencher]
[/CALLOUT-INFO]

## Resumo
[Suas anotações aqui]

## Questões
[POSTIT-YELLOW]
- Questão 1
- Questão 2
[/POSTIT-YELLOW]`
    },
    {
      name: 'Relatório de Laboratório',
      content: `# Experimento: [Nome]

## Objetivo
[CALLOUT-INFO]
[Seu objetivo aqui]
[/CALLOUT-INFO]

## Resultados
[CHART-BARS]
{"labels": ["Teste 1", "Teste 2"], "values": [0, 0]}
[/CHART-BARS]

## Conclusão
[Sua análise aqui]`
    },
    {
      name: 'Notas de Aula',
      content: `# [Título da Aula]

## Tópicos Principais
[LIST-BULLET]
- Tópico 1
- Tópico 2
- Tópico 3

## Pontos Importantes
[CALLOUT-WARNING]
[Destacar informação crítica]
[/CALLOUT-WARNING]

## Resumo
[Seu resumo aqui]`
    },
  ];

  if (isMobile) {
    return (
      <div className="flex flex-wrap gap-2 p-2 bg-background border-t border-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-11 min-h-[44px]">
              <Type className="w-4 h-4 mr-2" />
              📝 Formato
              <ChevronDown className="w-3 h-3 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel>Formatação de Texto</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {textFormats.map((format) => (
              <DropdownMenuItem
                key={format.label}
                onClick={() => onInsertMarker(format.marker)}
              >
                <format.icon className="w-4 h-4 mr-2" />
                {format.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-11 min-h-[44px]">
              <AlertCircle className="w-4 h-4 mr-2" />
              💡 Destaques
              <ChevronDown className="w-3 h-3 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel>Caixas de Destaque</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {callouts.map((callout) => (
              <DropdownMenuItem
                key={callout.label}
                onClick={() => onInsertMarker(callout.marker)}
              >
                <callout.icon className={cn("w-4 h-4 mr-2", callout.color)} />
                {callout.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-11 min-h-[44px]">
              <DiagramIcon className="w-4 h-4 mr-2" />
              📊 Mais
              <ChevronDown className="w-3 h-3 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel>Elementos Visuais</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {visualElements.map((elem) => (
              <DropdownMenuItem
                key={elem.label}
                onClick={() => onInsertMarker(elem.marker)}
              >
                <elem.icon className="w-4 h-4 mr-2" />
                {elem.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Estruturas</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {structures.map((struct) => (
              <DropdownMenuItem
                key={struct.label}
                onClick={() => onInsertMarker(struct.marker)}
              >
                <struct.icon className="w-4 h-4 mr-2" />
                {struct.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-11 min-h-[44px]">
              <FileText className="w-4 h-4 mr-2" />
              📚 Modelos
              <ChevronDown className="w-3 h-3 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Modelos Prontos</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {templates.map((template) => (
              <DropdownMenuItem
                key={template.name}
                onClick={() => onInsertTemplate(template.content)}
                className="flex-col items-start"
              >
                <span className="font-medium">{template.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 border-b border-border">
        {/* Text Formatting */}
        <div className="flex items-center gap-1 pr-2 border-r border-border">
          <span className="text-xs font-medium text-muted-foreground mr-2">Texto</span>
          {textFormats.map((format) => (
            <Tooltip key={format.label}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onInsertMarker(format.marker)}
                  className="h-8 px-2"
                >
                  <format.icon className="w-4 h-4" />
                  <span className="ml-1 text-xs">{format.label}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{format.tooltip}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Callouts */}
        <div className="flex items-center gap-1 pr-2 border-r border-border">
          <span className="text-xs font-medium text-muted-foreground mr-2">Destaques</span>
          {callouts.map((callout) => (
            <Tooltip key={callout.label}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onInsertMarker(callout.marker)}
                  className="h-8 px-2"
                >
                  <callout.icon className={cn("w-4 h-4", callout.color)} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{callout.tooltip}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Visual Elements */}
        <div className="flex items-center gap-1 pr-2 border-r border-border">
          <span className="text-xs font-medium text-muted-foreground mr-2">Visual</span>
          {visualElements.slice(0, 1).map((elem) => (
            <Tooltip key={elem.label}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onInsertMarker(elem.marker)}
                  className="h-8 px-2"
                >
                  <elem.icon className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{elem.tooltip}</TooltipContent>
            </Tooltip>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2">
                <Palette className="w-4 h-4" />
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {visualElements.slice(1).map((elem) => (
                <DropdownMenuItem
                  key={elem.label}
                  onClick={() => onInsertMarker(elem.marker)}
                >
                  <elem.icon className="w-4 h-4 mr-2" />
                  {elem.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Structures */}
        <div className="flex items-center gap-1 pr-2 border-r border-border">
          <span className="text-xs font-medium text-muted-foreground mr-2">Estrutura</span>
          {structures.slice(0, 2).map((struct) => (
            <Tooltip key={struct.label}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onInsertMarker(struct.marker)}
                  className="h-8 px-2"
                >
                  <struct.icon className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{struct.tooltip}</TooltipContent>
            </Tooltip>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2">
                <DiagramIcon className="w-4 h-4" />
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {structures.slice(2).map((struct) => (
                <DropdownMenuItem
                  key={struct.label}
                  onClick={() => onInsertMarker(struct.marker)}
                >
                  <struct.icon className="w-4 h-4 mr-2" />
                  {struct.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Templates */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-3">
              <FileText className="w-4 h-4 mr-2" />
              Templates
              <ChevronDown className="w-3 h-3 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Insert Template</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {templates.map((template) => (
              <DropdownMenuItem
                key={template.name}
                onClick={() => onInsertTemplate(template.content)}
              >
                {template.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  );
};
