import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { MOCK_PRICES, EXCHANGES, formatUSD } from "@/lib/constants";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import { SiBitcoin, SiEthereum } from "react-icons/si";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

const chartData = Array.from({ length: 48 }, (_, i) => ({
  time: `${Math.floor(i / 2 + 9)}:${i % 2 === 0 ? "00" : "30"}`,
  price: 65800 + Math.random() * 2400 + (i > 30 ? -800 : 0) + Math.sin(i / 5) * 600,
}));

const trendingItems = [
  { text: "BTC Trade +5.80%", type: "gain" as const },
  { text: "ETH Trade -1.76%", type: "loss" as const },
  { text: "GPT-5 completed SOL +17.92%", type: "gain" as const },
  { text: "BNB Trade -4.76%", type: "loss" as const },
  { text: "Claude completed BTC +3.21%", type: "gain" as const },
];

const assetTabs = ["BTC", "ETH", "BNB", "DOGE", "SOL"] as const;

function AssetIcon({ asset, className }: { asset: string; className?: string }) {
  const base = `${className || "h-5 w-5"}`;
  switch (asset) {
    case "BTC":
      return <SiBitcoin className={`${base} text-orange-400`} />;
    case "ETH":
      return <SiEthereum className={`${base} text-blue-400`} />;
    default:
      return (
        <div className={`${base} rounded-full bg-primary/20 flex items-center justify-center`}>
          <span className="text-[10px] font-bold text-primary">{asset[0]}</span>
        </div>
      );
  }
}

export default function Dashboard() {
  const [selectedAsset, setSelectedAsset] = useState<string>("BTC");
  const price = MOCK_PRICES[selectedAsset as keyof typeof MOCK_PRICES];

  return (
    <div className="space-y-4 pb-20">
      <div className="gradient-green-dark rounded-b-2xl p-4 pt-2">
        <div className="mb-3 flex items-center gap-2">
          <AssetIcon asset={selectedAsset} className="h-5 w-5" />
          <span className="text-sm text-muted-foreground">{selectedAsset} Price</span>
        </div>
        <div className="mb-1 flex items-baseline gap-3">
          <span className="text-3xl font-bold tracking-tight" data-testid="text-price">
            {formatUSD(price.price)}
          </span>
          <Badge
            variant={price.change >= 0 ? "default" : "destructive"}
            className={`text-xs ${price.change >= 0 ? "bg-primary/20 text-primary no-default-hover-elevate no-default-active-elevate" : "bg-destructive/20 text-destructive no-default-hover-elevate no-default-active-elevate"}`}
          >
            {price.change >= 0 ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
            {price.change >= 0 ? "+" : ""}{price.change}%
          </Badge>
        </div>

        <div className="h-48 w-full mt-2" data-testid="chart-price">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142, 72%, 45%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(142, 72%, 45%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fill: "hsl(150, 5%, 55%)" }}
                tickLine={false}
                axisLine={false}
                interval={11}
              />
              <YAxis
                domain={["dataMin - 200", "dataMax + 200"]}
                tick={{ fontSize: 10, fill: "hsl(150, 5%, 55%)" }}
                tickLine={false}
                axisLine={false}
                orientation="right"
                width={60}
                tickFormatter={(v) => `${(v / 1000).toFixed(1)}K`}
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
              <Area
                type="monotone"
                dataKey="price"
                stroke="hsl(142, 72%, 45%)"
                strokeWidth={2}
                fill="url(#colorPrice)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="px-4">
        <Tabs value={selectedAsset} onValueChange={setSelectedAsset}>
          <TabsList className="w-full bg-card border border-border">
            {assetTabs.map((asset) => (
              <TabsTrigger key={asset} value={asset} className="flex-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                {asset}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="px-4">
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="mb-3 text-center text-sm font-medium">Depth Ratio</div>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gain">Longs: 44.9%</span>
                  <span className="text-xs text-loss">Shorts: 55.1%</span>
                </div>
                <div className="flex h-3 overflow-hidden rounded-full">
                  <div className="bg-gain/80" style={{ width: "44.9%" }} />
                  <div className="bg-loss/80" style={{ width: "55.1%" }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="px-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Activity className="h-4 w-4 text-primary" />
          Trending
        </h3>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {trendingItems.map((item, i) => (
            <Badge
              key={i}
              variant="secondary"
              className={`whitespace-nowrap text-xs ${item.type === "gain" ? "bg-gain/10 text-gain" : "bg-loss/10 text-loss"} no-default-hover-elevate no-default-active-elevate`}
            >
              {item.text}
            </Badge>
          ))}
        </div>
      </div>

      <div className="px-4">
        <h3 className="mb-3 text-sm font-semibold">Order Book Depth - {selectedAsset}</h3>
        <div className="space-y-1.5">
          {EXCHANGES.map((ex) => (
            <div key={ex.name} className="flex items-center gap-3" data-testid={`exchange-${ex.name.toLowerCase()}`}>
              <span className="w-24 text-xs font-medium truncate">{ex.name}</span>
              <span className="w-10 text-[10px] text-muted-foreground">Buy</span>
              <span className="w-10 text-[10px] text-muted-foreground text-right">{ex.buy}%</span>
              <div className="flex-1 flex h-4 overflow-hidden rounded-sm">
                <div className="bg-gain/60 transition-all" style={{ width: `${ex.buy}%` }} />
                <div className="bg-loss/60 transition-all" style={{ width: `${ex.sell}%` }} />
              </div>
              <span className="w-10 text-[10px] text-muted-foreground">{ex.sell}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
