import { useEffect, useMemo, useState } from 'react';
import { RichMaterialRenderer } from './RichMaterialRenderer';
import { MermaidDiagram } from '@/components/MermaidDiagram';
import { MermaidErrorBoundary } from '@/components/MermaidErrorBoundary';

interface TwoPhaseRendererProps {
  markdown: string;
}

interface MermaidBlock {
  index: number;
  code: string;
  title: string;
  description: string;
}

export const TwoPhaseRenderer: React.FC<TwoPhaseRendererProps> = ({ markdown }) => {
  const [renderMermaid, setRenderMermaid] = useState(false);
  
  // Split markdown into sections
  const { textContent, mermaidBlocks } = useMemo(() => {
    const blocks: MermaidBlock[] = [];
    let textOnly = markdown;
    
    // Extract mermaid blocks with their positions and context
    const regex = /```mermaid\n([\s\S]*?)```/g;
    let match;
    let index = 0;
    
    while ((match = regex.exec(markdown)) !== null) {
      // Extract title from preceding header if exists
      const beforeBlock = markdown.substring(0, match.index);
      const lastHeader = beforeBlock.match(/#{2,3}\s+([^\n]+)\n*$/);
      const title = lastHeader ? lastHeader[1] : `Diagrama ${index + 1}`;
      
      blocks.push({
        index: index++,
        code: match[1].trim(),
        title: title,
        description: 'Representação visual do conceito'
      });
      
      // Replace with placeholder in text version
      textOnly = textOnly.replace(match[0], `\n\n[MERMAID_PLACEHOLDER_${index}]\n\n`);
    }
    
    return { textContent: textOnly, mermaidBlocks: blocks };
  }, [markdown]);
  
  // Phase 1: Render immediately
  // Phase 2: Render Mermaid after 500ms delay
  useEffect(() => {
    const timer = setTimeout(() => setRenderMermaid(true), 500);
    return () => clearTimeout(timer);
  }, [markdown]);
  
  return (
    <div>
      {/* PHASE 1: Text, Math, Callouts (instant) */}
      <RichMaterialRenderer markdown={textContent} />
      
      {/* PHASE 2: Mermaid Diagrams (deferred) */}
      {!renderMermaid && mermaidBlocks.length > 0 && (
        <div className="mt-8 p-6 bg-purple-50 rounded-xl border-2 border-purple-200">
          <div className="flex items-center gap-3">
            <div className="animate-pulse h-8 w-8 bg-purple-300 rounded-full" />
            <div>
              <p className="font-semibold text-purple-800">
                Preparando {mermaidBlocks.length} {mermaidBlocks.length === 1 ? 'diagrama visual' : 'diagramas visuais'}...
              </p>
              <p className="text-sm text-purple-600">
                O conteúdo textual já está disponível acima
              </p>
            </div>
          </div>
        </div>
      )}
      
      {renderMermaid && mermaidBlocks.length > 0 && (
        <div className="space-y-6 mt-8">
          <div className="flex items-center gap-2">
            <h3 className="text-2xl font-bold text-purple-700">
              📊 Diagramas Visuais
            </h3>
            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
              {mermaidBlocks.length} {mermaidBlocks.length === 1 ? 'diagrama' : 'diagramas'}
            </span>
          </div>
          {mermaidBlocks.map((block, idx) => (
            <div key={block.index} className="relative">
              <div className="absolute -left-4 top-0 w-1 h-full bg-gradient-to-b from-purple-500 to-purple-300 rounded-full" />
              <MermaidErrorBoundary>
                <MermaidDiagram
                  code={block.code}
                  title={block.title}
                  description={block.description}
                  icon="📊"
                />
              </MermaidErrorBoundary>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
