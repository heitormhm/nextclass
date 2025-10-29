/**
 * PHASE 5: Simplified ContentTabs with MaterialViewer
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { FormattedTranscriptViewer } from '@/components/FormattedTranscriptViewer';
import { MaterialViewer } from './MaterialViewer';
import { MaterialGenerationButton } from '@/features/material-didatico-generation/components/MaterialGenerationButton';
import { FileText, Sparkles } from 'lucide-react';
import 'katex/dist/katex.min.css';
import type { StructuredContent } from '../types/lecture.types';

interface ContentTabsProps {
  rawTranscript?: string;
  structuredContent: StructuredContent | null;
  topics?: Array<{ conceito: string; definicao: string }>;
  htmlContent?: string;
  isGeneratingMaterial?: boolean;
  materialProgress?: number;
  materialProgressMessage?: string;
  onGenerateMaterial?: () => Promise<void>;
  onRegenerateMaterial?: () => Promise<void>;
}

export const ContentTabs: React.FC<ContentTabsProps> = ({
  rawTranscript,
  structuredContent,
  topics,
  htmlContent,
  isGeneratingMaterial = false,
  materialProgress = 0,
  materialProgressMessage = 'Processando...',
  onGenerateMaterial,
  onRegenerateMaterial,
}) => {
  return (
    <Card className="backdrop-blur-sm bg-white/95 shadow-xl border border-white/20 overflow-hidden">
      <CardContent className="p-6 max-w-full overflow-x-hidden">
        <Tabs defaultValue="transcript" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="transcript" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Transcrição
            </TabsTrigger>
            <TabsTrigger value="material" className="flex items-center gap-2 relative">
              <Sparkles className="h-4 w-4" />
              Material Didático
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transcript" className="mt-4">
            {rawTranscript ? (
              <FormattedTranscriptViewer transcript={rawTranscript} />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Transcrição não disponível
              </p>
            )}
          </TabsContent>

      <TabsContent value="material" className="mt-4 overflow-x-hidden">
        {structuredContent?.material_didatico || isGeneratingMaterial ? (
          <div className="max-h-[calc(100vh-400px)] overflow-y-auto">
            <MaterialViewer
              markdownContent={
                typeof structuredContent?.material_didatico === 'string' 
                  ? structuredContent.material_didatico 
                  : (structuredContent?.material_didatico ? JSON.stringify(structuredContent.material_didatico) : undefined)
              }
              isGenerating={isGeneratingMaterial}
              progress={materialProgress}
              progressMessage={materialProgressMessage}
              onRegenerate={onRegenerateMaterial}
              showRegenerateButton={true}
            />
          </div>
        ) : (
              <div className="text-center py-12">
                {onGenerateMaterial ? (
                  <MaterialGenerationButton 
                    onClick={onGenerateMaterial}
                    isGenerating={false}
                  />
                ) : (
                  <p className="text-muted-foreground">
                    Nenhum material didático disponível ainda.
                  </p>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
