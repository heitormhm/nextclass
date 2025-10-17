import React, { useMemo, useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export const BackgroundRippleEffect = ({
  rows,
  cols = 27,
  cellSize = 56,
  className,
}: {
  rows?: number;
  cols?: number;
  cellSize?: number;
  className?: string;
}) => {
  const [clickedCell, setClickedCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [rippleKey, setRippleKey] = useState(0);
  const [dynamicRows, setDynamicRows] = useState(rows || Math.ceil(window.innerHeight / cellSize) + 3);
  const ref = useRef<any>(null);

  useEffect(() => {
    if (rows) {
      setDynamicRows(rows);
      return;
    }

    const calculateRows = () => {
      const pageHeight = Math.max(
        document.documentElement.scrollHeight,
        document.documentElement.clientHeight,
        window.innerHeight
      );
      const calculatedRows = Math.ceil(pageHeight / cellSize) + 5;
      setDynamicRows(calculatedRows);
    };

    calculateRows();
    window.addEventListener('resize', calculateRows);
    
    const observer = new MutationObserver(calculateRows);
    observer.observe(document.body, { 
      childList: true, 
      subtree: true 
    });
    
    return () => {
      window.removeEventListener('resize', calculateRows);
      observer.disconnect();
    };
  }, [cellSize, rows]);

  return (
    <div
      ref={ref}
      className={cn(
        "absolute inset-0 h-full w-full",
        "[--cell-border-color:rgb(147,51,234)] [--cell-fill-color:rgba(168,85,247,0.15)] [--cell-shadow-color:rgba(147,51,234,0.3)]",
        className
      )}
    >
      <div className="relative h-full w-full">
        <div className="absolute inset-0 z-[2] h-full w-full" />
        <DivGrid
          key={`base-${rippleKey}`}
          className="opacity-600"
          rows={dynamicRows}
          cols={cols}
          cellSize={cellSize}
          borderColor="var(--cell-border-color)"
          fillColor="var(--cell-fill-color)"
          clickedCell={clickedCell}
          onCellClick={(row, col) => {
            setClickedCell({ row, col });
            setRippleKey((k) => k + 1);
          }}
          interactive
        />
      </div>
    </div>
  );
};

type DivGridProps = {
  className?: string;
  rows: number;
  cols: number;
  cellSize: number;
  borderColor: string;
  fillColor: string;
  clickedCell: { row: number; col: number } | null;
  onCellClick?: (row: number, col: number) => void;
  interactive?: boolean;
};

type CellStyle = React.CSSProperties & {
  ["--delay"]?: string;
  ["--duration"]?: string;
};

const DivGrid = ({
  className,
  rows = 7,
  cols = 30,
  cellSize = 56,
  borderColor = "#9333ea",
  fillColor = "rgba(168,85,247,0.3)",
  clickedCell = null,
  onCellClick = () => {},
  interactive = true,
}: DivGridProps) => {
  const cells = useMemo(
    () => Array.from({ length: rows * cols }, (_, idx) => idx),
    [rows, cols],
  );

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
    gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
    width: cols * cellSize,
    minHeight: '100%',
    marginInline: "auto",
  };

  return (
    <div className={cn("relative z-[3] pointer-events-auto", className)} style={gridStyle}>
      {cells.map((idx) => {
        const rowIdx = Math.floor(idx / cols);
        const colIdx = idx % cols;
        const distance = clickedCell
          ? Math.hypot(clickedCell.row - rowIdx, clickedCell.col - colIdx)
          : 0;
        const delay = clickedCell ? Math.max(0, distance * 55) : 0;
        const duration = 200 + distance * 80;

        const style: CellStyle = clickedCell
          ? {
              "--delay": `${delay}ms`,
              "--duration": `${duration}ms`,
            }
          : {};

        return (
          <div
            key={idx}
            className={cn(
              "cell relative border-[0.5px] opacity-25 transition-opacity duration-150 will-change-transform hover:opacity-80 shadow-[0px_0px_40px_1px_var(--cell-shadow-color)_inset]",
              clickedCell && "animate-cell-ripple [animation-fill-mode:none]",
              !interactive && "pointer-events-none",
            )}
            style={{
              backgroundColor: fillColor,
              borderColor: borderColor,
              ...style,
            }}
            onClick={
              interactive ? () => onCellClick?.(rowIdx, colIdx) : undefined
            }
          />
        );
      })}
    </div>
  );
};

export default BackgroundRippleEffect;
