/**
 * CalloutBox React Component - NodeView
 * Phase 4: Expanded to 12 pedagogical callout types
 */

import React from 'react';
import { NodeViewWrapper, NodeViewContent, NodeViewProps } from '@tiptap/react';
import { 
  Info, AlertTriangle, CheckCircle2, XCircle, 
  Lightbulb, BookOpen, Sparkles, HelpCircle,
  Microscope, ListChecks, Factory, PenTool,
  Search, Quote, Link2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalloutBoxComponentProps {
  node: {
    attrs: {
      type: string;
      title: string;
    };
  };
  updateAttributes: (attrs: Record<string, any>) => void;
  selected: boolean;
}

const calloutConfig = {
  // Original 7 types
  info: {
    icon: Info,
    emoji: 'ℹ️',
    bgClass: 'bg-blue-50/80',
    borderClass: 'border-blue-200',
    iconClass: 'text-blue-600',
    titleClass: 'text-blue-900',
  },
  warning: {
    icon: AlertTriangle,
    emoji: '⚠️',
    bgClass: 'bg-amber-50/80',
    borderClass: 'border-amber-200',
    iconClass: 'text-amber-600',
    titleClass: 'text-amber-900',
  },
  success: {
    icon: CheckCircle2,
    emoji: '✅',
    bgClass: 'bg-emerald-50/80',
    borderClass: 'border-emerald-200',
    iconClass: 'text-emerald-600',
    titleClass: 'text-emerald-900',
  },
  error: {
    icon: XCircle,
    emoji: '❌',
    bgClass: 'bg-red-50/80',
    borderClass: 'border-red-200',
    iconClass: 'text-red-600',
    titleClass: 'text-red-900',
  },
  tip: {
    icon: Lightbulb,
    emoji: '💡',
    bgClass: 'bg-purple-50/80',
    borderClass: 'border-purple-200',
    iconClass: 'text-purple-600',
    titleClass: 'text-purple-900',
  },
  concept: {
    icon: BookOpen,
    emoji: '📖',
    bgClass: 'bg-indigo-50/80',
    borderClass: 'border-indigo-200',
    iconClass: 'text-indigo-600',
    titleClass: 'text-indigo-900',
  },
  ai: {
    icon: Sparkles,
    emoji: '✨',
    bgClass: 'bg-pink-50/80',
    borderClass: 'border-pink-200',
    iconClass: 'text-pink-600',
    titleClass: 'text-pink-900',
  },
  
  // Phase 4: New 5 types matching Material Didático
  question: {
    icon: HelpCircle,
    emoji: '🤔',
    bgClass: 'bg-violet-50/80',
    borderClass: 'border-violet-200',
    iconClass: 'text-violet-600',
    titleClass: 'text-violet-900',
  },
  example: {
    icon: Microscope,
    emoji: '🔬',
    bgClass: 'bg-sky-50/80',
    borderClass: 'border-sky-200',
    iconClass: 'text-sky-600',
    titleClass: 'text-sky-900',
  },
  summary: {
    icon: ListChecks,
    emoji: '📊',
    bgClass: 'bg-teal-50/80',
    borderClass: 'border-teal-200',
    iconClass: 'text-teal-600',
    titleClass: 'text-teal-900',
  },
  professional: {
    icon: Factory,
    emoji: '🏭',
    bgClass: 'bg-slate-50/80',
    borderClass: 'border-slate-300',
    iconClass: 'text-slate-700',
    titleClass: 'text-slate-900',
  },
  exercise: {
    icon: PenTool,
    emoji: '✍️',
    bgClass: 'bg-lime-50/80',
    borderClass: 'border-lime-200',
    iconClass: 'text-lime-600',
    titleClass: 'text-lime-900',
  },
  deep: {
    icon: Search,
    emoji: '🔍',
    bgClass: 'bg-purple-100/80',
    borderClass: 'border-purple-300',
    iconClass: 'text-purple-700',
    titleClass: 'text-purple-950',
  },
  quote: {
    icon: Quote,
    emoji: '🎓',
    bgClass: 'bg-gray-50/80',
    borderClass: 'border-gray-300',
    iconClass: 'text-gray-600',
    titleClass: 'text-gray-900',
  },
  connection: {
    icon: Link2,
    emoji: '🔗',
    bgClass: 'bg-cyan-50/80',
    borderClass: 'border-cyan-200',
    iconClass: 'text-cyan-600',
    titleClass: 'text-cyan-900',
  },
};

export const CalloutBoxComponent: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
  selected,
}) => {
  const config = calloutConfig[node.attrs.type as keyof typeof calloutConfig] || calloutConfig.info;
  const Icon = config.icon;

  return (
    <NodeViewWrapper
      className={cn(
        'callout-box my-4 rounded-xl border-2 p-4 transition-all',
        config.bgClass,
        config.borderClass,
        selected && 'ring-2 ring-primary ring-offset-2'
      )}
    >
      <div className="flex gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/50">
            <span className="text-xl">{config.emoji}</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          {node.attrs.title && (
            <div className={cn('font-semibold mb-2 text-sm', config.titleClass)}>
              {node.attrs.title}
            </div>
          )}
          <NodeViewContent className="callout-content prose prose-sm max-w-none" />
        </div>
      </div>
    </NodeViewWrapper>
  );
};