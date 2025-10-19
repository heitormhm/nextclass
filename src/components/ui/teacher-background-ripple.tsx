import React from 'react';
import { BackgroundRippleEffect } from './background-ripple-effect';

interface TeacherBackgroundRippleProps {
  className?: string;
}

// Teacher colors: deep purple/indigo with blue-violet tones
const TEACHER_COLORS = [
  '99, 102, 241',   // indigo-500
  '129, 140, 248',  // indigo-400
  '67, 56, 202',    // indigo-700
  '79, 70, 229',    // indigo-600
  '109, 40, 217',   // violet-600
];

export const TeacherBackgroundRipple: React.FC<TeacherBackgroundRippleProps> = ({ className }) => {
  return (
    <BackgroundRippleEffect 
      className={className}
      colorPalette={TEACHER_COLORS}
      gridOpacity={0.15} // More visible grid for professionalism
    />
  );
};

export default TeacherBackgroundRipple;
