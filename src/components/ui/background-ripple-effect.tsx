import React, { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedCell {
  col: number;
  row: number;
  opacity: number;
  color: string;
  state: 'appearing' | 'active' | 'fading';
  stateStartTime: number;
  targetOpacity: number;
}

interface BackgroundRippleEffectProps {
  className?: string;
  colorPalette: string[];
  gridOpacity?: number;
  cellSize?: number;
  numCells?: number;
  maxOpacity?: number;
  minOpacity?: number;
}

const CONFIG = {
  CELL_SIZE: 40,
  NUM_ANIMATED_CELLS: 15,
  MIN_OPACITY: 0.08,
  MAX_OPACITY: 0.45,
  APPEAR_DURATION: 2500,
  ACTIVE_DURATION: 4000,
  FADE_DURATION: 2500,
  TARGET_FRAME_TIME: 1000 / 20, // 20 FPS
  GRID_OPACITY: 0.12,
};

// Ease-in-out cubic for smooth transitions
const easeInOutCubic = (t: number): number => {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

const DivGrid: React.FC<BackgroundRippleEffectProps> = ({ 
  className,
  colorPalette,
  gridOpacity = CONFIG.GRID_OPACITY,
  cellSize = CONFIG.CELL_SIZE,
  numCells = CONFIG.NUM_ANIMATED_CELLS,
  maxOpacity = CONFIG.MAX_OPACITY,
  minOpacity = CONFIG.MIN_OPACITY,
}) => {
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

    const cols = Math.ceil(dimensions.width / cellSize);
    const rows = Math.ceil(dimensions.height / cellSize);

    const cells: AnimatedCell[] = [];
    const usedPositions = new Set<string>();

    for (let i = 0; i < numCells; i++) {
      let col, row, key;
      do {
        col = Math.floor(Math.random() * cols);
        row = Math.floor(Math.random() * rows);
        key = `${col}-${row}`;
      } while (usedPositions.has(key));

      usedPositions.add(key);

      // Random target opacity for variety
      const targetOpacity = minOpacity + Math.random() * (maxOpacity - minOpacity);

      cells.push({
        col,
        row,
        opacity: 0,
        color: colorPalette[Math.floor(Math.random() * colorPalette.length)],
        state: 'appearing',
        stateStartTime: Date.now() + Math.random() * 2000, // Stagger initial appearance
        targetOpacity,
      });
    }

    setAnimatedCells(cells);
  }, [dimensions, cellSize, numCells, colorPalette, maxOpacity, minOpacity]);

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

      lastFrameTimeRef.current = timestamp;

      canvas.width = dimensions.width;
      canvas.height = dimensions.height;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw static grid
      const cols = Math.ceil(canvas.width / cellSize);
      const rows = Math.ceil(canvas.height / cellSize);

      ctx.strokeStyle = `rgba(255, 255, 255, ${gridOpacity})`;
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

      // Update and draw animated cells
      setAnimatedCells(prevCells => {
        const now = Date.now();
        
        return prevCells.map(cell => {
          const timeSinceStateStart = now - cell.stateStartTime;
          let newState = cell.state;
          let newOpacity = cell.opacity;
          let newStateStartTime = cell.stateStartTime;

          // State machine
          if (cell.state === 'appearing') {
            const progress = Math.min(timeSinceStateStart / CONFIG.APPEAR_DURATION, 1);
            newOpacity = easeInOutCubic(progress) * cell.targetOpacity;

            if (progress >= 1) {
              newState = 'active';
              newStateStartTime = now;
            }
          } else if (cell.state === 'active') {
            newOpacity = cell.targetOpacity;

            if (timeSinceStateStart >= CONFIG.ACTIVE_DURATION) {
              newState = 'fading';
              newStateStartTime = now;
            }
          } else if (cell.state === 'fading') {
            const progress = Math.min(timeSinceStateStart / CONFIG.FADE_DURATION, 1);
            newOpacity = cell.targetOpacity * (1 - easeInOutCubic(progress));

            // Reset to new position after fading
            if (progress >= 1) {
              const cols = Math.ceil(canvas.width / cellSize);
              const rows = Math.ceil(canvas.height / cellSize);
              
              // Find new random position
              const newCol = Math.floor(Math.random() * cols);
              const newRow = Math.floor(Math.random() * rows);
              const newTargetOpacity = minOpacity + Math.random() * (maxOpacity - minOpacity);

              return {
                col: newCol,
                row: newRow,
                opacity: 0,
                color: colorPalette[Math.floor(Math.random() * colorPalette.length)],
                state: 'appearing' as const,
                stateStartTime: now,
                targetOpacity: newTargetOpacity,
              };
            }
          }

          // Draw cell
          ctx.fillStyle = `rgba(${cell.color}, ${newOpacity})`;
          ctx.fillRect(
            cell.col * cellSize,
            cell.row * cellSize,
            cellSize,
            cellSize
          );

          return {
            ...cell,
            opacity: newOpacity,
            state: newState,
            stateStartTime: newStateStartTime,
          };
        });
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [animatedCells.length, dimensions, cellSize, colorPalette, gridOpacity, maxOpacity, minOpacity]);

  return (
    <canvas
      ref={canvasRef}
      className={cn('absolute inset-0', className)}
      style={{ pointerEvents: 'none' }}
    />
  );
};

export const BackgroundRippleEffect: React.FC<BackgroundRippleEffectProps> = (props) => {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className={cn('absolute inset-0 overflow-hidden', props.className)}
    >
      <DivGrid {...props} />
    </div>
  );
};

export default BackgroundRippleEffect;
