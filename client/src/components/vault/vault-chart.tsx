import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";
import { formatUSD } from "@/lib/constants";
import { VAULT_CHART_PERIODS, type VaultChartPeriod } from "@/lib/data";
import { generateVaultChartData } from "@/lib/formulas";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveAccount } from "thirdweb/react";
import type { VaultPosition } from "@shared/schema";

export function VaultChart() {
  const [period, setPeriod] = useState<VaultChartPeriod>("ALL");
  const chartData = useMemo(() => generateVaultChartData(period), [period]);
  const account = useActiveAccount();
  const walletAddress = account?.address;

  const { data: positions } = useQuery<VaultPosition[]>({
    queryKey: ["/api/vault/positions", walletAddress],
    enabled: !!walletAddress,
  });

  const { totalValue, totalYield } = useMemo(() => {
    if (!positions || positions.length === 0) return { totalValue: 0, totalYield: 0 };
    const now = new Date();
    let principal = 0;
    let yieldSum = 0;
    for (const p of positions) {
      if (p.status !== "ACTIVE") continue;
      const amt = Number(p.principal || 0);
      principal += amt;
      const start = new Date(p.startDate!);
      const days = Math.max(0, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      yieldSum += amt * Number(p.dailyRate || 0) * days;
    }
    return { totalValue: principal + yieldSum, totalYield: yieldSum };
  }, [positions]);

  const changePercent = totalValue > 0 && totalYield > 0
    ? ((totalYield / (totalValue - totalYield)) * 100)
    : 0;

  return (
    <div className="gradient-green-dark p-4 pt-2 rounded-b-2xl">
      <h2 className="text-lg font-bold mb-1" data-testid="text-vault-title">Vault</h2>
      <div className="text-xs text-muted-foreground mb-2">P&L</div>
      <div className="flex items-baseline gap-3 flex-wrap mb-1">
        <span className="text-3xl font-bold tracking-tight" data-testid="text-vault-total">
          {formatUSD(totalValue)}
        </span>
        {changePercent > 0 && (
          <Badge className="bg-primary/15 text-neon-value text-xs no-default-hover-elevate no-default-active-elevate">
            <TrendingUp className="mr-1 h-3 w-3" />+{changePercent.toFixed(2)}%
          </Badge>
        )}
      </div>
      <div className="h-36 mt-3" data-testid="chart-vault">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="vaultGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(174, 72%, 46%)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="hsl(174, 72%, 46%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="value" stroke="hsl(174, 72%, 46%)" strokeWidth={2} fill="url(#vaultGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-2 mt-2">
        {VAULT_CHART_PERIODS.map((p) => (
          <Button
            key={p}
            variant={period === p ? "default" : "ghost"}
            size="sm"
            className={`text-xs ${period === p ? "" : "text-muted-foreground"}`}
            onClick={() => setPeriod(p)}
            data-testid={`button-chart-period-${p}`}
          >
            {p}
          </Button>
        ))}
      </div>
    </div>
  );
}
