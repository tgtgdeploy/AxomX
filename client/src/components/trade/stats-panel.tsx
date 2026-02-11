import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface TradeStats {
  total: number;
  wins: number;
  losses: number;
  totalStaked: string;
}

interface StatsPanelProps {
  stats: TradeStats;
  isLoading: boolean;
}

function useCountUp(target: number, duration: number = 800): number {
  const [value, setValue] = useState(0);
  const prevTarget = useRef(0);

  useEffect(() => {
    const start = prevTarget.current;
    prevTarget.current = target;
    if (target === 0 && start === 0) return;

    const startTime = performance.now();
    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + (target - start) * eased));
      if (progress < 1) requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }, [target, duration]);

  return value;
}

export function StatsPanel({ stats, isLoading }: StatsPanelProps) {
  const totalAnim = useCountUp(stats.total);
  const winsAnim = useCountUp(stats.wins);
  const lossesAnim = useCountUp(stats.losses);
  const staked = parseFloat(stats.totalStaked || "0");

  const winRate = stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(1) : "0.0";

  if (isLoading) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="p-3">
          <div className="h-16 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className="border-border bg-card"
      style={{ boxShadow: "0 0 12px rgba(0, 188, 165, 0.06), inset 0 0 0 1px rgba(0, 188, 165, 0.08)" }}
    >
      <CardContent className="p-3">
        <div className="text-xs font-medium mb-2 text-primary/80">
          My Stats
        </div>
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-neon-value" data-testid="text-total-bets">{totalAnim}</div>
            <div className="text-[10px] text-muted-foreground">Total Bets</div>
          </div>
          <div>
            <div className="text-lg font-bold" data-testid="text-win-loss">
              <span className="text-neon-value">{winsAnim}</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-red-400">{lossesAnim}</span>
            </div>
            <div className="text-[10px] text-muted-foreground">W/L</div>
          </div>
          <div>
            <div className="text-lg font-bold text-neon-value" data-testid="text-win-rate">{winRate}%</div>
            <div className="text-[10px] text-muted-foreground">Win Rate</div>
          </div>
          <div>
            <div className="text-lg font-bold text-neon-value" data-testid="text-total-staked">${staked.toFixed(0)}</div>
            <div className="text-[10px] text-muted-foreground">Staked</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
