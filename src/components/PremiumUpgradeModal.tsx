import { useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { Crown, Shirt, Sparkles, Camera, MessageCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: string;
};

const features = [
  {
    icon: Shirt,
    title: "Unlimited Wardrobe",
    desc: "Upload as many outfits as you want. No more 20-item cap.",
  },
  {
    icon: Sparkles,
    title: "Unlimited AI Styling",
    desc: "Get instant outfit suggestions whenever you need them.",
  },
  {
    icon: Camera,
    title: "Unlimited Virtual Try-Ons",
    desc: "See yourself in any outfit without daily limits.",
  },
  {
    icon: MessageCircle,
    title: "Priority AI Chat",
    desc: "Unlimited messages with your personal fashion stylist.",
  },
];

export default function PremiumUpgradeModal({ open, onOpenChange, trigger }: Props) {
  const [selectedPlan, setSelectedPlan] = useState<"yearly" | "monthly">("yearly");

  const handleStart = () => {
    toast.info("Coming Soon! Premium subscriptions will be available shortly.");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden border-none [&>button]:z-10">
        {/* Header */}
        <div className="px-6 pt-8 pb-4 text-center">
          <h2 className="font-display text-2xl font-bold text-foreground leading-tight">
            Unlock Your Full<br />Style Potential
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            Premium members are 3x more likely to build their perfect wardrobe.
          </p>
        </div>

        {/* Features */}
        <div className="px-6 space-y-3 pb-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 mt-0.5">
                <Crown className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Plan selection */}
        <div className="px-6 pb-4">
          <p className="text-sm font-medium text-foreground text-center mb-3">
            Select a plan for your free trial.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {/* Yearly */}
            <button
              onClick={() => setSelectedPlan("yearly")}
              className={cn(
                "relative rounded-xl border-2 p-4 text-left transition-all",
                selectedPlan === "yearly"
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border bg-card hover:border-primary/40"
              )}
            >
              <span className="absolute -top-2.5 left-3 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                60% Savings
              </span>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">Yearly</span>
                {selectedPlan === "yearly" && (
                  <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
              </div>
              <p className="text-lg font-bold text-primary">$3.99<span className="text-xs font-normal text-muted-foreground">/mo</span></p>
              <p className="text-[10px] text-muted-foreground line-through">$9.99/mo</p>
              <p className="text-[10px] text-muted-foreground mt-1">Billed yearly after free trial.</p>
            </button>

            {/* Monthly */}
            <button
              onClick={() => setSelectedPlan("monthly")}
              className={cn(
                "relative rounded-xl border-2 p-4 text-left transition-all",
                selectedPlan === "monthly"
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border bg-card hover:border-primary/40"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">Monthly</span>
                {selectedPlan === "monthly" && (
                  <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
              </div>
              <p className="text-lg font-bold text-foreground">$9.99<span className="text-xs font-normal text-muted-foreground">/mo</span></p>
              <p className="text-[10px] text-muted-foreground opacity-0">placeholder</p>
              <p className="text-[10px] text-muted-foreground mt-1">Billed monthly after free trial.</p>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 space-y-3">
          <p className="text-xs text-muted-foreground text-center">
            Change plans or cancel anytime.
          </p>
          <Button
            onClick={handleStart}
            className="w-full bg-gradient-primary text-primary-foreground shadow-warm h-12 text-base font-semibold"
            size="lg"
          >
            Start 1-Month Free Trial
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
