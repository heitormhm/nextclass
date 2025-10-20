import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, BookOpen, FileText, ClipboardCheck } from "lucide-react";

interface QuickActionsCardProps {
  onPublish: () => void;
  onNavigateToAIChat: (actionType: string) => void;
}

export const QuickActionsCard = ({ 
  onPublish, 
  onNavigateToAIChat 
}: QuickActionsCardProps) => {
  const handleAction = (actionType: 'publish' | 'study_material' | 'lesson_plan' | 'assessment') => {
    if (actionType === 'publish') {
      onPublish();
    } else {
      onNavigateToAIChat(actionType);
    }
  };

  return (
    <Card className="mb-6 p-6 max-h-[400px] overflow-y-auto bg-gradient-to-br from-purple-50/80 via-pink-50/80 to-blue-50/80 border-2 border-purple-200/50 shadow-xl hover:shadow-2xl transition-all duration-300 backdrop-blur-sm">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Ações Rápidas com IA
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Publique materiais ou crie conteúdo educacional com a Mia
          </p>
        </div>

        {/* Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Publicar Material */}
          <Button
            onClick={() => handleAction('publish')}
            className="h-auto py-6 px-6 flex flex-col items-center gap-3 bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Upload className="h-6 w-6" />
            <div className="text-center">
              <p className="font-bold text-base">Publicar Material</p>
              <p className="text-xs opacity-90">Compartilhar na biblioteca</p>
            </div>
          </Button>

          {/* Material Didático */}
          <Button
            onClick={() => handleAction('study_material')}
            className="h-auto py-6 px-6 flex flex-col items-center gap-3 bg-gradient-to-br from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <BookOpen className="h-6 w-6" />
            <div className="text-center">
              <p className="font-bold text-base">Material Didático</p>
              <p className="text-xs opacity-90">Criar com Mia</p>
            </div>
          </Button>

          {/* Plano de Aula */}
          <Button
            onClick={() => handleAction('lesson_plan')}
            className="h-auto py-6 px-6 flex flex-col items-center gap-3 bg-gradient-to-br from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <FileText className="h-6 w-6" />
            <div className="text-center">
              <p className="font-bold text-base">Plano de Aula</p>
              <p className="text-xs opacity-90">Criar com Mia</p>
            </div>
          </Button>

          {/* Atividade Avaliativa */}
          <Button
            onClick={() => handleAction('assessment')}
            className="h-auto py-6 px-6 flex flex-col items-center gap-3 bg-gradient-to-br from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <ClipboardCheck className="h-6 w-6" />
            <div className="text-center">
              <p className="font-bold text-base">Atividade Avaliativa</p>
              <p className="text-xs opacity-90">Criar com Mia</p>
            </div>
          </Button>
        </div>

        {/* Helper Text */}
        <p className="text-sm text-center text-muted-foreground mt-4">
          💡 Clique em "Publicar Material" para compartilhar arquivos ou em qualquer ação de IA para criar conteúdo com a Mia
        </p>
      </div>
    </Card>
  );
};
