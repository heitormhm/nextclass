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
      cellSize={50}              // Células maiores para suavidade (+25%)
      numCells={20}              // Mais células para atividade contínua (+33%)
      maxOpacity={0.18}          // Opacidade sutil e elegante (-60%)
      minOpacity={0.03}          // Quase invisível no mínimo
      gridOpacity={0.25}         // Grid mais visível para profissionalismo (+67%)
      appearDuration={12000}     // 12s fade in - animação zen ultra-suave
      activeDuration={18000}     // 18s estável - tempo prolongado de presença
      fadeDuration={12000}       // 12s fade out - saída orgânica e imperceptível
    />
  );
};

export default TeacherBackgroundRipple;
