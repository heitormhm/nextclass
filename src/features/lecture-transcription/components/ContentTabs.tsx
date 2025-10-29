import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { FormattedTranscriptViewer } from '@/components/FormattedTranscriptViewer';
import { StructuredContentRenderer } from '@/components/StructuredContentRenderer';
import { HTMLContentRenderer } from '@/components/HTMLContentRenderer';
import { MaterialGenerationLoading } from '@/features/material-didatico-generation/components/MaterialGenerationLoading';
import { FileText, BookOpen, Sparkles, RotateCcw, AlertCircle } from 'lucide-react';
import 'katex/dist/katex.min.css';
import type { StructuredContent } from '../types/lecture.types';

interface ContentTabsProps {
  rawTranscript?: string;
  structuredContent: StructuredContent | null;
  topics?: Array<{ conceito: string; definicao: string }>;
  materialGenerationComponent?: React.ReactNode;
  onRegenerateMaterial?: () => void;
  isGeneratingMaterial?: boolean;
  materialGenerationProgress?: {
    step: number;
    message: string;
  };
}

export const ContentTabs: React.FC<ContentTabsProps> = ({
  rawTranscript,
  structuredContent,
  topics,
  materialGenerationComponent,
  onRegenerateMaterial,
  isGeneratingMaterial,
  materialGenerationProgress,
}) => {
  /**
   * Handler para regeneração de material didático
   * Bloqueia propagação de eventos para evitar mudança de tab
   */
  const handleRegenerateMaterial = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    console.log('[ContentTabs] Redo button clicked');
    
    if (!onRegenerateMaterial) {
      console.warn('[ContentTabs] No regeneration handler provided');
      return;
    }
    
    onRegenerateMaterial();
  };

  /**
   * FASE 3: Enhanced HTML validation - strips tags AND entities
   */
  const isEmptyHTML = (html: string | undefined) => {
    if (!html) return true;
    
    // Remove all HTML tags
    const stripped = html.replace(/<[^>]*>/g, '').trim();
    
    // Remove HTML entities (&nbsp;, &amp;, etc)
    const clean = stripped
      .replace(/&[a-z]+;/gi, '')
      .replace(/&\#\d+;/g, '')
      .trim();
    
    // Check if real text remains
    const isEmpty = clean.length < 10;
    
    if (isEmpty) {
      console.warn('[ContentTabs] HTML is effectively empty:', { 
        originalLength: html.length,
        strippedLength: stripped.length,
        cleanLength: clean.length,
        preview: clean 
      });
    }
    
    return isEmpty;
  };

  // ✅ Extract material formats
  const materialHTML = structuredContent?.material_didatico_html as string | undefined;
  const materialJSON = structuredContent?.material_didatico;

  // ✅ FASE 4: Diagnostic logging
  console.log('[ContentTabs] Render state:', {
    hasHTML: !!materialHTML,
    htmlLength: materialHTML?.length || 0,
    htmlPreview: materialHTML?.substring(0, 100),
    hasJSON: !!materialJSON,
    jsonType: typeof materialJSON,
    isGenerating: isGeneratingMaterial,
    generationStep: materialGenerationProgress?.step,
    generationMessage: materialGenerationProgress?.message,
  });

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
                className="ml-2 p-1.5 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-full transition-all duration-200 flex items-center justify-center hover:scale-110 active:scale-95 cursor-pointer"
                title="Refazer pesquisa profunda"
                aria-label="Refazer pesquisa de material didático"
              >
                <RotateCcw className="h-4 w-4 text-purple-600 dark:text-purple-400" />
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
            {isGeneratingMaterial ? (
              <MaterialGenerationLoading
                currentStep={materialGenerationProgress?.step || 0}
                progressMessage={materialGenerationProgress?.message || 'Processando...'}
              />
            ) : materialHTML ? (
              // ✅ FASE 2: Render HTML (primary format)
              isEmptyHTML(materialHTML) ? (
                <div className="text-center py-12 space-y-4">
                  <AlertCircle className="h-12 w-12 text-orange-500 mx-auto" />
                  <div>
                    <p className="text-muted-foreground font-medium">
                      ⚠️ Material didático está vazio
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Tente regenerar clicando no ícone de refazer acima.
                    </p>
                  </div>
                </div>
              ) : (
                <HTMLContentRenderer htmlContent={materialHTML} />
              )
            ) : materialJSON ? (
              // ✅ Backward compatibility: Render JSON (old lectures)
              <StructuredContentRenderer 
                structuredData={materialJSON as any}
              />
            ) : (
              <div className="text-center py-12">
                {materialGenerationComponent || (
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
