import { useMemo, useState, useEffect } from "react";
import type { TradeBet } from "@shared/schema";

interface GridCell {
  direction: "up" | "down";
  confirmed: boolean;
  isLatest: boolean;
  number: number;
}

interface PredictionGridProps {
  bets: TradeBet[];
  gridType: "big" | "small";
  timeframe?: string;
}

function generateCells(bets: TradeBet[], gridType: "big" | "small", timeframe?: string): GridCell[] {
  const cols = gridType === "big" ? 9 : 12;
  const rows = gridType === "big" ? 6 : 4;
  const totalCells = cols * rows;
  const cells: GridCell[] = [];

  const seed = timeframe === "30M" ? 17 : timeframe === "4H" ? 31 : timeframe === "1M" ? 53 : 7;

  if (bets && bets.length > 0) {
    for (let idx = 0; idx < bets.length && cells.length < totalCells; idx++) {
      const bet = bets[idx];
      cells.push({
        direction: bet.direction === "up" || bet.direction === "bull" ? "up" : "down",
        confirmed: bet.result !== null && bet.result !== undefined,
        isLatest: false,
        number: idx + 1,
      });
    }
  }

  const remaining = totalCells - cells.length;
  for (let i = 0; i < remaining; i++) {
    const v = ((i + seed) * 13 + seed * 3) % 100;
    const isUp = v > 46;
    cells.push({
      direction: isUp ? "up" : "down",
      confirmed: i < remaining - 2,
      isLatest: false,
      number: cells.length + 1,
    });
  }

  const result = cells.slice(0, totalCells);
  if (result.length > 0) {
    result[result.length - 1] = { ...result[result.length - 1], isLatest: true };
  }
  return result;
}

export function PredictionGrid({ bets, gridType, timeframe }: PredictionGridProps) {
  const [visibleCount, setVisibleCount] = useState(0);
  const cells = useMemo(
    () => generateCells(bets || [], gridType, timeframe),
    [bets, gridType, timeframe]
  );

  const cols = gridType === "big" ? 9 : 12;
  const rows = gridType === "big" ? 6 : 4;

  useEffect(() => {
    setVisibleCount(0);
    let frame = 0;
    const batchSize = gridType === "big" ? 3 : 4;
    const interval = setInterval(() => {
      frame += batchSize;
      if (frame >= cells.length) {
        setVisibleCount(cells.length);
        clearInterval(interval);
      } else {
        setVisibleCount(frame);
      }
    }, 20);
    return () => clearInterval(interval);
  }, [cells.length, gridType, timeframe]);

  const ups = cells.filter(c => c.direction === "up").length;
  const downs = cells.filter(c => c.direction === "down").length;
  const total = ups + downs;
  const pctDiff = total > 0 ? Math.abs(((ups - downs) / total) * 100).toFixed(0) : "0";

  return (
    <div data-testid={`prediction-grid-${gridType}`}>
      <div className="flex items-center gap-3 mb-2 text-[11px] flex-wrap">
        <span className="text-green-400 font-medium" data-testid="text-bull-count">Bull: {ups}</span>
        <span className="text-red-400 font-medium" data-testid="text-bear-count">Bear: {downs}</span>
        <span className="flex items-center gap-1 text-muted-foreground">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse" />
          Diff {pctDiff}%
        </span>
        <span className="text-muted-foreground flex items-center gap-1">
          <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
            <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Reversal
        </span>
      </div>

      <div className="rounded-md border border-border bg-card/50 p-1 overflow-hidden">
        <div className="flex">
          <div className="flex flex-col shrink-0" style={{ marginTop: 0 }}>
            {Array.from({ length: rows }, (_, r) => (
              <div
                key={r}
                className="flex items-center justify-center text-[9px] text-muted-foreground font-mono"
                style={{ height: gridType === "big" ? 32 : 24, width: 16 }}
                data-testid={`row-label-${r + 1}`}
              >
                {r + 1}
              </div>
            ))}
          </div>

          <div
            className="grid flex-1"
            style={{
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gridTemplateRows: `repeat(${rows}, ${gridType === "big" ? 32 : 24}px)`,
              gap: "2px",
            }}
          >
            {cells.map((cell, i) => {
              const isVisible = i < visibleCount;
              const isUp = cell.direction === "up";

              let bgClass: string;
              let borderClass: string;
              if (isUp) {
                bgClass = cell.confirmed ? "bg-green-600/80" : "bg-green-500/20";
                borderClass = "border-green-500/40";
              } else {
                bgClass = cell.confirmed ? "bg-red-500/70" : "bg-red-500/20";
                borderClass = "border-red-500/40";
              }

              return (
                <div
                  key={i}
                  className={`
                    flex items-center justify-center rounded-[3px] border text-[10px] font-bold
                    transition-all duration-200
                    ${isVisible ? "opacity-100 scale-100" : "opacity-0 scale-75"}
                    ${bgClass} ${borderClass}
                    ${cell.isLatest ? "ring-1 ring-yellow-400/60" : ""}
                  `}
                  style={cell.isLatest && isVisible ? {
                    animation: "gridPulse 1.5s ease-in-out infinite",
                    boxShadow: isUp
                      ? "0 0 8px rgba(34,197,94,0.4)"
                      : "0 0 8px rgba(239,68,68,0.4)",
                  } : undefined}
                  data-testid={`grid-cell-${i}`}
                >
                  <span className={isUp ? "text-green-200" : "text-red-200"}>
                    {cell.number}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex mt-1 ml-4">
          {Array.from({ length: cols }, (_, c) => (
            <div
              key={c}
              className="flex-1 text-center text-[9px] text-muted-foreground font-mono"
              data-testid={`col-label-${c + 1}`}
            >
              {c + 1}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes gridPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.85; }
        }
      `}</style>
    </div>
  );
}
