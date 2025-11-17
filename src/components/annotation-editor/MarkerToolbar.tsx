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
    { label: 'H1', marker: '# ', icon: Type, tooltip: 'Heading 1' },
    { label: 'H2', marker: '## ', icon: Type, tooltip: 'Heading 2' },
    { label: 'H3', marker: '### ', icon: Type, tooltip: 'Heading 3' },
  ];

  const callouts = [
    { label: 'Info', marker: '[CALLOUT-INFO]\nYour text here\n[/CALLOUT-INFO]', icon: AlertCircle, color: 'text-blue-600', tooltip: 'Information callout' },
    { label: 'Warning', marker: '[CALLOUT-WARNING]\nYour text here\n[/CALLOUT-WARNING]', icon: AlertTriangle, color: 'text-yellow-600', tooltip: 'Warning message' },
    { label: 'Success', marker: '[CALLOUT-SUCCESS]\nYour text here\n[/CALLOUT-SUCCESS]', icon: CheckCircle2, color: 'text-green-600', tooltip: 'Success message' },
    { label: 'Error', marker: '[CALLOUT-ERROR]\nYour text here\n[/CALLOUT-ERROR]', icon: XCircle, color: 'text-red-600', tooltip: 'Error message' },
  ];

  const visualElements = [
    { label: 'Post-it', marker: '[POSTIT-YELLOW]\nYour note here\n[/POSTIT-YELLOW]', icon: StickyNote, tooltip: 'Sticky note' },
    { label: 'Red Text', marker: '[COLOR-RED]Your text[/COLOR-RED]', icon: Palette, tooltip: 'Red colored text' },
    { label: 'Blue Text', marker: '[COLOR-BLUE]Your text[/COLOR-BLUE]', icon: Palette, tooltip: 'Blue colored text' },
    { label: 'Green Text', marker: '[COLOR-GREEN]Your text[/COLOR-GREEN]', icon: Palette, tooltip: 'Green colored text' },
  ];

  const structures = [
    { label: 'Bullet List', marker: '[LIST-BULLET]\n- Item 1\n- Item 2\n- Item 3', icon: List, tooltip: 'Bullet list' },
    { label: 'Numbered List', marker: '[LIST-NUMBER]\n1. First\n2. Second\n3. Third', icon: ListOrdered, tooltip: 'Numbered list' },
    { label: 'Diagram', marker: '[DIAGRAM-MERMAID]\ngraph TD\n  A[Start] --> B[End]\n[/DIAGRAM-MERMAID]', icon: DiagramIcon, tooltip: 'Mermaid diagram (read-only)' },
    { label: 'Chart', marker: '[CHART-BARS]\n{"labels": ["A", "B"], "values": [10, 20]}\n[/CHART-BARS]', icon: BarChart3, tooltip: 'Bar chart (read-only)' },
  ];

  const templates = [
    {
      name: 'Study Notes',
      content: `# [Topic Name]

[CALLOUT-INFO]
Key Concept: [Fill in]
[/CALLOUT-INFO]

## Summary
[Your notes here]

## Questions
[POSTIT-YELLOW]
- Question 1
- Question 2
[/POSTIT-YELLOW]`
    },
    {
      name: 'Lab Report',
      content: `# Experiment: [Name]

## Objective
[CALLOUT-INFO]
[Your objective here]
[/CALLOUT-INFO]

## Results
[CHART-BARS]
{"labels": ["Test 1", "Test 2"], "values": [0, 0]}
[/CHART-BARS]

## Conclusion
[Your analysis here]`
    },
    {
      name: 'Lecture Notes',
      content: `# [Lecture Title]

## Main Topics
[LIST-BULLET]
- Topic 1
- Topic 2
- Topic 3

## Important Points
[CALLOUT-WARNING]
[Highlight critical information]
[/CALLOUT-WARNING]

## Summary
[Your summary here]`
    },
  ];

  if (isMobile) {
    return (
      <div className="flex flex-wrap gap-2 p-2 bg-background border-t border-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Type className="w-4 h-4 mr-2" />
              Text
              <ChevronDown className="w-3 h-3 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel>Text Formatting</DropdownMenuLabel>
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
            <Button variant="outline" size="sm">
              <AlertCircle className="w-4 h-4 mr-2" />
              Callouts
              <ChevronDown className="w-3 h-3 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel>Callouts</DropdownMenuLabel>
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
            <Button variant="outline" size="sm">
              <DiagramIcon className="w-4 h-4 mr-2" />
              More
              <ChevronDown className="w-3 h-3 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel>Visual Elements</DropdownMenuLabel>
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
            <DropdownMenuLabel>Structures</DropdownMenuLabel>
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
            <Button variant="outline" size="sm">
              <FileText className="w-4 h-4 mr-2" />
              Templates
              <ChevronDown className="w-3 h-3 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
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
    );
  }

  return (
    <TooltipProvider>
      <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 border-b border-border">
        {/* Text Formatting */}
        <div className="flex items-center gap-1 pr-2 border-r border-border">
          <span className="text-xs font-medium text-muted-foreground mr-2">Text</span>
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
          <span className="text-xs font-medium text-muted-foreground mr-2">Callouts</span>
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
          <span className="text-xs font-medium text-muted-foreground mr-2">Structure</span>
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
