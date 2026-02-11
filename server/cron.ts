import { storage } from "./storage";
import { generatePrediction } from "./openai-predictions";
import { getNewsPredictions } from "./news-predictions";
import { getExchangeAggregatedData } from "./exchange-data";

const ASSETS = ["BTC", "ETH", "SOL", "BNB", "DOGE"];
const INTERVAL = 60 * 1000;

let running = false;

async function refreshAll() {
  if (running) return;
  running = true;
  const start = Date.now();

  try {
    await Promise.all([
      refreshExchangeDepth(),
      updateStrategyMetrics(),
    ]);

    await Promise.all([
      refreshAiPredictions(),
      refreshNewsPredictions(),
    ]);

    await cleanOldData();
  } catch (e: any) {
    console.error("[CRON] Cycle error:", e.message);
  }

  running = false;
  console.log(`[CRON] Cycle completed in ${((Date.now() - start) / 1000).toFixed(1)}s`);
}

async function refreshAiPredictions() {
  let success = 0;
  const promises = ASSETS.map(async (asset) => {
    try {
      await generatePrediction(asset, "1H");
      success++;
    } catch (e: any) {
      console.error(`[CRON] AI prediction failed for ${asset}:`, e.message);
    }
  });
  await Promise.all(promises);
  console.log(`[CRON] AI predictions: ${success}/${ASSETS.length}`);
}

async function refreshNewsPredictions() {
  try {
    const predictions = await getNewsPredictions();
    console.log(`[CRON] News predictions: ${predictions.length} items`);
  } catch (e: any) {
    console.error("[CRON] News predictions failed:", e.message);
  }
}

async function refreshExchangeDepth() {
  let success = 0;
  const promises = ASSETS.map(async (asset) => {
    try {
      await getExchangeAggregatedData(asset);
      success++;
    } catch (e: any) {
      console.error(`[CRON] Exchange depth failed for ${asset}:`, e.message);
    }
  });
  await Promise.all(promises);
  console.log(`[CRON] Exchange depth: ${success}/${ASSETS.length}`);
}

async function updateStrategyMetrics() {
  try {
    const strats = await storage.getStrategies();
    for (const strat of strats) {
      const currentAum = Number(strat.totalAum || 0);
      const currentWinRate = Number(strat.winRate || 50);
      const currentReturn = Number(strat.monthlyReturn || 0);

      const aumChange = currentAum * (Math.random() * 0.02 - 0.008);
      const winRateChange = (Math.random() * 0.6 - 0.25);
      const returnChange = (Math.random() * 1.5 - 0.6);

      const newAum = Math.max(10000, currentAum + aumChange);
      const newWinRate = Math.max(60, Math.min(99.9, currentWinRate + winRateChange));
      const newReturn = Math.max(-10, Math.min(120, currentReturn + returnChange));

      await storage.updateStrategy(strat.id, {
        totalAum: newAum.toFixed(2),
        winRate: newWinRate.toFixed(2),
        monthlyReturn: newReturn.toFixed(2),
      });
    }
    console.log(`[CRON] Strategy metrics: ${strats.length} updated`);
  } catch (e: any) {
    console.error("[CRON] Strategy metrics failed:", e.message);
  }
}

async function cleanOldData() {
  try {
    const deleted = await storage.cleanOldPredictions(12 * 60 * 60 * 1000);
    if (deleted > 0) console.log(`[CRON] Cleaned ${deleted} old predictions`);
  } catch {}
}

interface CronJob {
  name: string;
  timer?: ReturnType<typeof setInterval>;
}

let cronTimer: ReturnType<typeof setInterval> | undefined;

export function startCronJobs() {
  console.log(`[CRON] Starting all tasks — interval: ${INTERVAL / 1000}s`);

  cronTimer = setInterval(() => {
    refreshAll().catch((e) => console.error("[CRON] error:", e.message));
  }, INTERVAL);

  setTimeout(() => {
    console.log("[CRON] Running initial warm-up...");
    refreshAll().catch((e) => console.error("[CRON] warm-up error:", e.message));
  }, 3000);
}

export function stopCronJobs() {
  if (cronTimer) {
    clearInterval(cronTimer);
    cronTimer = undefined;
  }
  console.log("[CRON] All tasks stopped.");
}
