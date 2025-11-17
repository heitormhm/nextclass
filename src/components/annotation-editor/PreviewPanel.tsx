import React, { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StructuredContentRenderer } from '@/components/StructuredContentRenderer';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PreviewPanelProps {
  structuredData: any;
  isLoading?: boolean;
  syncScroll?: boolean;
  scrollPercentage?: number;
  onScroll?: (percentage: number) => void;
  className?: string;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({
  structuredData,
  isLoading = false,
  syncScroll = false,
  scrollPercentage = 0,
  onScroll,
  className
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sync scroll position
  useEffect(() => {
    if (syncScroll && scrollRef.current) {
      const maxScroll = scrollRef.current.scrollHeight - scrollRef.current.clientHeight;
      scrollRef.current.scrollTop = maxScroll * scrollPercentage;
    }
  }, [syncScroll, scrollPercentage]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (onScroll) {
      const target = e.currentTarget;
      const maxScroll = target.scrollHeight - target.clientHeight;
      const percentage = maxScroll > 0 ? target.scrollTop / maxScroll : 0;
      onScroll(percentage);
    }
  };

  return (
    <div className={cn("relative h-full flex flex-col", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Visualização</h3>
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Processando...
          </div>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1" onScroll={handleScroll}>
        <div ref={scrollRef} className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : structuredData ? (
            <StructuredContentRenderer structuredData={structuredData} />
          ) : (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              Comece a editar para ver a visualização
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
