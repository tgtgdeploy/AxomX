import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveAccount } from "thirdweb/react";
import { shortenAddress, formatCompact } from "@/lib/constants";
import { Copy, Crown, WalletCards, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Profile, Transaction } from "@shared/schema";
import { AssetsOverview } from "@/components/profile/assets-overview";
import { NodeSection } from "@/components/profile/node-section";
import { ReferralCard } from "@/components/profile/referral-card";

const TX_TYPE_COLORS: Record<string, string> = {
  DEPOSIT: "bg-green-500/15 text-green-400",
  WITHDRAW: "bg-red-500/15 text-red-400",
  YIELD: "bg-blue-500/15 text-blue-400",
  VIP_PURCHASE: "bg-purple-500/15 text-purple-400",
  NODE_PURCHASE: "bg-amber-500/15 text-amber-400",
};

export default function ProfilePage() {
  const account = useActiveAccount();
  const { toast } = useToast();
  const walletAddr = account?.address || "";

  const { data: profile, isLoading: profileLoading } = useQuery<Profile>({
    queryKey: ["/api/profile", walletAddr],
    enabled: !!walletAddr,
  });

  const { data: transactions = [], isLoading: txLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions", walletAddr],
    enabled: !!walletAddr,
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

  if (!walletAddr) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <WalletCards className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-bold mb-2" data-testid="text-not-connected">Not Connected</h2>
        <p className="text-xs text-muted-foreground text-center">
          Connect your wallet to view your profile, assets, and referral network.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      <AssetsOverview />

      <div className="px-4" style={{ animation: "fadeSlideIn 0.4s ease-out 0.1s both" }}>
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted-foreground mb-1">Connected Wallet</div>
                {profileLoading ? (
                  <Skeleton className="h-5 w-32" />
                ) : (
                  <div className="font-mono text-sm font-medium" data-testid="text-wallet-address">
                    {shortenAddress(walletAddr)}
                  </div>
                )}
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  navigator.clipboard.writeText(walletAddr);
                  toast({ title: "Copied", description: "Address copied" });
                }}
                data-testid="button-copy-address"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            {profile && (
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="text-[10px] no-default-hover-elevate no-default-active-elevate" data-testid="badge-rank">
                  Rank: {profile.rank}
                </Badge>
                <Badge variant="secondary" className="text-[10px] no-default-hover-elevate no-default-active-elevate" data-testid="badge-node-type">
                  Node: {profile.nodeType}
                </Badge>
                {profile.isVip && (
                  <Badge className="bg-primary/20 text-primary text-[10px] no-default-hover-elevate no-default-active-elevate" data-testid="badge-vip">
                    VIP
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {!profile?.isVip && (
        <div className="px-4" style={{ animation: "fadeSlideIn 0.4s ease-out 0.15s both" }}>
          <Card className="border-border bg-card glow-green-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold">Upgrade to VIP</span>
                </div>
                <Button
                  size="sm"
                  onClick={() => vipMutation.mutate()}
                  disabled={vipMutation.isPending}
                  data-testid="button-subscribe-vip"
                >
                  {vipMutation.isPending ? "Processing..." : "Subscribe $99/mo"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="px-4">
        <NodeSection />
      </div>

      <div className="px-4">
        <ReferralCard refCode={profile?.refCode} />
      </div>

      <div className="px-4" style={{ animation: "fadeSlideIn 0.4s ease-out 0.4s both" }}>
        <h3 className="text-sm font-bold mb-3">Transaction History</h3>
        {txLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-md" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <Card className="border-border bg-card">
            <CardContent className="p-6 text-center">
              <p className="text-xs text-muted-foreground" data-testid="text-no-transactions">No transactions yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {transactions.slice(0, 20).map((tx) => (
              <Card key={tx.id} className="border-border bg-card" data-testid={`transaction-card-${tx.id}`}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Badge
                        className={`text-[9px] shrink-0 no-default-hover-elevate no-default-active-elevate ${TX_TYPE_COLORS[tx.type] || "bg-muted text-muted-foreground"}`}
                        data-testid={`badge-tx-type-${tx.id}`}
                      >
                        {tx.type}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold" data-testid={`text-tx-amount-${tx.id}`}>
                          {formatCompact(Number(tx.amount))} {tx.token}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                      <Calendar className="h-3 w-3" />
                      {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : "--"}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
