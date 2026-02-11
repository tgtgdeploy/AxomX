import OpenAI from "openai";
import { storage } from "./storage";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface FearGreedData {
  value: number;
  classification: string;
}

async function fetchFearGreedIndex(): Promise<FearGreedData> {
  try {
    const res = await fetch("https://api.alternative.me/fng/?limit=1");
    const data = await res.json();
    return {
      value: parseInt(data.data[0].value),
      classification: data.data[0].value_classification,
    };
  } catch {
    return { value: 50, classification: "Neutral" };
  }
}

async function fetchCurrentPrice(asset: string): Promise<number> {
  const binanceSymbol = `${asset}USDT`;
  try {
    const res = await fetch(`https://api.binance.us/api/v3/ticker/price?symbol=${binanceSymbol}`);
    if (res.ok) {
      const data = await res.json();
      const price = parseFloat(data.price);
      if (price > 0) return price;
    }
  } catch {}

  const ids: Record<string, string> = {
    BTC: "bitcoin",
    ETH: "ethereum",
    SOL: "solana",
    BNB: "binancecoin",
    DOGE: "dogecoin",
  };
  try {
    const id = ids[asset] || "bitcoin";
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currency=usd`);
    const data = await res.json();
    return data[id]?.usd || 0;
  } catch {
    return 0;
  }
}

const TIMEFRAME_LABELS: Record<string, string> = {
  "5M": "5-minute",
  "15M": "15-minute",
  "30M": "30-minute",
  "1H": "1-hour",
  "4H": "4-hour",
  "1D": "1-day",
  "1W": "1-week",
};

const predictionCache: Map<string, { data: any; time: number }> = new Map();

export async function generatePrediction(asset: string, timeframe: string = "1H") {
  const cacheKey = `${asset}-${timeframe}`;
  const cached = predictionCache.get(cacheKey);
  if (cached && Date.now() - cached.time < 5 * 60 * 1000) {
    return cached.data;
  }

  const dbCached = await storage.getLatestPrediction(asset);
  if (dbCached && dbCached.createdAt && dbCached.timeframe === timeframe) {
    const age = Date.now() - new Date(dbCached.createdAt).getTime();
    if (age < 10 * 60 * 1000) {
      predictionCache.set(cacheKey, { data: dbCached, time: Date.now() });
      return dbCached;
    }
  }

  const [fearGreed, currentPrice] = await Promise.all([
    fetchFearGreedIndex(),
    fetchCurrentPrice(asset),
  ]);

  const tfLabel = TIMEFRAME_LABELS[timeframe] || timeframe;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a crypto market analyst. Analyze the market and provide a prediction in JSON format only. Response must be valid JSON with these fields: prediction (BULLISH/BEARISH/NEUTRAL), confidence (0-100), targetPrice (number), reasoning (1 sentence).`,
        },
        {
          role: "user",
          content: `Analyze ${asset} at $${currentPrice}. Fear & Greed Index: ${fearGreed.value} (${fearGreed.classification}). Predict the ${tfLabel} price movement for timeframe ${timeframe}.`,
        },
      ],
      max_tokens: 200,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);

    const expires = new Date();
    if (timeframe === "5M") expires.setMinutes(expires.getMinutes() + 5);
    else if (timeframe === "15M") expires.setMinutes(expires.getMinutes() + 15);
    else if (timeframe === "30M") expires.setMinutes(expires.getMinutes() + 30);
    else if (timeframe === "4H") expires.setHours(expires.getHours() + 4);
    else if (timeframe === "1D") expires.setDate(expires.getDate() + 1);
    else if (timeframe === "1W") expires.setDate(expires.getDate() + 7);
    else expires.setHours(expires.getHours() + 1);

    const saved = await storage.savePrediction({
      asset,
      prediction: parsed.prediction || "NEUTRAL",
      confidence: String(parsed.confidence || 50),
      targetPrice: String(parsed.targetPrice || currentPrice),
      currentPrice: String(currentPrice),
      fearGreedIndex: fearGreed.value,
      fearGreedLabel: fearGreed.classification,
      reasoning: parsed.reasoning || "",
      timeframe,
      expiresAt: expires,
    });

    predictionCache.set(cacheKey, { data: saved, time: Date.now() });
    return saved;
  } catch (error) {
    console.error("AI prediction error:", error);
    const fallback = dbCached || {
      asset,
      prediction: "NEUTRAL",
      confidence: "50",
      targetPrice: String(currentPrice),
      currentPrice: String(currentPrice),
      fearGreedIndex: fearGreed.value,
      fearGreedLabel: fearGreed.classification,
      reasoning: "Unable to generate prediction",
      timeframe,
    };
    predictionCache.set(cacheKey, { data: fallback, time: Date.now() });
    return fallback;
  }
}

export async function getFearGreedForDepth(): Promise<{
  buyPercent: string;
  sellPercent: string;
  index: number;
  label: string;
}> {
  const fg = await fetchFearGreedIndex();
  const buyPercent = Math.min(Math.max(fg.value, 15), 85);
  const sellPercent = 100 - buyPercent;
  return {
    buyPercent: buyPercent.toFixed(1),
    sellPercent: sellPercent.toFixed(1),
    index: fg.value,
    label: fg.classification,
  };
}
