import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EventCardProps {
  date: string;
  title: string;
  time: string;
  type?: 'lecture' | 'deadline' | 'lab' | 'meeting';
  priority?: 'urgent' | 'normal' | 'low';
  index?: number;
}

export const EventCard = ({
  date,
  title,
  time,
  type = 'lecture',
  priority = 'normal',
  index = 0,
}: EventCardProps) => {
  const getTypeColor = () => {
    switch (type) {
      case 'deadline':
        return 'from-red-500/10 to-pink-500/10 border-red-200/50';
      case 'lab':
        return 'from-green-500/10 to-emerald-500/10 border-green-200/50';
      case 'meeting':
        return 'from-orange-500/10 to-amber-500/10 border-orange-200/50';
      default:
        return 'from-blue-500/10 to-purple-500/10 border-blue-200/50';
    }
  };

  const getTypeBadgeColor = () => {
    switch (type) {
      case 'deadline':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'lab':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'meeting':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      default:
        return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const getPriorityBadge = () => {
    if (priority === 'urgent') {
      return (
        <Badge className="bg-red-500 text-white border-0 text-xs font-semibold px-2 py-0.5 shadow-md">
          Urgente
        </Badge>
      );
    }
    return null;
  };

  return (
    <div
      className={cn(
        "group relative p-4 rounded-xl backdrop-blur-md border transition-all duration-300 hover:scale-102 hover:shadow-lg animate-fade-in",
        `bg-gradient-to-br ${getTypeColor()}`
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex gap-3">
        <div className="flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm rounded-lg p-2.5 min-w-[56px] shadow-sm">
          <span className={cn("text-xs font-semibold", type === 'deadline' ? 'text-red-600' : 'text-purple-600')}>
            {date.split(' ')[0]}
          </span>
          <span className="text-xl font-bold text-gray-900">
            {date.split(' ')[1]}
          </span>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2">{title}</p>
            {getPriorityBadge()}
          </div>
          
          <div className="flex items-center gap-3 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{time}</span>
            </div>
            <Badge className={cn("border shadow-sm", getTypeBadgeColor())}>
              {type === 'deadline' && '📝 Entrega'}
              {type === 'lab' && '🔬 Lab'}
              {type === 'meeting' && '💼 Reunião'}
              {type === 'lecture' && '📚 Aula'}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
};
