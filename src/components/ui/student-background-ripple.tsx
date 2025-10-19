import React from 'react';
import { BackgroundRippleEffect } from './background-ripple-effect';

interface StudentBackgroundRippleProps {
  className?: string;
}

// Student colors: vibrant pink/purple for energetic engagement
const STUDENT_COLORS = [
  '236, 72, 153',   // pink-500
  '219, 39, 119',   // pink-600
  '168, 85, 247',   // purple-500
  '147, 51, 234',   // purple-600
  '217, 70, 239',   // fuchsia-500
];

export const StudentBackgroundRipple: React.FC<StudentBackgroundRippleProps> = ({ className }) => {
  return (
    <BackgroundRippleEffect 
      className={className}
      colorPalette={STUDENT_COLORS}
      maxOpacity={0.5}  // More vibrant for engagement
      minOpacity={0.1}  // Higher minimum for visibility
    />
  );
};

export default StudentBackgroundRipple;
