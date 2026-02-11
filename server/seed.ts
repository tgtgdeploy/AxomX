import { db } from "./db";
import { strategies, predictionMarkets } from "@shared/schema";
import { sql } from "drizzle-orm";

export async function seedDatabase() {
  try {
    const existing = await db.select().from(strategies).limit(1);
    if (existing.length > 0) {
      console.log("Database already seeded");
      return;
    }

    await db.insert(strategies).values([
      {
        name: "Vault AI Strategy - VIP Exclusive",
        description: "AI-powered trading across multiple exchanges",
        leverage: "3X-10X",
        winRate: "89.29",
        monthlyReturn: "-5.72",
        totalAum: "92140.83",
        status: "ACTIVE",
        isHot: false,
        isVipOnly: true,
      },
      {
        name: "Multi Currency Strategy, High-Risk",
        description: "Diversified high-risk multi-currency approach",
        leverage: "3X-10X",
        winRate: "89.29",
        monthlyReturn: "14.41",
        totalAum: "156200.00",
        status: "ACTIVE",
        isHot: true,
        isVipOnly: false,
      },
      {
        name: "VIP PRO Exclusive AI Trading Model",
        description: "Adaptive strategy with machine learning optimization",
        leverage: "3X-10X",
        winRate: "100.00",
        monthlyReturn: "100.00",
        totalAum: "450000.00",
        status: "ACTIVE",
        isHot: false,
        isVipOnly: true,
      },
      {
        name: "GPT-5 Quantitative Engine",
        description: "GPT-5 powered quantitative trading engine",
        leverage: "3X-10X",
        winRate: "83.87",
        monthlyReturn: "39.36",
        totalAum: "280000.00",
        status: "ACTIVE",
        isHot: false,
        isVipOnly: false,
      },
      {
        name: "Crypto Alpha Mixed Index",
        description: "Balanced crypto index fund with AI rebalancing",
        leverage: "3X-10X",
        winRate: "100.00",
        monthlyReturn: "100.00",
        totalAum: "320000.00",
        status: "ACTIVE",
        isHot: false,
        isVipOnly: true,
      },
      {
        name: "Cortex Alpha Market Intelligence",
        description: "Autonomous market decision intelligence system",
        leverage: "3X-10X",
        winRate: "96.15",
        monthlyReturn: "100.00",
        totalAum: "198500.00",
        status: "ACTIVE",
        isHot: false,
        isVipOnly: false,
      },
    ]);

    const now = new Date();
    const hour1 = new Date(now);
    hour1.setHours(hour1.getHours() + 1);
    const hour4 = new Date(now);
    hour4.setHours(hour4.getHours() + 4);

    await db.insert(predictionMarkets).values([
      {
        asset: "BTC",
        timeframe: "1H",
        targetPrice1: "66426",
        targetPrice2: "66691",
        yesOdds: "38.40",
        noOdds: "61.60",
        expiresAt: hour1,
        status: "OPEN",
      },
      {
        asset: "BTC",
        timeframe: "1H",
        targetPrice1: "66426",
        targetPrice2: "66691",
        yesOdds: "51.70",
        noOdds: "48.30",
        expiresAt: hour1,
        status: "OPEN",
      },
      {
        asset: "BTC",
        timeframe: "4H",
        targetPrice1: "67552",
        targetPrice2: "67949",
        yesOdds: "29.50",
        noOdds: "70.50",
        expiresAt: hour4,
        status: "OPEN",
      },
      {
        asset: "ETH",
        timeframe: "1H",
        targetPrice1: "1927",
        targetPrice2: "1935",
        yesOdds: "17.90",
        noOdds: "82.10",
        expiresAt: hour1,
        status: "OPEN",
      },
      {
        asset: "SOL",
        timeframe: "1H",
        targetPrice1: "142",
        targetPrice2: "145",
        yesOdds: "42.30",
        noOdds: "57.70",
        expiresAt: hour1,
        status: "OPEN",
      },
      {
        asset: "BNB",
        timeframe: "4H",
        targetPrice1: "605",
        targetPrice2: "612",
        yesOdds: "53.90",
        noOdds: "46.10",
        expiresAt: hour4,
        status: "OPEN",
      },
    ]);

    console.log("Database seeded successfully");
  } catch (error) {
    console.error("Seed error:", error);
  }
}
