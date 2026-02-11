import { useState, useEffect, useMemo } from "react";
import {
  ComposedChart, Area, Line, XAxis, YAxis, ResponsiveContainer, Tooltip,
  ReferenceLine, CartesianGrid,
} from "recharts";
import { formatUSD } from "@/lib/constants";
import type { ChartDataPoint, ChartTimeframe } from "@/hooks/use-crypto-price";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Minus, Sparkles } from "lucide-react";

interface ForecastData {
  direction: string;
  confidence: number;
  currentPrice: number;
  targetPrice: number;
  reasoning: string;
  forecastPoints: { timestamp: number; time: string; price: number; predicted: boolean }[];
}

interface PriceChartProps {
  data: ChartDataPoint[] | undefined;
  isLoading: boolean;
  color?: string;
  forecast?: ForecastData | null;
  forecastLoading?: boolean;
  selectedTimeframe?: ChartTimeframe;
  onTimeframeChange?: (tf: ChartTimeframe) => void;
}

const TIMEFRAMES: { key: ChartTimeframe; label: string }[] = [
  { key: "1m", label: "1m" },
  { key: "10m", label: "10m" },
  { key: "30m", label: "30m" },
  { key: "1H", label: "1H" },
  { key: "4H", label: "4H" },
  { key: "1D", label: "1D" },
  { key: "7D", label: "7D" },
];

