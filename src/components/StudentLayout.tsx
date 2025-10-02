import React from 'react';
import { BackgroundRippleEffect } from '@/components/ui/background-ripple-effect';

interface StudentLayoutProps {
  children: React.ReactNode;
}

export const StudentLayout: React.FC<StudentLayoutProps> = ({ children }) => {
  return (
    <div className="relative min-h-screen bg-slate-50">
      {/* Gradient Blobs */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-br from-pink-300 to-purple-300 rounded-full filter blur-3xl opacity-50" />
      <div className="absolute bottom-40 right-20 w-80 h-80 bg-gradient-to-br from-purple-300 to-pink-300 rounded-full filter blur-3xl opacity-50" />
      <div className="absolute top-1/2 left-1/3 w-72 h-72 bg-gradient-to-br from-pink-400 to-purple-400 rounded-full filter blur-3xl opacity-40" />
      
      {/* Background Ripple Effect */}
      <BackgroundRippleEffect />
      
      {/* Main Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
