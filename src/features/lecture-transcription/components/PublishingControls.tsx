import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Save, Upload, Loader2 } from 'lucide-react';

interface PublishingControlsProps {
  onSave: () => Promise<boolean>;
  onPublish: () => void;
  hasUnsavedChanges: boolean;
  isSaving?: boolean;
}

export const PublishingControls: React.FC<PublishingControlsProps> = ({
  onSave,
  onPublish,
  hasUnsavedChanges,
  isSaving = false,
}) => {
  const handleSave = async () => {
    await onSave();
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-3">
          <Button
            onClick={handleSave}
            disabled={!hasUnsavedChanges || isSaving}
            className="w-full"
            variant="outline"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Progresso
              </>
            )}
          </Button>
          
          <Button onClick={onPublish} className="w-full">
            <Upload className="mr-2 h-4 w-4" />
            Publicar Aula
          </Button>

          {hasUnsavedChanges && !isSaving && (
            <p className="text-xs text-amber-500 text-center">
              ⚠️ Alterações não salvas
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
