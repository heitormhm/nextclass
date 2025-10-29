import { Button } from '@/components/ui/button';
import { Brain, Loader2 } from 'lucide-react';

interface MaterialGenerationButtonProps {
  isGenerating: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export const MaterialGenerationButton: React.FC<MaterialGenerationButtonProps> = ({
  isGenerating,
  onClick,
  disabled = false,
}) => {
  return (
    <Button 
      disabled={isGenerating || disabled}
      onClick={onClick}
      className="gap-2 h-10 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold border-0 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 whitespace-nowrap min-w-[240px]"
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Gerando...
        </>
      ) : (
        <>
          <Brain className="h-4 w-4" />
          Gerar Material Didático
        </>
      )}
    </Button>
  );
};