export function PriceChart({
  data,
  isLoading,
  color = "hsl(174, 72%, 46%)",
  forecast,
  forecastLoading,
  selectedTimeframe,
  onTimeframeChange,
}: PriceChartProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (data && data.length > 0) {
      const timer = setTimeout(() => setVisible(true), 50);
      return () => clearTimeout(timer);
    }
    setVisible(false);
  }, [data]);

  const mergedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    const maxPoints = 80;
    const step = Math.max(1, Math.floor(data.length / maxPoints));
    const sampled = data.filter((_, i) => i % step === 0 || i === data.length - 1);
    const historicalPoints = sampled.map(d => ({
      time: d.time,
      timestamp: d.timestamp,
      price: d.price,
      forecastPrice: null as number | null,
    }));

    if (forecast?.forecastPoints?.length) {
      const lastHistorical = historicalPoints[historicalPoints.length - 1];
      historicalPoints[historicalPoints.length - 1] = {
        ...lastHistorical,
        forecastPrice: lastHistorical.price,
      };

      for (const fp of forecast.forecastPoints) {
        historicalPoints.push({
          time: fp.time,
          timestamp: fp.timestamp,
          price: null as any,
          forecastPrice: fp.price,
        });
      }
    }

    return historicalPoints;
  }, [data, forecast]);

  const direction = forecast?.direction || "NEUTRAL";
  const confidence = forecast?.confidence || 0;
  const targetPrice = forecast?.targetPrice || null;

  const directionIcon =
    direction === "BULLISH" ? <TrendingUp className="mr-1 h-3 w-3" /> :
    direction === "BEARISH" ? <TrendingDown className="mr-1 h-3 w-3" /> :
    <Minus className="mr-1 h-3 w-3" />;

  const directionColor =
    direction === "BULLISH" ? "bg-primary/15 text-neon-value" :
    direction === "BEARISH" ? "bg-red-500/15 text-red-400" :
    "bg-yellow-500/15 text-yellow-400";

  const forecastLineColor =
    direction === "BULLISH" ? "#22c55e" :
    direction === "BEARISH" ? "#ef4444" :
    "#eab308";

  const formatYAxis = (v: number) => {
    if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
    if (v >= 1) return v.toFixed(2);
    return v.toFixed(4);
  };

  return (
    <div data-testid="chart-price-container">
      {onTimeframeChange && (
      <div className="flex items-center gap-1 mb-2 flex-wrap" data-testid="timeframe-selector">
        {TIMEFRAMES.map(tf => (
          <Button
            key={tf.key}
            variant={selectedTimeframe === tf.key ? "default" : "ghost"}
            size="sm"
            className={`text-[10px] ${selectedTimeframe === tf.key ? "font-bold" : "text-muted-foreground"}`}
            onClick={() => onTimeframeChange(tf.key)}
            data-testid={`button-tf-${tf.key}`}
          >
            {tf.label}
          </Button>
        ))}
        {forecast && (
          <Badge
            className={`ml-auto text-[9px] shrink-0 ${directionColor} no-default-hover-elevate no-default-active-elevate`}
            data-testid="badge-forecast-direction"
          >
            <Sparkles className="mr-1 h-2.5 w-2.5" />
            AI {direction} {confidence}%
          </Badge>
        )}
        {forecastLoading && !forecast && (
          <Badge className="ml-auto text-[9px] shrink-0 bg-muted/30 text-muted-foreground no-default-hover-elevate no-default-active-elevate animate-pulse">
            <Sparkles className="mr-1 h-2.5 w-2.5" />
            Loading...
          </Badge>
        )}
      </div>
      )}

      {isLoading || !data || data.length === 0 ? (
        <Skeleton className="h-52 w-full rounded-md" />
      ) : (
        <div
          className="relative w-full transition-opacity duration-700 ease-out"
          style={{ opacity: visible ? 1 : 0, height: 210 }}
          data-testid="chart-price"
        >
          {forecast && targetPrice && (
            <div
              className="absolute top-1 right-1 z-10 text-right"
              style={{ animation: "fadeSlideIn 0.5s ease-out" }}
              data-testid="forecast-target-label"
            >
              <div
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold border"
                style={{
                  backgroundColor: direction === "BULLISH" ? "rgba(34,197,94,0.15)" : direction === "BEARISH" ? "rgba(239,68,68,0.15)" : "rgba(234,179,8,0.15)",
                  borderColor: direction === "BULLISH" ? "rgba(34,197,94,0.3)" : direction === "BEARISH" ? "rgba(239,68,68,0.3)" : "rgba(234,179,8,0.3)",
                  color: forecastLineColor,
                }}
              >
                {directionIcon}
                Target: {formatUSD(targetPrice)}
              </div>
            </div>
          )}

          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={mergedData} margin={{ top: 24, right: 4, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={forecastLineColor} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={forecastLineColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 9, fill: "hsl(150, 5%, 50%)" }}
                tickLine={false}
                axisLine={false}
                interval={Math.floor(mergedData.length / 6)}
              />
              <YAxis
                domain={["dataMin", "dataMax"]}
                tick={{ fontSize: 9, fill: "hsl(150, 5%, 50%)" }}
                tickLine={false}
                axisLine={false}
                orientation="right"
                width={55}
                tickFormatter={formatYAxis}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(150, 8%, 12%)",
                  border: "1px solid hsl(150, 8%, 20%)",
                  borderRadius: "6px",
                  fontSize: "11px",
                  color: "hsl(150, 5%, 95%)",
                }}
                formatter={(value: any, name: string) => {
                  if (value === null || value === undefined) return ["-", ""];
                  const label = name === "forecastPrice" ? "AI Forecast" : "Price";
                  return [formatUSD(Number(value)), label];
                }}
              />
              {targetPrice && (
                <ReferenceLine
                  y={targetPrice}
                  stroke={forecastLineColor}
                  strokeDasharray="6 4"
                  strokeWidth={1}
                  strokeOpacity={0.5}
                />
              )}
              <Area
                type="monotone"
                dataKey="price"
                stroke={color}
                strokeWidth={2}
                fill="url(#priceGradient)"
                connectNulls={false}
                dot={false}
              />
              {forecast && (
                <Area
                  type="monotone"
                  dataKey="forecastPrice"
                  stroke={forecastLineColor}
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  fill="url(#forecastGradient)"
                  connectNulls={true}
                  dot={(props: any) => {
                    if (!props.payload?.forecastPrice || props.payload?.price !== null) return <></>;
                    const isLast = props.index === mergedData.length - 1;
                    if (!isLast) return <></>;
                    return (
                      <g>
                        <circle cx={props.cx} cy={props.cy} r={4} fill={forecastLineColor} stroke="white" strokeWidth={1.5} />
                        <text x={props.cx - 4} y={props.cy - 10} fill={forecastLineColor} fontSize={9} fontWeight="bold">
                          {formatUSD(props.payload.forecastPrice)}
                        </text>
                      </g>
                    );
                  }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {forecast?.reasoning && (
        <div className="mt-1.5 px-1" data-testid="text-forecast-reasoning">
          <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">
            <Sparkles className="inline h-2.5 w-2.5 mr-1 text-amber-400" />
            {forecast.reasoning}
          </p>
        </div>
      )}
    </div>
  );
}
