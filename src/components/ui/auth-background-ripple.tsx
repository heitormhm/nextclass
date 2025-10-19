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
      numCells={18}           // More cells for continuous subtle activity
      maxOpacity={0.12}       // Reduced opacity for ultra-subtle transitions
      minOpacity={0.02}       // Almost invisible minimum
      gridOpacity={0.18}      // Grid visible but subtle
      appearDuration={80000}  // 80 seconds to appear (100x slower)
      activeDuration={120000} // 120 seconds stable (100x slower)
      fadeDuration={80000}    // 80 seconds to fade (100x slower)
    />
  );
};

export default AuthBackgroundRipple;
