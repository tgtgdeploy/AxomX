import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface NewsArticle {
  title: string;
  description: string;
  source: { name: string };
  publishedAt: string;
  url: string;
}

export interface NewsPrediction {
  id: string;
  headline: string;
  source: string;
  publishedAt: string;
  url: string;
  asset: string;
  prediction: "BULLISH" | "BEARISH" | "NEUTRAL";
  confidence: number;
  impact: "HIGH" | "MEDIUM" | "LOW";
  reasoning: string;
}

const newsCache: { data: NewsPrediction[] | null; timestamp: number } = {
  data: null,
  timestamp: 0,
};
const NEWS_CACHE_TTL = 10 * 60 * 1000;

async function fetchCryptoNews(): Promise<NewsArticle[]> {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) {
    console.error("NEWS_API_KEY not configured");
    return [];
  }

  try {
    const res = await fetch(
      `https://newsapi.org/v2/everything?q=bitcoin OR ethereum OR crypto OR cryptocurrency&language=en&sortBy=publishedAt&pageSize=15&apiKey=${apiKey}`,
      {
        headers: { Accept: "application/json" },
      }
    );

    if (!res.ok) {
      console.error("NewsAPI error:", res.status);
      return [];
    }

    const data = await res.json();
    return (data.articles || []).filter(
      (a: NewsArticle) => a.title && a.title !== "[Removed]" && a.description
    );
  } catch (error) {
    console.error("NewsAPI fetch error:", error);
    return [];
  }
}

function detectAsset(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("bitcoin") || lower.includes("btc")) return "BTC";
  if (lower.includes("ethereum") || lower.includes("eth")) return "ETH";
  if (lower.includes("solana") || lower.includes("sol")) return "SOL";
  if (lower.includes("bnb") || lower.includes("binance coin")) return "BNB";
  if (lower.includes("dogecoin") || lower.includes("doge")) return "DOGE";
  if (lower.includes("xrp") || lower.includes("ripple")) return "XRP";
  return "CRYPTO";
}

export async function getNewsPredictions(): Promise<NewsPrediction[]> {
  const now = Date.now();
  if (newsCache.data && now - newsCache.timestamp < NEWS_CACHE_TTL) {
    return newsCache.data;
  }

  const articles = await fetchCryptoNews();
  if (articles.length === 0) {
    return newsCache.data || [];
  }

  const top8 = articles.slice(0, 8);

  try {
    const newsText = top8
      .map(
        (a, i) =>
          `${i + 1}. "${a.title}" - ${a.source.name} (${a.description?.slice(0, 120) || ""})`
      )
      .join("\n");

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a crypto market analyst. Analyze each news headline for crypto market impact.
Return a JSON object with key "items" containing an array. Each element must have:
- "i": article number (1-8)
- "p": prediction ("BULLISH", "BEARISH", or "NEUTRAL")
- "c": confidence score (0-100)
- "imp": impact level ("HIGH", "MEDIUM", or "LOW")
- "r": one sentence reasoning about market impact
- "a": primary asset affected ("BTC","ETH","SOL","BNB","DOGE","XRP","CRYPTO")

Example: {"items":[{"i":1,"p":"BULLISH","c":75,"imp":"HIGH","r":"Institutional buying signals strong demand","a":"BTC"}]}`,
        },
        {
          role: "user",
          content: `Analyze these headlines:\n${newsText}`,
        },
      ],
      max_tokens: 1000,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content || "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error("Failed to parse OpenAI news response:", content);
      parsed = {};
    }

    const items: any[] = parsed.items || parsed.analyses || parsed.predictions || parsed.results || [];

    const predictions: NewsPrediction[] = top8.map((article, i) => {
      const match = items.find((item: any) => item.i === i + 1 || item.index === i + 1) || items[i];

      const pred = match?.p || match?.prediction || "NEUTRAL";
      const conf = match?.c || match?.confidence || 50;
      const imp = match?.imp || match?.impact || "MEDIUM";
      const reason = match?.r || match?.reasoning || "Market impact analysis pending";
      const asset = match?.a || match?.asset || detectAsset(article.title + " " + (article.description || ""));

      return {
        id: `news-${i}-${now}`,
        headline: article.title,
        source: article.source.name,
        publishedAt: article.publishedAt,
        url: article.url,
        asset,
        prediction: (["BULLISH", "BEARISH", "NEUTRAL"].includes(pred) ? pred : "NEUTRAL") as "BULLISH" | "BEARISH" | "NEUTRAL",
        confidence: Math.min(100, Math.max(0, Number(conf) || 50)),
        impact: (["HIGH", "MEDIUM", "LOW"].includes(imp) ? imp : "MEDIUM") as "HIGH" | "MEDIUM" | "LOW",
        reasoning: reason,
      };
    });

    newsCache.data = predictions;
    newsCache.timestamp = now;

    return predictions;
  } catch (error) {
    console.error("News AI analysis error:", error);

    const fallback: NewsPrediction[] = top8.map((article, i) => ({
      id: `news-${i}-${now}`,
      headline: article.title,
      source: article.source.name,
      publishedAt: article.publishedAt,
      url: article.url,
      asset: detectAsset(article.title + " " + (article.description || "")),
      prediction: "NEUTRAL" as const,
      confidence: 50,
      impact: "MEDIUM" as const,
      reasoning: "AI analysis temporarily unavailable",
    }));

    newsCache.data = fallback;
    newsCache.timestamp = now;

    return fallback;
  }
}
