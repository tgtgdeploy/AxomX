import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatUSD, formatCompact } from "@/lib/constants";
import { ArrowLeft, ChevronLeft, ChevronRight, Activity } from "lucide-react";
import { useLocation } from "wouter";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface CalendarDay { date: string; day: number; change: number; }
interface CalendarData { dailyChanges: CalendarDay[]; currentPrice: number; }
interface FearGreedHistory {
  current: { value: number; label: string };
  buckets: { extremeFear: number; fear: number; neutral: number; greed: number; extremeGreed: number };
  totalDays: number;
  chartData: { date: string; fgi: number; btcPrice: number }[];
}
interface SentimentCoin {
  id: string; symbol: string; name: string; image: string;
  price: number; change24h: number; netFlow: number;
}
interface SentimentData { coins: SentimentCoin[]; totalNetInflow: number; }
interface FuturesOIPos {
  pair: string; symbol: string; exchange: string;
  openInterestValue: number; openInterest: number; price: number; priceChange24h: number;
}
interface FuturesOIData { positions: FuturesOIPos[]; totalOI: number; }
interface ExchangePriceRow {
  exchange: string; pair: string; symbol: string; price: number; change24h: number; isReal?: boolean;
}
interface CoinExchangeData {
  symbol: string; basePrice: number; baseChange: number; exchanges: ExchangePriceRow[];
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const EXCHANGE_LOGOS: Record<string, string> = {
  "Binance": "https://cryptologos.cc/logos/binance-coin-bnb-logo.png?v=040",
  "OKX": "https://cryptologos.cc/logos/okb-okb-logo.png?v=040",
};

function FearGreedGauge({ value, label }: { value: number; label: string }) {
  const angle = -90 + (value / 100) * 180;
  const gaugeColor =
    value <= 25 ? "#ef4444" : value <= 45 ? "#f97316" : value <= 55 ? "#eab308" : value <= 75 ? "#84cc16" : "#22c55e";

  return (
    <div className="flex flex-col items-center py-4" data-testid="fear-greed-gauge">
      <svg viewBox="0 0 220 130" className="w-56 h-32">
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="25%" stopColor="#f97316" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="75%" stopColor="#84cc16" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
        <path d="M 30 110 A 80 80 0 0 1 190 110" fill="none" stroke="url(#gaugeGrad)" strokeWidth="14" strokeLinecap="round" />
        <text x="15" y="118" fontSize="7" fill="#ef4444" textAnchor="start" fontWeight="bold">Extreme Fear</text>
        <text x="58" y="52" fontSize="7" fill="#f97316" textAnchor="middle" fontWeight="bold">Fear</text>
        <text x="110" y="30" fontSize="7" fill="#eab308" textAnchor="middle" fontWeight="bold">Neutral</text>
        <text x="162" y="52" fontSize="7" fill="#84cc16" textAnchor="middle" fontWeight="bold">Greed</text>
        <text x="205" y="118" fontSize="7" fill="#22c55e" textAnchor="end" fontWeight="bold">Extreme Greed</text>
        <g transform={`rotate(${angle}, 110, 110)`}>
          <polygon points="110,40 106,110 114,110" fill={gaugeColor} opacity="0.9" />
          <circle cx="110" cy="110" r="6" fill={gaugeColor} />
        </g>
      </svg>
      <div className="text-4xl font-bold mt-1" style={{ color: gaugeColor }} data-testid="text-fear-greed-value">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5" data-testid="text-fear-greed-label">{label}</div>
    </div>
  );
}

function FearGreedChart({ data }: { data: { date: string; fgi: number; btcPrice: number }[] }) {
  if (!data || data.length === 0) return null;
  const sampled = data.filter((_, i) => i % 3 === 0 || i === data.length - 1);

  return (
    <div className="mt-4" data-testid="fear-greed-chart">
      <div className="flex items-center gap-3 mb-2 flex-wrap">
        <div className="flex items-center gap-1"><div className="w-3 h-[2px] bg-white/80" /><span className="text-[10px] text-muted-foreground">BTC Price</span></div>
        <div className="flex items-center gap-1"><div className="w-3 h-[2px] bg-amber-500" /><span className="text-[10px] text-muted-foreground">Fear & Greed Index</span></div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={sampled} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="date" tick={{ fontSize: 8, fill: "hsl(150,5%,45%)" }} tickFormatter={(d) => { const dt = new Date(d); return `${dt.getMonth()+1}/${dt.getDate()}`; }} interval={Math.floor(sampled.length / 6)} />
          <YAxis yAxisId="price" orientation="right" tick={{ fontSize: 8, fill: "rgba(255,255,255,0.5)" }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}K`} domain={["dataMin","dataMax"]} />
          <YAxis yAxisId="fgi" orientation="left" tick={{ fontSize: 8, fill: "rgba(245,158,11,0.6)" }} domain={[0, 100]} />
          <Tooltip contentStyle={{ backgroundColor: "hsl(160,20%,8%)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", fontSize: "11px" }} formatter={(value: number, name: string) => name === "btcPrice" ? [`$${value.toLocaleString()}`, "BTC Price"] : [value, "Fear & Greed"]} />
          <Line yAxisId="price" type="monotone" dataKey="btcPrice" stroke="rgba(255,255,255,0.8)" strokeWidth={1.5} dot={false} />
          <Area yAxisId="fgi" type="monotone" dataKey="fgi" stroke="#f59e0b" fill="rgba(245,158,11,0.15)" strokeWidth={1.5} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function PriceCalendar({ data }: { data: CalendarData | undefined }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const calendarData = useMemo(() => {
    if (!data?.dailyChanges?.length) return null;
    const now = new Date();
    const targetMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const year = targetMonth.getFullYear(); const month = targetMonth.getMonth();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const changeMap = new Map<number, number>();
    for (const dc of data.dailyChanges) { const d = new Date(dc.date); if (d.getFullYear() === year && d.getMonth() === month) changeMap.set(dc.day, dc.change); }
    return { firstDayOfWeek, daysInMonth, changeMap, monthName: targetMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" }) };
  }, [data, monthOffset]);

  if (!calendarData) return <Skeleton className="h-64 w-full rounded-md" />;
  const { firstDayOfWeek, daysInMonth, changeMap, monthName } = calendarData;
  const cells: (null | { day: number; change: number | undefined })[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, change: changeMap.get(d) });

  return (
    <div data-testid="price-calendar">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <Button size="icon" variant="ghost" onClick={() => setMonthOffset(o => o - 1)} data-testid="button-prev-month"><ChevronLeft className="h-4 w-4" /></Button>
        <span className="text-sm font-bold" data-testid="text-calendar-month">{monthName}</span>
        <Button size="icon" variant="ghost" onClick={() => setMonthOffset(o => Math.min(o + 1, 0))} disabled={monthOffset >= 0} data-testid="button-next-month"><ChevronRight className="h-4 w-4" /></Button>
      </div>
      <div className="grid grid-cols-7 gap-[2px] mb-1">
        {WEEKDAYS.map((wd) => (<div key={wd} className="text-center text-[10px] text-muted-foreground font-medium py-1">{wd}</div>))}
      </div>
      <div className="grid grid-cols-7 gap-[2px]">
        {cells.map((cell, i) => {
          if (!cell) return <div key={`empty-${i}`} className="h-12" />;
          const change = cell.change; const hasData = change !== undefined;
          let bgClass = "bg-card/30"; let textColor = "text-muted-foreground";
          if (hasData) {
            if (change > 3) { bgClass = "bg-emerald-500/50"; textColor = "text-emerald-300"; }
            else if (change > 0) { bgClass = "bg-emerald-500/25"; textColor = "text-emerald-400"; }
            else if (change > -3) { bgClass = "bg-red-500/25"; textColor = "text-red-400"; }
            else { bgClass = "bg-red-500/50"; textColor = "text-red-300"; }
          }
          return (
            <div key={`day-${cell.day}`} className={`h-12 rounded-[3px] flex flex-col items-center justify-center ${bgClass}`} data-testid={`calendar-day-${cell.day}`}>
              <span className="text-[10px] text-muted-foreground">{cell.day}</span>
              {hasData && <span className={`text-[10px] font-bold ${textColor}`}>{change > 0 ? "+" : ""}{change.toFixed(2)}%</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MarketPage() {
  const [, navigate] = useLocation();
  const [selectedCoinTab, setSelectedCoinTab] = useState("BTC");

  const { data: calendarData, isLoading: calLoading } = useQuery<CalendarData>({ queryKey: ["/api/market/calendar"], staleTime: 5 * 60 * 1000 });
  const { data: fgHistory, isLoading: fgLoading } = useQuery<FearGreedHistory>({ queryKey: ["/api/market/fear-greed-history"], staleTime: 5 * 60 * 1000 });
  const { data: sentimentData, isLoading: sentLoading } = useQuery<SentimentData>({ queryKey: ["/api/market/sentiment"], staleTime: 60 * 1000 });
  const { data: futuresData, isLoading: oiLoading } = useQuery<FuturesOIData>({ queryKey: ["/api/market/futures-oi"], staleTime: 60 * 1000 });
  const { data: exchangePrices, isLoading: epLoading } = useQuery<CoinExchangeData[]>({ queryKey: ["/api/market/exchange-prices"], staleTime: 60 * 1000 });

  const selectedCoinExchanges = exchangePrices?.find(c => c.symbol === selectedCoinTab);

  return (
    <div className="space-y-4 pb-20" data-testid="page-market">
      {/* Header + Calendar */}
      <div className="gradient-green-dark rounded-b-2xl p-4 pt-2" style={{ animation: "fadeSlideIn 0.5s ease-out" }}>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Button size="icon" variant="ghost" onClick={() => navigate("/")} data-testid="button-back-home"><ArrowLeft className="h-4 w-4" /></Button>
          <h1 className="text-lg font-bold">Market Analysis</h1>
        </div>
        {calLoading ? <Skeleton className="h-8 w-48 mb-2" /> : (
          <div className="mb-3">
            <span className="text-xs text-muted-foreground">BTC Price</span>
            <div className="text-2xl font-bold" data-testid="text-btc-price">{formatUSD(calendarData?.currentPrice || 0)}</div>
          </div>
        )}
        <Card className="border-border bg-card/50"><CardContent className="p-3">
          {calLoading ? <Skeleton className="h-64 w-full" /> : <PriceCalendar data={calendarData} />}
        </CardContent></Card>
      </div>

      {/* Fear & Greed Index */}
      <div className="px-4" style={{ animation: "fadeSlideIn 0.6s ease-out" }}>
        <h2 className="text-sm font-bold mb-3">Fear & Greed Index</h2>
        {fgLoading ? <Skeleton className="h-48 w-full rounded-md" /> : fgHistory ? (
          <Card className="border-border bg-card"><CardContent className="p-4">
            <div className="space-y-2.5 mb-2">
              {[
                { label: "Extreme Fear", value: fgHistory.buckets.extremeFear, color: "text-red-400", barColor: "bg-red-500", glow: "rgba(239,68,68,0.4)" },
                { label: "Fear", value: fgHistory.buckets.fear, color: "text-orange-400", barColor: "bg-orange-500", glow: "rgba(249,115,22,0.4)" },
                { label: "Neutral", value: fgHistory.buckets.neutral, color: "text-yellow-400", barColor: "bg-yellow-500", glow: "rgba(234,179,8,0.3)" },
                { label: "Greed", value: fgHistory.buckets.greed, color: "text-lime-400", barColor: "bg-lime-500", glow: "rgba(132,204,22,0.4)" },
                { label: "Extreme Greed", value: fgHistory.buckets.extremeGreed, color: "text-emerald-400", barColor: "bg-emerald-500", glow: "rgba(16,185,129,0.4)" },
              ].map((item) => {
                const pct = fgHistory.totalDays > 0 ? (item.value / fgHistory.totalDays) * 100 : 0;
                return (
                  <div key={item.label} className="space-y-0.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className={`font-medium ${item.color}`}>{item.label}</span>
                      <span className="text-muted-foreground tabular-nums">{item.value} days ({pct.toFixed(2)}%)</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
                      <div className={`h-full rounded-full ${item.barColor} transition-all duration-700`} style={{ width: `${pct}%`, boxShadow: `0 0 6px ${item.glow}` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <FearGreedGauge value={fgHistory.current.value} label={fgHistory.current.label} />
            <FearGreedChart data={fgHistory.chartData} />
          </CardContent></Card>
        ) : null}
      </div>

      {/* Market Sentiment - Top Net Inflows */}
      <div className="px-4" style={{ animation: "fadeSlideIn 0.7s ease-out" }}>
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <h2 className="text-sm font-bold">Market Sentiment</h2>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground">Top Net Inflows</span>
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-emerald-400">Real-time</span>
          </div>
        </div>
        {sentLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full rounded-md" />)}</div>
        ) : sentimentData?.coins ? (
          <>
            <div className="space-y-2">
              {sentimentData.coins.map((coin) => {
                const isInflow = coin.netFlow >= 0;
                return (
                  <Card key={coin.id} className="border-border bg-card" data-testid={`sentiment-card-${coin.symbol}`}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0 flex-wrap">
                          <div className="relative h-8 w-8 rounded-full shrink-0 flex items-center justify-center" style={{ boxShadow: isInflow ? "0 0 10px rgba(16,185,129,0.3)" : "0 0 10px rgba(239,68,68,0.3)" }}>
                            {coin.image ? <img src={coin.image} alt={coin.name} className="h-8 w-8 rounded-full" /> : <div className="h-8 w-8 rounded-full bg-card flex items-center justify-center text-xs font-bold">{coin.symbol}</div>}
                          </div>
                          <div>
                            <div className="text-xs font-bold">{coin.symbol}</div>
                            <div className="text-[10px] text-muted-foreground">24H INFLOW</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-bold ${isInflow ? "text-emerald-400" : "text-red-400"}`} style={{ textShadow: isInflow ? "0 0 8px rgba(16,185,129,0.3)" : "0 0 8px rgba(239,68,68,0.3)" }} data-testid={`text-netflow-${coin.symbol}`}>
                            {isInflow ? "" : "-"}${formatCompact(Math.abs(coin.netFlow))}
                          </div>
                          <div className={`text-[10px] font-medium ${coin.change24h >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {coin.change24h >= 0 ? "+" : ""}{coin.change24h.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <Card className="border-border bg-card mt-3">
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">TOTAL NET INFLOW</span>
                  <span className={`text-lg font-bold ${sentimentData.totalNetInflow >= 0 ? "text-emerald-400" : "text-red-400"}`} style={{ textShadow: sentimentData.totalNetInflow >= 0 ? "0 0 8px rgba(16,185,129,0.3)" : "0 0 8px rgba(239,68,68,0.3)" }} data-testid="text-total-net-inflow">
                    {sentimentData.totalNetInflow >= 0 ? "" : "-"}${formatCompact(Math.abs(sentimentData.totalNetInflow))}
                  </span>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      {/* Futures Open Interest */}
      <div className="px-4" style={{ animation: "fadeSlideIn 0.8s ease-out" }}>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Activity className="h-4 w-4 text-emerald-400" />
          <h2 className="text-sm font-bold">Futures Open Interest</h2>
        </div>
        {oiLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full rounded-md" />)}</div>
        ) : futuresData?.positions ? (
          <>
            <Card className="border-border bg-card">
              <CardContent className="p-0">
                {futuresData.positions.map((item, idx) => {
                  const isPositive = item.priceChange24h >= 0;
                  return (
                    <div key={`${item.pair}-${item.exchange}`} className={`flex items-center justify-between gap-2 p-3 flex-wrap ${idx < futuresData.positions.length - 1 ? "border-b border-border" : ""}`} data-testid={`futures-oi-${item.symbol}-${item.exchange}`}>
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <div className="w-16">
                          <div className="text-xs font-bold">{item.pair}</div>
                          <div className="text-[10px] text-muted-foreground">{item.exchange}</div>
                        </div>
                        <Badge className={`text-[9px] no-default-hover-elevate no-default-active-elevate ${isPositive ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}`}>
                          {isPositive ? "+" : ""}{item.priceChange24h.toFixed(2)}%
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold" data-testid={`text-oi-value-${item.symbol}-${item.exchange}`}>${formatCompact(item.openInterestValue)}</div>
                        <div className="text-[10px] text-muted-foreground">{item.openInterest.toLocaleString()} contracts</div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
            <Card className="border-border bg-card mt-3">
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">TOTAL OI</span>
                  <span className="text-lg font-bold text-emerald-400" style={{ textShadow: "0 0 8px rgba(16,185,129,0.3)" }} data-testid="text-total-oi">${formatCompact(futuresData.totalOI)}</span>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="border-border bg-card"><CardContent className="p-4 text-center text-xs text-muted-foreground">Futures data unavailable</CardContent></Card>
        )}
      </div>

      {/* Cross-Exchange Price Table */}
      <div className="px-4" style={{ animation: "fadeSlideIn 0.9s ease-out" }}>
        <h2 className="text-sm font-bold mb-3">Cross-Exchange Prices</h2>

        <div className="flex items-center gap-1.5 mb-3 overflow-x-auto flex-nowrap pb-1">
          {["BTC", "ETH", "SOL", "BNB", "DOGE"].map(sym => (
            <Button
              key={sym}
              variant={selectedCoinTab === sym ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCoinTab(sym)}
              data-testid={`button-coin-tab-${sym}`}
            >
              {sym}
            </Button>
          ))}
        </div>

        {epLoading ? (
          <div className="space-y-1">{Array.from({length: 8}, (_, i) => <Skeleton key={i} className="h-10 w-full rounded-sm" />)}</div>
        ) : selectedCoinExchanges ? (
          <Card className="border-border bg-card">
            <CardContent className="p-0">
              <div className="flex items-center justify-between gap-2 p-3 border-b border-border text-[10px] text-muted-foreground uppercase font-medium flex-wrap">
                <span className="w-28">Exchange</span>
                <span className="flex-1 text-center">{selectedCoinTab} Spot Price</span>
                <span className="w-16 text-right">24h %</span>
              </div>
              {selectedCoinExchanges.exchanges.map((row, idx) => {
                const isPos = row.change24h >= 0;
                return (
                  <div key={row.exchange} className={`flex items-center justify-between gap-2 px-3 py-2 flex-wrap ${idx < selectedCoinExchanges.exchanges.length - 1 ? "border-b border-border/50" : ""}`} data-testid={`exchange-price-${row.exchange}-${row.symbol}`}>
                    <div className="w-28 flex items-center gap-2 flex-wrap">
                      <div className="h-5 w-5 rounded-full bg-card/80 border border-border flex items-center justify-center shrink-0">
                        <span className="text-[7px] font-bold">{row.exchange.substring(0, 2)}</span>
                      </div>
                      <span className="text-xs font-medium">{row.exchange}</span>
                    </div>
                    <span className="flex-1 text-center text-xs font-bold tabular-nums">{selectedCoinTab === "DOGE" ? `$${row.price.toFixed(5)}` : formatUSD(row.price)}</span>
                    <span className={`w-16 text-right text-xs font-medium ${isPos ? "text-emerald-400" : "text-red-400"}`}>
                      {isPos ? "+" : ""}{row.change24h.toFixed(2)}%
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border bg-card"><CardContent className="p-4 text-center text-xs text-muted-foreground">No data available</CardContent></Card>
        )}
      </div>
    </div>
  );
}
