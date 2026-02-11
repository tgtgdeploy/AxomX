import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ASSET_IDS } from "@/lib/constants";
import { useCryptoPrices, usePriceChart, useOrderBook } from "@/hooks/use-crypto-price";
import { PriceHeader } from "@/components/dashboard/price-header";
import { PriceChart } from "@/components/dashboard/price-chart";
import { AssetTabs } from "@/components/dashboard/asset-tabs";
import { DepthBar } from "@/components/dashboard/depth-bar";
import { TrendingFeed } from "@/components/dashboard/trending-feed";
import { ExchangeDepth } from "@/components/dashboard/exchange-depth";
import { AiPredictionGrid } from "@/components/dashboard/ai-prediction-grid";
import { Button } from "@/components/ui/button";
import { BarChart3 } from "lucide-react";

export default function Dashboard() {
  const [, navigate] = useLocation();
  const [selectedAsset, setSelectedAsset] = useState("BTC");
  const coinId = ASSET_IDS[selectedAsset] || "bitcoin";

  const { data: prices, isLoading: pricesLoading } = useCryptoPrices();
  const { data: chartData, isLoading: chartLoading } = usePriceChart(coinId);
  const { data: orderBook, isLoading: bookLoading } = useOrderBook(selectedAsset);

  const { data: exchangeData, isLoading: exchangeLoading } = useQuery<{
    exchanges: Array<{ name: string; buy: number; sell: number }>;
    aggregatedBuy: number;
    aggregatedSell: number;
    fearGreedIndex: number;
    fearGreedLabel: string;
    longShortRatio: number;
    timestamp: number;
  }>({
    queryKey: ["/api/exchange/depth", selectedAsset],
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const { data: prediction } = useQuery<{
    prediction: string;
    confidence: string;
    targetPrice: string;
    currentPrice: string;
    reasoning: string;
  }>({
    queryKey: ["/api/ai/prediction", selectedAsset],
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });

  const selectedCoin = prices?.find(
    (p) => p.symbol.toUpperCase() === selectedAsset
  );

  const depthBuy = exchangeData ? String(exchangeData.aggregatedBuy) : (orderBook?.buyPercent || "50.0");
  const depthSell = exchangeData ? String(exchangeData.aggregatedSell) : (orderBook?.sellPercent || "50.0");

  return (
    <div className="space-y-4 pb-20" data-testid="page-dashboard">
      <div
        className="gradient-green-dark rounded-b-2xl p-4 pt-2"
        style={{ animation: "fadeSlideIn 0.5s ease-out" }}
      >
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <PriceHeader coin={selectedCoin} isLoading={pricesLoading} />
          <Button
            size="icon"
            variant="ghost"
            onClick={() => navigate(`/market?coin=${selectedAsset}`)}
            className="mt-1 shrink-0"
            data-testid="button-market-analysis"
          >
            <BarChart3 className="h-5 w-5" />
          </Button>
        </div>
        <PriceChart
          data={chartData}
          isLoading={chartLoading}
          prediction={prediction ? {
            prediction: prediction.prediction,
            confidence: prediction.confidence,
            targetPrice: prediction.targetPrice,
          } : undefined}
        />
      </div>

      <div className="px-4" style={{ animation: "fadeSlideIn 0.6s ease-out" }}>
        <AssetTabs selected={selectedAsset} onChange={setSelectedAsset} />
      </div>

      <div className="px-4" style={{ animation: "fadeSlideIn 0.7s ease-out" }}>
        <DepthBar
          buyPercent={depthBuy}
          sellPercent={depthSell}
          isLoading={bookLoading && exchangeLoading}
          fearGreedIndex={exchangeData?.fearGreedIndex}
          fearGreedLabel={exchangeData?.fearGreedLabel}
        />
      </div>

      <div className="px-4" style={{ animation: "fadeSlideIn 0.8s ease-out" }}>
        <AiPredictionGrid asset={selectedAsset} currentPrice={selectedCoin?.current_price || null} />
      </div>

      <div className="px-4" style={{ animation: "fadeSlideIn 0.85s ease-out" }}>
        <TrendingFeed prices={prices} isLoading={pricesLoading} />
      </div>

      <div className="px-4" style={{ animation: "fadeSlideIn 0.9s ease-out" }}>
        <ExchangeDepth symbol={selectedAsset} />
      </div>
    </div>
  );
}
