import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VAULT_PLANS } from "@/lib/data";
import { formatDailyRate } from "@/lib/formulas";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { useState } from "react";

interface VaultPlansProps {
  selectedPlan?: string;
  onSelectPlan?: (planKey: string) => void;
}

export function VaultPlans({ selectedPlan, onSelectPlan }: VaultPlansProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleSelect = (key: string) => {
    onSelectPlan?.(key);
    setDialogOpen(false);
  };

  return (
    <div>
      <Card className="border-border bg-card" data-testid="card-vault-plans-cta">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-sm font-bold">Vault Plans</div>
                <div className="text-[10px] text-muted-foreground">Earn yield with locked staking</div>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setDialogOpen(true)}
              data-testid="button-open-plans-dialog"
            >
              View Plans
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Choose a Vault Plan</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select a plan to start earning yield on your assets
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {Object.entries(VAULT_PLANS).map(([key, plan]) => {
              const isSelected = selectedPlan === key;
              return (
                <Card
                  key={key}
                  className={`border-border bg-background cursor-pointer transition-all duration-200 hover-elevate ${
                    isSelected
                      ? "ring-2 ring-primary border-primary/50 shadow-[0_0_12px_rgba(0,188,165,0.15)]"
                      : ""
                  }`}
                  onClick={() => handleSelect(key)}
                  data-testid={`vault-plan-${key}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                      <span className={`text-sm font-bold ${isSelected ? "text-primary" : ""}`}>
                        {plan.label}
                      </span>
                      <span className="text-lg font-bold text-neon-value">{plan.apr} APR</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
                        <span>Daily rate: {formatDailyRate(plan.dailyRate)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
                        <span>Lock period: {plan.days} days</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
