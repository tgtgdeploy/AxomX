export const VAULT_CHART_PERIODS = ["7D", "14D", "30D", "ALL"] as const;
export type VaultChartPeriod = (typeof VAULT_CHART_PERIODS)[number];

export const STRATEGY_FILTERS = ["All", "Trending", "Quantitative", "Completed"] as const;
export const PREDICTION_TIMEFRAMES = ["All", "15min", "1H", "4H"] as const;

export const TRADE_ASSETS = ["BTC", "ETH", "SOL", "BNB"] as const;
export const DASHBOARD_ASSETS = ["BTC", "ETH", "BNB", "DOGE", "SOL"] as const;

export const BET_DEFAULTS = {
  minAmount: 1,
  step: 5,
  defaultAmount: 10,
  defaultDuration: "1min",
  payoutPercent: 84,
};

export const PREDICTION_GRID_CONFIG = {
  totalCells: 54,
  columns: 9,
  hitThreshold: 0.6,
  directionThreshold: 0.5,
};

export const VAULT_PLANS = {
  "5_DAYS": { days: 5, dailyRate: 0.005, label: "5 Days", apr: "36.5%" },
  "15_DAYS": { days: 15, dailyRate: 0.007, label: "15 Days", apr: "51.1%" },
  "45_DAYS": { days: 45, dailyRate: 0.009, label: "45 Days", apr: "65.7%" },
} as const;

export const SETTINGS_ITEMS = [
  { key: "leaderboard", label: "Leaderboard" },
  { key: "contact-us", label: "Contact Us" },
  { key: "language-settings", label: "Language Settings" },
  { key: "disconnect-wallet", label: "Disconnect Wallet" },
] as const;
