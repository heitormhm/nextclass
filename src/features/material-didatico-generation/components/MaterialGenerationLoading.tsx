import { Loader2, Brain, Search, Sparkles, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface MaterialGenerationLoadingProps {
  currentStep: number;
  progressMessage: string;
}

export const MaterialGenerationLoading: React.FC<MaterialGenerationLoadingProps> = ({
  currentStep,
  progressMessage,
}) => {
  const steps = [
    { icon: Brain, label: 'Analisando conteúdo...', color: 'text-purple-600' },
    { icon: Search, label: 'Pesquisando fontes acadêmicas...', color: 'text-blue-600' },
    { icon: Sparkles, label: 'Gerando material estruturado...', color: 'text-pink-600' },
    { icon: CheckCircle2, label: 'Finalizando...', color: 'text-green-600' },
  ];

  const currentStepData = steps[Math.min(currentStep - 1, steps.length - 1)] || steps[0];
  const Icon = currentStepData.icon;

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <CardContent className="pt-16 pb-16">
        <div className="flex flex-col items-center justify-center space-y-8">
          {/* Animated Icon with Glow */}
          <div className="relative">
            <div className="absolute inset-0 bg-purple-400 rounded-full blur-2xl animate-pulse opacity-40" />
            <div className="relative bg-white rounded-full p-8 shadow-2xl">
              <Icon className={`h-16 w-16 ${currentStepData.color} animate-spin`} />
            </div>
          </div>

          {/* Progress Text */}
          <div className="text-center space-y-3">
            <h3 className="text-2xl font-bold text-gray-800 animate-pulse">
              Gerando Material Didático
            </h3>
            <p className="text-base text-gray-600 max-w-md px-4">
              {progressMessage || currentStepData.label}
            </p>
          </div>

          {/* Progress Steps Indicator */}
          <div className="flex items-center gap-3 mt-6">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`h-3 w-20 rounded-full transition-all duration-500 ${
                  index < currentStep
                    ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 shadow-lg'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          {/* Educational Tip */}
          <div className="mt-8 max-w-lg px-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800 text-center leading-relaxed">
                💡 <strong>Dica:</strong> Este processo pode levar até 2 minutos. 
                Estamos realizando pesquisa profunda em fontes acadêmicas confiáveis 
                para criar um material de alta qualidade pedagógica.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
