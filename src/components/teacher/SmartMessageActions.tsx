import { Button } from "@/components/ui/button";
import { FileDown, Lightbulb, FileEdit } from "lucide-react";

interface SmartMessageActionsProps {
  messageContent: string;
  messageId: string;
  isDeepSearchResult: boolean;
  onExportPDF: () => void;
  onGenerateSuggestions: () => void;
  onAddToAnnotations: () => void;
}

export const SmartMessageActions = ({
  messageContent,
  messageId,
  isDeepSearchResult,
  onExportPDF,
  onGenerateSuggestions,
  onAddToAnnotations
}: SmartMessageActionsProps) => {
  // Don't show actions for short messages
  if (messageContent.length < 200) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-purple-100">
      {/* Export PDF Button */}
      {isDeepSearchResult && (
        <Button
          variant="outline"
          size="sm"
          onClick={onExportPDF}
          className="text-xs bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 border-purple-200"
        >
          <FileDown className="w-3 h-3 mr-1.5" />
          Exportar PDF
        </Button>
      )}

      {/* Generate Suggestions Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onGenerateSuggestions}
        className="text-xs bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-blue-200"
      >
        <Lightbulb className="w-3 h-3 mr-1.5" />
        Sugestões de Melhoria
      </Button>

      {/* Add to Annotations Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onAddToAnnotations}
        className="text-xs bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 border-green-200"
      >
        <FileEdit className="w-3 h-3 mr-1.5" />
        Salvar em Anotações
      </Button>
    </div>
  );
};
