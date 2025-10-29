import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { FormattedTranscriptViewer } from '@/components/FormattedTranscriptViewer';
import { StructuredContentRenderer } from '@/components/StructuredContentRenderer';
import { FileText, BookOpen, Sparkles, RotateCcw } from 'lucide-react';
import 'katex/dist/katex.min.css';
import type { StructuredContent } from '../types/lecture.types';

interface ContentTabsProps {
  rawTranscript?: string;
  structuredContent: StructuredContent | null;
  topics?: Array<{ conceito: string; definicao: string }>;
  materialGenerationComponent?: React.ReactNode;
  onRegenerateMaterial?: () => void;
}

export const ContentTabs: React.FC<ContentTabsProps> = ({
  rawTranscript,
  structuredContent,
  topics,
  materialGenerationComponent,
  onRegenerateMaterial
}) => {
  const handleRegenerateMaterial = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRegenerateMaterial?.();
  };
  return (
    <Card className="backdrop-blur-sm bg-white/95 shadow-xl border-white/20">
      <CardContent className="pt-6">
        <Tabs defaultValue="material" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="topics" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Tópicos
            </TabsTrigger>
            <TabsTrigger value="transcript" className="gap-2">
              <FileText className="h-4 w-4" />
              Transcrição
            </TabsTrigger>
            <TabsTrigger value="material" className="gap-2 relative">
              <Sparkles className="h-4 w-4" />
              Material Didático
              {structuredContent?.material_didatico && (
                <button
                  onClick={handleRegenerateMaterial}
                  className="ml-2 p-1 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-full transition-colors"
                  title="Refazer pesquisa profunda"
                  aria-label="Refazer pesquisa de material didático"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                </button>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="topics" className="mt-4">
            {!topics || topics.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum tópico identificado ainda
              </p>
            ) : (
              <div className="space-y-4">
                {topics.map((topic, index) => (
                  <div key={index} className="border-l-4 border-purple-600 pl-4 py-2">
                    <h4 className="font-semibold text-foreground mb-1">
                      {topic.conceito}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {topic.definicao}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

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
              <div className="text-center py-12">
                {materialGenerationComponent || (
                  <p className="text-muted-foreground">
                    Nenhum material didático disponível
                  </p>
                )}
              </div>
            ) : (
              <StructuredContentRenderer 
                structuredData={structuredContent.material_didatico as any}
              />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
