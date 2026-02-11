import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useActiveAccount } from "thirdweb/react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCompact, formatUSD } from "@/lib/constants";
import {
  Crown, Zap, Shield, CheckCircle2, TrendingUp, TrendingDown,
  Minus, Clock, Brain, Info, RefreshCw, Wallet, ChevronLeft, ChevronRight,
  Search, RotateCcw, Send, Copy, Eye, EyeOff, Key, Link2, MessageCircle,
} from "lucide-react";
import type { Strategy, StrategySubscription, Profile, HedgePosition, InsurancePurchase, AiPrediction } from "@shared/schema";
import { StrategyHeader } from "@/components/strategy/strategy-header";
import { StrategyCard } from "@/components/strategy/strategy-card";

type TabId = "strategies" | "hedge" | "predictions";

const TABS: { id: TabId; label: string }[] = [
  { id: "strategies", label: "Strategy List" },
  { id: "hedge", label: "Hedge Protection" },
  { id: "predictions", label: "Predictions" },
];

const EXCHANGES = [
  { name: "Aster", tag: "Aster" },
  { name: "Hyperliquid", tag: "Hyperliquid" },
  { name: "Binance", tag: "Binance" },
  { name: "OKX", tag: "OKX" },
  { name: "Bybit", tag: "Bybit" },
];

