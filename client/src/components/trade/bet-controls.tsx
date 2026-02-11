import { useState } from "react";
import { Minus, Plus, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BET_DEFAULTS } from "@/lib/data";

const DURATIONS = ["1min", "3min", "5min", "15min"];

interface BetControlsProps {
  amount: number;
  onAmountChange: (amount: number) => void;
  duration: string;
  onDurationChange: (duration: string) => void;
  onBet: (direction: "up" | "down") => void;
  isPending?: boolean;
}

export function BetControls({ amount, onAmountChange, duration, onDurationChange, onBet, isPending }: BetControlsProps) {
  const [activeDir, setActiveDir] = useState<"up" | "down" | null>(null);

  const durationIndex = DURATIONS.indexOf(duration);

  function cycleDuration(dir: number) {
    const next = (durationIndex + dir + DURATIONS.length) % DURATIONS.length;
    onDurationChange(DURATIONS[next]);
  }

  function handleBet(direction: "up" | "down") {
    setActiveDir(direction);
    onBet(direction);
    setTimeout(() => setActiveDir(null), 600);
  }

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-md px-4 py-3">
      <div className="mx-auto max-w-lg">
        <div className="flex items-center gap-4 mb-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="icon"
              variant="outline"
              onClick={() => onAmountChange(Math.max(BET_DEFAULTS.minAmount, amount - BET_DEFAULTS.step))}
              data-testid="button-decrease-bet"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <div className="flex items-baseline gap-1 min-w-[60px] justify-center">
              <span className="text-lg font-bold" data-testid="text-bet-amount">${amount}</span>
              <span className="text-[9px] text-muted-foreground">Stake</span>
            </div>
            <Button
              size="icon"
              variant="outline"
              onClick={() => onAmountChange(amount + BET_DEFAULTS.step)}
              data-testid="button-increase-bet"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => cycleDuration(-1)}
              data-testid="button-duration-prev"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center min-w-[50px]">
              <span className="text-lg font-bold" data-testid="text-duration">{duration}</span>
              <div className="text-[9px] text-muted-foreground">Duration</div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => cycleDuration(1)}
              data-testid="button-duration-next"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex gap-3 mb-2">
          <Button
            onClick={() => handleBet("down")}
            disabled={isPending}
            className="flex-1 relative overflow-visible bg-red-600 text-white border-red-700"
            data-testid="button-bear"
          >
            Bear {BET_DEFAULTS.payoutPercent}%
            {activeDir === "down" && <span className="absolute inset-0 rounded-md animate-ping bg-red-400/20" />}
          </Button>
          <Button
            onClick={() => handleBet("up")}
            disabled={isPending}
            className="flex-1 relative overflow-visible bg-green-600 text-white border-green-700"
            data-testid="button-bull"
          >
            Bull {BET_DEFAULTS.payoutPercent}%
            {activeDir === "up" && <span className="absolute inset-0 rounded-md animate-ping bg-green-400/20" />}
          </Button>
        </div>

        <Button
          variant="outline"
          className="w-full text-green-400 border-green-500/30"
          data-testid="button-ai-smarty"
        >
          <Sparkles className="h-4 w-4 mr-1.5" />
          AI Smarty
        </Button>
      </div>
    </div>
  );
}
