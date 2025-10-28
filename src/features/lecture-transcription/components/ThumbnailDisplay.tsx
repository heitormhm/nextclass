import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ImageIcon, Loader2, Upload } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface ThumbnailDisplayProps {
  url: string | null;
  isGenerating: boolean;
  onRegenerate?: () => void;
  onUpload?: (file: File) => void;
}

export const ThumbnailDisplay: React.FC<ThumbnailDisplayProps> = ({
  url,
  isGenerating,
  onRegenerate,
  onUpload,
}) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUpload) {
      onUpload(file);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-primary" />
          <CardTitle>Thumbnail</CardTitle>
        </div>
        <CardDescription>
          Imagem de capa da aula
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {url ? (
            <img
              src={url}
              alt="Thumbnail da aula"
              className="w-full h-48 object-cover rounded-lg"
            />
          ) : (
            <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
              {isGenerating ? (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              ) : (
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
          )}
          
          <div className="flex gap-2">
            {onRegenerate && (
              <Button
                onClick={onRegenerate}
                disabled={isGenerating}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Regenerar
                  </>
                )}
              </Button>
            )}
            
            {onUpload && (
              <Button variant="outline" size="sm" className="flex-1" asChild>
                <label className="cursor-pointer">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
