import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: LucideIcon;
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
  gradientFrom: string;
  gradientTo: string;
  iconColor: string;
  index?: number;
}

export const StatCard = ({
  icon: Icon,
  title,
  value,
  subtitle,
  trend,
  gradientFrom,
  gradientTo,
  iconColor,
  index = 0,
}: StatCardProps) => {
  const getTrendIcon = () => {
    if (!trend) return null;
    
    switch (trend.direction) {
      case 'up':
        return <TrendingUp className="h-3 w-3" />;
      case 'down':
        return <TrendingDown className="h-3 w-3" />;
      default:
        return <Minus className="h-3 w-3" />;
    }
  };

  const getTrendColor = () => {
    if (!trend) return 'bg-gray-100/80 text-gray-600 border-gray-200 hover:bg-gray-100';
    
    switch (trend.direction) {
      case 'up':
        return 'bg-green-100/80 text-green-700 border-green-200 hover:bg-green-100';
      case 'down':
        return 'bg-red-100/80 text-red-700 border-red-200 hover:bg-red-100';
      default:
        return 'bg-gray-100/80 text-gray-600 border-gray-200 hover:bg-gray-100';
    }
  };

  return (
    <Card
      className={cn(
        "relative overflow-hidden border-0 shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl animate-fade-in",
        "bg-white/75 backdrop-blur-xl"
      )}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className={cn("absolute inset-0 opacity-10", `bg-gradient-to-br ${gradientFrom} ${gradientTo}`)} />
      
      <CardContent className="relative p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={cn("p-3 rounded-xl shadow-lg", `bg-gradient-to-br ${gradientFrom} ${gradientTo}`)}>
            <Icon className="h-6 w-6 text-white" strokeWidth={2.5} />
          </div>
          
          {trend && (
            <Badge className={cn(
              "flex items-center gap-1.5 border shadow-sm px-2.5 py-1 transition-all duration-200",
              "hover:shadow-md hover:scale-105",
              getTrendColor()
            )}>
              {getTrendIcon()}
              <span className="text-sm font-bold">{trend.value > 0 ? '+' : ''}{trend.value}%</span>
            </Badge>
          )}
        </div>
        
        <div className="space-y-1">
          <p className="text-4xl font-bold text-gray-900">{value}</p>
          <p className="text-sm font-medium text-gray-700">{title}</p>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
};
