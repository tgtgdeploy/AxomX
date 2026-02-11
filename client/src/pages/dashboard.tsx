import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ASSET_IDS } from "@/lib/constants";
import { useCryptoPrices, usePriceChart, useOrderBook } from "@/hooks/use-crypto-price";
import { PriceHeader } from "@/components/dashboard/price-header";
import { PriceChart } from "@/components/dashboard/price-chart";
import { AssetTabs } from "@/components/dashboard/asset-tabs";
import { DepthBar } from "@/components/dashboard/depth-bar";
import { TrendingFeed } from "@/components/dashboard/trending-feed";
import { ExchangeDepth } from "@/components/dashboard/exchange-depth";

export default function Dashboard() {
  const [selectedAsset, setSelectedAsset] = useState("BTC");
  const coinId = ASSET_IDS[selectedAsset] || "bitcoin";

  const { data: prices, isLoading: pricesLoading } = useCryptoPrices();
  const { data: chartData, isLoading: chartLoading } = usePriceChart(coinId);
  const { data: orderBook, isLoading: bookLoading } = useOrderBook(selectedAsset);

  const { data: fearGreed, isLoading: fgLoading } = useQuery<{
    buyPercent: string;
    sellPercent: string;
    index: number;
    label: string;
  }>({
    queryKey: ["/api/ai/fear-greed"],
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
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

  const depthBuy = fearGreed?.buyPercent || orderBook?.buyPercent || "50.0";
  const depthSell = fearGreed?.sellPercent || orderBook?.sellPercent || "50.0";

  return (
    <div className="space-y-4 pb-20" data-testid="page-dashboard">
      <div
        className="gradient-green-dark rounded-b-2xl p-4 pt-2"
        style={{ animation: "fadeSlideIn 0.5s ease-out" }}
      >
        <PriceHeader coin={selectedCoin} isLoading={pricesLoading} />
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
          isLoading={bookLoading && fgLoading}
          fearGreedIndex={fearGreed?.index}
          fearGreedLabel={fearGreed?.label}
        />
      </div>

      <div className="px-4" style={{ animation: "fadeSlideIn 0.8s ease-out" }}>
        <TrendingFeed prices={prices} isLoading={pricesLoading} />
      </div>

      <div className="px-4" style={{ animation: "fadeSlideIn 0.9s ease-out" }}>
        <ExchangeDepth symbol={selectedAsset} />
      </div>
    </div>
  );
}
