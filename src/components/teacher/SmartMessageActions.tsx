import { Button } from "@/components/ui/button";
import { StatefulButton } from "@/components/ui/stateful-button";
import { FileDown, Lightbulb, FileEdit } from "lucide-react";

interface SmartMessageActionsProps {
  messageContent: string;
  messageId: string;
  onExportPDF: () => Promise<void>;
  onGenerateSuggestions: () => void;
  onAddToAnnotations: () => Promise<void>;
  isLoading?: boolean;
  isSuggestionsLoading?: boolean;
}

export const SmartMessageActions = ({
  messageContent,
  messageId,
  onExportPDF,
  onGenerateSuggestions,
  onAddToAnnotations,
  isLoading = false,
  isSuggestionsLoading = false
}: SmartMessageActionsProps) => {
  // Don't show actions for short messages
  if (messageContent.length < 200) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-purple-100">
      {/* Export PDF Button with stateful animation */}
      <StatefulButton
        onClick={onExportPDF}
        disabled={isLoading || isSuggestionsLoading}
        className="bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 hover:ring-purple-400 border-0"
      >
        <FileDown className="w-3 h-3" />
        Exportar PDF
      </StatefulButton>

      {/* Generate Suggestions Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onGenerateSuggestions}
        disabled={isLoading || isSuggestionsLoading}
        className="text-xs bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-blue-200"
      >
        <Lightbulb className="w-3 h-3 mr-1.5" />
        {isSuggestionsLoading ? 'Gerando...' : 'Sugestões de Melhoria'}
      </Button>

      {/* Add to Annotations Button with stateful animation */}
      <StatefulButton
        onClick={onAddToAnnotations}
        disabled={isLoading || isSuggestionsLoading}
        className="bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 hover:ring-green-400 border-0"
      >
        <FileEdit className="w-3 h-3" />
        Salvar em Anotações
      </StatefulButton>
    </div>
  );
};
