import React, { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedCell {
  col: number;
  row: number;
  opacity: number;
  color: string;
  phase: number;
  speed: number;
}

interface DivGridProps {
  className?: string;
}

const CELL_COLORS = [
  '59, 130, 246',   // blue-500
  '168, 85, 247',   // purple-500
  '236, 72, 153',   // pink-500
  '147, 51, 234',   // purple-600
  '219, 39, 119',   // pink-600
];

const CONFIG = {
  CELL_SIZE: 40,
  NUM_ANIMATED_CELLS: 20,
  MIN_OPACITY: 0.05,
  MAX_OPACITY: 0.35,
  MIN_SPEED: 0.0003,
  MAX_SPEED: 0.0008,
  COLOR_CHANGE_CHANCE: 0.3,
  TARGET_FRAME_TIME: 1000 / 30, // 30 FPS
};

const DivGrid: React.FC<DivGridProps> = ({ className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [animatedCells, setAnimatedCells] = useState<AnimatedCell[]>([]);
  const animationFrameRef = useRef<number>();
  const lastFrameTimeRef = useRef<number>(0);

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

  // Initialize animated cells
  useEffect(() => {
    if (dimensions.width === 0 || dimensions.height === 0) return;

    const cols = Math.ceil(dimensions.width / CONFIG.CELL_SIZE);
    const rows = Math.ceil(dimensions.height / CONFIG.CELL_SIZE);

    const cells: AnimatedCell[] = [];
    const usedPositions = new Set<string>();

    for (let i = 0; i < CONFIG.NUM_ANIMATED_CELLS; i++) {
      let col, row, key;
      do {
        col = Math.floor(Math.random() * cols);
        row = Math.floor(Math.random() * rows);
        key = `${col}-${row}`;
      } while (usedPositions.has(key));

      usedPositions.add(key);

      cells.push({
        col,
        row,
        opacity: Math.random() * (CONFIG.MAX_OPACITY - CONFIG.MIN_OPACITY) + CONFIG.MIN_OPACITY,
        color: CELL_COLORS[Math.floor(Math.random() * CELL_COLORS.length)],
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * (CONFIG.MAX_SPEED - CONFIG.MIN_SPEED) + CONFIG.MIN_SPEED,
      });
    }

    setAnimatedCells(cells);
  }, [dimensions]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || animatedCells.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = (timestamp: number) => {
      // Throttle to target FPS
      if (timestamp - lastFrameTimeRef.current < CONFIG.TARGET_FRAME_TIME) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      const deltaTime = timestamp - lastFrameTimeRef.current;
      lastFrameTimeRef.current = timestamp;

      canvas.width = dimensions.width;
      canvas.height = dimensions.height;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw static grid
      const cols = Math.ceil(canvas.width / CONFIG.CELL_SIZE);
      const rows = Math.ceil(canvas.height / CONFIG.CELL_SIZE);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;

      for (let i = 0; i <= cols; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CONFIG.CELL_SIZE, 0);
        ctx.lineTo(i * CONFIG.CELL_SIZE, canvas.height);
        ctx.stroke();
      }

      for (let i = 0; i <= rows; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * CONFIG.CELL_SIZE);
        ctx.lineTo(canvas.width, i * CONFIG.CELL_SIZE);
        ctx.stroke();
      }

      // Update and draw animated cells
      setAnimatedCells(prevCells =>
        prevCells.map(cell => {
          // Update phase
          const newPhase = cell.phase + deltaTime * cell.speed;

          // Calculate opacity using sine wave
          const newOpacity = CONFIG.MIN_OPACITY + 
            (Math.sin(newPhase) + 1) / 2 * (CONFIG.MAX_OPACITY - CONFIG.MIN_OPACITY);

          // Draw cell
          ctx.fillStyle = `rgba(${cell.color}, ${newOpacity})`;
          ctx.fillRect(
            cell.col * CONFIG.CELL_SIZE,
            cell.row * CONFIG.CELL_SIZE,
            CONFIG.CELL_SIZE,
            CONFIG.CELL_SIZE
          );

          // Chance to change color after full cycle
          let newColor = cell.color;
          if (newPhase > Math.PI * 2 && Math.random() < CONFIG.COLOR_CHANGE_CHANCE) {
            newColor = CELL_COLORS[Math.floor(Math.random() * CELL_COLORS.length)];
          }

          return {
            ...cell,
            phase: newPhase % (Math.PI * 2),
            opacity: newOpacity,
            color: newColor,
          };
        })
      );

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [animatedCells.length, dimensions]);

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
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className={cn('absolute inset-0 overflow-hidden', className)}
    >
      <DivGrid />
    </div>
  );
};

export default BackgroundRippleEffect;
