import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Eye, Share2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface AnnotationCardProps {
  id: string;
  title: string;
  source: string;
  createdAt?: string;
  preview?: string;
  onDelete: (id: string) => void;
  onShare: (id: string) => void;
}

const AnnotationCard = ({ id, title, source, createdAt, preview, onDelete, onShare }: AnnotationCardProps) => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  const handleOpen = () => {
    navigate(`/annotation/${id}`);
  };

  const handleDelete = () => {
    onDelete(id);
  };

  const handleShare = () => {
    onShare(id);
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'Workshop Prático':
        return 'bg-blue-500/10 text-blue-700 border-blue-200';
      case 'Curso Online':
        return 'bg-green-500/10 text-green-700 border-green-200';
      case 'Estudo de Caso':
        return 'bg-purple-500/10 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `Atualizado em ${date.toLocaleDateString('pt-BR')}`;
  };

  return (
    <Card 
      className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/50 cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleOpen}
    >
      <CardContent className="p-5">
        {/* Source Badge at top */}
        <div className="flex justify-between items-start mb-3">
          <Badge 
            variant="outline" 
            className={`text-xs px-2 py-1 border ${getSourceColor(source)}`}
          >
            {source}
          </Badge>
          
          {/* Action Buttons - Appear on hover */}
          <div 
            className={`flex gap-1 transition-all duration-300 ${
              isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              size="sm"
              variant="ghost"
              onClick={handleOpen}
              className="h-7 w-7 p-0 hover:bg-primary hover:text-primary-foreground"
            >
              <Eye className="h-3 w-3" />
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={handleShare}
              className="h-7 w-7 p-0 hover:bg-secondary hover:text-secondary-foreground"
            >
              <Share2 className="h-3 w-3" />
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir anotação</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir "{title}"? Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Title and Icon */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-foreground leading-tight line-clamp-2 mb-2">
              {title}
            </h3>
            
            {/* Content Preview */}
            {preview && (
              <p className="text-sm text-foreground-muted leading-relaxed line-clamp-2 mb-3">
                {preview}
              </p>
            )}
            
            {/* Last Modified Date */}
            {createdAt && (
              <p className="text-xs text-foreground-muted font-medium">
                {formatDate(createdAt)}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AnnotationCard;