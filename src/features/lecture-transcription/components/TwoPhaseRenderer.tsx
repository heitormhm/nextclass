import { useEffect, useMemo, useState } from 'react';
import { RichMaterialRenderer } from './RichMaterialRenderer';
import { MermaidDiagram } from '@/components/MermaidDiagram';
import { MermaidErrorBoundary } from '@/components/MermaidErrorBoundary';
import { MarkdownReferencesRenderer } from './MarkdownReferencesRenderer';

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
  const { textContent, mermaidBlocks, referencesSection } = useMemo(() => {
    console.log('[TwoPhaseRenderer] 🔍 Processing markdown, length:', markdown.length);
    const blocks: MermaidBlock[] = [];
    let textOnly = markdown;
    
    // Extract references section (anywhere in text, not just at end)
    const referencesMatch = textOnly.match(
      /(#{1,6}\s*(?:Referências|Referencias)[\s\S]*?)(?=\n#{1,6}\s+(?!#)|$)/i
    );
    const references = referencesMatch ? referencesMatch[1] : '';
    if (references) {
      textOnly = textOnly.replace(referencesMatch![0], '').trim();
    }
    
    // Extract mermaid blocks with their positions and context
    const regex = /```mermaid\n([\s\S]*?)```/g;
    let match;
    let index = 0;
    
    console.log('[TwoPhaseRenderer] 🔎 Starting Mermaid extraction...');
    
    while ((match = regex.exec(textOnly)) !== null) {
      const code = match[1].trim();
      console.log(`[TwoPhaseRenderer] 📦 Found Mermaid block #${index + 1}, length: ${code.length} chars`);
      
      // PHASE 1: Minimum length check
      if (code.length < 20) {
        console.warn(`[TwoPhaseRenderer] ❌ REJECTED (Phase 1): Too short (${code.length} chars)`);
        textOnly = textOnly.replace(match[0], '');
        continue;
      }
      console.log(`[TwoPhaseRenderer] ✅ Phase 1 passed: Length OK (${code.length} chars)`);
      
      // PHASE 2: Basic validation before adding to blocks
      const isValid = code.match(/^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gantt)/);
      if (!isValid) {
        console.warn(`[TwoPhaseRenderer] ❌ REJECTED (Phase 2): No valid diagram type found`);
        console.warn(`[TwoPhaseRenderer] 📄 Code preview: ${code.substring(0, 100)}...`);
        textOnly = textOnly.replace(match[0], '');
        continue;
      }
      const detectedType = code.match(/^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gantt)/)?.[1];
      console.log(`[TwoPhaseRenderer] ✅ Phase 2 passed: Type detected = ${detectedType}`);
      
      // PHASE 3: CRITICAL - Detect forbidden subgraph syntax
      if (code.includes('subgraph')) {
        console.error(`[TwoPhaseRenderer] ❌ REJECTED (Phase 3): Contains forbidden "subgraph" syntax`);
        console.error(`[TwoPhaseRenderer] 📄 Code: ${code}`);
        textOnly = textOnly.replace(match[0], '');
        continue;
      }
      console.log(`[TwoPhaseRenderer] ✅ Phase 3 passed: No subgraph`);
      
      // PHASE 4: Detect corrupted syntax patterns
      if (code.includes('undefined') || code.includes('-->undefined') || code.includes('null')) {
        console.error(`[TwoPhaseRenderer] ❌ REJECTED (Phase 4): Corrupted syntax (undefined/null)`);
        console.error(`[TwoPhaseRenderer] 📄 Code: ${code.substring(0, 200)}...`);
        textOnly = textOnly.replace(match[0], '');
        continue;
      }
      console.log(`[TwoPhaseRenderer] ✅ Phase 4 passed: No corruption`);
      
      // PHASE 5: Detect single-line corruption but allow compact diagrams
      const lineCount = code.split('\n').filter(l => l.trim()).length;
      if (lineCount === 1 && code.length > 200) {
        // Single line AND very long = likely corrupted
        console.warn(`[TwoPhaseRenderer] ❌ REJECTED (Phase 5): Single-line and long (${code.length} chars)`);
        console.warn(`[TwoPhaseRenderer] 📄 Code: ${code.substring(0, 200)}...`);
        textOnly = textOnly.replace(match[0], '');
        continue;
      }
      console.log(`[TwoPhaseRenderer] ✅ Phase 5 passed: ${lineCount} lines, reasonable length`);

      // PHASE 6: Check for minimum viable structure (nodes + connections)
      const hasNodes = /[A-Z0-9_]+\[/.test(code) || /[A-Z0-9_]+\(/.test(code);
      const hasConnections = /-->|---|==>|->/.test(code);
      if (!hasNodes && !hasConnections) {
        console.warn(`[TwoPhaseRenderer] ❌ REJECTED (Phase 6): No valid structure (arrows/nodes)`);
        console.warn(`[TwoPhaseRenderer] 📄 Full code: ${code}`);
        textOnly = textOnly.replace(match[0], '');
        continue;
      }
      console.log(`[TwoPhaseRenderer] ✅ Phase 6 passed: Structure detected (nodes: ${hasNodes}, connections: ${hasConnections})`);
      
      // Extract title from preceding header if exists
      const beforeBlock = textOnly.substring(0, match.index);
      const lastHeader = beforeBlock.match(/#{2,3}\s+([^\n]+)\n*$/);
      const title = lastHeader ? lastHeader[1] : `Diagrama ${index + 1}`;
      
      blocks.push({
        index: index++,
        code: code,
        title: title,
        description: 'Representação visual do conceito'
      });
      
      console.log(`[TwoPhaseRenderer] ✅ ACCEPTED: Block #${blocks.length} added (title: "${title}")`);
      
      // Remove mermaid block completely from text version
      textOnly = textOnly.replace(match[0], '');
    }
    
    console.log(`[TwoPhaseRenderer] 📊 FINAL RESULT: ${blocks.length} valid Mermaid diagrams extracted`);
    if (blocks.length === 0) {
      console.warn('[TwoPhaseRenderer] ⚠️ WARNING: No Mermaid diagrams passed validation!');
    }
    
    // PHASE 2: Clean up excessive newlines left behind
    textOnly = textOnly
      .replace(/\n{3,}/g, '\n\n')  // Max 2 consecutive newlines
      .trim();
    
    return { textContent: textOnly, mermaidBlocks: blocks, referencesSection: references };
  }, [markdown]);
  
  // Phase 1: Render immediately
  // Phase 2: Render Mermaid after 500ms delay with timeout protection
  useEffect(() => {
    const timer = setTimeout(() => setRenderMermaid(true), 500);
    
    // Safety net: Force render after 8s max to prevent infinite loading
    const timeoutTimer = setTimeout(() => {
      if (!renderMermaid) {
        console.warn('[TwoPhaseRenderer] ⚠️ Mermaid rendering timeout reached (8s), forcing render');
        setRenderMermaid(true);
      }
    }, 8000);
    
    return () => {
      clearTimeout(timer);
      clearTimeout(timeoutTimer);
    };
  }, [markdown, renderMermaid]);
  
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
      
      {/* PHASE 3: References (always at the end) */}
      {referencesSection && (
        <div className="mt-12">
          <MarkdownReferencesRenderer markdown={referencesSection} />
        </div>
      )}
    </div>
  );
};
