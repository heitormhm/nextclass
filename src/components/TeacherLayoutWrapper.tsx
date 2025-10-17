import React, { ReactNode } from 'react';

interface TeacherLayoutWrapperProps {
  children: ReactNode;
  className?: string;
}

export const TeacherLayoutWrapper = ({ children, className = '' }: TeacherLayoutWrapperProps) => {
  return (
    <div className={`relative bg-gradient-to-br from-purple-300 via-purple-200 to-purple-50 h-full ${className}`}>
      {/* Content */}
      <div className="relative z-10 h-full">
        {children}
      </div>
    </div>
  );
};
