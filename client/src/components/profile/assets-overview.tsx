import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, ArrowDownToLine, ArrowUpFromLine, Users } from "lucide-react";
import { useActiveAccount } from "thirdweb/react";
import { useQuery } from "@tanstack/react-query";
import { formatCompact } from "@/lib/constants";
import type { Profile } from "@shared/schema";

export function AssetsOverview() {
  const account = useActiveAccount();
  const walletAddr = account?.address || "";

  const { data: profile, isLoading } = useQuery<Profile>({
    queryKey: ["/api/profile", walletAddr],
    enabled: !!walletAddr,
  });

  const deposited = Number(profile?.totalDeposited || 0);
  const withdrawn = Number(profile?.totalWithdrawn || 0);
  const net = deposited - withdrawn;
  const referralEarnings = Number(profile?.referralEarnings || 0);

  return (
    <div className="gradient-green-dark p-4 pt-2 rounded-b-2xl" style={{ animation: "fadeSlideIn 0.4s ease-out" }}>
      <h2 className="text-lg font-bold mb-3" data-testid="text-profile-title">Assets Overview</h2>
      <Card className="border-border bg-card/50 glow-green-sm mb-3">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-[10px] text-muted-foreground mb-1">Net Assets</div>
              {isLoading ? (
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
            {isLoading ? (
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
            {isLoading ? (
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
            {isLoading ? (
              <Skeleton className="h-5 w-16" />
            ) : (
              <div className="text-sm font-bold" data-testid="text-referral-earnings">{formatCompact(referralEarnings)}</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
