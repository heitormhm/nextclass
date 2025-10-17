import React, { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface DivGridProps {
  className?: string;
  mouseX: number;
  mouseY: number;
}

const DivGrid: React.FC<DivGridProps> = ({ className, mouseX, mouseY }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      if (canvasRef.current && canvasRef.current.parentElement) {
        const { width, height } = canvasRef.current.parentElement.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cellSize = 40;
    const cols = Math.ceil(canvas.width / cellSize);
    const rows = Math.ceil(canvas.height / cellSize);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;

    for (let i = 0; i <= cols; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, canvas.height);
      ctx.stroke();
    }

    for (let i = 0; i <= rows; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(canvas.width, i * cellSize);
      ctx.stroke();
    }

    // Draw ripple effect around mouse
    if (mouseX >= 0 && mouseY >= 0) {
      const maxDistance = 150;
      for (let i = 0; i <= cols; i++) {
        for (let j = 0; j <= rows; j++) {
          const x = i * cellSize;
          const y = j * cellSize;
          const distance = Math.sqrt((mouseX - x) ** 2 + (mouseY - y) ** 2);

          if (distance < maxDistance) {
            const opacity = 1 - distance / maxDistance;
            ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.2})`;
            ctx.fillRect(x, y, cellSize, cellSize);
          }
        }
      }
    }
  }, [dimensions, mouseX, mouseY]);

  return (
    <canvas
      ref={canvasRef}
      className={cn('absolute inset-0', className)}
      style={{ pointerEvents: 'none' }}
    />
  );
};

interface BackgroundRippleEffectProps {
  className?: string;
}

export const BackgroundRippleEffect: React.FC<BackgroundRippleEffectProps> = ({ className }) => {
  const [mousePosition, setMousePosition] = useState({ x: -1, y: -1 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const handleMouseLeave = () => {
    setMousePosition({ x: -1, y: -1 });
  };

  return (
    <div
      ref={containerRef}
      className={cn('absolute inset-0 overflow-hidden', className)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <DivGrid mouseX={mousePosition.x} mouseY={mousePosition.y} />
    </div>
  );
};

export default BackgroundRippleEffect;
