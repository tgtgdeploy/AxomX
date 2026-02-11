import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useActiveAccount } from "thirdweb/react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Zap, Server, CheckCircle2 } from "lucide-react";
import type { NodeMembership, Profile } from "@shared/schema";

export function NodeSection() {
  const account = useActiveAccount();
  const { toast } = useToast();
  const walletAddr = account?.address || "";

  const { data: profile } = useQuery<Profile>({
    queryKey: ["/api/profile", walletAddr],
    enabled: !!walletAddr,
  });

  const { data: membership, isLoading } = useQuery<NodeMembership | null>({
    queryKey: ["/api/node", walletAddr],
    enabled: !!walletAddr,
  });

  const purchaseMutation = useMutation({
    mutationFn: async (nodeType: string) => {
      const res = await apiRequest("POST", "/api/node/purchase", { walletAddress: walletAddr, nodeType });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Node Purchased", description: "Your node membership is now active" });
      queryClient.invalidateQueries({ queryKey: ["/api/node", walletAddr] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile", walletAddr] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const currentNode = profile?.nodeType || "NONE";

  return (
    <div style={{ animation: "fadeSlideIn 0.4s ease-out 0.2s both" }}>
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <h3 className="text-sm font-bold">Node Membership</h3>
        {currentNode !== "NONE" && (
          <Badge className="text-[10px] no-default-hover-elevate no-default-active-elevate" data-testid="badge-current-node">
            {currentNode} Node
          </Badge>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full rounded-md" />
      ) : membership && currentNode !== "NONE" ? (
        <Card className="border-border bg-card glow-green-sm" data-testid="card-active-node">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Server className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-sm font-bold">{currentNode} Node</div>
                <div className="text-[10px] text-muted-foreground">
                  Status: {membership.status} | Price: ${Number(membership.price).toFixed(0)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-border bg-card" data-testid="card-mini-node">
            <CardContent className="p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <div className="text-sm font-bold">MINI Node</div>
              </div>
              <div className="text-2xl font-bold text-primary">$500</div>
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
                  <span>5% referral bonus</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
                  <span>Basic strategies</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
                  <span>Community access</span>
                </div>
              </div>
              <Button
                size="sm"
                className="w-full"
                onClick={() => purchaseMutation.mutate("MINI")}
                disabled={purchaseMutation.isPending}
                data-testid="button-buy-mini"
              >
                <Zap className="mr-1 h-3 w-3" /> Purchase
              </Button>
            </CardContent>
          </Card>
          <Card className="border-border bg-card glow-green-sm" data-testid="card-max-node">
            <CardContent className="p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-primary" />
                <div className="text-sm font-bold">MAX Node</div>
              </div>
              <div className="text-2xl font-bold text-primary">$1,000</div>
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
                  <span>10% referral bonus</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
                  <span>All strategies</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
                  <span>Priority support</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
                  <span>Higher yields</span>
                </div>
              </div>
              <Button
                size="sm"
                className="w-full"
                onClick={() => purchaseMutation.mutate("MAX")}
                disabled={purchaseMutation.isPending}
                data-testid="button-buy-max"
              >
                <Zap className="mr-1 h-3 w-3" /> Purchase
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
