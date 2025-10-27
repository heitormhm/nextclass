import React, { useEffect, useRef } from 'react';

interface StudentBackgroundGridProps {
  className?: string;
}

// Student colors: pastel tones for soft, motivational atmosphere
const STUDENT_GRID_COLORS = [
  '252, 231, 243',  // pink-50 enhanced
  '243, 232, 255',  // purple-50 enhanced
  '250, 245, 255',  // fuchsia-50
  '240, 253, 250',  // teal-50 (fresh accent)
  '254, 252, 232',  // yellow-50 (energy accent)
];

export const StudentBackgroundGrid: React.FC<StudentBackgroundGridProps> = ({ className }) => {
  const gridRef = useRef<SVGSVGElement>(null);
  
  useEffect(() => {
    // Soft pulsing animation for grid cells
    const cells = gridRef.current?.querySelectorAll('.grid-cell');
    if (!cells) return;
    
    cells.forEach((cell, index) => {
      const delay = (index * 0.15) % 4; // Stagger animation
      const duration = 4 + Math.random() * 2; // 4-6s for slow, gentle motion
      const color = STUDENT_GRID_COLORS[index % STUDENT_GRID_COLORS.length];
      
      (cell as HTMLElement).style.animationDelay = `${delay}s`;
      (cell as HTMLElement).style.animationDuration = `${duration}s`;
      (cell as HTMLElement).style.fill = `rgba(${color}, 0.05)`;
    });
  }, []);
  
  return (
    <svg
      ref={gridRef}
      className={`absolute inset-0 w-full h-full opacity-50 pointer-events-none ${className || ''}`}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <pattern 
          id="student-grid-pattern" 
          width="60" 
          height="60" 
          patternUnits="userSpaceOnUse"
        >
          <rect 
            width="60" 
            height="60" 
            fill="none" 
            stroke="rgba(168, 85, 247, 0.06)" 
            strokeWidth="0.5" 
          />
        </pattern>
        
        <linearGradient id="grid-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(252, 231, 243, 0.3)" />
          <stop offset="50%" stopColor="rgba(243, 232, 255, 0.3)" />
          <stop offset="100%" stopColor="rgba(250, 245, 255, 0.3)" />
        </linearGradient>
      </defs>
      
      {/* Base grid pattern */}
      <rect width="100%" height="100%" fill="url(#student-grid-pattern)" />
      
      {/* Animated cells - soft pulsing orbs */}
      {Array.from({ length: 24 }).map((_, i) => (
        <circle
          key={i}
          className="grid-cell"
          cx={`${(i * 11 + 10) % 95}%`}
          cy={`${(i * 13 + 15) % 90}%`}
          r={Math.random() * 20 + 25}
          style={{ 
            animation: 'pulse-soft 5s ease-in-out infinite',
            transformOrigin: 'center'
          }}
        />
      ))}
      
      {/* Gradient overlay for depth */}
      <rect 
        width="100%" 
        height="100%" 
        fill="url(#grid-gradient)" 
        opacity="0.1"
      />
    </svg>
  );
};

export default StudentBackgroundGrid;