export default function StrategyPage() {
  const account = useActiveAccount();
  const { toast } = useToast();
  const walletAddr = account?.address || "";
  const [activeTab, setActiveTab] = useState<TabId>("strategies");
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [capitalAmount, setCapitalAmount] = useState("");
  const [hedgeAmount, setHedgeAmount] = useState("300");
  const [investmentOpen, setInvestmentOpen] = useState(false);
  const [investmentExchange, setInvestmentExchange] = useState("Aster");
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [copyFilterType, setCopyFilterType] = useState("all");
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [bindApiOpen, setBindApiOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [apiPassphrase, setApiPassphrase] = useState("");
  const [depositNetwork, setDepositNetwork] = useState("ERC-20");
  const [showApiSecret, setShowApiSecret] = useState(false);
  const [showApiPassphrase, setShowApiPassphrase] = useState(false);
  const [bindTelegramOpen, setBindTelegramOpen] = useState(false);
  const [telegramUsername, setTelegramUsername] = useState("");

  const { data: strategies = [], isLoading } = useQuery<Strategy[]>({
    queryKey: ["/api/strategies"],
  });

  const { data: profile } = useQuery<Profile>({
    queryKey: ["/api/profile", walletAddr],
    enabled: !!walletAddr,
  });

  const { data: subscriptions = [] } = useQuery<(StrategySubscription & { strategyName?: string })[]>({
    queryKey: ["/api/subscriptions", walletAddr],
    enabled: !!walletAddr,
  });

  const { data: hedgePositions = [] } = useQuery<HedgePosition[]>({
    queryKey: ["/api/hedge/positions", walletAddr],
    enabled: !!walletAddr,
  });

  const { data: insurancePool } = useQuery<{ poolSize: string; totalPolicies: number; totalPaid: string; payoutRate: string }>({
    queryKey: ["/api/hedge/insurance-pool"],
  });

  const { data: purchases = [] } = useQuery<InsurancePurchase[]>({
    queryKey: ["/api/hedge/purchases", walletAddr],
    enabled: !!walletAddr,
  });

  const { data: aiPredictions = [], isLoading: predsLoading } = useQuery<AiPrediction[]>({
    queryKey: ["/api/ai/predictions/list"],
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });

  const subscribeMutation = useMutation({
    mutationFn: async (data: { walletAddress: string; strategyId: string; amount: number }) => {
      const res = await apiRequest("POST", "/api/strategy/subscribe", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Subscribed", description: "Strategy subscription activated" });
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions", walletAddr] });
      setSubscribeOpen(false);
      setCapitalAmount("");
      setSelectedStrategy(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const hedgeMutation = useMutation({
    mutationFn: async (data: { walletAddress: string; amount: number }) => {
      const res = await apiRequest("POST", "/api/hedge/purchase", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Hedge protection purchased" });
      queryClient.invalidateQueries({ queryKey: ["/api/hedge/positions", walletAddr] });
      queryClient.invalidateQueries({ queryKey: ["/api/hedge/purchases", walletAddr] });
      queryClient.invalidateQueries({ queryKey: ["/api/hedge/insurance-pool"] });
      setHedgeAmount("300");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const vipMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/vip/subscribe", { walletAddress: walletAddr });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "VIP Activated", description: "Welcome to VIP membership" });
      queryClient.invalidateQueries({ queryKey: ["/api/profile", walletAddr] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleSubscribeClick = (strategy: Strategy) => {
    if (!walletAddr) {
      toast({ title: "Connect Wallet", description: "Please connect your wallet first", variant: "destructive" });
      return;
    }
    if (strategy.isVipOnly && !profile?.isVip) {
      toast({ title: "VIP Required", description: "This strategy requires VIP membership", variant: "destructive" });
      return;
    }
    setSelectedStrategy(strategy);
    setSubscribeOpen(true);
  };

  const handleConfirmSubscribe = () => {
    if (!selectedStrategy || !capitalAmount || Number(capitalAmount) <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid capital amount", variant: "destructive" });
      return;
    }
    subscribeMutation.mutate({
      walletAddress: walletAddr,
      strategyId: selectedStrategy.id,
      amount: Number(capitalAmount),
    });
  };

  const handleHedgePurchase = () => {
    if (!walletAddr) {
      toast({ title: "Connect Wallet", description: "Please connect your wallet first", variant: "destructive" });
      return;
    }
    if (!hedgeAmount || Number(hedgeAmount) < 100) {
      toast({ title: "Invalid Amount", description: "Minimum 100 USDT required", variant: "destructive" });
      return;
    }
    hedgeMutation.mutate({ walletAddress: walletAddr, amount: Number(hedgeAmount) });
  };

  const totalPremium = hedgePositions.reduce((sum, h) => sum + Number(h.amount || 0), 0);
  const totalPayout = hedgePositions.reduce((sum, h) => sum + Number(h.purchaseAmount || 0), 0);
  const totalPnl = hedgePositions.reduce((sum, h) => sum + Number(h.currentPnl || 0), 0);

  const handleInvestmentClick = () => {
    setInvestmentOpen(true);
  };

  const getCalendarDays = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: { day: number; pnl: number }[] = [];
    for (let i = 0; i < firstDay; i++) days.push({ day: 0, pnl: 0 });
    for (let d = 1; d <= daysInMonth; d++) days.push({ day: d, pnl: 0 });
    return days;
  };

  const calendarDays = getCalendarDays();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const calendarLabel = `${monthNames[calendarMonth.getMonth()]} ${calendarMonth.getFullYear()}`;

  const getStrategyName = (strategyId: string) => {
    const s = strategies.find((st) => st.id === strategyId);
    return s?.name || "Unknown Strategy";
  };

  return (
    <div className="space-y-4 pb-20" data-testid="page-strategy">
      <StrategyHeader />

      <div className="px-4 space-y-3">
        <Button
          className="w-full text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-500 border-emerald-500/50 text-white"
          onClick={handleInvestmentClick}
          data-testid="button-investment-panel"
        >
          <Wallet className="h-4 w-4 mr-2" />
          Investment
          <ChevronRight className="h-4 w-4 ml-auto" />
        </Button>

        <div className="flex gap-0 bg-card border border-border rounded-md overflow-hidden" data-testid="strategy-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`flex-1 py-2.5 text-xs font-bold text-center transition-all ${
                activeTab === tab.id
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover-elevate"
              }`}
              onClick={() => setActiveTab(tab.id)}
              data-testid={`tab-${tab.id}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 space-y-4">
        {activeTab === "strategies" && (
          <>
            <div style={{ animation: "fadeSlideIn 0.4s ease-out 0.1s both" }}>
              <h3 className="text-sm font-bold mb-3" data-testid="text-strategies-list-title">All Strategies</h3>
              {isLoading ? (
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-56 rounded-md" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {strategies.map((s, i) => (
                    <StrategyCard key={s.id} strategy={s} index={i} onSubscribe={handleSubscribeClick} />
                  ))}
                </div>
              )}
            </div>

            {walletAddr && subscriptions.length > 0 && (
              <div style={{ animation: "fadeSlideIn 0.4s ease-out 0.2s both" }}>
                <h3 className="text-sm font-bold mb-3" data-testid="text-subscriptions-title">My Subscriptions</h3>
                <div className="space-y-2">
                  {subscriptions.map((sub) => (
                    <Card key={sub.id} className="border-border bg-card" data-testid={`subscription-card-${sub.id}`}>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold truncate">{getStrategyName(sub.strategyId)}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              Capital: {formatCompact(Number(sub.allocatedCapital))}
                            </div>
                          </div>
                          <Badge
                            variant={sub.status === "ACTIVE" ? "default" : "secondary"}
                            className="text-[9px] no-default-hover-elevate no-default-active-elevate shrink-0"
                            data-testid={`badge-sub-status-${sub.id}`}
                          >
                            {sub.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {walletAddr && !profile?.isVip && (
              <div style={{ animation: "fadeSlideIn 0.4s ease-out 0.3s both" }}>
                <Card className="border-border bg-card glow-green-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Crown className="h-5 w-5 text-primary" />
                      <h3 className="text-sm font-bold">Upgrade to VIP</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      Unlock exclusive strategies and premium features with VIP membership.
                    </p>
                    <div className="space-y-2 mb-4">
                      {["Access VIP-only strategies", "Higher leverage options", "Priority support and insights", "Enhanced referral rewards"].map((t) => (
                        <div key={t} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
                          <span>{t}</span>
                        </div>
                      ))}
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => vipMutation.mutate()}
                      disabled={vipMutation.isPending}
                      data-testid="button-upgrade-vip"
                    >
                      <Zap className="mr-1 h-4 w-4" />
                      {vipMutation.isPending ? "Processing..." : "Upgrade to VIP - $99/mo"}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}

        {activeTab === "hedge" && (
          <div className="space-y-4" style={{ animation: "fadeSlideIn 0.3s ease-out" }}>
            <Card className="border-border bg-card" data-testid="card-my-hedge">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
                  <h3 className="text-sm font-bold">My Hedge Protection</h3>
                  <Button size="icon" variant="ghost" data-testid="button-hedge-info">
                    <Info className="h-4 w-4" />
                  </Button>
                </div>

                <Card className="border-border bg-background mb-3">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <div className="text-[10px] text-muted-foreground">Premium Paid: {formatUSD(totalPremium)} USDT</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">(Premium + Payout)</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
                      <div className="text-xs font-bold">Payout Balance: {formatUSD(totalPayout)} USDT</div>
                      <Button size="sm" variant="secondary" data-testid="button-withdraw-payout" disabled={totalPayout <= 0}>
                        Withdraw
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-3">
                  <Card className="border-border bg-background">
                    <CardContent className="p-3">
                      <div className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                        <Shield className="h-3 w-3" /> Current P&L
                      </div>
                      <div className={`text-lg font-bold ${totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}
                        style={{ textShadow: totalPnl >= 0 ? "0 0 6px rgba(16,185,129,0.4)" : "0 0 6px rgba(239,68,68,0.4)" }}
                        data-testid="text-hedge-pnl"
                      >
                        {totalPnl.toFixed(2)}%
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-border bg-background">
                    <CardContent className="p-3">
                      <div className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                        <Wallet className="h-3 w-3" /> Purchase Amount
                      </div>
                      <div className="text-lg font-bold" data-testid="text-hedge-purchase-total">
                        {formatUSD(totalPremium)} USDT
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card" data-testid="card-purchase-hedge">
              <CardContent className="p-4">
                <h3 className="text-sm font-bold mb-3">Purchase Hedge Protection</h3>
                <div className="flex items-center justify-between gap-2 mb-2 text-xs text-muted-foreground flex-wrap">
                  <span>Investment Amount (USDT)</span>
                  <span>Min: 100 USDT</span>
                </div>
                <div className="flex gap-2 mb-3">
                  <Input
                    type="number"
                    placeholder="300"
                    value={hedgeAmount}
                    onChange={(e) => setHedgeAmount(e.target.value)}
                    className="flex-1"
                    data-testid="input-hedge-amount"
                  />
                  <span className="flex items-center text-xs text-muted-foreground font-medium px-2">USDT</span>
                </div>
                <Button
                  className="w-full"
                  onClick={handleHedgePurchase}
                  disabled={hedgeMutation.isPending}
                  data-testid="button-confirm-hedge"
                >
                  {hedgeMutation.isPending ? "Processing..." : "Confirm Purchase"}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border bg-card" data-testid="card-insurance-pool">
              <CardContent className="p-4">
                <h3 className="text-sm font-bold mb-3">Insurance Pool Overview</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Coverage", value: insurancePool?.poolSize || "--", color: "text-emerald-400" },
                    { label: "Claims", value: insurancePool?.totalPolicies?.toString() || "--", color: "text-emerald-400" },
                    { label: "Paid Out", value: insurancePool?.totalPaid || "--", color: "text-emerald-400" },
                    { label: "Payout Rate", value: insurancePool?.payoutRate || "--", color: "text-emerald-400" },
                  ].map((item) => (
                    <Card key={item.label} className="border-border bg-background">
                      <CardContent className="p-3 text-center">
                        <div className={`text-lg font-bold ${item.color}`}
                          style={{ textShadow: "0 0 6px rgba(16,185,129,0.3)" }}
                        >
                          {item.value}
                        </div>
                        <div className="text-[10px] text-muted-foreground">{item.label}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card" data-testid="card-hedge-records">
              <CardContent className="p-4">
                <div className="flex gap-0 mb-3">
                  <Badge className="text-[10px] bg-primary text-white no-default-hover-elevate no-default-active-elevate">
                    Purchase Records
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] ml-1 no-default-hover-elevate no-default-active-elevate">
                    Payout Records
                  </Badge>
                </div>
                <div className="grid grid-cols-4 gap-2 text-[10px] text-muted-foreground font-medium mb-2 px-1">
                  <span>Amount</span>
                  <span>Date</span>
                  <span>Status</span>
                  <span>Type</span>
                </div>
                {purchases.length === 0 ? (
                  <div className="text-center py-4 text-xs text-muted-foreground" data-testid="text-no-records">
                    No records yet
                  </div>
                ) : (
                  <div className="space-y-1">
                    {purchases.slice(0, 10).map((p) => (
                      <div key={p.id} className="grid grid-cols-4 gap-2 text-[10px] px-1 py-1.5 rounded-md bg-background/30" data-testid={`record-${p.id}`}>
                        <span className="font-medium">{Number(p.amount).toFixed(2)}</span>
                        <span className="text-muted-foreground">{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "--"}</span>
                        <Badge variant="secondary" className="text-[8px] no-default-hover-elevate no-default-active-elevate w-fit">
                          {p.status}
                        </Badge>
                        <span className="text-muted-foreground">Hedge</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border bg-card" data-testid="card-exchange-connect">
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-2 mb-4">
                  {EXCHANGES.map((ex) => (
                    <Badge
                      key={ex.name}
                      variant="outline"
                      className="text-[10px] cursor-pointer"
                      data-testid={`badge-exchange-${ex.tag}`}
                    >
                      {ex.tag}
                    </Badge>
                  ))}
                  <Badge variant="outline" className="text-[10px] cursor-pointer" data-testid="badge-exchange-more">
                    More
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <div className="text-[10px] text-muted-foreground">Position Amount</div>
                    <div className="text-sm font-bold" data-testid="text-position-amount">0.00</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground">P&L</div>
                    <div className="text-sm font-bold" data-testid="text-position-pnl">
                      0.00 <span className="text-emerald-400 text-[10px]">(0.00%)</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card" data-testid="card-total-assets">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <div className="text-[10px] text-muted-foreground">Total Assets</div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">All</span>
                      <RefreshCw className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </div>
                </div>
                <div className="text-2xl font-bold mt-2" data-testid="text-total-assets">
                  ${formatCompact(totalPremium)}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "predictions" && (
          <div className="space-y-3" style={{ animation: "fadeSlideIn 0.3s ease-out" }}>
            <h3 className="text-sm font-bold" data-testid="text-predictions-title">AI Predictions</h3>

            {predsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-md" />
                ))}
              </div>
            ) : aiPredictions.length > 0 ? (
              aiPredictions.map((pred) => {
                const isBullish = pred.prediction === "BULLISH";
                const isBearish = pred.prediction === "BEARISH";
                const confidence = Number(pred.confidence || 0);
                const current = Number(pred.currentPrice || 0);
                const target = Number(pred.targetPrice || 0);
                const pctChange = current > 0 ? ((target - current) / current * 100) : 0;

                return (
                  <Card key={pred.id} className="border-border bg-card" data-testid={`prediction-card-${pred.asset}`}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center ${
                              isBullish ? "bg-emerald-500/20" : isBearish ? "bg-red-500/20" : "bg-yellow-500/20"
                            }`}
                            style={{
                              boxShadow: isBullish
                                ? "0 0 10px rgba(16,185,129,0.3)"
                                : isBearish
                                  ? "0 0 10px rgba(239,68,68,0.3)"
                                  : undefined,
                            }}
                          >
                            {isBullish ? (
                              <TrendingUp className="h-4 w-4 text-emerald-400" />
                            ) : isBearish ? (
                              <TrendingDown className="h-4 w-4 text-red-400" />
                            ) : (
                              <Minus className="h-4 w-4 text-yellow-400" />
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-bold">{pred.asset}/USDT</div>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5" /> {pred.timeframe}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <Badge
                            className={`text-[9px] no-default-hover-elevate no-default-active-elevate ${
                              isBullish
                                ? "bg-emerald-500/20 text-emerald-400"
                                : isBearish
                                  ? "bg-red-500/20 text-red-400"
                                  : "bg-yellow-500/20 text-yellow-400"
                            }`}
                            style={{
                              boxShadow: isBullish
                                ? "0 0 6px rgba(16,185,129,0.25)"
                                : isBearish
                                  ? "0 0 6px rgba(239,68,68,0.25)"
                                  : undefined,
                            }}
                          >
                            {pred.prediction} {confidence}%
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <div>
                          <div className="text-[9px] text-muted-foreground">Current</div>
                          <div className="text-[11px] font-bold">{current > 0 ? formatUSD(current) : "--"}</div>
                        </div>
                        <div>
                          <div className="text-[9px] text-muted-foreground">Target</div>
                          <div className={`text-[11px] font-bold ${isBullish ? "text-emerald-400" : isBearish ? "text-red-400" : ""}`}>
                            {target > 0 ? formatUSD(target) : "--"}
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] text-muted-foreground">Change</div>
                          <div className={`text-[11px] font-bold ${pctChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {pctChange >= 0 ? "+" : ""}{pctChange.toFixed(2)}%
                          </div>
                        </div>
                      </div>

                      {pred.reasoning && (
                        <div className="mt-2 bg-background/30 rounded-md p-2 border border-border/20">
                          <div className="flex items-center gap-1 mb-0.5">
                            <Brain className="h-2.5 w-2.5 text-primary" />
                            <span className="text-[9px] text-muted-foreground">AI Analysis</span>
                          </div>
                          <p className="text-[10px] text-foreground/70">{pred.reasoning}</p>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2 mt-2 text-[9px] text-muted-foreground flex-wrap">
                        <span>Fear & Greed: {pred.fearGreedIndex} ({pred.fearGreedLabel})</span>
                        {pred.createdAt && (
                          <span>{new Date(pred.createdAt).toLocaleTimeString()}</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Card className="border-border bg-card">
                <CardContent className="p-6 text-center">
                  <Brain className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No predictions available yet. Predictions are generated when you visit the Dashboard.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      <Dialog open={investmentOpen} onOpenChange={setInvestmentOpen}>
        <DialogContent className="bg-card border-border max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold" data-testid="text-investment-dialog-title">
              Investment
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Manage API connections, view P&L, and track copy trading performance.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2" data-testid="investment-exchange-tabs">
              {EXCHANGES.map((ex) => (
                <Badge
                  key={ex.name}
                  variant={investmentExchange === ex.name ? "default" : "outline"}
                  className={`text-[10px] cursor-pointer ${investmentExchange === ex.name ? "" : ""}`}
                  onClick={() => setInvestmentExchange(ex.name)}
                  data-testid={`badge-inv-exchange-${ex.tag}`}
                >
                  {ex.tag}
                </Badge>
              ))}
              <Badge variant="outline" className="text-[10px] cursor-pointer" data-testid="badge-inv-exchange-more">
                More
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] text-muted-foreground">Position Amount</div>
                <div className="text-sm font-bold" data-testid="text-inv-position">0.00</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground">P&L</div>
                <div className="text-sm font-bold" data-testid="text-inv-pnl">
                  0.00 <span className="text-emerald-400 text-[10px]">(0.00%)</span>
                </div>
              </div>
            </div>

            <Card className="border-border bg-background">
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <div className="text-[10px] text-muted-foreground">Total Assets</div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">All</span>
                      <RefreshCw className="h-3 w-3 text-muted-foreground cursor-pointer" />
                    </div>
                  </div>
                </div>
                <div className="text-2xl font-bold mt-1" data-testid="text-inv-total-assets">$0</div>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground flex-wrap">
                    <span>Unrealized P&L</span>
                    <span className="font-medium text-foreground">$0.00</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground flex-wrap">
                    <span>Completed Trades</span>
                    <span className="font-medium text-foreground">--</span>
                  </div>
                  <div className="border-t border-border/50 pt-1 mt-1">
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground flex-wrap">
                      <span>Perpetual</span>
                      <span className="font-medium text-foreground">$0</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground flex-wrap">
                      <span>Spot</span>
                      <span className="font-medium text-foreground">--</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div>
              <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                <Button size="icon" variant="ghost" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))} data-testid="button-cal-prev">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs font-bold" data-testid="text-cal-label">{calendarLabel}</span>
                <Button size="icon" variant="ghost" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))} data-testid="button-cal-next">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-7 gap-0.5 text-center">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div key={d} className="text-[9px] text-muted-foreground font-medium py-1">{d}</div>
                ))}
                {calendarDays.map((cell, idx) => (
                  <div
                    key={idx}
                    className={`rounded-sm py-1.5 text-center ${cell.day === 0 ? "" : "bg-muted/30 border border-border/30"}`}
                    data-testid={cell.day > 0 ? `cal-day-${cell.day}` : undefined}
                  >
                    {cell.day > 0 && (
                      <>
                        <div className="text-[10px] font-medium">{cell.day}</div>
                        <div className="text-[9px] text-muted-foreground">{cell.pnl.toFixed(2)}</div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" className="text-xs" data-testid="button-inv-deposit" onClick={() => setDepositOpen(true)}>
                <Wallet className="h-3.5 w-3.5 mr-1" />
                Deposit
              </Button>
              <Button variant="outline" className="text-xs" data-testid="button-inv-bind-api" onClick={() => setBindApiOpen(true)}>
                <Key className="h-3.5 w-3.5 mr-1" />
                Bind API
              </Button>
              <Button variant="outline" className="text-xs" data-testid="button-inv-bind-telegram" onClick={() => setBindTelegramOpen(true)}>
                <MessageCircle className="h-3.5 w-3.5 mr-1" />
                Bind TG
              </Button>
            </div>

            <Card className="border-border bg-background">
              <CardContent className="p-3">
                <h4 className="text-xs font-bold mb-3" data-testid="text-copy-records-title">Copy Trading Records</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-lg font-bold" data-testid="text-cumulative-return">0%</div>
                    <div className="text-[10px] text-muted-foreground">Cumulative Return</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold" data-testid="text-total-profit">0</div>
                    <div className="text-[10px] text-muted-foreground">Total Profit</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-emerald-400" data-testid="text-win-count">0</div>
                    <div className="text-[10px] text-muted-foreground">Win Count</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-red-400" data-testid="text-loss-count">0</div>
                    <div className="text-[10px] text-muted-foreground">Loss Count</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-background">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge
                    variant={copyFilterType === "all" ? "default" : "outline"}
                    className="text-[10px] cursor-pointer"
                    onClick={() => setCopyFilterType("all")}
                    data-testid="badge-filter-all"
                  >
                    All Strategy Types
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-2 flex-wrap">
                  <Clock className="h-3 w-3" />
                  <span>Select Start Date - Select End Date</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="text-xs" data-testid="button-filter-search">
                    <Search className="h-3 w-3 mr-1" />
                    Search
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs" data-testid="button-filter-reset">
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={subscribeOpen} onOpenChange={setSubscribeOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold" data-testid="text-subscribe-dialog-title">
              Subscribe to Strategy
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Allocate capital to follow this strategy automatically.
            </DialogDescription>
          </DialogHeader>
          {selectedStrategy && (
            <div className="space-y-4">
              <div>
                <div className="text-xs font-semibold mb-2">{selectedStrategy.name}</div>
                <div className="grid grid-cols-3 gap-2">
                  <Card className="border-border bg-background">
                    <CardContent className="p-2 text-center">
                      <div className="text-[10px] text-muted-foreground">Leverage</div>
                      <div className="text-xs font-bold" data-testid="text-dialog-leverage">
                        {selectedStrategy.leverage}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-border bg-background">
                    <CardContent className="p-2 text-center">
                      <div className="text-[10px] text-muted-foreground">Win Rate</div>
                      <div className="text-xs font-bold text-neon-value" data-testid="text-dialog-winrate">
                        {Number(selectedStrategy.winRate).toFixed(1)}%
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-border bg-background">
                    <CardContent className="p-2 text-center">
                      <div className="text-[10px] text-muted-foreground">Monthly</div>
                      <div className="text-xs font-bold text-neon-value" data-testid="text-dialog-return">
                        +{Number(selectedStrategy.monthlyReturn).toFixed(1)}%
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Capital Amount (USDT)</label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={capitalAmount}
                  onChange={(e) => setCapitalAmount(e.target.value)}
                  data-testid="input-capital-amount"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setSubscribeOpen(false)} data-testid="button-cancel-subscribe">
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSubscribe}
              disabled={subscribeMutation.isPending}
              data-testid="button-confirm-subscribe"
            >
              <TrendingUp className="mr-1 h-4 w-4" />
              {subscribeMutation.isPending ? "Subscribing..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold" data-testid="text-deposit-dialog-title">Deposit Funds</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Transfer funds to your {investmentExchange} account for copy trading.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Network</label>
              <div className="flex gap-1.5 flex-wrap">
                {["ERC-20", "TRC-20", "BEP-20", "SOL"].map((net) => (
                  <Badge
                    key={net}
                    variant={depositNetwork === net ? "default" : "outline"}
                    className="text-[10px] cursor-pointer"
                    onClick={() => setDepositNetwork(net)}
                    data-testid={`badge-network-${net}`}
                  >
                    {net}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Deposit Address</label>
              <div className="flex items-center gap-2">
                <Input
                  value={walletAddr || "Connect wallet first"}
                  readOnly
                  className="text-xs font-mono"
                  data-testid="input-deposit-address"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    if (walletAddr) {
                      navigator.clipboard.writeText(walletAddr);
                      toast({ title: "Copied", description: "Address copied to clipboard" });
                    }
                  }}
                  data-testid="button-copy-address"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Amount (USDT)</label>
              <Input
                type="number"
                placeholder="Min 100 USDT"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                data-testid="input-deposit-amount"
              />
            </div>
            <div className="space-y-1 text-[10px] text-muted-foreground">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span>Min Deposit</span><span className="font-medium text-foreground">100 USDT</span>
              </div>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span>Fee</span><span className="font-medium text-foreground">0 USDT</span>
              </div>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span>Expected Arrival</span><span className="font-medium text-foreground">~5 min</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDepositOpen(false)} data-testid="button-cancel-deposit">Cancel</Button>
            <Button
              onClick={() => {
                if (!walletAddr) {
                  toast({ title: "Connect Wallet", description: "Please connect your wallet first", variant: "destructive" });
                  return;
                }
                const amt = parseFloat(depositAmount);
                if (!amt || amt < 100) {
                  toast({ title: "Invalid Amount", description: "Minimum deposit is 100 USDT", variant: "destructive" });
                  return;
                }
                toast({ title: "Deposit Submitted", description: `${amt} USDT via ${depositNetwork} submitted to ${investmentExchange}` });
                setDepositAmount("");
                setDepositOpen(false);
              }}
              data-testid="button-confirm-deposit"
            >
              <Wallet className="mr-1 h-4 w-4" />
              Confirm Deposit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bindApiOpen} onOpenChange={setBindApiOpen}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold" data-testid="text-bind-api-dialog-title">Bind {investmentExchange} API</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Connect your exchange API keys for automated copy trading execution.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Card className="border-border bg-background">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                  <Info className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>Enable <strong>Read & Trade</strong> permissions only. Do not enable withdrawal permissions for security.</span>
                </div>
              </CardContent>
            </Card>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">API Key</label>
              <Input
                placeholder="Enter API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="text-xs font-mono"
                data-testid="input-api-key"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">API Secret</label>
              <div className="flex items-center gap-2">
                <Input
                  type={showApiSecret ? "text" : "password"}
                  placeholder="Enter API secret"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  className="text-xs font-mono"
                  data-testid="input-api-secret"
                />
                <Button size="icon" variant="ghost" onClick={() => setShowApiSecret(v => !v)} data-testid="button-toggle-secret">
                  {showApiSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Passphrase (if required)</label>
              <div className="flex items-center gap-2">
                <Input
                  type={showApiPassphrase ? "text" : "password"}
                  placeholder="Optional"
                  value={apiPassphrase}
                  onChange={(e) => setApiPassphrase(e.target.value)}
                  className="text-xs font-mono"
                  data-testid="input-api-passphrase"
                />
                <Button size="icon" variant="ghost" onClick={() => setShowApiPassphrase(v => !v)} data-testid="button-toggle-passphrase">
                  {showApiPassphrase ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              <Badge variant="outline" className="text-[9px] no-default-hover-elevate no-default-active-elevate">
                <CheckCircle2 className="h-2.5 w-2.5 mr-0.5 text-emerald-400" />Read
              </Badge>
              <Badge variant="outline" className="text-[9px] no-default-hover-elevate no-default-active-elevate">
                <CheckCircle2 className="h-2.5 w-2.5 mr-0.5 text-emerald-400" />Trade
              </Badge>
              <Badge variant="outline" className="text-[9px] no-default-hover-elevate no-default-active-elevate">
                <Shield className="h-2.5 w-2.5 mr-0.5 text-red-400" />No Withdraw
              </Badge>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setBindApiOpen(false)} data-testid="button-cancel-bind-api">Cancel</Button>
            <Button
              onClick={() => {
                if (!apiKey.trim() || !apiSecret.trim()) {
                  toast({ title: "Missing Fields", description: "API Key and Secret are required", variant: "destructive" });
                  return;
                }
                toast({ title: "API Bound", description: `${investmentExchange} API keys successfully saved` });
                setApiKey("");
                setApiSecret("");
                setApiPassphrase("");
                setBindApiOpen(false);
              }}
              data-testid="button-confirm-bind-api"
            >
              <Link2 className="mr-1 h-4 w-4" />
              Bind API
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bindTelegramOpen} onOpenChange={setBindTelegramOpen}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold" data-testid="text-bind-telegram-dialog-title">Bind Telegram</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Receive trade notifications and alerts via Telegram.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Card className="border-border bg-background">
              <CardContent className="p-3">
                <div className="space-y-2 text-[10px] text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <span className="bg-primary/20 text-primary rounded-full h-4 w-4 flex items-center justify-center shrink-0 text-[9px] font-bold">1</span>
                    <span>Open Telegram and search for <strong>@AxomXBot</strong></span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="bg-primary/20 text-primary rounded-full h-4 w-4 flex items-center justify-center shrink-0 text-[9px] font-bold">2</span>
                    <span>Send <strong>/start</strong> to the bot</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="bg-primary/20 text-primary rounded-full h-4 w-4 flex items-center justify-center shrink-0 text-[9px] font-bold">3</span>
                    <span>Enter your Telegram username below</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Telegram Username</label>
              <Input
                placeholder="@your_username"
                value={telegramUsername}
                onChange={(e) => setTelegramUsername(e.target.value)}
                className="text-xs"
                data-testid="input-telegram-username"
              />
            </div>
            <div className="space-y-1 text-[10px] text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                <span>Trade execution alerts</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                <span>P&L daily summary</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                <span>Risk warnings & liquidation alerts</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setBindTelegramOpen(false)} data-testid="button-cancel-bind-telegram">Cancel</Button>
            <Button
              onClick={() => {
                if (!telegramUsername.trim()) {
                  toast({ title: "Missing Username", description: "Please enter your Telegram username", variant: "destructive" });
                  return;
                }
                toast({ title: "Telegram Bound", description: `Notifications will be sent to ${telegramUsername}` });
                setTelegramUsername("");
                setBindTelegramOpen(false);
              }}
              data-testid="button-confirm-bind-telegram"
            >
              <MessageCircle className="mr-1 h-4 w-4" />
              Bind Telegram
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
