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
import { formatCompact } from "@/lib/constants";
import { Crown, Zap, Shield, CheckCircle2, TrendingUp } from "lucide-react";
import type { Strategy, StrategySubscription, Profile } from "@shared/schema";
import { StrategyHeader } from "@/components/strategy/strategy-header";
import { StrategyCard } from "@/components/strategy/strategy-card";

export default function StrategyPage() {
  const account = useActiveAccount();
  const { toast } = useToast();
  const walletAddr = account?.address || "";

  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [capitalAmount, setCapitalAmount] = useState("");

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

  const getStrategyName = (strategyId: string) => {
    const s = strategies.find((st) => st.id === strategyId);
    return s?.name || "Unknown Strategy";
  };

  return (
    <div className="space-y-4 pb-20">
      <StrategyHeader />

      <div className="px-4 space-y-4">
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
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
                    <span>Access VIP-only strategies</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
                    <span>Higher leverage options</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
                    <span>Priority support and insights</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
                    <span>Enhanced referral rewards</span>
                  </div>
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
      </div>

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
    </div>
  );
}
