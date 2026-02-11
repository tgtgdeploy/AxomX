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

  app.get("/api/market/calendar", async (_req, res) => {
    try {
      const response = await fetch(
        "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=30&interval=daily"
      );
      if (!response.ok) throw new Error("Failed to fetch price data");
      const data = await response.json();
      const prices = data.prices as [number, number][];

      const dailyChanges: { date: string; day: number; change: number }[] = [];
      for (let i = 1; i < prices.length; i++) {
        const [ts, price] = prices[i];
        const prevPrice = prices[i - 1][1];
        const change = ((price - prevPrice) / prevPrice) * 100;
        const d = new Date(ts);
        dailyChanges.push({
          date: d.toISOString().split("T")[0],
          day: d.getDate(),
          change: parseFloat(change.toFixed(2)),
        });
      }

      res.json({ dailyChanges, currentPrice: prices[prices.length - 1]?.[1] || 0 });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/market/fear-greed-history", async (_req, res) => {
    try {
      const [fngRes, btcRes] = await Promise.all([
        fetch("https://api.alternative.me/fng/?limit=365"),
        fetch("https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=365&interval=daily"),
      ]);
      const fngData = await fngRes.json();
      const entries = fngData.data || [];

      const buckets = { extremeFear: 0, fear: 0, neutral: 0, greed: 0, extremeGreed: 0 };
      for (const entry of entries) {
        const v = parseInt(entry.value);
        if (v <= 25) buckets.extremeFear++;
        else if (v <= 45) buckets.fear++;
        else if (v <= 55) buckets.neutral++;
        else if (v <= 75) buckets.greed++;
        else buckets.extremeGreed++;
      }

      const current = entries[0] ? { value: parseInt(entries[0].value), label: entries[0].value_classification } : { value: 50, label: "Neutral" };

      let chartData: { date: string; fgi: number; btcPrice: number }[] = [];
      try {
        const btcData = await btcRes.json();
        const btcPrices = (btcData.prices as [number, number][]) || [];
        const btcMap = new Map<string, number>();
        for (const [ts, price] of btcPrices) {
          const dateStr = new Date(ts).toISOString().split("T")[0];
          btcMap.set(dateStr, price);
        }
        const reversedEntries = [...entries].reverse();
        for (const entry of reversedEntries) {
          const ts = parseInt(entry.timestamp) * 1000;
          const dateStr = new Date(ts).toISOString().split("T")[0];
          const btcPrice = btcMap.get(dateStr);
          if (btcPrice) {
            chartData.push({ date: dateStr, fgi: parseInt(entry.value), btcPrice });
          }
        }
      } catch {
        // chart data unavailable
      }

      res.json({ current, buckets, totalDays: entries.length, chartData });
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
