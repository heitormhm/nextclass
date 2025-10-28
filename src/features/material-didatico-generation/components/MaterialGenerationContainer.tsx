import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
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
      <div className="flex items-center gap-3 flex-wrap">
        <MaterialGenerationButton
          isGenerating={isGenerating}
          onClick={handleButtonClick}
        />

        <MaterialGenerationProgress
          currentStep={currentStep}
          progressMessage={progressMessage}
          isVisible={isGenerating}
        />

        {error && !isGenerating && (
          <Alert variant="destructive" className="flex-1 min-w-[300px]">
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
