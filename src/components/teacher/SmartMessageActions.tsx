import { StatefulButton } from "@/components/ui/stateful-button";
import { FileDown, Lightbulb, FileEdit } from "lucide-react";

interface SmartMessageActionsProps {
  messageContent: string;
  messageId: string;
  onExportPDF: () => Promise<void>;
  onGenerateSuggestions: () => Promise<void>; // ✅ Agora retorna Promise
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
    <div className="flex flex-wrap gap-2.5 mt-4 pt-4 border-t border-purple-100">
      {/* Export PDF Button - Gradiente Roxo/Rosa */}
      <StatefulButton
        onClick={onExportPDF}
        disabled={isLoading || isSuggestionsLoading}
        className="bg-gradient-to-r from-purple-500 to-pink-500 text-white 
                   hover:from-purple-600 hover:to-pink-600 hover:ring-purple-400 
                   border-0 text-sm px-4 py-2 min-w-[140px] font-medium
                   shadow-md hover:shadow-lg transition-all"
      >
        <FileDown className="w-4 h-4" />
        Exportar PDF
      </StatefulButton>

      {/* Suggestions Button - Gradiente Azul/Índigo */}
      <StatefulButton
        onClick={onGenerateSuggestions}
        disabled={isLoading || isSuggestionsLoading}
        className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white 
                   hover:from-blue-600 hover:to-indigo-700 hover:ring-blue-400 
                   border-0 text-sm px-4 py-2 min-w-[180px] font-medium
                   shadow-md hover:shadow-lg transition-all"
      >
        <Lightbulb className="w-4 h-4" />
        Sugestões de Melhoria
      </StatefulButton>

      {/* Save to Annotations Button - Gradiente Verde/Esmeralda */}
      <StatefulButton
        onClick={onAddToAnnotations}
        disabled={isLoading || isSuggestionsLoading}
        className="bg-gradient-to-r from-green-500 to-emerald-600 text-white 
                   hover:from-green-600 hover:to-emerald-700 hover:ring-green-400 
                   border-0 text-sm px-4 py-2 min-w-[180px] font-medium
                   shadow-md hover:shadow-lg transition-all"
      >
        <FileEdit className="w-4 h-4" />
        Salvar em Anotações
      </StatefulButton>
    </div>
  );
};
