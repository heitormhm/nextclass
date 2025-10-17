import React, { ReactNode } from 'react';
import { BackgroundRippleEffect } from '@/components/ui/background-ripple-effect';

interface TeacherLayoutWrapperProps {
  children: ReactNode;
  className?: string;
}

export const TeacherLayoutWrapper = ({ children, className = '' }: TeacherLayoutWrapperProps) => {
  return (
    <div className={`min-h-screen relative overflow-hidden bg-gradient-to-br from-purple-100 via-purple-50 to-white ${className}`}>
      {/* Animated Background with Ripple Effect */}
      <BackgroundRippleEffect className="opacity-20" />
      
      {/* Gradient Blobs for Depth - Roxo/Violeta Theme */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-gradient-to-br from-purple-200/40 to-purple-300/30 rounded-full blur-3xl" />
        <div className="absolute top-2/3 -right-32 w-80 h-80 bg-gradient-to-br from-pink-200/30 to-purple-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-gradient-to-br from-violet-200/35 to-purple-300/25 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
