import React, { useEffect, useRef } from 'react';

interface StudentBackgroundGridProps {
  className?: string;
}

// Student colors: vibrant pastel tones for engaging atmosphere
const STUDENT_GRID_COLORS = [
  '244, 114, 182',  // pink-400 (more vibrant)
  '192, 132, 252',  // purple-400 (more vibrant)
  '232, 121, 249',  // fuchsia-400
  '45, 212, 191',   // teal-400
  '251, 191, 36',   // amber-400
  '59, 130, 246',   // blue-500
  '139, 92, 246',   // violet-500
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
      (cell as HTMLElement).style.fill = `rgba(${color}, 0.15)`;
    });
  }, []);
  
  return (
    <svg
      ref={gridRef}
      className={`absolute inset-0 w-full h-full opacity-90 pointer-events-none z-0 ${className || ''}`}
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
            stroke="rgba(232, 121, 249, 0.15)" 
            strokeWidth="1" 
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
      
      {/* Animated cells - soft pulsing SQUARES */}
      {Array.from({ length: 20 }).map((_, i) => {
        const size = 40 + Math.random() * 30; // 40-70px
        const x = (i * 17 + 5) % 90;
        const y = (i * 13 + 10) % 85;
        
        return (
          <rect
            key={i}
            className="grid-cell"
            x={`${x}%`}
            y={`${y}%`}
            width={size}
            height={size}
            rx="8"
            style={{ 
              animation: 'pulse-soft 5s ease-in-out infinite',
              transformOrigin: 'center'
            }}
          />
        );
      })}
      
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
