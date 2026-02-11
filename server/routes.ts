import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generatePrediction, getFearGreedForDepth } from "./openai-predictions";
import { getExchangeAggregatedData } from "./exchange-data";

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  app.get("/api/config", (_req, res) => {
    res.json({
      thirdwebClientId: process.env.THIRDWEB_CLIENT_ID || "",
    });
  });

  app.post("/api/auth/wallet", async (req, res) => {
    try {
      const { walletAddress, refCode } = req.body;
      if (!walletAddress) {
        return res.status(400).json({ message: "Wallet address required" });
      }

      let profile = await storage.getProfileByWallet(walletAddress);
      if (!profile) {
        let referrerId: string | undefined;
        if (refCode) {
          const referrer = await storage.getProfileByRefCode(refCode);
          if (referrer) referrerId = referrer.id;
        }
        profile = await storage.createProfile({ walletAddress, referrerId });
      }

      res.json(profile);
    } catch (error: any) {
      console.error("Auth error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/profile/:walletAddress", async (req, res) => {
    try {
      const profile = await storage.getProfileByWallet(req.params.walletAddress);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      res.json(profile);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/strategies", async (_req, res) => {
    try {
      const list = await storage.getStrategies();
      res.json(list);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/predictions", async (_req, res) => {
    try {
      const list = await storage.getPredictionMarkets();
      res.json(list);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/vault/positions/:walletAddress", async (req, res) => {
    try {
      const profile = await storage.getProfileByWallet(req.params.walletAddress);
      if (!profile) return res.json([]);
      const positions = await storage.getVaultPositions(profile.id);
      res.json(positions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/vault/overview", async (_req, res) => {
    try {
      const overview = await storage.getVaultOverview();
      res.json(overview);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/vault/deposit", async (req, res) => {
    try {
      const { walletAddress, planType, amount, txHash } = req.body;
      if (!walletAddress || !planType || !amount) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      let profile = await storage.getProfileByWallet(walletAddress);
      if (!profile) {
        profile = await storage.createProfile({ walletAddress });
      }

      const rates: Record<string, { days: number; rate: string }> = {
        "5_DAYS": { days: 5, rate: "0.005" },
        "15_DAYS": { days: 15, rate: "0.007" },
        "45_DAYS": { days: 45, rate: "0.009" },
      };
      const plan = rates[planType] || rates["5_DAYS"];

      const endDate = new Date();
      endDate.setDate(endDate.getDate() + plan.days);

      const position = await storage.createVaultPosition({
        userId: profile.id,
        planType,
        principal: String(amount),
        dailyRate: plan.rate,
        endDate,
        status: "ACTIVE",
      });

      const tx = await storage.createTransaction({
        userId: profile.id,
        type: "DEPOSIT",
        token: "USDT",
        amount: String(amount),
        txHash: txHash || null,
        status: "CONFIRMED",
      });

      const newTotal = Number(profile.totalDeposited || 0) + Number(amount);
      await storage.updateProfile(profile.id, { totalDeposited: String(newTotal) });

      res.json({ position, transaction: tx });
    } catch (error: any) {
      console.error("Deposit error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/vault/withdraw", async (req, res) => {
    try {
      const { walletAddress, positionId } = req.body;
      if (!walletAddress || !positionId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const profile = await storage.getProfileByWallet(walletAddress);
      if (!profile) return res.status(404).json({ message: "Profile not found" });

      const positions = await storage.getVaultPositions(profile.id);
      const position = positions.find(p => p.id === positionId);
      if (!position) return res.status(404).json({ message: "Position not found" });

      const now = new Date();
      const start = new Date(position.startDate!);
      const daysElapsed = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const yieldAmount = Number(position.principal) * Number(position.dailyRate) * daysElapsed;
      const totalWithdraw = Number(position.principal) + yieldAmount;

      const isEarlyExit = position.endDate && now < new Date(position.endDate);

      await storage.updateVaultPosition(positionId, {
        status: isEarlyExit ? "EARLY_EXIT" : "COMPLETED",
      });

      const tx = await storage.createTransaction({
        userId: profile.id,
        type: "WITHDRAW",
        token: "USDT",
        amount: String(totalWithdraw.toFixed(6)),
        status: "CONFIRMED",
      });

      if (yieldAmount > 0) {
        await storage.createTransaction({
          userId: profile.id,
          type: "YIELD",
          token: "USDT",
          amount: String(yieldAmount.toFixed(6)),
          status: "CONFIRMED",
        });
      }

      const newTotal = Number(profile.totalWithdrawn || 0) + totalWithdraw;
      await storage.updateProfile(profile.id, { totalWithdrawn: String(newTotal) });

      res.json({ transaction: tx, yieldAmount: yieldAmount.toFixed(6), totalWithdraw: totalWithdraw.toFixed(6) });
    } catch (error: any) {
      console.error("Withdraw error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/transactions/:walletAddress", async (req, res) => {
    try {
      const profile = await storage.getProfileByWallet(req.params.walletAddress);
      if (!profile) return res.json([]);
      const type = req.query.type as string | undefined;
      const txs = await storage.getTransactions(profile.id, type);
      res.json(txs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/trade/bet", async (req, res) => {
    try {
      const { walletAddress, asset, direction, amount, duration, entryPrice } = req.body;
      if (!walletAddress || !asset || !direction || !amount) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      let profile = await storage.getProfileByWallet(walletAddress);
      if (!profile) {
        profile = await storage.createProfile({ walletAddress });
      }

      const bet = await storage.createTradeBet({
        userId: profile.id,
        asset,
        direction,
        amount: String(amount),
        duration: duration || "1min",
        entryPrice: entryPrice ? String(entryPrice) : null,
      });

      res.json(bet);
    } catch (error: any) {
      console.error("Bet error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/trade/stats/:walletAddress", async (req, res) => {
    try {
      const profile = await storage.getProfileByWallet(req.params.walletAddress);
      if (!profile) return res.json({ total: 0, wins: 0, losses: 0, totalStaked: "0" });
      const stats = await storage.getTradeStats(profile.id);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/trade/bets/:walletAddress", async (req, res) => {
    try {
      const profile = await storage.getProfileByWallet(req.params.walletAddress);
      if (!profile) return res.json([]);
      const bets = await storage.getTradeBets(profile.id);
      res.json(bets);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/ai/prediction/:asset", async (req, res) => {
    try {
      const timeframe = (req.query.timeframe as string) || "1H";
      const prediction = await generatePrediction(req.params.asset.toUpperCase(), timeframe);
      res.json(prediction);
    } catch (error: any) {
      console.error("Prediction error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/ai/fear-greed", async (_req, res) => {
    try {
      const data = await getFearGreedForDepth();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/exchange/depth/:symbol", async (req, res) => {
    try {
      const symbol = req.params.symbol || "BTC";
      const data = await getExchangeAggregatedData(symbol);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/strategy/overview", async (_req, res) => {
    try {
      const overview = await storage.getStrategyOverview();
      res.json(overview);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/strategy/subscribe", async (req, res) => {
    try {
      const { walletAddress, strategyId, amount } = req.body;
      if (!walletAddress || !strategyId || !amount) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const profile = await storage.getProfileByWallet(walletAddress);
      if (!profile) return res.status(404).json({ message: "Profile not found" });

      const strategies = await storage.getStrategies();
      const strategy = strategies.find(s => s.id === strategyId);
      if (!strategy) return res.status(404).json({ message: "Strategy not found" });

      if (strategy.isVipOnly && !profile.isVip) {
        return res.status(403).json({ message: "VIP subscription required" });
      }

      const sub = await storage.createStrategySubscription({
        userId: profile.id,
        strategyId,
        allocatedCapital: String(amount),
      });

      res.json(sub);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/subscriptions/:walletAddress", async (req, res) => {
    try {
      const profile = await storage.getProfileByWallet(req.params.walletAddress);
      if (!profile) return res.json([]);
      const subs = await storage.getStrategySubscriptions(profile.id);
      res.json(subs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/vip/subscribe", async (req, res) => {
    try {
      const { walletAddress } = req.body;
      if (!walletAddress) return res.status(400).json({ message: "Wallet required" });

      const profile = await storage.getProfileByWallet(walletAddress);
      if (!profile) return res.status(404).json({ message: "Profile not found" });

      const expires = new Date();
      expires.setMonth(expires.getMonth() + 1);

      const updated = await storage.updateProfile(profile.id, {
        isVip: true,
        vipExpiresAt: expires,
      });

      await storage.createTransaction({
        userId: profile.id,
        type: "VIP_PURCHASE",
        token: "USDT",
        amount: "99",
        status: "CONFIRMED",
      });

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/node/purchase", async (req, res) => {
    try {
      const { walletAddress, nodeType } = req.body;
      if (!walletAddress || !nodeType) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const profile = await storage.getProfileByWallet(walletAddress);
      if (!profile) return res.status(404).json({ message: "Profile not found" });

      const prices: Record<string, string> = { MAX: "1000", MINI: "500" };
      const price = prices[nodeType] || "500";

      const membership = await storage.createNodeMembership(profile.id, nodeType, price);
      await storage.updateProfile(profile.id, { nodeType });

      await storage.createTransaction({
        userId: profile.id,
        type: "NODE_PURCHASE",
        token: "USDT",
        amount: price,
        status: "CONFIRMED",
      });

      res.json(membership);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/node/:walletAddress", async (req, res) => {
    try {
      const profile = await storage.getProfileByWallet(req.params.walletAddress);
      if (!profile) return res.json(null);
      const membership = await storage.getNodeMembership(profile.id);
      res.json(membership || null);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const calendarCacheMap = new Map<string, { data: any; timestamp: number }>();
  const CALENDAR_CACHE_DURATION = 10 * 60 * 1000;

  async function getBinancePrice(symbol: string): Promise<number> {
    try {
      const pair = symbol === "DOGE" ? "DOGEUSDT" : `${symbol}USDT`;
      const res = await fetch(`https://api.binance.us/api/v3/ticker/price?symbol=${pair}`);
      if (res.ok) {
        const data = await res.json();
        return parseFloat(data.price) || 0;
      }
    } catch {}
    return 0;
  }

  async function getBinanceKlines(symbol: string, days: number): Promise<[number, number][]> {
    try {
      const pair = symbol === "DOGE" ? "DOGEUSDT" : `${symbol}USDT`;
      const endTime = Date.now();
      const startTime = endTime - days * 24 * 60 * 60 * 1000;
      const res = await fetch(
        `https://api.binance.us/api/v3/klines?symbol=${pair}&interval=1d&startTime=${startTime}&endTime=${endTime}&limit=${days + 1}`
      );
      if (res.ok) {
        const data = await res.json();
        return (data as any[]).map((k: any) => [k[0], parseFloat(k[4])]);
      }
    } catch {}
    return [];
  }

  app.get("/api/market/calendar", async (req, res) => {
    try {
      const coinMap: Record<string, string> = {
        BTC: "bitcoin", ETH: "ethereum", BNB: "binancecoin", DOGE: "dogecoin", SOL: "solana",
      };
      const symbol = (req.query.coin as string || "BTC").toUpperCase();
      const coinId = coinMap[symbol] || "bitcoin";

      const cached = calendarCacheMap.get(symbol);
      if (cached && Date.now() - cached.timestamp < CALENDAR_CACHE_DURATION) {
        return res.json(cached.data);
      }

      let prices: [number, number][] = [];
      let currentPrice = 0;

      try {
        const response = await fetch(
          `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=30&interval=daily`
        );
        if (response.ok) {
          const data = await response.json();
          prices = data.prices as [number, number][];
          currentPrice = prices[prices.length - 1]?.[1] || 0;
        }
      } catch {}

      if (prices.length < 2) {
        prices = await getBinanceKlines(symbol, 30);
        if (prices.length > 0) {
          currentPrice = prices[prices.length - 1][1];
        }
      }

      if (currentPrice === 0) {
        currentPrice = await getBinancePrice(symbol);
      }

      const dailyChanges: { date: string; day: number; change: number }[] = [];
      for (let i = 1; i < prices.length; i++) {
        const [ts, price] = prices[i];
        const prevPrice = prices[i - 1][1];
        if (prevPrice === 0) continue;
        const change = ((price - prevPrice) / prevPrice) * 100;
        const d = new Date(ts);
        dailyChanges.push({
          date: d.toISOString().split("T")[0],
          day: d.getDate(),
          change: parseFloat(change.toFixed(2)),
        });
      }

      const result = { dailyChanges, currentPrice };
      calendarCacheMap.set(symbol, { data: result, timestamp: Date.now() });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const fgiCacheMap = new Map<string, { data: any; timestamp: number }>();
  const FGI_CACHE_DURATION = 10 * 60 * 1000;

  function getFgiLabel(v: number): string {
    if (v <= 25) return "Extreme Fear";
    if (v <= 45) return "Fear";
    if (v <= 55) return "Neutral";
    if (v <= 75) return "Greed";
    return "Extreme Greed";
  }

  function addToBuckets(buckets: any, v: number) {
    if (v <= 25) buckets.extremeFear++;
    else if (v <= 45) buckets.fear++;
    else if (v <= 55) buckets.neutral++;
    else if (v <= 75) buckets.greed++;
    else buckets.extremeGreed++;
  }

  app.get("/api/market/fear-greed-history", async (req, res) => {
    try {
      const coinMap: Record<string, string> = {
        BTC: "bitcoin", ETH: "ethereum", BNB: "binancecoin", DOGE: "dogecoin", SOL: "solana",
      };
      const symbol = (req.query.coin as string || "BTC").toUpperCase();
      const coinId = coinMap[symbol] || "bitcoin";
      const cacheKey = symbol;

      const cached = fgiCacheMap.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < FGI_CACHE_DURATION) {
        return res.json(cached.data);
      }

      const fngRes = await fetch("https://api.alternative.me/fng/?limit=90");
      const fngData = await fngRes.json();
      const fgiEntries = fngData.data || [];

      if (symbol === "BTC") {
        const buckets = { extremeFear: 0, fear: 0, neutral: 0, greed: 0, extremeGreed: 0 };
        for (const entry of fgiEntries) {
          addToBuckets(buckets, parseInt(entry.value));
        }
        const current = fgiEntries[0]
          ? { value: parseInt(fgiEntries[0].value), label: fgiEntries[0].value_classification }
          : { value: 50, label: "Neutral" };

        const chartData: { date: string; fgi: number; btcPrice: number }[] = [];
        const reversed = [...fgiEntries].reverse();
        for (const entry of reversed) {
          const ts = parseInt(entry.timestamp) * 1000;
          const dateStr = new Date(ts).toISOString().split("T")[0];
          chartData.push({ date: dateStr, fgi: parseInt(entry.value), btcPrice: 0 });
        }

        const result = { current, buckets, totalDays: fgiEntries.length, chartData, lastUpdated: new Date().toISOString() };
        fgiCacheMap.set(cacheKey, { data: result, timestamp: Date.now() });
        return res.json(result);
      }

      let coinPrices: [number, number][] = [];
      let coinVolumes: [number, number][] = [];
      try {
        const coinRes = await fetch(
          `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=90&interval=daily`
        );
        if (coinRes.ok) {
          const coinData = await coinRes.json();
          coinPrices = (coinData.prices as [number, number][]) || [];
          coinVolumes = (coinData.total_volumes as [number, number][]) || [];
        }
      } catch {
        // CoinGecko rate limited - fall back to adjusted global FGI
      }

      const buckets = { extremeFear: 0, fear: 0, neutral: 0, greed: 0, extremeGreed: 0 };
      const chartData: { date: string; fgi: number; btcPrice: number }[] = [];

      if (coinPrices.length >= 2) {
        const dailyScores: { date: string; score: number; price: number }[] = [];
        for (let i = 1; i < coinPrices.length; i++) {
          const [ts, price] = coinPrices[i];
          const prevPrice = coinPrices[i - 1][1];
          const dateStr = new Date(ts).toISOString().split("T")[0];

          const priceChange1d = ((price - prevPrice) / prevPrice) * 100;

          const lookback7 = Math.max(0, i - 7);
          const price7dAgo = coinPrices[lookback7][1];
          const momentum7d = ((price - price7dAgo) / price7dAgo) * 100;

          const lookback14 = Math.max(0, i - 14);
          const priceSlice = coinPrices.slice(lookback14, i + 1).map(p => p[1]);
          const mean = priceSlice.reduce((a, b) => a + b, 0) / priceSlice.length;
          const variance = priceSlice.reduce((a, b) => a + (b - mean) ** 2, 0) / priceSlice.length;
          const volatility = Math.sqrt(variance) / mean * 100;

          let volChange = 0;
          if (coinVolumes.length > i && i > 0) {
            const vol = coinVolumes[i][1];
            const prevVol = coinVolumes[Math.max(0, i - 1)][1];
            volChange = prevVol > 0 ? ((vol - prevVol) / prevVol) * 100 : 0;
          }

          let score = 50;
          score += Math.max(-20, Math.min(20, momentum7d * 2.5));
          score += Math.max(-10, Math.min(10, priceChange1d * 3));
          score -= Math.max(0, Math.min(15, (volatility - 3) * 3));
          score += Math.max(-5, Math.min(5, volChange * 0.05));

          score = Math.max(0, Math.min(100, Math.round(score)));
          dailyScores.push({ date: dateStr, score, price });
        }

        for (const ds of dailyScores) {
          addToBuckets(buckets, ds.score);
          chartData.push({ date: ds.date, fgi: ds.score, btcPrice: ds.price });
        }

        const latest = dailyScores[dailyScores.length - 1];
        const current = { value: latest.score, label: getFgiLabel(latest.score) };

        const result = { current, buckets, totalDays: dailyScores.length, chartData, lastUpdated: new Date().toISOString() };
        fgiCacheMap.set(cacheKey, { data: result, timestamp: Date.now() });
        return res.json(result);
      }

      const baseFgi = fgiEntries[0] ? parseInt(fgiEntries[0].value) : 50;
      const coinOffsets: Record<string, number> = { ETH: -3, SOL: 8, BNB: 2, DOGE: 12 };
      const offset = coinOffsets[symbol] || 0;
      const adjusted = Math.max(0, Math.min(100, baseFgi + offset));

      const reversed = [...fgiEntries].reverse();
      for (const entry of reversed) {
        const rawVal = parseInt(entry.value);
        const coinVal = Math.max(0, Math.min(100, rawVal + offset));
        const ts = parseInt(entry.timestamp) * 1000;
        const dateStr = new Date(ts).toISOString().split("T")[0];
        addToBuckets(buckets, coinVal);
        chartData.push({ date: dateStr, fgi: coinVal, btcPrice: 0 });
      }

      const current = { value: adjusted, label: getFgiLabel(adjusted) };
      const result = { current, buckets, totalDays: fgiEntries.length, chartData, lastUpdated: new Date().toISOString() };
      fgiCacheMap.set(cacheKey, { data: result, timestamp: Date.now() });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/market/sentiment", async (_req, res) => {
    try {
      const symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "DOGEUSDT"];
      const symbolToName: Record<string, { name: string; symbol: string; id: string }> = {
        BTCUSDT: { name: "Bitcoin", symbol: "BTC", id: "bitcoin" },
        ETHUSDT: { name: "Ethereum", symbol: "ETH", id: "ethereum" },
        SOLUSDT: { name: "Solana", symbol: "SOL", id: "solana" },
        BNBUSDT: { name: "BNB", symbol: "BNB", id: "binancecoin" },
        DOGEUSDT: { name: "Dogecoin", symbol: "DOGE", id: "dogecoin" },
      };

      const [binanceRes, coingeckoRes] = await Promise.all([
        fetch("https://api.binance.us/api/v3/ticker/24hr"),
        fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,binancecoin,dogecoin,solana&order=market_cap_desc&sparkline=false&price_change_percentage=24h,7d"),
      ]);

      let binanceTickers: any[] = [];
      try { binanceTickers = await binanceRes.json(); } catch {}

      let coingeckoCoins: any[] = [];
      try { coingeckoCoins = await coingeckoRes.json(); } catch {}

      const coingeckoMap = new Map<string, any>();
      if (Array.isArray(coingeckoCoins)) {
        for (const c of coingeckoCoins) coingeckoMap.set(c.id, c);
      }

      const sentiment = symbols.map((pair) => {
        const meta = symbolToName[pair];
        const cgCoin = coingeckoMap.get(meta.id);
        const bnTicker = Array.isArray(binanceTickers) ? binanceTickers.find((t: any) => t.symbol === pair) : null;

        const bnVolume = bnTicker ? parseFloat(bnTicker.quoteVolume || "0") : 0;
        const bnChange = bnTicker ? parseFloat(bnTicker.priceChangePercent || "0") : 0;
        const bnPrice = bnTicker ? parseFloat(bnTicker.lastPrice || "0") : 0;
        const cgVol = cgCoin?.total_volume || 0;
        const cgChange = cgCoin?.price_change_percentage_24h || 0;
        const totalVolume = bnVolume + cgVol;
        const avgChange = bnTicker ? (bnChange + cgChange) / 2 : cgChange;
        const netFlowRaw = totalVolume * (avgChange / 100) * 0.15;

        return {
          id: meta.id,
          symbol: meta.symbol,
          name: meta.name,
          image: cgCoin?.image || "",
          price: bnPrice || cgCoin?.current_price || 0,
          change24h: avgChange,
          change7d: cgCoin?.price_change_percentage_7d_in_currency || 0,
          marketCap: cgCoin?.market_cap || 0,
          volume: totalVolume,
          netFlow: parseFloat(netFlowRaw.toFixed(0)),
          binanceVolume: bnVolume,
          exchanges: bnTicker ? ["Binance", "CoinGecko Aggregated"] : ["CoinGecko Aggregated"],
        };
      });

      sentiment.sort((a, b) => Math.abs(b.netFlow) - Math.abs(a.netFlow));
      const totalNetInflow = sentiment.reduce((s, c) => s + c.netFlow, 0);
      res.json({ coins: sentiment, totalNetInflow });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/market/futures-oi", async (_req, res) => {
    try {
      const pairs = [
        { symbol: "BTCUSDT", label: "BTC" },
        { symbol: "ETHUSDT", label: "ETH" },
        { symbol: "SOLUSDT", label: "SOL" },
      ];
      const exchanges = [
        { name: "Binance", weight: 0.38 },
        { name: "OKX", weight: 0.22 },
        { name: "Bybit", weight: 0.18 },
        { name: "Bitget", weight: 0.12 },
        { name: "Gate", weight: 0.10 },
      ];

      const tickerRes = await fetch("https://api.binance.us/api/v3/ticker/24hr");
      let allTickers: any[] = [];
      try { allTickers = await tickerRes.json(); } catch {}

      const results: any[] = [];
      let totalOI = 0;

      for (const pair of pairs) {
        const ticker = Array.isArray(allTickers) ? allTickers.find((t: any) => t.symbol === pair.symbol) : null;
        const price = ticker ? parseFloat(ticker.lastPrice || "0") : 0;
        const volume = ticker ? parseFloat(ticker.quoteVolume || "0") : 0;
        const priceChange = ticker ? parseFloat(ticker.priceChangePercent || "0") : 0;

        for (const ex of exchanges) {
          const oiBase = volume * ex.weight * 0.4;
          const jitter = 1 + (Math.random() * 0.06 - 0.03);
          const oiValue = oiBase * jitter;
          totalOI += oiValue;
          results.push({
            pair: pair.symbol,
            symbol: pair.label,
            exchange: ex.name,
            openInterestValue: oiValue,
            openInterest: price > 0 ? Math.round(oiValue / price) : 0,
            price,
            priceChange24h: priceChange,
          });
        }
      }

      res.json({ positions: results, totalOI });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/market/exchange-prices", async (_req, res) => {
    try {
      const coins = [
        { symbol: "BTC", binancePair: "BTCUSDT", krakenPair: "XXBTZUSD", coinbaseId: "BTC", cgId: "bitcoin" },
        { symbol: "ETH", binancePair: "ETHUSDT", krakenPair: "XETHZUSD", coinbaseId: "ETH", cgId: "ethereum" },
        { symbol: "SOL", binancePair: "SOLUSDT", krakenPair: "SOLUSD", coinbaseId: "SOL", cgId: "solana" },
        { symbol: "BNB", binancePair: "BNBUSDT", krakenPair: null, coinbaseId: null, cgId: "binancecoin" },
        { symbol: "DOGE", binancePair: "DOGEUSDT", krakenPair: "XDGUSD", coinbaseId: "DOGE", cgId: "dogecoin" },
      ];

      const exchangeNames = [
        "Binance", "OKX", "Bybit", "Bitget", "Kraken",
        "Coinbase", "Gate", "MEXC", "CoinEx", "LBank",
        "Hyperliquid", "Bitmex", "Crypto.com", "Bitunix",
        "KuCoin", "Huobi",
      ];

      const coinbaseSymbols = coins.map(c => c.symbol);
      const [bnTickersRaw, krakenRaw, cgRaw, ...coinbaseResults] = await Promise.all([
        fetch("https://api.binance.us/api/v3/ticker/24hr").then(r => r.json()).catch(() => []),
        fetch("https://api.kraken.com/0/public/Ticker?pair=XBTUSD,XETHZUSD,SOLUSD,XDGUSD").then(r => r.json()).catch(() => null),
        fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,binancecoin,dogecoin&vs_currencies=usd").then(r => r.json()).catch(() => null),
        ...coinbaseSymbols.map(sym =>
          fetch(`https://api.coinbase.com/v2/prices/${sym}-USD/spot`).then(r => r.json()).catch(() => null)
        ),
      ]);

      const bnTickers = Array.isArray(bnTickersRaw) ? bnTickersRaw : [];
      const krakenResult = krakenRaw?.result || {};

      const coinbasePrices: Record<string, number> = {};
      coinbaseSymbols.forEach((sym, i) => {
        const amt = coinbaseResults[i]?.data?.amount;
        if (amt) coinbasePrices[sym] = parseFloat(amt);
      });

      const allCoinsData: any[] = [];

      for (const coin of coins) {
        const bnTicker = bnTickers.find((t: any) => t.symbol === coin.binancePair);
        const bnPrice = bnTicker ? parseFloat(bnTicker.lastPrice || "0") : 0;
        const bnChange = bnTicker ? parseFloat(bnTicker.priceChangePercent || "0") : 0;

        let krakenPrice = 0;
        if (coin.krakenPair && krakenResult[coin.krakenPair]) {
          krakenPrice = parseFloat(krakenResult[coin.krakenPair].c?.[0] || "0");
        }

        const cbPrice = coinbasePrices[coin.symbol] || 0;
        const cgPrice = cgRaw?.[coin.cgId]?.usd || 0;
        const basePrice = bnPrice || krakenPrice || cbPrice || cgPrice || 0;
        if (basePrice === 0) continue;

        const realPrices: Record<string, number> = {};
        if (bnPrice > 0) realPrices["Binance"] = bnPrice;
        if (krakenPrice > 0) realPrices["Kraken"] = krakenPrice;
        if (cbPrice > 0) realPrices["Coinbase"] = cbPrice;
        if (cgPrice > 0) realPrices["CoinGecko"] = cgPrice;

        const spreadFactor = basePrice * 0.0003;

        const rows = exchangeNames.map((exName) => {
          const realP = realPrices[exName];
          const spread = (Math.random() * 2 - 1) * spreadFactor;
          const price = realP || (basePrice + spread);
          const change = bnChange + (Math.random() * 0.4 - 0.2);
          return {
            exchange: exName,
            pair: `${coin.symbol}/USDT`,
            symbol: coin.symbol,
            price: parseFloat(price.toFixed(coin.symbol === "DOGE" ? 5 : 2)),
            change24h: parseFloat(change.toFixed(2)),
            isReal: !!realP,
          };
        });

        allCoinsData.push({
          symbol: coin.symbol,
          basePrice,
          baseChange: bnChange,
          exchanges: rows,
        });
      }

      res.json(allCoinsData);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/hedge/positions/:walletAddress", async (req, res) => {
    try {
      const profile = await storage.getProfileByWallet(req.params.walletAddress);
      if (!profile) return res.json([]);
      const positions = await storage.getHedgePositions(profile.id);
      res.json(positions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/hedge/purchase", async (req, res) => {
    try {
      const { walletAddress, amount } = req.body;
      if (!walletAddress || !amount || Number(amount) < 100) {
        return res.status(400).json({ message: "Minimum 100 USDT required" });
      }

      let profile = await storage.getProfileByWallet(walletAddress);
      if (!profile) {
        profile = await storage.createProfile({ walletAddress });
      }

      const hedge = await storage.createHedgePosition({
        userId: profile.id,
        amount: String(amount),
        purchaseAmount: String(amount),
        status: "ACTIVE",
      });

      await storage.createInsurancePurchase({
        userId: profile.id,
        amount: String(amount),
        status: "ACTIVE",
      });

      await storage.createTransaction({
        userId: profile.id,
        type: "HEDGE_PURCHASE",
        token: "USDT",
        amount: String(amount),
        status: "CONFIRMED",
      });

      res.json(hedge);
    } catch (error: any) {
      console.error("Hedge purchase error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/hedge/insurance-pool", async (_req, res) => {
    try {
      const overview = await storage.getInsurancePoolOverview();
      res.json(overview);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/hedge/purchases/:walletAddress", async (req, res) => {
    try {
      const profile = await storage.getProfileByWallet(req.params.walletAddress);
      if (!profile) return res.json([]);
      const purchases = await storage.getInsurancePurchases(profile.id);
      res.json(purchases);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/ai/predictions/list", async (_req, res) => {
    try {
      const assets = ["BTC", "ETH", "SOL", "BNB", "DOGE"];
      const predictions = [];
      for (const asset of assets) {
        const pred = await storage.getLatestPrediction(asset);
        if (pred) predictions.push(pred);
      }
      res.json(predictions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/referrals/:walletAddress", async (req, res) => {
    try {
      const profile = await storage.getProfileByWallet(req.params.walletAddress);
      if (!profile) return res.json({ referrals: [], teamSize: 0, teamPerformance: {} });

      const directReferrals = await storage.getReferrals(profile.id);

      const teamData = [];
      for (const ref of directReferrals) {
        const subReferrals = await storage.getReferrals(ref.id);
        teamData.push({
          ...ref,
          level: 1,
          subReferrals: subReferrals.map(s => ({ ...s, level: 2 })),
        });
      }

      const totalTeamSize = directReferrals.length +
        teamData.reduce((sum, t) => sum + (t.subReferrals?.length || 0), 0);

      res.json({
        referrals: teamData,
        teamSize: totalTeamSize,
        directCount: directReferrals.length,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  return httpServer;
}
