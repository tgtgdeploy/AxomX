import { Card, CardContent } from "@/components/ui/card";
import { VAULT_PLANS } from "@/lib/data";
import { formatDailyRate } from "@/lib/formulas";

interface VaultPlansProps {
  selectedPlan?: string;
  onSelectPlan?: (planKey: string) => void;
}

export function VaultPlans({ selectedPlan, onSelectPlan }: VaultPlansProps) {
  return (
    <div>
      <h3 className="text-sm font-bold mb-3">Vault Plans</h3>
      <div className="grid grid-cols-3 gap-3">
        {Object.entries(VAULT_PLANS).map(([key, plan]) => {
          const isSelected = selectedPlan === key;
          return (
            <Card
              key={key}
              className={`border-border bg-card cursor-pointer transition-all duration-200 hover-elevate ${
                isSelected
                  ? "ring-2 ring-green-500 border-green-500/50 shadow-[0_0_12px_rgba(34,197,94,0.15)]"
                  : ""
              }`}
              onClick={() => onSelectPlan?.(key)}
              data-testid={`vault-plan-${key}`}
            >
              <CardContent className="p-3 text-center">
                <div className={`text-sm font-bold mb-1 ${isSelected ? "text-green-400" : "text-primary"}`}>
                  {plan.label}
                </div>
                <div className="text-xs text-muted-foreground mb-1">Daily: {formatDailyRate(plan.dailyRate)}</div>
                <div className="text-xs font-medium text-green-400">{plan.apr} APR</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
