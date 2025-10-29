/**
 * MaterialViewer Component
 * Displays generated markdown content with rich rendering
 */

import React, { useState } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MaterialGenerationLoading } from '@/features/material-didatico-generation/components/MaterialGenerationLoading';
import { TwoPhaseRenderer } from './TwoPhaseRenderer';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface MaterialViewerProps {
  markdownContent?: string;
  isGenerating?: boolean;
  progress?: number;
  progressMessage?: string;
  onRegenerate?: () => Promise<void>;
  showRegenerateButton?: boolean;
}

export const MaterialViewer: React.FC<MaterialViewerProps> = ({
  markdownContent,
  isGenerating = false,
  progress = 0,
  progressMessage = 'Processando...',
  onRegenerate,
  showRegenerateButton = true
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Validate markdown content
  const validateContent = (markdown: string | undefined) => {
    if (!markdown) return { isValid: false, reason: 'empty' };
    
    const stripped = markdown
      .replace(/[#*`>\[\]()]/g, '')
      .replace(/\$\$.*?\$\$/g, '')
      .replace(/\$.*?\$/g, '')
      .trim();

    const wordCount = stripped.split(/\s+/).filter(w => w.length > 2).length;

    if (wordCount < 20) {
      return { isValid: false, reason: 'too-short', wordCount };
    }

    return { isValid: true, reason: 'valid', wordCount };
  };

  const validation = validateContent(markdownContent);

  // Loading state
  if (isGenerating) {
    return (
      <MaterialGenerationLoading
        currentStep={1}
        progress={progress}
        progressMessage={progressMessage}
      />
    );
  }

  // Empty state
  if (!validation.isValid) {
    return (
      <div className="text-center py-12 space-y-4">
        <AlertCircle className="h-12 w-12 text-orange-500 mx-auto" />
        <div>
          <p className="text-muted-foreground font-medium">
            {validation.reason === 'empty' 
              ? 'Nenhum material didático disponível'
              : '⚠️ Material didático está vazio'
            }
          </p>
          {validation.reason === 'too-short' && (
            <p className="text-sm text-muted-foreground mt-2">
              Conteúdo muito curto ({validation.wordCount} palavras). Tente regenerar.
            </p>
          )}
          {onRegenerate && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRegenerate()}
              className="mt-4"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {validation.reason === 'empty' ? 'Gerar Material' : 'Regenerar Material'}
            </Button>
          )}
        </div>
      </div>
    );
  }

  const handleRegenerateClick = () => {
    if (onRegenerate) {
      setShowConfirmModal(true);
    }
  };

  const handleConfirmRegenerate = async () => {
    setShowConfirmModal(false);
    if (onRegenerate) {
      await onRegenerate();
    }
  };

  return (
    <>
      {showRegenerateButton && onRegenerate && (
        <div className="sticky top-0 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b p-4 mb-4 flex justify-between items-center rounded-t-lg">
          {validation.wordCount < 100 && (
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>Conteúdo pode estar incompleto</span>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerateClick}
            className="gap-2 ml-auto shadow-sm"
          >
            <RotateCcw className="h-4 w-4" />
            Regenerar Material
          </Button>
        </div>
      )}
      
      <div className="space-y-4">
        {/* ✅ PHASE 2: Two-phase rendering (text first, then Mermaid) */}
        <TwoPhaseRenderer markdown={markdownContent!} />
      </div>

      <AlertDialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerar Material Didático?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação substituirá o material atual por um novo. 
              O conteúdo anterior será perdido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRegenerate}>
              Sim, Substituir Material
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
