import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useMaterialGenerationJob } from '../hooks/useMaterialGenerationJob';
import { MaterialGenerationButton } from './MaterialGenerationButton';
import { MaterialGenerationProgress } from './MaterialGenerationProgress';
import { MaterialGenerationModal } from './MaterialGenerationModal';
import { validateStructuredMaterial, logMaterialState } from '../utils/debugHelpers';

interface MaterialGenerationContainerProps {
  lectureId: string;
  lectureTitle: string;
  transcript?: string;
  currentMaterial?: string;
  onSuccess?: () => void;
  onGeneratingChange?: (isGenerating: boolean, step: number, message: string) => void;
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
  onGeneratingChange,
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
      onGeneratingChange?.(false, 0, '');
    },
    onError: (error) => {
      console.error('[MaterialGenerationContainer] ❌ Error:', error);
      onGeneratingChange?.(false, 0, '');
    },
  });

  // ✅ FASE 3: Removed - Hook now notifies directly via callback
  // No need for useEffect since onProgress is called before setIsGenerating

  // Debug logging para lifecycle do componente
  React.useEffect(() => {
    console.log('[Container] Mount/Update:', {
      hasLectureId: !!lectureId,
      hasTitle: !!lectureTitle,
      hasMaterial: !!currentMaterial,
      isGenerating,
    });
  }, [lectureId, lectureTitle, currentMaterial, isGenerating]);

  // Validação crítica de props
  React.useEffect(() => {
    if (!lectureId || !lectureTitle) {
      console.error('[Container] CRITICAL: Missing required props:', {
        hasLectureId: !!lectureId,
        hasTitle: !!lectureTitle,
      });
    }
  }, [lectureId, lectureTitle]);

  /**
   * Iniciar geração de material com validações de segurança
   * Memoizado para prevenir re-criação desnecessária
   */
  const handleGenerate = React.useCallback(() => {
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
  }, [lectureId, lectureTitle, currentMaterial, transcript, startGeneration]);

  /**
   * FASE 1: useLayoutEffect para garantir ref síncrono
   * Executa ANTES da pintura do browser, eliminando timing issues
   */
  React.useLayoutEffect(() => {
    if (!ref || typeof ref === 'function') return;
    
    ref.current = {
      triggerRegeneration: () => {
        console.log('[Container] External trigger: Regeneration requested');
        
        // ✅ FASE 2: Validação robusta com helper
        const validation = validateStructuredMaterial(currentMaterial);
        logMaterialState('Container', currentMaterial, null);
        
        console.log('[Container] Material validation:', validation);
        
        if (isGenerating) {
          console.warn('[Container] Already generating, ignoring trigger');
          return;
        }
        
        if (!lectureId || !lectureTitle) {
          console.error('[Container] Missing required data');
          return;
        }
        
        // Decisão baseada em validação robusta
        if (validation.isValid) {
          console.log(`[Container] Valid material (${validation.wordCount} words), opening modal`);
          setShowConfirmModal(true);
        } else {
          console.log(`[Container] Invalid material (${validation.reason}), generating directly`);
          handleGenerate();
        }
      }
    };
  }, [currentMaterial, isGenerating, lectureId, lectureTitle, handleGenerate, ref]);

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
