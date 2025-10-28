import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Sparkles, BookOpen } from 'lucide-react';
import { ThumbnailDisplay } from './ThumbnailDisplay';

interface LectureHeaderCardProps {
  title: string;
  onTitleChange: (title: string) => void;
  thumbnailUrl?: string | null;
  isGeneratingThumbnail: boolean;
  onRegenerateThumbnail: () => void;
  onUploadThumbnail: (file: File) => void;
  createdAt?: string;
  duration?: number;
}

export const LectureHeaderCard: React.FC<LectureHeaderCardProps> = ({
  title,
  onTitleChange,
  thumbnailUrl,
  isGeneratingThumbnail,
  onRegenerateThumbnail,
  onUploadThumbnail,
  createdAt,
  duration
}) => {
  return (
    <Card className="backdrop-blur-sm bg-white/95 shadow-xl border-white/20">
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
          {/* Left: Title and Metadata */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-white drop-shadow-lg">
              <Sparkles className="h-5 w-5 animate-pulse" />
              <span className="text-sm font-medium">Material Didático Gerado por IA</span>
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="h-5 w-5 text-purple-600" />
                <h3 className="text-lg font-bold text-slate-900">Título da Aula</h3>
              </div>
              <Input
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                className="bg-white border-slate-300 text-slate-900 text-lg font-semibold"
                placeholder="Digite o título da aula"
              />
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {createdAt && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(createdAt).toLocaleDateString('pt-BR')}</span>
                </div>
              )}
              {duration && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{Math.round(duration / 60)} min</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Right: Thumbnail */}
          <div>
            <ThumbnailDisplay 
              url={thumbnailUrl} 
              isGenerating={isGeneratingThumbnail}
              onRegenerate={onRegenerateThumbnail}
              onUpload={onUploadThumbnail}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
