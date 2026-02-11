import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flame, Lock } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { generateStrategyChartData, calcStrategyReturn, calcStrategyWinDisplay, getReturnColor } from "@/lib/formulas";
import type { Strategy } from "@shared/schema";
import { useMemo } from "react";
import { formatCompact } from "@/lib/constants";

interface StrategyCardProps {
  strategy: Strategy;
  index: number;
  onSubscribe: (strategy: Strategy) => void;
}

export function StrategyCard({ strategy, index, onSubscribe }: StrategyCardProps) {
  const returnVal = Number(strategy.monthlyReturn) || 0;
  const winRate = Number(strategy.winRate || 0);
  const { formatted, isPositive } = calcStrategyReturn(returnVal);
  const color = getReturnColor(isPositive);
  const winDisplay = calcStrategyWinDisplay(winRate);
  const chartData = useMemo(() => generateStrategyChartData(index), [index]);
  const aum = Number(strategy.totalAum) || 0;

  return (
    <Card
      className="border-border bg-card hover-elevate relative"
      data-testid={`strategy-card-${strategy.id}`}
      style={{ animation: `fadeSlideIn 0.4s ease-out ${index * 0.08}s both` }}
    >
      {strategy.isVipOnly && (
        <div className="absolute inset-0 z-10 rounded-md bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
          <Lock className="h-6 w-6 text-primary" />
          <Badge className="bg-primary/20 text-primary text-[10px] no-default-hover-elevate no-default-active-elevate">
            VIP Only
          </Badge>
        </div>
      )}
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-1 mb-1">
          <h4 className="text-xs font-semibold leading-tight line-clamp-2 flex-1">{strategy.name}</h4>
          <div className="flex gap-1 shrink-0">
            {strategy.isHot && (
              <Badge className="bg-red-500/15 text-red-400 text-[9px] no-default-hover-elevate no-default-active-elevate">
                <Flame className="h-2.5 w-2.5 mr-0.5" />Hot
              </Badge>
            )}
          </div>
        </div>
        {strategy.description && (
          <p className="text-[10px] text-muted-foreground line-clamp-2 mb-1">{strategy.description}</p>
        )}
        <div className="text-[10px] text-muted-foreground mb-1">
          {strategy.leverage} | AUM: {formatCompact(aum)}
        </div>
        <div className={`text-xl font-bold mb-1 ${isPositive ? "text-neon-value" : "text-red-400"}`}>
          {formatted}
        </div>
        <div className="text-[10px] text-muted-foreground mb-2">Win: {winDisplay}</div>
        <div className="h-10 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id={`sg-${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#sg-${index})`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="w-full mt-2 text-xs"
          data-testid={`button-subscribe-${strategy.id}`}
          onClick={() => onSubscribe(strategy)}
        >
          Subscribe
        </Button>
      </CardContent>
    </Card>
  );
}
