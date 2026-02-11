import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatUSD, formatCompact } from "@/lib/constants";
import { ArrowLeft, ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from "lucide-react";
import { useLocation } from "wouter";

interface CalendarDay {
  date: string;
  day: number;
  change: number;
}

interface CalendarData {
  dailyChanges: CalendarDay[];
  currentPrice: number;
}

interface FearGreedHistory {
  current: { value: number; label: string };
  buckets: { extremeFear: number; fear: number; neutral: number; greed: number; extremeGreed: number };
  totalDays: number;
}

interface SentimentCoin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  price: number;
  change24h: number;
  change7d: number;
  marketCap: number;
  volume: number;
  netFlow: number;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function FearGreedGauge({ value, label }: { value: number; label: string }) {
  const angle = -90 + (value / 100) * 180;
  const gaugeColor =
    value <= 25 ? "#ef4444" :
    value <= 45 ? "#f97316" :
    value <= 55 ? "#eab308" :
    value <= 75 ? "#84cc16" :
    "#22c55e";

  return (
    <div className="flex flex-col items-center py-4" data-testid="fear-greed-gauge">
      <svg viewBox="0 0 200 120" className="w-48 h-28">
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="25%" stopColor="#f97316" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="75%" stopColor="#84cc16" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <g transform={`rotate(${angle}, 100, 100)`}>
          <line x1="100" y1="100" x2="100" y2="35" stroke={gaugeColor} strokeWidth="3" strokeLinecap="round" />
          <circle cx="100" cy="100" r="6" fill={gaugeColor} />
        </g>
        <text x="20" y="118" fontSize="8" fill="hsl(150,5%,55%)" textAnchor="start">Extreme Fear</text>
        <text x="100" y="20" fontSize="8" fill="hsl(150,5%,55%)" textAnchor="middle">Neutral</text>
        <text x="180" y="118" fontSize="8" fill="hsl(150,5%,55%)" textAnchor="end">Extreme Greed</text>
      </svg>
      <div className="text-3xl font-bold mt-2" style={{ color: gaugeColor }} data-testid="text-fear-greed-value">
        {value}
      </div>
      <div className="text-xs text-muted-foreground" data-testid="text-fear-greed-label">{label}</div>
    </div>
  );
}

function PriceCalendar({ data }: { data: CalendarData | undefined }) {
  const [monthOffset, setMonthOffset] = useState(0);

  const calendarData = useMemo(() => {
    if (!data?.dailyChanges?.length) return null;

    const now = new Date();
    const targetMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const year = targetMonth.getFullYear();
    const month = targetMonth.getMonth();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const changeMap = new Map<number, number>();
    for (const dc of data.dailyChanges) {
      const d = new Date(dc.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        changeMap.set(dc.day, dc.change);
      }
    }

    const monthName = targetMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

    return { year, month, firstDayOfWeek, daysInMonth, changeMap, monthName };
  }, [data, monthOffset]);

  if (!calendarData) {
    return <Skeleton className="h-64 w-full rounded-md" />;
  }

  const { firstDayOfWeek, daysInMonth, changeMap, monthName } = calendarData;
  const cells: (null | { day: number; change: number | undefined })[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, change: changeMap.get(d) });

  return (
    <div data-testid="price-calendar">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <Button size="icon" variant="ghost" onClick={() => setMonthOffset(o => o - 1)} data-testid="button-prev-month">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-bold" data-testid="text-calendar-month">{monthName}</span>
        <Button size="icon" variant="ghost" onClick={() => setMonthOffset(o => Math.min(o + 1, 0))} disabled={monthOffset >= 0} data-testid="button-next-month">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-[2px] mb-1">
        {WEEKDAYS.map((wd) => (
          <div key={wd} className="text-center text-[10px] text-muted-foreground font-medium py-1">
            {wd}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-[2px]">
        {cells.map((cell, i) => {
          if (!cell) {
            return <div key={`empty-${i}`} className="h-12" />;
          }

          const change = cell.change;
          const hasData = change !== undefined;
          let bgClass = "bg-card/30";
          let textColor = "text-muted-foreground";

          if (hasData) {
            if (change > 3) {
              bgClass = "bg-cyan-600/60";
              textColor = "text-cyan-200";
            } else if (change > 0) {
              bgClass = "bg-cyan-600/30";
              textColor = "text-cyan-300";
            } else if (change > -3) {
              bgClass = "bg-red-500/30";
              textColor = "text-red-300";
            } else {
              bgClass = "bg-red-500/60";
              textColor = "text-red-200";
            }
          }

          return (
            <div
              key={`day-${cell.day}`}
              className={`h-12 rounded-[3px] flex flex-col items-center justify-center ${bgClass}`}
              data-testid={`calendar-day-${cell.day}`}
            >
              <span className="text-[10px] text-muted-foreground">{cell.day}</span>
              {hasData && (
                <span className={`text-[10px] font-bold ${textColor}`}>
                  {change > 0 ? "+" : ""}{change.toFixed(2)}%
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MarketPage() {
  const [, navigate] = useLocation();

  const { data: calendarData, isLoading: calLoading } = useQuery<CalendarData>({
    queryKey: ["/api/market/calendar"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: fgHistory, isLoading: fgLoading } = useQuery<FearGreedHistory>({
    queryKey: ["/api/market/fear-greed-history"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: sentiment, isLoading: sentLoading } = useQuery<SentimentCoin[]>({
    queryKey: ["/api/market/sentiment"],
    staleTime: 60 * 1000,
  });

  return (
    <div className="space-y-4 pb-20" data-testid="page-market">
      <div
        className="gradient-green-dark rounded-b-2xl p-4 pt-2"
        style={{ animation: "fadeSlideIn 0.5s ease-out" }}
      >
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Button size="icon" variant="ghost" onClick={() => navigate("/")} data-testid="button-back-home">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-bold">Market Analysis</h1>
        </div>

        {calLoading ? (
          <Skeleton className="h-8 w-48 mb-2" />
        ) : (
          <div className="mb-3">
            <span className="text-xs text-muted-foreground">BTC Price</span>
            <div className="text-2xl font-bold" data-testid="text-btc-price">
              {formatUSD(calendarData?.currentPrice || 0)}
            </div>
          </div>
        )}

        <Card className="border-border bg-card/50">
          <CardContent className="p-3">
            {calLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <PriceCalendar data={calendarData} />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="px-4" style={{ animation: "fadeSlideIn 0.6s ease-out" }}>
        <h2 className="text-sm font-bold mb-3">Fear & Greed Index</h2>

        {fgLoading ? (
          <Skeleton className="h-48 w-full rounded-md" />
        ) : fgHistory ? (
          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <div className="space-y-2 mb-2">
                {[
                  { label: "Extreme Fear", value: fgHistory.buckets.extremeFear, color: "text-red-400" },
                  { label: "Fear", value: fgHistory.buckets.fear, color: "text-orange-400" },
                  { label: "Neutral", value: fgHistory.buckets.neutral, color: "text-yellow-400" },
                  { label: "Greed", value: fgHistory.buckets.greed, color: "text-lime-400" },
                  { label: "Extreme Greed", value: fgHistory.buckets.extremeGreed, color: "text-primary" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-2 text-xs">
                    <span className={item.color}>{item.label}</span>
                    <span className="text-muted-foreground">{item.value} days</span>
                  </div>
                ))}
              </div>

              <FearGreedGauge
                value={fgHistory.current.value}
                label={fgHistory.current.label}
              />
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div className="px-4" style={{ animation: "fadeSlideIn 0.7s ease-out" }}>
        <h2 className="text-sm font-bold mb-3">Market Sentiment</h2>
        {sentLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-md" />
            ))}
          </div>
        ) : sentiment && sentiment.length > 0 ? (
          <div className="space-y-2">
            {sentiment.map((coin) => {
              const isPositive = coin.change24h >= 0;
              return (
                <Card key={coin.id} className="border-border bg-card" data-testid={`sentiment-card-${coin.symbol}`}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <img src={coin.image} alt={coin.name} className="h-6 w-6 rounded-full shrink-0" />
                        <div>
                          <div className="text-xs font-bold">{coin.symbol}</div>
                          <div className="text-[10px] text-muted-foreground">{coin.name}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold" data-testid={`text-price-${coin.symbol}`}>
                          {formatUSD(coin.price)}
                        </div>
                        <Badge
                          className={`text-[9px] no-default-hover-elevate no-default-active-elevate ${
                            isPositive ? "bg-primary/15 text-neon-value" : "bg-red-500/15 text-red-400"
                          }`}
                        >
                          {isPositive ? <TrendingUp className="mr-0.5 h-2.5 w-2.5" /> : <TrendingDown className="mr-0.5 h-2.5 w-2.5" />}
                          {isPositive ? "+" : ""}{coin.change24h.toFixed(2)}%
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-2 text-[10px] text-muted-foreground flex-wrap">
                      <span>Vol: {formatCompact(coin.volume)}</span>
                      <span className={coin.netFlow >= 0 ? "text-neon-value" : "text-red-400"}>
                        Net Flow: {coin.netFlow >= 0 ? "+" : ""}{formatCompact(Math.abs(coin.netFlow))}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
