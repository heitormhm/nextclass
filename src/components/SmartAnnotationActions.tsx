import { Button } from "@/components/ui/button";
import { Upload, BookOpen, FileText, ClipboardCheck } from "lucide-react";

interface Annotation {
  id: string;
  title: string;
  content: string;
}

interface SmartAnnotationActionsProps {
  annotation: Annotation;
  onPublish: (annotation: Annotation) => void;
  onCreateStudyMaterial: (annotation: Annotation) => void;
  onCreateLessonPlan: (annotation: Annotation) => void;
  onCreateAssessment: (annotation: Annotation) => void;
}

export const SmartAnnotationActions = ({
  annotation,
  onPublish,
  onCreateStudyMaterial,
  onCreateLessonPlan,
  onCreateAssessment
}: SmartAnnotationActionsProps) => {
  return (
    <div className="mt-4 pt-4 border-t space-y-3">
      <p className="text-xs font-medium text-muted-foreground mb-2">Ações Rápidas:</p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Publicar Material */}
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onPublish(annotation);
          }}
          className="w-full bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 border-purple-200 text-purple-700 hover:text-purple-800"
        >
          <Upload className="h-4 w-4 mr-2" />
          Publicar Material
        </Button>

        {/* Material Didático */}
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onCreateStudyMaterial(annotation);
          }}
          className="w-full bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 border-blue-200 text-blue-700 hover:text-blue-800"
        >
          <BookOpen className="h-4 w-4 mr-2" />
          Material Didático
        </Button>

        {/* Plano de Aula */}
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onCreateLessonPlan(annotation);
          }}
          className="w-full bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 border-green-200 text-green-700 hover:text-green-800"
        >
          <FileText className="h-4 w-4 mr-2" />
          Plano de Aula
        </Button>

        {/* Atividade Avaliativa */}
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onCreateAssessment(annotation);
          }}
          className="w-full bg-gradient-to-r from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100 border-orange-200 text-orange-700 hover:text-orange-800"
        >
          <ClipboardCheck className="h-4 w-4 mr-2" />
          Atividade Avaliativa
        </Button>
      </div>
    </div>
  );
};
