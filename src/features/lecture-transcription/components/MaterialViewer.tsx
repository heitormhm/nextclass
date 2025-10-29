/**
 * PHASE 3: New Material Viewer Component
 * Simple, self-contained HTML viewer with regeneration
 */

import React, { useState } from 'react';
import DOMPurify from 'dompurify';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MaterialGenerationLoading } from '@/features/material-didatico-generation/components/MaterialGenerationLoading';
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
  htmlContent?: string;
  isGenerating?: boolean;
  progress?: number;
  progressMessage?: string;
  onRegenerate?: () => Promise<void>;
  showRegenerateButton?: boolean;
}

export const MaterialViewer: React.FC<MaterialViewerProps> = ({
  htmlContent,
  isGenerating = false,
  progress = 0,
  progressMessage = 'Processando...',
  onRegenerate,
  showRegenerateButton = true
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Validate HTML content
  const validateContent = (html: string | undefined) => {
    if (!html) return { isValid: false, reason: 'empty' };
    
    const stripped = html
      .replace(/<[^>]*>/g, '')
      .replace(/&[a-z]+;/gi, '')
      .replace(/&#\d+;/g, '')
      .trim();

    const wordCount = stripped.split(/\s+/).filter(w => w.length > 2).length;

    if (wordCount < 5) {
      return { isValid: false, reason: 'too-short', wordCount };
    }

    return { isValid: true, reason: 'valid', wordCount };
  };

  const validation = validateContent(htmlContent);

  // Loading state
  if (isGenerating) {
    return (
      <MaterialGenerationLoading
        currentStep={progress}
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

  // Sanitize HTML
  const sanitizedHTML = DOMPurify.sanitize(htmlContent!, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'a', 'code', 'pre', 'blockquote', 'div', 'span',
      'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'id', 'src', 'alt', 'style']
  });

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
      <div className="space-y-4">
        {showRegenerateButton && onRegenerate && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerateClick}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Regenerar Material
            </Button>
          </div>
        )}
        
        <div
          className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-li:text-foreground prose-a:text-primary hover:prose-a:text-primary/80"
          dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
        />
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
