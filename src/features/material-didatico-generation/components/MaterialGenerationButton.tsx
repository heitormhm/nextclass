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
      size="sm"
      disabled={isGenerating || disabled}
      onClick={onClick}
      className="gap-2 h-10 bg-gradient-to-r from-purple-600 to-purple-700 text-white border-0 hover:from-purple-700 hover:to-purple-800 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 whitespace-nowrap"
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
