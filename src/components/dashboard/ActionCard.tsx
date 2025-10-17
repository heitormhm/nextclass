import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ActionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  gradientFrom: string;
  gradientTo: string;
  onClick: () => void;
  badge?: string;
  index?: number;
}

export const ActionCard = ({
  icon: Icon,
  title,
  description,
  gradientFrom,
  gradientTo,
  onClick,
  badge,
  index = 0,
}: ActionCardProps) => {
  return (
    <Card
      onClick={onClick}
      className={cn(
        "relative group cursor-pointer overflow-hidden border-0 shadow-lg transition-all duration-300",
        "hover:scale-105 hover:shadow-2xl animate-fade-in",
        `bg-gradient-to-br ${gradientFrom} ${gradientTo}`
      )}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative p-6 flex flex-col items-center text-center space-y-3">
        <div className="relative">
          <div className="absolute inset-0 bg-white/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-300" />
          <div className="relative bg-white/20 backdrop-blur-sm p-4 rounded-2xl group-hover:bg-white/30 transition-all duration-300">
            <Icon className="h-8 w-8 text-white" strokeWidth={2.5} />
          </div>
        </div>
        
        <div className="space-y-1">
          <h3 className="font-bold text-white text-lg leading-tight">{title}</h3>
          <p className="text-white/80 text-sm leading-snug">{description}</p>
        </div>
        
        {badge && (
          <Badge className="absolute top-3 right-3 bg-white/20 backdrop-blur-md text-white border-white/30 text-xs font-semibold px-2 py-0.5 shadow-lg">
            {badge}
          </Badge>
        )}
      </div>
    </Card>
  );
};
