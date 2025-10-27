import React from 'react';
import { Download, FileText, Video, Headphones, Image } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface LibraryMaterial {
  id: string;
  title: string;
  description: string;
  type: 'PDF' | 'Vídeo' | 'Áudio' | 'Imagem';
  category: string;
  teacher: string;
  file_url?: string;
  tags?: string[];
}

interface LibraryCardProps {
  material: LibraryMaterial;
}

const LibraryCard: React.FC<LibraryCardProps> = ({ material }) => {
  // Get icon based on material type
  const getTypeIcon = () => {
    switch (material.type) {
      case 'PDF':
        return <FileText className="w-8 h-8" />;
      case 'Vídeo':
        return <Video className="w-8 h-8" />;
      case 'Áudio':
        return <Headphones className="w-8 h-8" />;
      case 'Imagem':
        return <Image className="w-8 h-8" />;
      default:
        return <FileText className="w-8 h-8" />;
    }
  };

  // Get badge color based on material type
  const getTypeColor = () => {
    switch (material.type) {
      case 'PDF':
        return 'bg-destructive text-destructive-foreground'; // Red for PDFs
      case 'Vídeo':
        return 'bg-primary text-primary-foreground'; // Pink for Videos
      case 'Áudio':
        return 'bg-success text-success-foreground'; // Green for Audio
      case 'Imagem':
        return 'bg-warning text-warning-foreground'; // Orange for Images
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const handleDownload = async () => {
    if (!material.file_url) {
      console.error('No file URL available');
      return;
    }
    
    try {
      const response = await fetch(material.file_url);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const filename = material.file_url.split('/').pop() || 
                      `${material.title.replace(/[^a-z0-9]/gi, '_')}.pdf`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log(`Downloaded: ${material.title}`);
    } catch (error) {
      console.error('Download error:', error);
      window.open(material.file_url, '_blank');
    }
  };

  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 bg-card border-border">
      <CardContent className="p-6">
        {/* Type Badge */}
        <div className="absolute top-4 left-4">
          <Badge className={`text-xs font-medium ${getTypeColor()}`}>
            {material.type}
          </Badge>
        </div>

        {/* Main Content Area */}
        <div className="flex flex-col items-center text-center mb-4 mt-8">
          {/* Large Document Icon */}
          <div className="mb-4 p-6 rounded-full bg-accent text-accent-foreground group-hover:bg-primary-glow group-hover:text-primary transition-colors duration-300">
            {getTypeIcon()}
          </div>

          {/* Title */}
          <h3 className="font-semibold text-foreground mb-2 line-clamp-2 leading-tight">
            {material.title}
          </h3>

          {/* Description */}
          <p className="text-sm text-foreground-muted line-clamp-2 mb-3">
            {material.description}
          </p>

          {/* Category and Teacher */}
          <div className="flex flex-col gap-1 text-xs text-foreground-light">
            <span className="font-medium">{material.category}</span>
            <span>{material.teacher}</span>
          </div>
        </div>

        {/* Tags Display */}
        {material.tags && material.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3 pb-3 border-b border-border/50">
            {material.tags.slice(0, 3).map((tag, index) => (
              <Badge 
                key={index}
                variant="outline"
                className="text-[10px] px-1.5 py-0.5"
              >
                {tag}
              </Badge>
            ))}
            {material.tags.length > 3 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                +{material.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Download Button */}
        <div className="mt-auto">
          <Button 
            onClick={handleDownload}
            className="w-full bg-primary hover:bg-primary-light text-primary-foreground transition-colors duration-300"
            size="sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default LibraryCard;