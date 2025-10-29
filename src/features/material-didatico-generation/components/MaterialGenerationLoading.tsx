import { Brain, Search, Sparkles, CheckCircle2 } from 'lucide-react';

interface MaterialGenerationLoadingProps {
  currentStep: number;
  progressMessage: string;
  progress?: number;  // Add progress prop
}

export const MaterialGenerationLoading: React.FC<MaterialGenerationLoadingProps> = ({
  currentStep,
  progressMessage,
  progress: progressProp,
}) => {
  const steps = [
    { icon: Brain, label: 'Analisando' },
    { icon: Search, label: 'Pesquisando' },
    { icon: Sparkles, label: 'Gerando' },
    { icon: CheckCircle2, label: 'Finalizando' },
  ];

  // Use provided progress or calculate from currentStep
  const progress = progressProp ?? ((currentStep / steps.length) * 100);
  
  // Calculate step from progress percentage (0-100)
  const calculatedStep = Math.min(Math.floor((progress / 100) * steps.length), steps.length - 1);

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      {/* Minimalist Progress Circle */}
      <div className="relative w-32 h-32 mb-8">
        {/* Background Circle */}
        <svg className="absolute inset-0 w-full h-full -rotate-90">
          <circle
            cx="64"
            cy="64"
            r="56"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            className="text-gray-200"
          />
          {/* Progress Circle */}
          <circle
            cx="64"
            cy="64"
            r="56"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            strokeDasharray={`${2 * Math.PI * 56}`}
            strokeDashoffset={`${2 * Math.PI * 56 * (1 - progress / 100)}`}
            className="text-purple-600 transition-all duration-500"
            strokeLinecap="round"
          />
        </svg>
        
        {/* Center Icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          {(() => {
            const CurrentIcon = steps[calculatedStep]?.icon || Brain;
            return <CurrentIcon className="h-12 w-12 text-purple-600 animate-pulse" />;
          })()}
        </div>
      </div>

      {/* Status Text */}
      <div className="text-center space-y-2 max-w-md">
        <h3 className="text-lg font-semibold text-gray-900">
          {progressMessage || steps[calculatedStep]?.label || 'Processando'}
        </h3>
        <p className="text-sm text-gray-600">
          Gerando material didático com IA...
        </p>
      </div>

      {/* Step Indicators */}
      <div className="flex items-center gap-2 mt-8">
        {steps.map((step, index) => (
          <div
            key={index}
            className={`h-2 w-12 rounded-full transition-all duration-300 ${
              index <= calculatedStep
                ? 'bg-purple-600'
                : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
