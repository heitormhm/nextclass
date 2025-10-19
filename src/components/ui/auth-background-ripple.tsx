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
      cellSize={60}           // Larger cells for ultra-smooth effect
      numCells={6}            // Fewer cells (half) for imperceptible changes
      maxOpacity={0.15}       // Much lower opacity
      minOpacity={0.03}       // Almost invisible minimum
      gridOpacity={0.08}      // Ultra-soft grid
      appearDuration={8000}   // 8 seconds to appear (mega slow)
      activeDuration={12000}  // 12 seconds stable (ultra long)
      fadeDuration={8000}     // 8 seconds to fade (mega slow)
    />
  );
};

export default AuthBackgroundRipple;
