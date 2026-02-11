import { useState, useEffect } from "react";

interface ExchangeRow {
  name: string;
  buy: number;
  sell: number;
}

const EXCHANGES: ExchangeRow[] = [
  { name: "LBank", buy: 48.9, sell: 51.1 },
  { name: "CoinEx", buy: 47.9, sell: 52.1 },
  { name: "Gate", buy: 47.0, sell: 53.0 },
  { name: "Bitunix", buy: 47.0, sell: 53.0 },
  { name: "Bitmex", buy: 46.5, sell: 53.5 },
  { name: "Kraken", buy: 46.5, sell: 53.5 },
  { name: "MEXC", buy: 44.4, sell: 55.6 },
  { name: "Crypto.com", buy: 46.2, sell: 53.8 },
  { name: "Coinbase", buy: 46.0, sell: 54.0 },
  { name: "Binance", buy: 45.8, sell: 54.2 },
  { name: "OKX", buy: 45.8, sell: 54.2 },
  { name: "Bitget", buy: 45.4, sell: 54.6 },
  { name: "Bybit", buy: 44.3, sell: 55.7 },
  { name: "Hyperliquid", buy: 43.5, sell: 56.5 },
];

interface ExchangeDepthProps {
  symbol: string;
}

export function ExchangeDepth({ symbol }: ExchangeDepthProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div data-testid="section-exchange-depth">
      <h3 className="mb-3 text-sm font-semibold">Order Book Depth - {symbol}</h3>
      <div className="space-y-1.5">
        {EXCHANGES.map((ex, index) => (
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
            <span className="w-10 text-[10px] text-muted-foreground text-right">{ex.buy}%</span>
            <div className="flex-1 flex h-4 overflow-hidden rounded-sm">
              <div
                className="bg-green-500/50 transition-all duration-700 ease-out"
                style={{ width: mounted ? `${ex.buy}%` : "0%" }}
              />
              <div
                className="bg-red-500/50 transition-all duration-700 ease-out"
                style={{ width: mounted ? `${ex.sell}%` : "0%" }}
              />
            </div>
            <span className="w-10 text-[10px] text-muted-foreground">{ex.sell}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
