export const VAULT_PLANS = {
  "5_DAYS": { days: 5, dailyRate: 0.005, label: "5 Days", apr: "36.5%" },
  "15_DAYS": { days: 15, dailyRate: 0.007, label: "15 Days", apr: "51.1%" },
  "45_DAYS": { days: 45, dailyRate: 0.009, label: "45 Days", apr: "65.7%" },
} as const;

export const RANKS = [
  { level: "V1", personal: 100, team: 5000, commission: 0.06 },
  { level: "V2", personal: 100, team: 20000, commission: 0.10 },
  { level: "V3", personal: 100, team: 50000, commission: 0.15 },
  { level: "V4", personal: 100, team: 100000, commission: 0.20 },
  { level: "V5", personal: 1000, team: 500000, commission: 0.25 },
  { level: "V6", personal: 1000, team: 1000000, commission: 0.30 },
  { level: "V7", personal: 1000, team: 3000000, commission: 0.50 },
] as const;

export const NODE_CONFIG = {
  MAX: { amount: 6000, duration: 120, fixedReturn: 0.10, rankUnlock: "V6" },
  MINI: { amount: 1000, duration: 90, fixedReturn: 0.10, rankUnlock: "V4" },
} as const;

export const MOCK_PRICES = {
  BTC: { price: 66098.10, change: -4.75 },
  ETH: { price: 1935.42, change: -2.13 },
  BNB: { price: 598.20, change: +1.24 },
  DOGE: { price: 0.1642, change: -5.80 },
  SOL: { price: 142.55, change: +3.12 },
} as const;

export const EXCHANGES = [
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
] as const;

export function formatUSD(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCompact(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
