import { useState, forwardRef, useImperativeHandle } from 'react';
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

export interface MaterialGenerationContainerRef {
  triggerRegeneration: () => void;
}

export const MaterialGenerationContainer = forwardRef<
  MaterialGenerationContainerRef,
  MaterialGenerationContainerProps
>(({
  lectureId,
  lectureTitle,
  transcript,
  currentMaterial,
  onSuccess,
}, ref) => {
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

  /**
   * Iniciar geração de material com validações de segurança
   */
  const handleGenerate = () => {
    console.group('[MaterialGeneration] Starting Flow');
    console.log('- Lecture ID:', lectureId);
    console.log('- Lecture Title:', lectureTitle);
    console.log('- Has Material:', !!currentMaterial);
    console.log('- Transcript Length:', transcript?.length || 0);
    console.log('- Timestamp:', new Date().toISOString());
    console.groupEnd();
    
    if (!lectureId || !lectureTitle) {
      console.error('[MaterialGeneration] Missing required data');
      return;
    }
    
    setShowConfirmModal(false);
    startGeneration(lectureId, lectureTitle, transcript);
  };

  /**
   * Expor método público para regeneração
   * Inclui validações internas para prevenir estados inválidos
   */
  useImperativeHandle(ref, () => ({
    triggerRegeneration: () => {
      console.log('[Container] External trigger: Regeneration requested');
      console.log('[Container] State:', { 
        hasCurrentMaterial: !!currentMaterial, 
        isGenerating,
        lectureId 
      });
      
      if (isGenerating) {
        console.warn('[Container] Already generating, ignoring trigger');
        return;
      }
      
      if (currentMaterial) {
        console.log('[Container] Opening confirmation modal');
        setShowConfirmModal(true);
      } else {
        console.log('[Container] No material exists, generating directly');
        handleGenerate();
      }
    }
  }), [currentMaterial, isGenerating, lectureId, handleGenerate]);

  /**
   * Handler para o botão principal de geração
   */
  const handleButtonClick = () => {
    if (currentMaterial && !isGenerating) {
      setShowConfirmModal(true);
    } else {
      handleGenerate();
    }
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
                <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
                  Gerando material didático...
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-300">
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
        
        {/* Feedback quando material já existe */}
        {currentMaterial && !isGenerating && (
          <div className="text-center text-sm text-muted-foreground mb-2">
            <p>Material já gerado. Clique para refazer a pesquisa profunda.</p>
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
});

MaterialGenerationContainer.displayName = 'MaterialGenerationContainer';
