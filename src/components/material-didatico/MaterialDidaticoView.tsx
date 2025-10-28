import React, { useState } from 'react';
import { Brain, FileText, Package } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MaterialDidaticoHeader } from './MaterialDidaticoHeader';
import { MaterialDidaticoSidebar } from './MaterialDidaticoSidebar';
import { StructuredContentRenderer } from '@/components/StructuredContentRenderer';
import { FormattedTranscriptViewer } from '@/components/FormattedTranscriptViewer';
import { useMaterialGeneration } from '@/hooks/useMaterialGeneration';
import { MATERIAL_THEME } from '@/utils/materialDidaticoTheme';

interface MaterialDidaticoViewProps {
  lectureId: string;
  lecture: any;
  onTitleChange: (title: string) => void;
  onSave: () => void;
  onPublish: () => void;
  onExportPDF: () => void;
}

export const MaterialDidaticoView: React.FC<MaterialDidaticoViewProps> = ({
  lectureId,
  lecture,
  onTitleChange,
  onSave,
  onPublish,
  onExportPDF,
}) => {
  const { isGenerating, generateMaterial } = useMaterialGeneration(lectureId);
  const [currentSection, setCurrentSection] = useState('');

  const hasMaterial = lecture?.structured_content?.material_didatico?.conteudo;
  const sections = hasMaterial
    ? lecture.structured_content.material_didatico.conteudo
        .filter((b: any) => b.tipo === 'h2')
        .map((b: any, idx: number) => ({
          id: `section-${idx}`,
          title: b.texto,
          type: b.tipo,
        }))
    : [];

  const stats = lecture?.structured_content?.material_didatico?.quality_metrics || null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <MaterialDidaticoHeader
        title={lecture?.title || ''}
        status={lecture?.status || 'processing'}
        onTitleChange={onTitleChange}
        onSave={onSave}
        onPublish={onPublish}
        onExportPDF={onExportPDF}
        isEditing={true}
      />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <MaterialDidaticoSidebar
            sections={sections}
            currentSection={currentSection}
            onSectionClick={setCurrentSection}
            stats={stats}
          />
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <Card className={`${MATERIAL_THEME.components.card} ${MATERIAL_THEME.shadows.card}`}>
            <Tabs defaultValue="material" className="w-full">
              <TabsList className="w-full grid grid-cols-3 bg-purple-100">
                <TabsTrigger value="transcript" className="data-[state=active]:bg-white data-[state=active]:text-purple-900">
                  <FileText className="w-4 h-4 mr-2" />
                  Transcrição
                </TabsTrigger>
                <TabsTrigger value="material" className="data-[state=active]:bg-white data-[state=active]:text-purple-900">
                  <Brain className="w-4 h-4 mr-2" />
                  Material Didático
                </TabsTrigger>
                <TabsTrigger value="resources" className="data-[state=active]:bg-white data-[state=active]:text-purple-900">
                  <Package className="w-4 h-4 mr-2" />
                  Recursos
                </TabsTrigger>
              </TabsList>

              <TabsContent value="transcript" className="p-6">
                <FormattedTranscriptViewer
                  transcript={lecture?.raw_transcript || ''}
                />
              </TabsContent>

              <TabsContent value="material" className="p-6">
                {hasMaterial ? (
                  <StructuredContentRenderer
                    structuredData={lecture.structured_content.material_didatico}
                  />
                ) : (
                  <div className="text-center py-12">
                    <Brain className="w-16 h-16 mx-auto mb-4 text-purple-400" />
                    <h3 className="text-xl font-semibold text-purple-900 mb-2">
                      Material Didático Não Gerado
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Gere conteúdo estruturado com pesquisa acadêmica e IA avançada
                    </p>
                    <Button
                      onClick={generateMaterial}
                      disabled={isGenerating}
                      className={`${MATERIAL_THEME.components.button} ${MATERIAL_THEME.shadows.button}`}
                    >
                      {isGenerating ? (
                        <>
                          <Brain className="w-4 h-4 mr-2 animate-pulse" />
                          Gerando...
                        </>
                      ) : (
                        <>
                          <Brain className="w-4 h-4 mr-2" />
                          Gerar Material Didático
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="resources" className="p-6">
                <div className="text-center py-12 text-gray-500">
                  Recursos adicionais em breve...
                </div>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
};
