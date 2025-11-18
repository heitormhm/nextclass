/**
 * CalloutBox React Component - NodeView
 * Renders pedagogical callout boxes with editable content
 */

import React from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { 
  Info, AlertTriangle, CheckCircle2, XCircle, 
  Lightbulb, BookOpen, Sparkles 
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
  info: {
    icon: Info,
    bgClass: 'bg-blue-50/80',
    borderClass: 'border-blue-200',
    iconClass: 'text-blue-600',
    titleClass: 'text-blue-900',
  },
  warning: {
    icon: AlertTriangle,
    bgClass: 'bg-amber-50/80',
    borderClass: 'border-amber-200',
    iconClass: 'text-amber-600',
    titleClass: 'text-amber-900',
  },
  success: {
    icon: CheckCircle2,
    bgClass: 'bg-emerald-50/80',
    borderClass: 'border-emerald-200',
    iconClass: 'text-emerald-600',
    titleClass: 'text-emerald-900',
  },
  error: {
    icon: XCircle,
    bgClass: 'bg-red-50/80',
    borderClass: 'border-red-200',
    iconClass: 'text-red-600',
    titleClass: 'text-red-900',
  },
  tip: {
    icon: Lightbulb,
    bgClass: 'bg-purple-50/80',
    borderClass: 'border-purple-200',
    iconClass: 'text-purple-600',
    titleClass: 'text-purple-900',
  },
  concept: {
    icon: BookOpen,
    bgClass: 'bg-indigo-50/80',
    borderClass: 'border-indigo-200',
    iconClass: 'text-indigo-600',
    titleClass: 'text-indigo-900',
  },
  ai: {
    icon: Sparkles,
    bgClass: 'bg-pink-50/80',
    borderClass: 'border-pink-200',
    iconClass: 'text-pink-600',
    titleClass: 'text-pink-900',
  },
};

export const CalloutBoxComponent: React.FC<CalloutBoxComponentProps> = ({
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
          <Icon className={cn('h-5 w-5', config.iconClass)} />
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
