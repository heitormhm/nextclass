import { GENERATION_STEPS } from '../types/materialGeneration.types';

interface MaterialGenerationProgressProps {
  currentStep: number;
  progressMessage: string;
  isVisible: boolean;
}

export const MaterialGenerationProgress: React.FC<MaterialGenerationProgressProps> = ({
  currentStep,
  progressMessage,
  isVisible,
}) => {
  if (!isVisible) return null;

  const progressPercent = (currentStep / GENERATION_STEPS.length) * 100;

  return (
    <div className="flex-1 flex items-center gap-2 min-w-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-medium text-purple-900 whitespace-nowrap">
            {Math.round(progressPercent)}%
          </span>
          <span className="text-xs text-purple-600 truncate">
            {progressMessage || GENERATION_STEPS[currentStep - 1]?.label || 'Processando...'}
          </span>
        </div>
        <div className="w-full bg-purple-200 rounded-full h-1.5">
          <div 
            className="bg-gradient-to-r from-purple-600 to-pink-600 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};
