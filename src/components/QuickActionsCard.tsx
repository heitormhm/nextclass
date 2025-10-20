import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, BookOpen, FileText, ClipboardCheck, Sparkles } from "lucide-react";
import { useState } from "react";

interface Annotation {
  id: string;
  title: string;
  content: string;
}

interface QuickActionsCardProps {
  annotations: Annotation[];
  selectedAnnotationId: string;
  onAnnotationSelect: (id: string) => void;
  onPublish: (annotation: Annotation) => void;
  onNavigateToAIChat: (annotation: Annotation, actionType: string) => void;
}

export const QuickActionsCard = ({
  annotations,
  selectedAnnotationId,
  onAnnotationSelect,
  onPublish,
  onNavigateToAIChat,
}: QuickActionsCardProps) => {
  const [showAnnotationPicker, setShowAnnotationPicker] = useState(false);
  
  const selectedAnnotation = annotations.find(a => a.id === selectedAnnotationId);
  const hasAnnotations = annotations.length > 0;

  const handleAction = (actionType: 'publish' | 'study_material' | 'lesson_plan' | 'assessment') => {
    if (!hasAnnotations) {
      return;
    }

    // Se não há anotação selecionada, mostrar picker
    if (!selectedAnnotation) {
      setShowAnnotationPicker(true);
      return;
    }

    // Executar ação com a anotação selecionada
    if (actionType === 'publish') {
      onPublish(selectedAnnotation);
    } else {
      onNavigateToAIChat(selectedAnnotation, actionType);
    }
  };

  return (
    <Card className="mb-6 p-6 bg-gradient-to-br from-purple-50/80 via-pink-50/80 to-blue-50/80 border-2 border-purple-200/50 shadow-xl hover:shadow-2xl transition-all duration-300 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            ⚡ Ações Rápidas com IA
          </h2>
          <p className="text-sm text-muted-foreground">
            Transforme suas anotações em materiais pedagógicos
          </p>
        </div>
      </div>

      {/* Annotation Picker (if no selection) */}
      {showAnnotationPicker && !selectedAnnotation && (
        <div className="mb-4 p-4 bg-white/60 rounded-lg border border-purple-200">
          <p className="text-sm font-medium mb-2">Selecione uma anotação primeiro:</p>
          <div className="max-h-40 overflow-y-auto space-y-2">
            {annotations.slice(0, 10).map(annotation => (
              <Button
                key={annotation.id}
                variant="outline"
                size="sm"
                onClick={() => {
                  onAnnotationSelect(annotation.id);
                  setShowAnnotationPicker(false);
                }}
                className="w-full justify-start text-left"
              >
                {annotation.title}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Publicar Material */}
        <Button
          variant="outline"
          onClick={() => handleAction('publish')}
          disabled={!hasAnnotations}
          className="h-auto py-4 px-4 bg-gradient-to-br from-purple-100 to-pink-100 hover:from-purple-200 hover:to-pink-200 border-purple-300 hover:border-purple-400 hover:shadow-lg transition-all duration-200 group"
        >
          <div className="flex flex-col items-center gap-2 w-full">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg group-hover:scale-110 transition-transform">
              <Upload className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-semibold text-purple-700 group-hover:text-purple-900">
              Publicar Material
            </span>
            <span className="text-xs text-muted-foreground text-center">
              Compartilhar na biblioteca
            </span>
          </div>
        </Button>

        {/* Material Didático */}
        <Button
          variant="outline"
          onClick={() => handleAction('study_material')}
          disabled={!hasAnnotations}
          className="h-auto py-4 px-4 bg-gradient-to-br from-blue-100 to-cyan-100 hover:from-blue-200 hover:to-cyan-200 border-blue-300 hover:border-blue-400 hover:shadow-lg transition-all duration-200 group"
        >
          <div className="flex flex-col items-center gap-2 w-full">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg group-hover:scale-110 transition-transform">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-semibold text-blue-700 group-hover:text-blue-900">
              Material Didático
            </span>
            <span className="text-xs text-muted-foreground text-center">
              Criar com Mia
            </span>
          </div>
        </Button>

        {/* Plano de Aula */}
        <Button
          variant="outline"
          onClick={() => handleAction('lesson_plan')}
          disabled={!hasAnnotations}
          className="h-auto py-4 px-4 bg-gradient-to-br from-green-100 to-emerald-100 hover:from-green-200 hover:to-emerald-200 border-green-300 hover:border-green-400 hover:shadow-lg transition-all duration-200 group"
        >
          <div className="flex flex-col items-center gap-2 w-full">
            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg group-hover:scale-110 transition-transform">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-semibold text-green-700 group-hover:text-green-900">
              Plano de Aula
            </span>
            <span className="text-xs text-muted-foreground text-center">
              Criar com Mia
            </span>
          </div>
        </Button>

        {/* Atividade Avaliativa */}
        <Button
          variant="outline"
          onClick={() => handleAction('assessment')}
          disabled={!hasAnnotations}
          className="h-auto py-4 px-4 bg-gradient-to-br from-orange-100 to-amber-100 hover:from-orange-200 hover:to-amber-200 border-orange-300 hover:border-orange-400 hover:shadow-lg transition-all duration-200 group"
        >
          <div className="flex flex-col items-center gap-2 w-full">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg group-hover:scale-110 transition-transform">
              <ClipboardCheck className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-semibold text-orange-700 group-hover:text-orange-900">
              Atividade Avaliativa
            </span>
            <span className="text-xs text-muted-foreground text-center">
              Criar com Mia
            </span>
          </div>
        </Button>
      </div>

      {/* Helper Text */}
      {!hasAnnotations && (
        <p className="text-sm text-center text-muted-foreground mt-4">
          Crie uma anotação primeiro para usar estas ações
        </p>
      )}
      
      {hasAnnotations && !selectedAnnotation && (
        <p className="text-sm text-center text-muted-foreground mt-4">
          💡 Clique em uma ação para selecionar qual anotação usar
        </p>
      )}
      
      {selectedAnnotation && (
        <div className="mt-4 p-3 bg-white/60 rounded-lg border border-purple-200">
          <p className="text-xs text-muted-foreground mb-1">Anotação selecionada:</p>
          <p className="text-sm font-medium text-purple-700">{selectedAnnotation.title}</p>
        </div>
      )}
    </Card>
  );
};
