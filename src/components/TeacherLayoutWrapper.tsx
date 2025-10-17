import React, { ReactNode } from 'react';
import { BackgroundRippleEffect } from '@/components/ui/background-ripple-effect';

interface TeacherLayoutWrapperProps {
  children: ReactNode;
  className?: string;
}

export const TeacherLayoutWrapper = ({ children, className = '' }: TeacherLayoutWrapperProps) => {
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-purple-300 via-purple-200 to-purple-50 h-full ${className}`}>
      {/* Animated Background with Ripple Effect */}
      <BackgroundRippleEffect className="opacity-40 z-[0]" />
      
      {/* Gradient Blobs for Depth - Roxo/Violeta Theme */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-[0]">
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-gradient-to-br from-purple-300/60 to-purple-400/50 rounded-full blur-3xl" />
        <div className="absolute top-2/3 -right-32 w-80 h-80 bg-gradient-to-br from-pink-300/50 to-purple-300/50 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-gradient-to-br from-violet-300/55 to-purple-400/45 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-20">
        {children}
      </div>
    </div>
  );
};
