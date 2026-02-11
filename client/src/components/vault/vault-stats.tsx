import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Lock, Layers } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { VAULT_PLANS } from "@/lib/data";

interface VaultOverviewResponse {
  tvl: string;
  holders: number;
  totalPositions: number;
}

export function VaultStats() {
  const { data: overview, isLoading } = useQuery<VaultOverviewResponse>({
    queryKey: ["/api/vault/overview"],
  });

  const maxApr = Object.values(VAULT_PLANS).reduce((max, p) => {
    const apr = parseFloat(p.apr);
    return apr > max ? apr : max;
  }, 0);

  if (isLoading || !overview) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-md" />
        ))}
      </div>
    );
  }

  const tvlNum = Number(overview.tvl || 0);
  const tvlFormatted = tvlNum >= 1_000_000
    ? `$${(tvlNum / 1_000_000).toFixed(2)}M`
    : tvlNum >= 1_000
      ? `$${(tvlNum / 1_000).toFixed(1)}K`
      : `$${tvlNum.toFixed(2)}`;

  return (
    <div className="grid grid-cols-2 gap-3">
      <Card className="border-border bg-card">
        <CardContent className="p-3">
          <div className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
            <Layers className="h-3 w-3" /> TVL
          </div>
          <div className="text-lg font-bold" data-testid="text-tvl">{tvlFormatted}</div>
        </CardContent>
      </Card>
      <Card className="border-border bg-card">
        <CardContent className="p-3">
          <div className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
            <Clock className="h-3 w-3" /> Max APR
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-neon-value" data-testid="text-max-apr">{maxApr}%</span>
            <Badge className="text-[10px] bg-primary/15 text-primary no-default-hover-elevate no-default-active-elevate">APR</Badge>
          </div>
        </CardContent>
      </Card>
      <Card className="border-border bg-card">
        <CardContent className="p-3">
          <div className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
            <Users className="h-3 w-3" /> Holders
          </div>
          <div className="text-lg font-bold" data-testid="text-holders">{overview.holders}</div>
        </CardContent>
      </Card>
      <Card className="border-border bg-card">
        <CardContent className="p-3">
          <div className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
            <Lock className="h-3 w-3" /> Active Positions
          </div>
          <div className="text-lg font-bold" data-testid="text-positions">{overview.totalPositions}</div>
        </CardContent>
      </Card>
    </div>
  );
}
