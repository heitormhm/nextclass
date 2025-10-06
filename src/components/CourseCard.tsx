import { Play, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface Course {
  id: number | string;
  lessonNumber: string;
  title: string;
  instructor: string;
  duration: string;
  progress: number;
  thumbnail: string;
  topic: string;
  type: string;
}

interface CourseCardProps {
  course: Course;
  type?: 'lesson' | 'lecture';
}

const CourseCard = ({ course, type = 'lesson' }: CourseCardProps) => {
  // Navigate to course page
  const navigationPath = `/course/${course.id}`;
  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-success';
    if (progress >= 50) return 'bg-primary';
    if (progress >= 20) return 'bg-warning';
    return 'bg-foreground-muted';
  };

  const getProgressBgColor = (progress: number) => {
    if (progress >= 80) return 'bg-success/10';
    if (progress >= 50) return 'bg-primary/10';
    if (progress >= 20) return 'bg-warning/10';
    return 'bg-foreground-muted/10';
  };

  return (
    <Link to={navigationPath} className="block no-underline">
      <Card className="group hover:shadow-lg transition-all duration-300 border-0 shadow-sm overflow-hidden bg-white/60 backdrop-blur-xl h-auto min-h-[400px] flex flex-col">
        {/* Thumbnail Section */}
        <div className="relative aspect-video overflow-hidden flex-shrink-0">
          {/* Background Image */}
          {course.thumbnail ? (
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${course.thumbnail})` }}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
          )}
          
          {/* Semi-transparent overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/10" />
          
          {/* Duration Badge */}
          <Badge 
            variant="secondary" 
            className="absolute top-3 right-3 bg-black/80 text-white border-0 backdrop-blur-sm z-10"
          >
            <Clock className="h-3 w-3 mr-1" />
            {course.duration}
          </Badge>

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
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 z-5" />
        </div>

        {/* Card Content */}
        <CardContent className="p-5 flex-1 flex flex-col">
          {/* Lesson Number */}
          <Badge variant="outline" className="mb-3 text-xs font-medium w-fit">
            {course.lessonNumber}
          </Badge>

          {/* Title and Instructor */}
          <div className="mb-4 flex-1">
            <h3 className="font-bold text-lg leading-tight mb-2 group-hover:text-primary transition-colors break-words">
              {course.title}
            </h3>
            <p className="text-foreground-muted text-sm break-words">
              {course.instructor}
            </p>
          </div>

          {/* Progress Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground-muted">Progresso</span>
              <span className="font-semibold">{course.progress}% Completo</span>
            </div>
            
            {/* Custom Progress Bar */}
            <div className={`w-full h-2 rounded-full overflow-hidden ${getProgressBgColor(course.progress)}`}>
              <div 
                className={`h-full rounded-full transition-all duration-500 ${getProgressColor(course.progress)}`}
                style={{ width: `${course.progress}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default CourseCard;