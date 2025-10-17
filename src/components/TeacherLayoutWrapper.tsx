import React, { ReactNode } from 'react';

interface TeacherLayoutWrapperProps {
  children: ReactNode;
  className?: string;
}

export const TeacherLayoutWrapper = ({ children, className = '' }: TeacherLayoutWrapperProps) => {
  return (
    <div className={`relative bg-gradient-to-br from-purple-400 via-purple-300 to-pink-200 h-full ${className}`}>
      {/* Content */}
      <div className="relative z-10 h-full">
        {children}
      </div>
    </div>
  );
};
