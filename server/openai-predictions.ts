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
  const ids: Record<string, string> = {
    BTC: "bitcoin",
    ETH: "ethereum",
    SOL: "solana",
    BNB: "binancecoin",
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

export async function generatePrediction(asset: string) {
  const cached = await storage.getLatestPrediction(asset);
  if (cached && cached.createdAt) {
    const age = Date.now() - new Date(cached.createdAt).getTime();
    if (age < 10 * 60 * 1000) return cached;
  }

  const [fearGreed, currentPrice] = await Promise.all([
    fetchFearGreedIndex(),
    fetchCurrentPrice(asset),
  ]);

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
          content: `Analyze ${asset} at $${currentPrice}. Fear & Greed Index: ${fearGreed.value} (${fearGreed.classification}). Predict the 1H price movement.`,
        },
      ],
      max_tokens: 200,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);

    const expires = new Date();
    expires.setHours(expires.getHours() + 1);

    const saved = await storage.savePrediction({
      asset,
      prediction: parsed.prediction || "NEUTRAL",
      confidence: String(parsed.confidence || 50),
      targetPrice: String(parsed.targetPrice || currentPrice),
      currentPrice: String(currentPrice),
      fearGreedIndex: fearGreed.value,
      fearGreedLabel: fearGreed.classification,
      reasoning: parsed.reasoning || "",
      timeframe: "1H",
      expiresAt: expires,
    });

    return saved;
  } catch (error) {
    console.error("AI prediction error:", error);
    return cached || {
      asset,
      prediction: "NEUTRAL",
      confidence: "50",
      targetPrice: String(currentPrice),
      currentPrice: String(currentPrice),
      fearGreedIndex: fearGreed.value,
      fearGreedLabel: fearGreed.classification,
      reasoning: "Unable to generate prediction",
      timeframe: "1H",
    };
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
