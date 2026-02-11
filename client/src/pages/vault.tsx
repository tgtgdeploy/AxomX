import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Lock, ArrowDownToLine, ArrowUpFromLine, Sparkles, AlertCircle } from "lucide-react";
import { VaultChart } from "@/components/vault/vault-chart";
import { VaultStats } from "@/components/vault/vault-stats";
import { VaultPlans } from "@/components/vault/vault-plans";
import { useActiveAccount } from "thirdweb/react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { VAULT_PLANS } from "@/lib/data";
import { formatUSD, shortenAddress } from "@/lib/constants";
import type { VaultPosition, Transaction } from "@shared/schema";

function TransactionTable({ walletAddress, type }: { walletAddress: string; type: string }) {
  const { data: txs, isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions", walletAddress, type],
    queryFn: async () => {
      const res = await fetch(`/api/transactions/${walletAddress}?type=${type}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!walletAddress,
  });

  if (isLoading) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="p-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full mb-2" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!txs || txs.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="p-4 text-center py-8">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
          <div className="text-sm text-muted-foreground" data-testid={`text-no-${type.toLowerCase()}-records`}>No records</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card">
      <CardContent className="p-4">
        <div className="grid grid-cols-5 text-[10px] text-muted-foreground mb-2 font-medium gap-1">
          <span>Token</span><span>Amount</span><span>TXID</span><span>Status</span><span>Date</span>
        </div>
        <div className="space-y-1">
          {txs.map((tx, idx) => (
            <div
              key={tx.id}
              className="grid grid-cols-5 text-xs py-2 border-b border-border/30 last:border-0 gap-1"
              style={{ animation: `fadeSlideIn 0.3s ease-out ${idx * 0.05}s both` }}
              data-testid={`row-tx-${tx.id}`}
            >
              <span className="font-medium">{tx.token}</span>
              <span className="text-neon-value">${Number(tx.amount).toFixed(2)}</span>
              <span className="text-muted-foreground truncate">
                {tx.txHash ? shortenAddress(tx.txHash) : "-"}
              </span>
              <Badge
                className={`text-[9px] w-fit no-default-hover-elevate no-default-active-elevate ${
                  tx.status === "CONFIRMED"
                    ? "bg-primary/15 text-primary"
                    : "bg-yellow-500/15 text-yellow-400"
                }`}
              >
                {tx.status}
              </Badge>
              <span className="text-muted-foreground">
                {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : "-"}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Vault() {
  const account = useActiveAccount();
  const walletAddress = account?.address || "";
  const { toast } = useToast();

  const [depositOpen, setDepositOpen] = useState(false);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>("5_DAYS");
  const [depositAmount, setDepositAmount] = useState("");
  const [selectedPositionId, setSelectedPositionId] = useState<string>("");

  const { data: positions, isLoading: positionsLoading } = useQuery<VaultPosition[]>({
    queryKey: ["/api/vault/positions", walletAddress],
    enabled: !!walletAddress,
  });

  const activePositions = useMemo(() => {
    return (positions || []).filter(p => p.status === "ACTIVE");
  }, [positions]);

  const { totalPrincipal, totalYield } = useMemo(() => {
    const now = new Date();
    let principal = 0;
    let yieldSum = 0;
    for (const p of activePositions) {
      const amt = Number(p.principal || 0);
      principal += amt;
      const start = new Date(p.startDate!);
      const days = Math.max(0, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      yieldSum += amt * Number(p.dailyRate || 0) * days;
    }
    return { totalPrincipal: principal, totalYield: yieldSum };
  }, [activePositions]);

  const depositMutation = useMutation({
    mutationFn: async (data: { walletAddress: string; planType: string; amount: number; txHash: string }) => {
      const res = await apiRequest("POST", "/api/vault/deposit", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Deposit successful", description: "Your vault position has been created." });
      queryClient.invalidateQueries({ queryKey: ["/api/vault/positions", walletAddress] });
      queryClient.invalidateQueries({ queryKey: ["/api/vault/overview"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions", walletAddress] });
      setDepositOpen(false);
      setDepositAmount("");
    },
    onError: (err: Error) => {
      toast({ title: "Deposit failed", description: err.message, variant: "destructive" });
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async (data: { walletAddress: string; positionId: string }) => {
      const res = await apiRequest("POST", "/api/vault/withdraw", data);
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Withdrawal successful",
        description: `Withdrawn $${Number(data.totalWithdraw).toFixed(2)} (Yield: $${Number(data.yieldAmount).toFixed(2)})`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/vault/positions", walletAddress] });
      queryClient.invalidateQueries({ queryKey: ["/api/vault/overview"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions", walletAddress] });
      setRedeemOpen(false);
      setSelectedPositionId("");
    },
    onError: (err: Error) => {
      toast({ title: "Withdrawal failed", description: err.message, variant: "destructive" });
    },
  });

  const handleDeposit = () => {
    const amount = parseFloat(depositAmount);
    if (!walletAddress || !selectedPlan || isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid input", description: "Please enter a valid amount and connect your wallet.", variant: "destructive" });
      return;
    }
    const txHash = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;
    depositMutation.mutate({ walletAddress, planType: selectedPlan, amount, txHash });
  };

  const handleWithdraw = (positionId: string) => {
    if (!walletAddress || !positionId) return;
    withdrawMutation.mutate({ walletAddress, positionId });
  };

  const handlePlanSelect = (planKey: string) => {
    setSelectedPlan(planKey);
    setDepositOpen(true);
  };

  return (
    <div className="space-y-4 pb-24">
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <VaultChart />

      <div className="px-4">
        <h3 className="text-base font-bold mb-3">Vault Details</h3>
        <VaultStats />
      </div>

      <div className="px-4">
        <Card className="border-border bg-card shadow-[0_0_15px_rgba(0,188,165,0.05)]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
              <div>
                <div className="text-[10px] text-muted-foreground">Your Position</div>
                <div className="text-xl font-bold" data-testid="text-my-position">
                  {walletAddress ? formatUSD(totalPrincipal) : "$0.00"}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground">Accumulated Yield</div>
                <div className="text-xl font-bold text-neon-value" data-testid="text-my-yield">
                  {walletAddress ? formatUSD(totalYield) : "$0.00"}
                </div>
              </div>
            </div>
            <Button
              variant="secondary"
              className="w-full"
              disabled={totalYield <= 0}
              data-testid="button-claim"
            >
              <Sparkles className="mr-2 h-4 w-4" /> Claim Yield
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="px-4">
        <VaultPlans selectedPlan={selectedPlan} onSelectPlan={handlePlanSelect} />
      </div>

      <div className="px-4">
        <h3 className="text-sm font-bold mb-3">Positions</h3>
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="grid grid-cols-5 text-[10px] text-muted-foreground mb-2 font-medium gap-1">
              <span>Amount</span>
              <span>Start</span>
              <span>Lock</span>
              <span>Remaining</span>
              <span>Action</span>
            </div>
            {positionsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full mb-2" />
              ))
            ) : !positions || positions.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground" data-testid="text-no-positions">
                No positions yet
              </div>
            ) : (
              <div className="space-y-1">
                {positions.map((pos, idx) => {
                  const now = new Date();
                  const start = new Date(pos.startDate!);
                  const end = pos.endDate ? new Date(pos.endDate) : null;
                  const remainingDays = end ? Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;
                  const planConfig = VAULT_PLANS[pos.planType as keyof typeof VAULT_PLANS];
                  const lockDays = planConfig?.days || 0;

                  return (
                    <div
                      key={pos.id}
                      className="grid grid-cols-5 items-center text-xs py-2 border-b border-border/30 last:border-0 gap-1"
                      style={{ animation: `fadeSlideIn 0.3s ease-out ${idx * 0.08}s both` }}
                      data-testid={`row-position-${pos.id}`}
                    >
                      <span className="font-medium">${Number(pos.principal).toFixed(2)}</span>
                      <span className="text-muted-foreground">{start.toLocaleDateString()}</span>
                      <span className="text-muted-foreground">{lockDays}d</span>
                      <span className={remainingDays > 0 ? "text-yellow-400" : "text-neon-value"}>
                        {pos.status === "ACTIVE" ? `${remainingDays}d` : pos.status}
                      </span>
                      <div>
                        {pos.status === "ACTIVE" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-red-400"
                            onClick={() => handleWithdraw(pos.id)}
                            disabled={withdrawMutation.isPending}
                            data-testid={`button-withdraw-${pos.id}`}
                          >
                            Withdraw
                          </Button>
                        ) : (
                          <Badge className="text-[9px] bg-muted/50 text-muted-foreground no-default-hover-elevate no-default-active-elevate">
                            {pos.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="px-4">
        <Tabs defaultValue="deposit">
          <TabsList className="w-full bg-card border border-border">
            <TabsTrigger value="deposit" className="flex-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" data-testid="tab-deposit">
              Deposit
            </TabsTrigger>
            <TabsTrigger value="withdraw" className="flex-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" data-testid="tab-withdraw">
              Withdraw
            </TabsTrigger>
            <TabsTrigger value="yield" className="flex-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" data-testid="tab-yield">
              Yield
            </TabsTrigger>
          </TabsList>
          <TabsContent value="deposit" className="mt-3">
            {walletAddress ? (
              <TransactionTable walletAddress={walletAddress} type="DEPOSIT" />
            ) : (
              <Card className="border-border bg-card">
                <CardContent className="p-4 text-center py-6 text-sm text-muted-foreground">Connect wallet to view</CardContent>
              </Card>
            )}
          </TabsContent>
          <TabsContent value="withdraw" className="mt-3">
            {walletAddress ? (
              <TransactionTable walletAddress={walletAddress} type="WITHDRAW" />
            ) : (
              <Card className="border-border bg-card">
                <CardContent className="p-4 text-center py-6 text-sm text-muted-foreground">Connect wallet to view</CardContent>
              </Card>
            )}
          </TabsContent>
          <TabsContent value="yield" className="mt-3">
            {walletAddress ? (
              <TransactionTable walletAddress={walletAddress} type="YIELD" />
            ) : (
              <Card className="border-border bg-card">
                <CardContent className="p-4 text-center py-6 text-sm text-muted-foreground">Connect wallet to view</CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <div className="fixed bottom-16 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-md px-4 py-3">
        <div className="mx-auto max-w-lg flex gap-3">
          <Button
            className="flex-1 bg-cyan-600 text-white border-cyan-700"
            onClick={() => setDepositOpen(true)}
            data-testid="button-deposit-vault"
          >
            <ArrowDownToLine className="mr-2 h-4 w-4" /> Deposit to Vault
          </Button>
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => setRedeemOpen(true)}
            data-testid="button-redeem-vault"
          >
            <ArrowUpFromLine className="mr-2 h-4 w-4" /> Redeem from Vault
          </Button>
        </div>
      </div>

      <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Deposit to Vault</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Select Plan</label>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger data-testid="select-plan">
                  <SelectValue placeholder="Choose a plan" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(VAULT_PLANS).map(([key, plan]) => (
                    <SelectItem key={key} value={key} data-testid={`select-plan-${key}`}>
                      {plan.label} - {plan.apr} APR
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Amount (USDT)</label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                min="1"
                step="1"
                data-testid="input-deposit-amount"
              />
            </div>
            {selectedPlan && (
              <div className="bg-muted/30 rounded-md p-3 text-xs space-y-1">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Daily Rate</span>
                  <span className="text-neon-value">
                    {(VAULT_PLANS[selectedPlan as keyof typeof VAULT_PLANS]?.dailyRate * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Lock Period</span>
                  <span>{VAULT_PLANS[selectedPlan as keyof typeof VAULT_PLANS]?.days} days</span>
                </div>
                {depositAmount && !isNaN(parseFloat(depositAmount)) && (
                  <div className="flex justify-between gap-2 pt-1 border-t border-border/30">
                    <span className="text-muted-foreground">Est. Total Yield</span>
                    <span className="text-neon-value font-medium">
                      ${(parseFloat(depositAmount) * VAULT_PLANS[selectedPlan as keyof typeof VAULT_PLANS]?.dailyRate * VAULT_PLANS[selectedPlan as keyof typeof VAULT_PLANS]?.days).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 border-emerald-500/50 text-white"
              onClick={handleDeposit}
              disabled={depositMutation.isPending || !walletAddress}
              data-testid="button-confirm-deposit"
            >
              {depositMutation.isPending ? "Processing..." : !walletAddress ? "Connect Wallet First" : "Confirm Deposit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={redeemOpen} onOpenChange={setRedeemOpen}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Redeem from Vault</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {!walletAddress ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                Connect wallet to view positions
              </div>
            ) : activePositions.length === 0 ? (
              <div className="text-center py-4 text-sm text-muted-foreground" data-testid="text-no-active-positions">
                No active positions to redeem
              </div>
            ) : (
              <>
                <label className="text-xs text-muted-foreground mb-1.5 block">Select Position</label>
                <Select value={selectedPositionId} onValueChange={setSelectedPositionId}>
                  <SelectTrigger data-testid="select-position">
                    <SelectValue placeholder="Choose a position" />
                  </SelectTrigger>
                  <SelectContent>
                    {activePositions.map((pos) => {
                      const planConfig = VAULT_PLANS[pos.planType as keyof typeof VAULT_PLANS];
                      return (
                        <SelectItem key={pos.id} value={pos.id} data-testid={`select-position-${pos.id}`}>
                          ${Number(pos.principal).toFixed(2)} - {planConfig?.label || pos.planType}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {selectedPositionId && (() => {
                  const pos = activePositions.find(p => p.id === selectedPositionId);
                  if (!pos) return null;
                  const now = new Date();
                  const start = new Date(pos.startDate!);
                  const days = Math.max(0, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
                  const yieldAmt = Number(pos.principal) * Number(pos.dailyRate) * days;
                  const total = Number(pos.principal) + yieldAmt;
                  const isEarly = pos.endDate && now < new Date(pos.endDate);
                  return (
                    <div className="bg-muted/30 rounded-md p-3 text-xs space-y-1">
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Principal</span>
                        <span>${Number(pos.principal).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Yield ({days}d)</span>
                        <span className="text-neon-value">${yieldAmt.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between gap-2 pt-1 border-t border-border/30">
                        <span className="text-muted-foreground">Total</span>
                        <span className="font-medium">${total.toFixed(2)}</span>
                      </div>
                      {isEarly && (
                        <div className="text-yellow-400 text-[10px] mt-1">
                          Early withdrawal - lock period not complete
                        </div>
                      )}
                    </div>
                  );
                })()}
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 border-emerald-500/50 text-white"
              onClick={() => handleWithdraw(selectedPositionId)}
              disabled={withdrawMutation.isPending || !selectedPositionId || !walletAddress}
              data-testid="button-confirm-redeem"
            >
              {withdrawMutation.isPending ? "Processing..." : "Confirm Redemption"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
