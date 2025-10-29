import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useMaterialGenerationJob } from '../hooks/useMaterialGenerationJob';
import { MaterialGenerationButton } from './MaterialGenerationButton';
import { MaterialGenerationProgress } from './MaterialGenerationProgress';
import { MaterialGenerationModal } from './MaterialGenerationModal';

interface MaterialGenerationContainerProps {
  lectureId: string;
  lectureTitle: string;
  transcript?: string;
  currentMaterial?: string;
  onSuccess?: () => void;
}

export const MaterialGenerationContainer: React.FC<MaterialGenerationContainerProps> = ({
  lectureId,
  lectureTitle,
  transcript,
  currentMaterial,
  onSuccess,
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const {
    isGenerating,
    currentStep,
    progressMessage,
    error,
    startGeneration,
  } = useMaterialGenerationJob({
    onSuccess: () => {
      onSuccess?.();
    },
  });

  const handleButtonClick = () => {
    if (currentMaterial && !isGenerating) {
      setShowConfirmModal(true);
    } else {
      handleGenerate();
    }
  };

  const handleGenerate = () => {
    setShowConfirmModal(false);
    startGeneration(lectureId, lectureTitle, transcript);
  };

  const handleCancel = () => {
    setShowConfirmModal(false);
  };

  return (
    <>
      <div className="flex flex-col items-center gap-4 w-full">
        {/* Barra de progresso ACIMA (apenas quando gerando) */}
        {isGenerating && (
          <div className="w-full max-w-md space-y-3">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="h-6 w-6 text-purple-600 animate-spin" />
              <div className="text-center">
                <p className="text-sm font-medium text-purple-900">
                  Gerando material didático...
                </p>
                <p className="text-xs text-purple-600">
                  {progressMessage || 'Isso pode levar alguns minutos'}
                </p>
              </div>
            </div>
            <MaterialGenerationProgress
              currentStep={currentStep}
              progressMessage={progressMessage}
              isVisible={true}
            />
          </div>
        )}
        
        {/* Botão centralizado (sempre visível) */}
        <MaterialGenerationButton
          isGenerating={isGenerating}
          onClick={handleButtonClick}
        />
        
        {/* Erro abaixo do botão (se houver) */}
        {error && !isGenerating && (
          <Alert variant="destructive" className="w-full max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {error}
            </AlertDescription>
          </Alert>
        )}
      </div>
      
      <MaterialGenerationModal
        isOpen={showConfirmModal}
        onConfirm={handleGenerate}
        onCancel={handleCancel}
      />
    </>
  );
};
