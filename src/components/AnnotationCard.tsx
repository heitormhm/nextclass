import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Eye, ExternalLink, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AnnotationCardProps {
  id: string;
  title: string;
  course: string;
  lectureId: string;
  lectureTitle: string;
  timestamp: string;
  tags: string[];
  createdAt: string;
  preview: string;
}

const AnnotationCard = ({ 
  id, 
  title, 
  course, 
  lectureId, 
  lectureTitle, 
  timestamp, 
  tags, 
  createdAt, 
  preview 
}: AnnotationCardProps) => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  const handleOpen = () => {
    navigate(`/annotation/${id}`);
  };

  const handleSourceClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Navigate to lecture page with timestamp query parameter
    navigate(`/lecture/${lectureId}?timestamp=${timestamp}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  return (
    <Card 
      className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/50 cursor-pointer bg-white/60 backdrop-blur-xl border-0"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleOpen}
    >
      <CardContent className="p-5">
        {/* Course Badge */}
        <div className="flex justify-between items-start mb-3">
          <Badge 
            variant="secondary" 
            className="text-xs px-2 py-1"
          >
            {course}
          </Badge>
          
          {/* View Button - Appears on hover */}
          <div 
            className={`transition-all duration-300 ${
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
            <p className="text-sm text-foreground-muted leading-relaxed line-clamp-2 mb-3">
              {preview}
            </p>
          </div>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {tags.map(tag => (
              <Badge 
                key={tag} 
                variant="outline" 
                className="text-xs px-2 py-0.5 bg-background/50"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Footer with back-link and date */}
        <div className="flex items-center justify-between pt-3 border-t">
          <button
            onClick={handleSourceClick}
            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors group/link"
          >
            <Clock className="h-3 w-3" />
            <span className="font-medium">Fonte: {lectureTitle}</span>
            <span className="text-foreground-muted">• {timestamp}</span>
            <ExternalLink className="h-3 w-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
          </button>
          
          <p className="text-xs text-foreground-muted">
            {formatDate(createdAt)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AnnotationCard;
