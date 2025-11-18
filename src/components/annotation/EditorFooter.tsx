/**
 * EditorFooter - Save and action buttons
 * Responsive footer for mobile and desktop
 */

import React from 'react';
import { Save, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface EditorFooterProps {
  onSave: () => void;
  onSaveAndExit: () => void;
  onExportPDF: () => void;
  isSaving: boolean;
}

export const EditorFooter: React.FC<EditorFooterProps> = ({
  onSave,
  onSaveAndExit,
  onExportPDF,
  isSaving,
}) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-xl border-t shadow-2xl pb-safe">
        <div className="flex gap-2 p-3">
          <Button
            onClick={onExportPDF}
            variant="outline"
            className="flex-1 h-12"
          >
            <FileDown className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button
            onClick={onSaveAndExit}
            disabled={isSaving}
            className="flex-1 h-12 bg-gradient-to-r from-blue-500 to-purple-600 text-white"
          >
            {isSaving ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-2 pt-4 border-t">
      <Button
        onClick={onExportPDF}
        variant="outline"
        className="h-10"
      >
        <FileDown className="h-4 w-4 mr-2" />
        Exportar PDF
      </Button>
      <Button
        onClick={onSave}
        disabled={isSaving}
        variant="outline"
        className="h-10"
      >
        {isSaving ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        ) : (
          <>
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </>
        )}
      </Button>
      <Button
        onClick={onSaveAndExit}
        disabled={isSaving}
        className="h-10 bg-gradient-to-r from-blue-500 to-purple-600"
      >
        Salvar e Sair
      </Button>
    </div>
  );
};
