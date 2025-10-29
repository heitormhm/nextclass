import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { FormattedTranscriptViewer } from '@/components/FormattedTranscriptViewer';
import { FileText, BookOpen, Sparkles, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import type { StructuredContent } from '../types/lecture.types';
import { MaterialGenerationButton } from '@/features/material-didatico-generation/components/MaterialGenerationButton';
import { MaterialGenerationProgress } from '@/features/material-didatico-generation/components/MaterialGenerationProgress';

interface ContentTabsProps {
  rawTranscript?: string;
  structuredContent: StructuredContent | null;
  topics?: Array<{ conceito: string; definicao: string }>;
  onGenerateMaterial?: () => void;
  isGenerating?: boolean;
  currentStep?: number;
  progressMessage?: string;
}

export const ContentTabs: React.FC<ContentTabsProps> = ({
  rawTranscript,
  structuredContent,
  topics,
  onGenerateMaterial,
  isGenerating = false,
  currentStep = 0,
  progressMessage = ''
}) => {
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
            <TabsTrigger value="material" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Material Didático
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
              <div className="text-center py-12 space-y-4">
                {isGenerating ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-center gap-3">
                      <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
                      <div className="text-left">
                        <p className="text-sm font-medium text-purple-900">
                          Gerando material didático...
                        </p>
                        <p className="text-xs text-purple-600">
                          Isso pode levar alguns minutos
                        </p>
                      </div>
                    </div>
                    
                    <div className="max-w-md mx-auto">
                      <MaterialGenerationProgress
                        currentStep={currentStep}
                        progressMessage={progressMessage}
                        isVisible={true}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Material didático ainda não foi gerado
                    </p>
                    {onGenerateMaterial && (
                      <MaterialGenerationButton 
                        isGenerating={false}
                        onClick={onGenerateMaterial}
                      />
                    )}
                  </>
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
