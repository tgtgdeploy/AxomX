import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface DepthBarProps {
  buyPercent: string;
  sellPercent: string;
  isLoading: boolean;
  fearGreedIndex?: number;
  fearGreedLabel?: string;
}

export function DepthBar({ buyPercent, sellPercent, isLoading, fearGreedIndex, fearGreedLabel }: DepthBarProps) {
  if (isLoading) {
    return <Skeleton className="h-20 w-full rounded-md" data-testid="skeleton-depth-bar" />;
  }

  const indexColor =
    fearGreedIndex !== undefined
      ? fearGreedIndex >= 60
        ? "text-green-400"
        : fearGreedIndex <= 40
          ? "text-red-400"
          : "text-yellow-400"
      : "text-muted-foreground";

  const labelColor =
    fearGreedIndex !== undefined
      ? fearGreedIndex >= 60
        ? "bg-green-500/15 text-green-400"
        : fearGreedIndex <= 40
          ? "bg-red-500/15 text-red-400"
          : "bg-yellow-500/15 text-yellow-400"
      : "bg-muted text-muted-foreground";

  return (
    <Card className="border-border bg-card" data-testid="card-depth-bar">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <span className="text-sm font-medium">Depth Ratio</span>
          {fearGreedIndex !== undefined && (
            <div className="flex items-center gap-2">
              <span className={`text-lg font-bold tabular-nums ${indexColor}`} data-testid="text-fear-greed-index">
                {fearGreedIndex}
              </span>
              {fearGreedLabel && (
                <Badge
                  className={`text-[10px] ${labelColor} no-default-hover-elevate no-default-active-elevate`}
                  data-testid="badge-fear-greed-label"
                >
                  {fearGreedLabel}
                </Badge>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
              <span className="text-xs text-green-400" data-testid="text-longs-percent">Longs: {buyPercent}%</span>
              <span className="text-xs text-red-400" data-testid="text-shorts-percent">Shorts: {sellPercent}%</span>
            </div>
            <div className="flex h-3 overflow-hidden rounded-full" data-testid="bar-depth-ratio">
              <div
                className="bg-green-500/70 transition-all duration-700 ease-out"
                style={{
                  width: `${buyPercent}%`,
                  animation: "pulseGlow 3s ease-in-out infinite",
                }}
              />
              <div
                className="bg-red-500/70 transition-all duration-700 ease-out"
                style={{ width: `${sellPercent}%` }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
