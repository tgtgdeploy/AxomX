import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";
import { formatUSD } from "@/lib/constants";
import type { CryptoPrice } from "@/hooks/use-crypto-price";
import { Skeleton } from "@/components/ui/skeleton";

interface PriceHeaderProps {
  coin: CryptoPrice | undefined;
  isLoading: boolean;
}

export function PriceHeader({ coin, isLoading }: PriceHeaderProps) {
  if (isLoading || !coin) {
    return (
      <div className="mb-3">
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-9 w-48 mb-1" />
      </div>
    );
  }

  const isPositive = coin.price_change_percentage_24h >= 0;

  return (
    <div className="mb-3">
      <div className="flex items-center gap-2 mb-1">
        <img src={coin.image} alt={coin.name} className="h-5 w-5 rounded-full" />
        <span className="text-sm text-muted-foreground">{coin.symbol.toUpperCase()} Price</span>
      </div>
      <div className="flex items-baseline gap-3 flex-wrap">
        <span className="text-3xl font-bold tracking-tight" data-testid="text-price">
          {formatUSD(coin.current_price)}
        </span>
        <Badge
          className={`text-xs ${
            isPositive
              ? "bg-primary/15 text-neon-value no-default-hover-elevate no-default-active-elevate"
              : "bg-red-500/15 text-red-400 no-default-hover-elevate no-default-active-elevate"
          }`}
        >
          {isPositive ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
          {isPositive ? "+" : ""}{coin.price_change_percentage_24h.toFixed(2)}%
        </Badge>
      </div>
    </div>
  );
}
