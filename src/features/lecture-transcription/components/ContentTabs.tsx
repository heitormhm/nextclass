import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { FormattedTranscriptViewer } from '@/components/FormattedTranscriptViewer';
import { FileText, BookOpen, Eye } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import type { StructuredContent } from '../types/lecture.types';

interface ContentTabsProps {
  rawTranscript?: string;
  structuredContent: StructuredContent | null;
}

export const ContentTabs: React.FC<ContentTabsProps> = ({
  rawTranscript,
  structuredContent,
}) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <Tabs defaultValue="material" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="transcript" className="gap-2">
              <FileText className="h-4 w-4" />
              Transcrição
            </TabsTrigger>
            <TabsTrigger value="material" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Material Didático
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2">
              <Eye className="h-4 w-4" />
              Preview
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
            {structuredContent?.material_didatico ? (
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
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Material didático ainda não gerado
              </p>
            )}
          </TabsContent>

          <TabsContent value="preview" className="mt-4">
            {structuredContent ? (
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <h1>{structuredContent.titulo_aula}</h1>
                <p className="lead">{structuredContent.resumo}</p>
                {structuredContent.material_didatico && (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                  >
                    {typeof structuredContent.material_didatico === 'string' 
                      ? structuredContent.material_didatico 
                      : JSON.stringify(structuredContent.material_didatico, null, 2)}
                  </ReactMarkdown>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Conteúdo não disponível para preview
              </p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
