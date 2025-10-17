import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MiniStatCardProps {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'green' | 'blue' | 'orange' | 'purple';
  onClick?: () => void;
}

export const MiniStatCard = ({
  label,
  value,
  trend = 'neutral',
  color = 'blue',
  onClick,
}: MiniStatCardProps) => {
  const getColorClasses = () => {
    switch (color) {
      case 'green':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'orange':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'purple':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getTrendIcon = () => {
    if (trend === 'up') {
      return <TrendingUp className="h-3 w-3 text-green-500" />;
    }
    if (trend === 'down') {
      return <TrendingDown className="h-3 w-3 text-red-500" />;
    }
    return null;
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex justify-between items-center p-3 rounded-lg border transition-all duration-200",
        "bg-white/60 backdrop-blur-sm hover:bg-white/80 hover:shadow-md",
        onClick && "cursor-pointer hover:scale-102"
      )}
    >
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div className="flex items-center gap-2">
        {getTrendIcon()}
        <span className={cn("text-lg font-bold px-2.5 py-1 rounded-md", getColorClasses())}>
          {value}
        </span>
      </div>
    </div>
  );
};
