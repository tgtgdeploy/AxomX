import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveAccount } from "thirdweb/react";
import { shortenAddress, formatCompact } from "@/lib/constants";
import { Copy, Crown, WalletCards, Calendar, Wallet, ArrowDownToLine, ArrowUpFromLine, Users, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Profile, Transaction } from "@shared/schema";
import { NodeSection } from "@/components/profile/node-section";
import { ReferralCard } from "@/components/profile/referral-card";

const TX_TYPE_COLORS: Record<string, string> = {
  DEPOSIT: "bg-primary/15 text-primary",
  WITHDRAW: "bg-red-500/15 text-red-400",
  YIELD: "bg-blue-500/15 text-blue-400",
  VIP_PURCHASE: "bg-purple-500/15 text-purple-400",
  NODE_PURCHASE: "bg-amber-500/15 text-amber-400",
};

export default function ProfilePage() {
  const account = useActiveAccount();
  const { toast } = useToast();
  const walletAddr = account?.address || "";
  const isConnected = !!walletAddr;

  const { data: profile, isLoading: profileLoading } = useQuery<Profile>({
    queryKey: ["/api/profile", walletAddr],
    enabled: isConnected,
  });

  const { data: transactions = [], isLoading: txLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions", walletAddr],
    enabled: isConnected,
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

  const deposited = Number(profile?.totalDeposited || 0);
  const withdrawn = Number(profile?.totalWithdrawn || 0);
  const net = deposited - withdrawn;
  const referralEarnings = Number(profile?.referralEarnings || 0);

  return (
    <div className="space-y-4 pb-20" data-testid="page-profile">
      <div className="gradient-green-dark p-4 pt-2 rounded-b-2xl" style={{ animation: "fadeSlideIn 0.4s ease-out" }}>
        <h2 className="text-lg font-bold mb-3" data-testid="text-profile-title">Assets Overview</h2>
        <Card className="border-border bg-card/50 glow-green-sm mb-3">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[10px] text-muted-foreground mb-1">Net Assets</div>
                {!isConnected ? (
                  <div className="text-2xl font-bold text-muted-foreground" data-testid="text-net-assets">--</div>
                ) : profileLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="text-2xl font-bold" data-testid="text-net-assets">{formatCompact(net)}</div>
                )}
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center glow-green-sm">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-border bg-card/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
                <ArrowDownToLine className="h-3 w-3" /> Deposited
              </div>
              {!isConnected ? (
                <div className="text-sm font-bold text-muted-foreground" data-testid="text-total-deposited">--</div>
              ) : profileLoading ? (
                <Skeleton className="h-5 w-16" />
              ) : (
                <div className="text-sm font-bold" data-testid="text-total-deposited">{formatCompact(deposited)}</div>
              )}
            </CardContent>
          </Card>
          <Card className="border-border bg-card/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
                <ArrowUpFromLine className="h-3 w-3" /> Withdrawn
              </div>
              {!isConnected ? (
                <div className="text-sm font-bold text-muted-foreground" data-testid="text-total-withdrawn">--</div>
              ) : profileLoading ? (
                <Skeleton className="h-5 w-16" />
              ) : (
                <div className="text-sm font-bold" data-testid="text-total-withdrawn">{formatCompact(withdrawn)}</div>
              )}
            </CardContent>
          </Card>
          <Card className="border-border bg-card/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
                <Users className="h-3 w-3" /> Referral
              </div>
              {!isConnected ? (
                <div className="text-sm font-bold text-muted-foreground" data-testid="text-referral-earnings">--</div>
              ) : profileLoading ? (
                <Skeleton className="h-5 w-16" />
              ) : (
                <div className="text-sm font-bold" data-testid="text-referral-earnings">{formatCompact(referralEarnings)}</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {!isConnected && (
        <div className="px-4" style={{ animation: "fadeSlideIn 0.4s ease-out 0.1s both" }}>
          <Card className="border-border bg-card border-dashed">
            <CardContent className="p-4 text-center">
              <WalletCards className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground" data-testid="text-connect-prompt">
                Connect your wallet to view your data, trade, and manage assets.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="px-4" style={{ animation: "fadeSlideIn 0.4s ease-out 0.1s both" }}>
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted-foreground mb-1">Connected Wallet</div>
                {!isConnected ? (
                  <div className="font-mono text-sm text-muted-foreground" data-testid="text-wallet-address">Not connected</div>
                ) : profileLoading ? (
                  <Skeleton className="h-5 w-32" />
                ) : (
                  <div className="font-mono text-sm font-medium" data-testid="text-wallet-address">
                    {shortenAddress(walletAddr)}
                  </div>
                )}
              </div>
              {isConnected && (
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
              )}
            </div>
            {isConnected && profile && (
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
            {!isConnected && (
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="text-[10px] no-default-hover-elevate no-default-active-elevate">
                  Rank: --
                </Badge>
                <Badge variant="secondary" className="text-[10px] no-default-hover-elevate no-default-active-elevate">
                  Node: --
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="px-4" style={{ animation: "fadeSlideIn 0.4s ease-out 0.15s both" }}>
        <Card className="border-border bg-card glow-green-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <Crown className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs font-semibold">
                  {isConnected && profile?.isVip ? "VIP Active" : "Upgrade to VIP"}
                </span>
              </div>
              {isConnected && !profile?.isVip && (
                <Button
                  size="sm"
                  onClick={() => vipMutation.mutate()}
                  disabled={vipMutation.isPending}
                  data-testid="button-subscribe-vip"
                >
                  {vipMutation.isPending ? "Processing..." : "Subscribe $99/mo"}
                </Button>
              )}
              {!isConnected && (
                <Badge variant="secondary" className="text-[10px] no-default-hover-elevate no-default-active-elevate">
                  Connect to unlock
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="px-4">
        {isConnected ? (
          <NodeSection />
        ) : (
          <div style={{ animation: "fadeSlideIn 0.4s ease-out 0.2s both" }}>
            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
              <h3 className="text-sm font-bold">Node Membership</h3>
            </div>
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-bold">Become a Node Operator</div>
                    <div className="text-[10px] text-muted-foreground">Connect wallet to view node plans</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <div className="px-4">
        <ReferralCard refCode={isConnected ? profile?.refCode : undefined} />
      </div>

      <div className="px-4" style={{ animation: "fadeSlideIn 0.4s ease-out 0.4s both" }}>
        <h3 className="text-sm font-bold mb-3">Transaction History</h3>
        {!isConnected ? (
          <Card className="border-border bg-card">
            <CardContent className="p-6 text-center">
              <p className="text-xs text-muted-foreground" data-testid="text-no-transactions">Connect wallet to view transactions</p>
            </CardContent>
          </Card>
        ) : txLoading ? (
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
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                      <Badge
                        className={`text-[9px] shrink-0 no-default-hover-elevate no-default-active-elevate ${TX_TYPE_COLORS[tx.type] || "bg-muted text-muted-foreground"}`}
                        data-testid={`badge-tx-type-${tx.id}`}
                      >
                        {tx.type}
                      </Badge>
                      <div className="min-w-0">
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
