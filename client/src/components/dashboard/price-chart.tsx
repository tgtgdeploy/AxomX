import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from "recharts";
import { formatUSD } from "@/lib/constants";
import type { ChartDataPoint } from "@/hooks/use-crypto-price";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface PredictionData {
  prediction: string;
  confidence: string | number;
  targetPrice: string | number;
}

interface PriceChartProps {
  data: ChartDataPoint[] | undefined;
  isLoading: boolean;
  color?: string;
  prediction?: PredictionData;
}

export function PriceChart({ data, isLoading, color = "hsl(142, 72%, 45%)", prediction }: PriceChartProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (data && data.length > 0) {
      const timer = setTimeout(() => setVisible(true), 50);
      return () => clearTimeout(timer);
    }
    setVisible(false);
  }, [data]);

  if (isLoading || !data || data.length === 0) {
    return <Skeleton className="h-48 w-full rounded-md" />;
  }

  const sampled = data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 80)) === 0);
  const targetPrice = prediction ? Number(prediction.targetPrice) : null;
  const confidence = prediction ? Number(prediction.confidence) : 0;
  const direction = prediction?.prediction || "NEUTRAL";

  const directionIcon =
    direction === "BULLISH" ? <TrendingUp className="mr-1 h-3 w-3" /> :
    direction === "BEARISH" ? <TrendingDown className="mr-1 h-3 w-3" /> :
    <Minus className="mr-1 h-3 w-3" />;

  const directionColor =
    direction === "BULLISH" ? "bg-green-500/15 text-green-400" :
    direction === "BEARISH" ? "bg-red-500/15 text-red-400" :
    "bg-yellow-500/15 text-yellow-400";

  return (
    <div
      className="relative h-48 w-full transition-opacity duration-700 ease-out"
      style={{ opacity: visible ? 1 : 0 }}
      data-testid="chart-price"
    >
      {prediction && (
        <div
          className="absolute top-2 right-2 z-10 flex flex-col items-end gap-1"
          data-testid="prediction-overlay"
          style={{ animation: "fadeSlideIn 0.5s ease-out" }}
        >
          <Badge
            className={`text-[10px] ${directionColor} no-default-hover-elevate no-default-active-elevate`}
            data-testid="badge-prediction-direction"
          >
            {directionIcon}
            {direction} {confidence}%
          </Badge>
          {targetPrice && (
            <span className="text-[10px] text-muted-foreground" data-testid="text-target-price">
              Target: {formatUSD(targetPrice)}
            </span>
          )}
        </div>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={sampled} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="time"
            tick={{ fontSize: 10, fill: "hsl(150, 5%, 55%)" }}
            tickLine={false}
            axisLine={false}
            interval={Math.floor(sampled.length / 5)}
          />
          <YAxis
            domain={["dataMin", "dataMax"]}
            tick={{ fontSize: 10, fill: "hsl(150, 5%, 55%)" }}
            tickLine={false}
            axisLine={false}
            orientation="right"
            width={65}
            tickFormatter={(v) =>
              v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v.toFixed(2)
            }
          />
          <Tooltip
            contentStyle={{
              background: "hsl(150, 8%, 12%)",
              border: "1px solid hsl(150, 8%, 20%)",
              borderRadius: "6px",
              fontSize: "12px",
              color: "hsl(150, 5%, 95%)",
            }}
            formatter={(value: number) => [formatUSD(value), "Price"]}
          />
          {targetPrice && (
            <ReferenceLine
              y={targetPrice}
              stroke={direction === "BULLISH" ? "hsl(142, 72%, 45%)" : direction === "BEARISH" ? "hsl(0, 72%, 55%)" : "hsl(45, 72%, 55%)"}
              strokeDasharray="6 4"
              strokeWidth={1.5}
              strokeOpacity={0.7}
              label={{
                value: `AI: ${formatUSD(targetPrice)}`,
                position: "left",
                fill: "hsl(150, 5%, 65%)",
                fontSize: 9,
              }}
            />
          )}
          <Area
            type="monotone"
            dataKey="price"
            stroke={color}
            strokeWidth={2}
            fill="url(#priceGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
