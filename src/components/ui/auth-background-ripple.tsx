import React from 'react';
import { BackgroundRippleEffect } from './background-ripple-effect';

interface AuthBackgroundRippleProps {
  className?: string;
}

// Auth colors: soft pink/purple pastels for welcoming feel
const AUTH_COLORS = [
  '244, 114, 182',  // pink-400
  '236, 72, 153',   // pink-500
  '232, 121, 249',  // fuchsia-400
  '217, 70, 239',   // fuchsia-500
  '192, 132, 252',  // purple-400
];

export const AuthBackgroundRipple: React.FC<AuthBackgroundRippleProps> = ({ className }) => {
  return (
    <BackgroundRippleEffect 
      className={className}
      colorPalette={AUTH_COLORS}
      cellSize={50}     // Larger cells for cleaner look
      numCells={12}     // Fewer cells for login screen
      maxOpacity={0.4}  // Slightly softer
    />
  );
};

export default AuthBackgroundRipple;
