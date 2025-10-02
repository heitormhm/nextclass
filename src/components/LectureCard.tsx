import { Play, Clock, BookOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface LectureCardProps {
  id: string;
  title: string;
  courseName: string;
  thumbnail: string;
  professor?: string;
  duration?: string;
  date?: string;
}

const LectureCard = ({ id, title, courseName, thumbnail, professor, duration, date }: LectureCardProps) => {
  return (
    <Link to={`/lecture/${id}`} className="block no-underline">
      <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-sm overflow-hidden bg-white/20 backdrop-blur-xl">
        {/* Thumbnail Section */}
        <div className="relative aspect-video overflow-hidden">
          {/* Background Image */}
          <div 
            className="absolute inset-0 bg-cover bg-center transform group-hover:scale-105 transition-transform duration-500"
            style={{ backgroundImage: `url(${thumbnail})` }}
          />
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          
          {/* Duration Badge */}
          {duration && (
            <Badge 
              variant="secondary" 
              className="absolute top-3 right-3 bg-black/80 text-white border-0 backdrop-blur-sm z-10"
            >
              <Clock className="h-3 w-3 mr-1" />
              {duration}
            </Badge>
          )}

          {/* Play Button Overlay */}
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <Button
              size="lg"
              className="w-16 h-16 rounded-full bg-primary/90 hover:bg-primary backdrop-blur-sm shadow-lg group-hover:scale-110 transition-all duration-300"
            >
              <Play className="h-7 w-7 text-white ml-1" fill="currentColor" />
            </Button>
          </div>

          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-all duration-300" />
        </div>

        {/* Card Content */}
        <CardContent className="p-5 space-y-3">
          {/* Course Name Badge */}
          <Badge variant="outline" className="text-xs font-medium border-primary/30">
            <BookOpen className="h-3 w-3 mr-1" />
            {courseName}
          </Badge>

          {/* Title */}
          <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors line-clamp-2">
            {title}
          </h3>

          {/* Professor and Date */}
          <div className="flex items-center justify-between text-sm text-foreground-muted">
            {professor && <span>{professor}</span>}
            {date && <span>{date}</span>}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default LectureCard;
