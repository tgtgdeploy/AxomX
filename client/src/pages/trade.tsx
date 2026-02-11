import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useActiveAccount } from "thirdweb/react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePriceChart, useCryptoPrices } from "@/hooks/use-crypto-price";
import { ASSET_IDS } from "@/lib/constants";
import { TRADE_ASSETS, BET_DEFAULTS } from "@/lib/data";
import { formatUSD } from "@/lib/constants";
import { PriceChart } from "@/components/dashboard/price-chart";
import { PredictionGrid } from "@/components/trade/prediction-grid";
import { BetControls } from "@/components/trade/bet-controls";
import { StatsPanel } from "@/components/trade/stats-panel";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Clock, TrendingUp, TrendingDown, Radio } from "lucide-react";
import type { TradeBet } from "@shared/schema";

const TIMEFRAMES = ["5M", "30M", "4H", "1M"] as const;

export default function Trade() {
  const account = useActiveAccount();
  const walletAddress = account?.address || "";

  const [selectedAsset, setSelectedAsset] = useState("BTC");
  const [timeframe, setTimeframe] = useState<string>("5M");
  const [gridView, setGridView] = useState<"big" | "small">("big");
  const [betAmount, setBetAmount] = useState(BET_DEFAULTS.defaultAmount);
  const [duration, setDuration] = useState(BET_DEFAULTS.defaultDuration);
  const [infoTab, setInfoTab] = useState<"market" | "leaderboard">("market");

  const coinId = ASSET_IDS[selectedAsset] || "bitcoin";
  const { data: chartData, isLoading: chartLoading } = usePriceChart(coinId);
  const { data: prices } = useCryptoPrices();

  const currentPrice = useMemo(() => {
    if (!prices) return null;
    const p = prices.find((c) => c.symbol === selectedAsset.toLowerCase());
    return p?.current_price ?? null;
  }, [prices, selectedAsset]);

  const { data: tradeStats, isLoading: statsLoading } = useQuery<{
    total: number;
    wins: number;
    losses: number;
    totalStaked: string;
  }>({
    queryKey: ["/api/trade/stats", walletAddress],
    enabled: !!walletAddress,
  });

  const { data: bets = [] } = useQuery<TradeBet[]>({
    queryKey: ["/api/trade/bets", walletAddress],
    enabled: !!walletAddress,
  });

  const stats = tradeStats || { total: 0, wins: 0, losses: 0, totalStaked: "0" };

  const betMutation = useMutation({
    mutationFn: async (direction: "up" | "down") => {
      const res = await apiRequest("POST", "/api/trade/bet", {
        walletAddress,
        asset: selectedAsset,
        direction,
        amount: betAmount,
        duration,
        entryPrice: currentPrice || 0,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trade/bets", walletAddress] });
      queryClient.invalidateQueries({ queryKey: ["/api/trade/stats", walletAddress] });
    },
  });

  const tfLabel = timeframe === "1M" ? "1 Min Signal" : timeframe === "5M" ? "5 Min Signal" : timeframe === "30M" ? "30 Min Signal" : "4H Signal";

  return (
    <div className="space-y-3 pb-52">
      <div className="flex items-center justify-between gap-2 px-4 pt-3 flex-wrap" style={{ animation: "fadeSlideIn 0.3s ease-out" }}>
        <Select value={selectedAsset} onValueChange={setSelectedAsset}>
          <SelectTrigger className="w-24 border-border bg-card text-sm" data-testid="select-asset">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRADE_ASSETS.map((a) => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          Data:
          <Badge variant="outline" className="text-[9px] text-green-400/70 border-green-400/30 no-default-hover-elevate no-default-active-elevate px-1.5 py-0">
            Binance
          </Badge>
        </div>
      </div>

      <div className="flex items-center justify-between px-4 flex-wrap gap-2">
        <div className="flex items-center gap-1 flex-wrap">
          {TIMEFRAMES.map((tf) => (
            <Button
              key={tf}
              size="sm"
              variant={timeframe === tf ? "default" : "ghost"}
              className={timeframe === tf ? "bg-green-500/20 text-green-400" : "text-muted-foreground"}
              onClick={() => setTimeframe(tf)}
              data-testid={`button-timeframe-${tf}`}
            >
              {tf}
              {timeframe === tf && (
                <span className="inline-block ml-1 h-1 w-1 rounded-full bg-green-400 animate-pulse" />
              )}
            </Button>
          ))}
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={gridView === "big" ? "default" : "ghost"}
            className={gridView === "big" ? "bg-green-500/20 text-green-400" : "text-muted-foreground"}
            onClick={() => setGridView("big")}
            data-testid="button-bigroad"
          >
            Big Road
          </Button>
          <Button
            size="sm"
            variant={gridView === "small" ? "default" : "ghost"}
            className={gridView === "small" ? "bg-green-500/20 text-green-400" : "text-muted-foreground"}
            onClick={() => setGridView("small")}
            data-testid="button-smallroad"
          >
            Small Road
          </Button>
        </div>
      </div>

      <div className="px-4" style={{ animation: "fadeSlideIn 0.35s ease-out 0.05s both" }}>
        <div className="flex items-center gap-2 mb-1.5">
          <Radio className="h-3 w-3 text-green-400 animate-pulse" />
          <span className="text-[10px] text-green-400/80 font-medium">{tfLabel}</span>
        </div>
        <PredictionGrid bets={bets} gridType={gridView} timeframe={timeframe} />
      </div>

      <div className="px-4 space-y-2" style={{ animation: "fadeSlideIn 0.35s ease-out 0.1s both" }}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex gap-1 flex-wrap">
            <Button
              size="sm"
              variant={infoTab === "market" ? "default" : "ghost"}
              className={infoTab === "market" ? "bg-green-500/20 text-green-400" : "text-muted-foreground"}
              onClick={() => setInfoTab("market")}
              data-testid="button-market-tab"
            >
              Market
            </Button>
            <Button
              size="sm"
              variant={infoTab === "leaderboard" ? "default" : "ghost"}
              className={infoTab === "leaderboard" ? "bg-green-500/20 text-green-400" : "text-muted-foreground"}
              onClick={() => setInfoTab("leaderboard")}
              data-testid="button-leaderboard-tab"
            >
              Leaderboard
            </Button>
          </div>
          <span className="text-[10px] text-muted-foreground">Source: Polymarket</span>
        </div>

        {infoTab === "market" ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              {currentPrice !== null && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xl font-bold text-green-400" data-testid="text-current-price">
                    {formatUSD(currentPrice)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{selectedAsset}/USD</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-[10px] text-green-400/70">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                Live 1s
              </div>
            </div>
            <PriceChart data={chartData} isLoading={chartLoading} color="hsl(142, 72%, 45%)" />
          </div>
        ) : (
          <Card className="border-border bg-card">
            <CardContent className="p-4 text-center text-sm text-muted-foreground">
              No leaderboard data
            </CardContent>
          </Card>
        )}
      </div>

      <div className="px-4" style={{ animation: "fadeSlideIn 0.35s ease-out 0.15s both" }}>
        <StatsPanel stats={stats} isLoading={statsLoading && !!walletAddress} />
      </div>

      <div className="px-4 space-y-2" style={{ animation: "fadeSlideIn 0.35s ease-out 0.2s both" }}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground">Orders ({bets.length})</span>
          <Button variant="ghost" size="sm" className="text-green-400" data-testid="button-batch-claim">
            Batch Claim
          </Button>
        </div>

        {bets.length === 0 ? (
          <Card className="border-border bg-card">
            <CardContent className="p-6 text-center text-sm text-muted-foreground" data-testid="text-no-orders">
              No orders yet
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-1.5">
            {bets.slice(0, 10).map((bet) => (
              <Card key={bet.id} className="border-border bg-card" data-testid={`order-${bet.id}`}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      {bet.direction === "up" || bet.direction === "bull" ? (
                        <TrendingUp className="h-4 w-4 text-green-400" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-400" />
                      )}
                      <span className="text-sm font-medium">{bet.asset}</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] no-default-hover-elevate no-default-active-elevate ${
                          bet.direction === "up" || bet.direction === "bull"
                            ? "text-green-400 border-green-400/30"
                            : "text-red-400 border-red-400/30"
                        }`}
                      >
                        {bet.direction === "up" || bet.direction === "bull" ? "Bull" : "Bear"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs flex-wrap">
                      <span className="text-muted-foreground">${Number(bet.amount).toFixed(0)}</span>
                      {bet.result && (
                        <Badge
                          variant="secondary"
                          className={`text-[10px] no-default-hover-elevate no-default-active-elevate ${
                            bet.result === "WIN" ? "text-green-400" : "text-red-400"
                          }`}
                        >
                          {bet.result === "WIN" ? "Won" : "Lost"}
                        </Badge>
                      )}
                      {!bet.result && (
                        <span className="flex items-center gap-0.5 text-yellow-400/70">
                          <Clock className="h-3 w-3" />
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <BetControls
        amount={betAmount}
        onAmountChange={setBetAmount}
        duration={duration}
        onDurationChange={setDuration}
        onBet={(dir) => betMutation.mutate(dir)}
        isPending={betMutation.isPending}
      />
    </div>
  );
}
