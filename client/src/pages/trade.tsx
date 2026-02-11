import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Minus, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { SiBitcoin, SiEthereum } from "react-icons/si";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { useQuery } from "@tanstack/react-query";
import type { PredictionMarket } from "@shared/schema";

const gridData = Array.from({ length: 54 }, () => ({
  direction: Math.random() > 0.5 ? "up" : "down",
  hit: Math.random() > 0.6,
}));

const miniChartData = Array.from({ length: 40 }, (_, i) => ({
  t: i,
  price: 66000 + Math.sin(i / 4) * 300 + Math.random() * 200 - (i > 25 ? i * 15 : 0),
}));

export default function Trade() {
  const [selectedAsset, setSelectedAsset] = useState("BTC");
  const [betAmount, setBetAmount] = useState(10);
  const [timeframe, setTimeframe] = useState("1m");
  const [mode, setMode] = useState<"grid" | "market">("grid");

  const { data: markets = [] } = useQuery<PredictionMarket[]>({
    queryKey: ["/api/predictions"],
  });

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center justify-between px-4 pt-2">
        <div className="flex items-center gap-2">
          <Select value={selectedAsset} onValueChange={setSelectedAsset}>
            <SelectTrigger className="h-9 w-24 border-border bg-card text-sm" data-testid="select-asset">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BTC">BTC</SelectItem>
              <SelectItem value="ETH">ETH</SelectItem>
              <SelectItem value="SOL">SOL</SelectItem>
              <SelectItem value="BNB">BNB</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Source: Binance</span>
          <div className="flex rounded-md border border-border overflow-hidden">
            <button
              onClick={() => setMode("grid")}
              className={`px-3 py-1 text-xs ${mode === "grid" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}
              data-testid="button-grid-mode"
            >
              Grid
            </button>
            <button
              onClick={() => setMode("market")}
              className={`px-3 py-1 text-xs ${mode === "market" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}
              data-testid="button-market-mode"
            >
              Market
            </button>
          </div>
        </div>
      </div>

      {mode === "grid" ? (
        <div className="px-4">
          <div className="mb-2 flex items-center gap-3 text-xs text-muted-foreground">
            <Tabs value={timeframe} onValueChange={setTimeframe}>
              <TabsList className="h-7 bg-card border border-border">
                {["5M", "30M", "4H", "1M"].map((tf) => (
                  <TabsTrigger key={tf} value={tf} className="text-[10px] px-2 h-5 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                    {tf}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <div className="mb-2 flex items-center gap-3 text-xs">
            <span className="text-gain">Wins: 24</span>
            <span className="text-loss">Losses: 23</span>
            <Badge variant="secondary" className="text-[10px] no-default-hover-elevate no-default-active-elevate">Streaks: 5x</Badge>
          </div>

          <div className="grid grid-cols-9 gap-1 mb-4" data-testid="prediction-grid">
            {gridData.map((cell, i) => (
              <div
                key={i}
                className={`flex items-center justify-center h-8 rounded-sm text-[10px] font-bold ${
                  cell.hit
                    ? cell.direction === "up"
                      ? "bg-gain/30 text-gain"
                      : "bg-loss/30 text-loss"
                    : cell.direction === "up"
                      ? "bg-gain/10 text-gain/50"
                      : "bg-loss/10 text-loss/50"
                }`}
              >
                {cell.direction === "up" ? "\u2191" : "\u2193"}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="px-4">
          <Tabs defaultValue="predictions">
            <TabsList className="w-full bg-card border border-border">
              <TabsTrigger value="predictions" className="flex-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Predictions
              </TabsTrigger>
            </TabsList>
            <TabsContent value="predictions" className="mt-3 space-y-3">
              {markets.length > 0 ? (
                markets.map((m) => (
                  <Card key={m.id} className="border-border bg-card" data-testid={`market-${m.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <AssetIconSmall asset={m.asset} />
                        <div className="flex-1">
                          <p className="text-sm font-medium mb-1">
                            {m.expiresAt ? new Date(m.expiresAt).toLocaleString() : ""} {m.asset} price &gt; __?
                          </p>
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">{m.targetPrice1}</span>
                              <div className="flex gap-2">
                                <span className="text-gain">{m.yesOdds}%</span>
                                <Badge variant="secondary" className="text-[10px] no-default-hover-elevate no-default-active-elevate">Yes</Badge>
                                <Badge variant="secondary" className="text-[10px] no-default-hover-elevate no-default-active-elevate">No</Badge>
                              </div>
                            </div>
                            {m.targetPrice2 && (
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">{m.targetPrice2}</span>
                                <div className="flex gap-2">
                                  <span className="text-loss">{m.noOdds}%</span>
                                  <Badge variant="secondary" className="text-[10px] no-default-hover-elevate no-default-active-elevate">Yes</Badge>
                                  <Badge variant="secondary" className="text-[10px] no-default-hover-elevate no-default-active-elevate">No</Badge>
                                </div>
                              </div>
                            )}
                          </div>
                          <Badge variant="secondary" className="mt-2 text-[10px] no-default-hover-elevate no-default-active-elevate">{m.asset}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">Loading markets...</div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}

      <div className="px-4">
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px] bg-primary/20 text-primary no-default-hover-elevate no-default-active-elevate">
                  Real-time
                </Badge>
              </div>
              <span className="text-sm font-mono font-bold" data-testid="text-live-price">66,159.200</span>
            </div>
            <div className="h-36" data-testid="chart-mini">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={miniChartData}>
                  <defs>
                    <linearGradient id="miniGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(200, 70%, 50%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(200, 70%, 50%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <YAxis domain={["dataMin - 100", "dataMax + 100"]} hide />
                  <Area type="monotone" dataKey="price" stroke="hsl(200, 70%, 50%)" strokeWidth={2} fill="url(#miniGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="px-4">
        <Card className="border-border bg-card">
          <CardContent className="p-3">
            <div className="text-xs font-medium mb-2 text-muted-foreground">Statistics</div>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-lg font-bold" data-testid="text-total-bets">0</div>
                <div className="text-[10px] text-muted-foreground">Total Bets</div>
              </div>
              <div>
                <div className="text-lg font-bold">0/0</div>
                <div className="text-[10px] text-muted-foreground">W/L</div>
              </div>
              <div>
                <div className="text-lg font-bold">0.0%</div>
                <div className="text-[10px] text-muted-foreground">Win Rate</div>
              </div>
              <div>
                <div className="text-lg font-bold">0</div>
                <div className="text-[10px] text-muted-foreground">Total Staked</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="fixed bottom-16 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-md px-4 py-3">
        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="secondary"
              onClick={() => setBetAmount(Math.max(1, betAmount - 5))}
              data-testid="button-decrease-bet"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold" data-testid="text-bet-amount">${betAmount}</span>
              <span className="text-[10px] text-muted-foreground">Amount</span>
            </div>
            <Button
              size="icon"
              variant="secondary"
              onClick={() => setBetAmount(betAmount + 5)}
              data-testid="button-increase-bet"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <span className="text-lg font-bold">1min</span>
              <div className="text-[10px] text-muted-foreground">Duration</div>
            </div>
            <Button size="icon" variant="ghost">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex gap-3">
          <Button className="flex-1 bg-loss text-white font-bold border-none" data-testid="button-bear">
            Bear (Down)
            <span className="ml-1 text-xs opacity-80">84%</span>
          </Button>
          <Button className="flex-1 bg-gain text-white font-bold border-none" data-testid="button-bull">
            Bull (Up)
            <span className="ml-1 text-xs opacity-80">84%</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

function AssetIconSmall({ asset }: { asset: string }) {
  switch (asset) {
    case "BTC":
      return <SiBitcoin className="h-5 w-5 text-orange-400 mt-0.5 shrink-0" />;
    case "ETH":
      return <SiEthereum className="h-5 w-5 text-blue-400 mt-0.5 shrink-0" />;
    default:
      return (
        <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center mt-0.5 shrink-0">
          <span className="text-[10px] font-bold text-primary">{asset[0]}</span>
        </div>
      );
  }
}
