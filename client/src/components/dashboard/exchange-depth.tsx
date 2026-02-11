import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface ExchangeRow {
  name: string;
  buy: number;
  sell: number;
}

interface ExchangeAggData {
  exchanges: ExchangeRow[];
  aggregatedBuy: number;
  aggregatedSell: number;
  fearGreedIndex: number;
  fearGreedLabel: string;
  longShortRatio: number;
  timestamp: number;
}

interface ExchangeDepthProps {
  symbol: string;
}

export function ExchangeDepth({ symbol }: ExchangeDepthProps) {
  const [mounted, setMounted] = useState(false);

  const { data, isLoading } = useQuery<ExchangeAggData>({
    queryKey: ["/api/exchange/depth", symbol],
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    setMounted(false);
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, [symbol, data]);

  const exchanges = data?.exchanges || [];

  return (
    <div data-testid="section-exchange-depth">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <h3 className="text-sm font-semibold">Order Book Depth - {symbol}</h3>
        {data && (
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[9px] text-emerald-400 border-emerald-400/30 no-default-hover-elevate no-default-active-elevate">
              L/S Ratio: {data.longShortRatio.toFixed(2)}
            </Badge>
            <Badge variant="outline" className="text-[9px] text-primary/70 border-primary/30 no-default-hover-elevate no-default-active-elevate">
              Live
            </Badge>
          </div>
        )}
      </div>
      {isLoading ? (
        <div className="space-y-1.5">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-5 w-full rounded-sm" />
          ))}
        </div>
      ) : (
        <div className="space-y-1.5">
          {exchanges.map((ex, index) => (
            <div
              key={ex.name}
              className="flex items-center gap-3"
              data-testid={`exchange-${ex.name.toLowerCase().replace(/\./g, "")}`}
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateX(0)" : "translateX(-8px)",
                transition: `opacity 0.4s ease ${index * 40}ms, transform 0.4s ease ${index * 40}ms`,
              }}
            >
              <span className="w-24 text-xs font-medium truncate">{ex.name}</span>
              <span className="w-10 text-[10px] text-emerald-400 font-medium text-right">{ex.buy}%</span>
              <div className="flex-1 flex h-4 overflow-hidden rounded-sm">
                <div
                  className="bg-emerald-500 transition-all duration-700 ease-out"
                  style={{ width: mounted ? `${ex.buy}%` : "0%" }}
                />
                <div
                  className="bg-red-500 transition-all duration-700 ease-out"
                  style={{ width: mounted ? `${ex.sell}%` : "0%" }}
                />
              </div>
              <span className="w-10 text-[10px] text-red-400 font-medium">{ex.sell}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
