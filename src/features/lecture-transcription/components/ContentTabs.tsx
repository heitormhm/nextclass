import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { FormattedTranscriptViewer } from '@/components/FormattedTranscriptViewer';
import { FileText, BookOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import type { StructuredContent } from '../types/lecture.types';
import { MaterialGenerationButton } from '@/features/material-didatico-generation/components/MaterialGenerationButton';

interface ContentTabsProps {
  rawTranscript?: string;
  structuredContent: StructuredContent | null;
  onGenerateMaterial?: () => void;
  isGenerating?: boolean;
}

export const ContentTabs: React.FC<ContentTabsProps> = ({
  rawTranscript,
  structuredContent,
  onGenerateMaterial,
  isGenerating = false
}) => {
  return (
    <Card className="backdrop-blur-sm bg-white/95 shadow-xl border-white/20">
      <CardContent className="pt-6">
        <Tabs defaultValue="material" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="transcript" className="gap-2">
              <FileText className="h-4 w-4" />
              Transcrição
            </TabsTrigger>
            <TabsTrigger value="material" className="gap-2">
              <BookOpen className="h-4 w-4" />
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

          <TabsContent value="material" className="mt-4">
            {!structuredContent?.material_didatico ? (
              <div className="text-center py-12 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Material didático ainda não foi gerado
                </p>
                {onGenerateMaterial && (
                  <MaterialGenerationButton 
                    isGenerating={isGenerating}
                    onClick={onGenerateMaterial}
                  />
                )}
              </div>
            ) : (
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                >
                  {typeof structuredContent.material_didatico === 'string' 
                    ? structuredContent.material_didatico 
                    : JSON.stringify(structuredContent.material_didatico, null, 2)}
                </ReactMarkdown>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
