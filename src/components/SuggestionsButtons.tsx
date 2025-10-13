import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";

interface SuggestionsButtonsProps {
  suggestionsJobId: string;
  activeJobs: Map<string, any>;
  onSuggestionClick: (suggestion: string) => void;
  disabled?: boolean;
}

export const SuggestionsButtons = ({ 
  suggestionsJobId, 
  activeJobs, 
  onSuggestionClick,
  disabled 
}: SuggestionsButtonsProps) => {
  const job = activeJobs.get(suggestionsJobId);
  
  if (!job) return null;
  
  // Mostrar loading enquanto processa
  if (job.status === 'PENDING') {
    return (
      <div className="flex items-center gap-2 mt-3 p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
        <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
        <p className="text-sm text-purple-700 dark:text-purple-300">Gerando sugestões de aprofundamento...</p>
      </div>
    );
  }
  
  // Mostrar botões quando completar
  if (job.status === 'COMPLETED' && job.result) {
    try {
      const parsed = JSON.parse(job.result);
      const suggestions = parsed.suggestions || [];
      
      if (suggestions.length === 0) return null;
      
      return (
        <div className="mt-4 space-y-2 animate-in fade-in-50 duration-300">
          <div className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 font-medium">
            <Sparkles className="h-4 w-4" />
            <span>Continue explorando:</span>
          </div>
          
          <div className="flex flex-col gap-2">
            {suggestions.map((suggestion: string, index: number) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => onSuggestionClick(suggestion)}
                disabled={disabled}
                className="justify-start text-left h-auto py-2 px-3 border-purple-300 dark:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/50 hover:border-purple-400 dark:hover:border-purple-600 text-purple-700 dark:text-purple-300 hover:text-purple-800 dark:hover:text-purple-200 transition-all"
              >
                <span className="text-xs leading-relaxed">{suggestion}</span>
              </Button>
            ))}
          </div>
        </div>
      );
    } catch (error) {
      console.error('Error parsing suggestions:', error);
      return null;
    }
  }
  
  return null;
};
