import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Save, Upload, Loader2, Sparkles } from 'lucide-react';

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
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <CardTitle className="text-lg">Centro de Publicação Inteligente</CardTitle>
            <CardDescription className="text-xs">
              Gerencie e publique sua aula
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Button
            onClick={handleSave}
            disabled={!hasUnsavedChanges || isSaving}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            size="lg"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-5 w-5" />
                Salvar Progresso
              </>
            )}
          </Button>
          
          <Button 
            onClick={onPublish} 
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            size="lg"
          >
            <Upload className="mr-2 h-5 w-5" />
            Publicar Aula
          </Button>

          {hasUnsavedChanges && !isSaving && (
            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded-md border border-amber-200">
              <span className="font-semibold">⚠️</span>
              <span>Alterações não salvas</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
