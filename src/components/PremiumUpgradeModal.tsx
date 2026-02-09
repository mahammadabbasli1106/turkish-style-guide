import { useState } from "react";
import { useTranslation } from "react-i18next";
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

type Currency = "TL" | "USD";

const pricing: Record<Currency, { monthly: number; yearly: number; symbol: string }> = {
  TL: { monthly: 69.99, yearly: 49.99, symbol: "₺" },
  USD: { monthly: 9.99, yearly: 3.99, symbol: "$" },
};

export default function PremiumUpgradeModal({ open, onOpenChange, trigger }: Props) {
  const { t, i18n } = useTranslation();
  const [selectedPlan, setSelectedPlan] = useState<"yearly" | "monthly">("yearly");
  const [currency, setCurrency] = useState<Currency>(i18n.language === "tr" ? "TL" : "USD");

  const p = pricing[currency];

  const features = [
    { icon: Shirt, title: t("premium.unlimitedWardrobe"), desc: t("premium.unlimitedWardrobeDesc") },
    { icon: Sparkles, title: t("premium.unlimitedStyling"), desc: t("premium.unlimitedStylingDesc") },
    { icon: Camera, title: t("premium.unlimitedTryOn"), desc: t("premium.unlimitedTryOnDesc") },
    { icon: MessageCircle, title: t("premium.priorityChat"), desc: t("premium.priorityChatDesc") },
  ];

  const handleStart = () => {
    toast.info(t("premium.comingSoon"));
  };

  const formatPrice = (amount: number) =>
    currency === "TL" ? `${amount.toFixed(2)} ₺` : `$${amount.toFixed(2)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden border-none [&>button]:z-10">
        {/* Header */}
        <div className="px-6 pt-8 pb-4 text-center">
          <h2 className="font-display text-2xl font-bold text-foreground leading-tight">
            {t("premium.headline")}
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            {t("premium.subheadline")}
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

        {/* Currency toggle + Plan selection */}
        <div className="px-6 pb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-foreground">
              {t("premium.selectPlan")}
            </p>
            <div className="flex items-center bg-secondary rounded-full p-0.5">
              <button
                onClick={() => setCurrency("TL")}
                className={cn(
                  "text-xs font-semibold px-3 py-1 rounded-full transition-all",
                  currency === "TL"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                ₺ TL
              </button>
              <button
                onClick={() => setCurrency("USD")}
                className={cn(
                  "text-xs font-semibold px-3 py-1 rounded-full transition-all",
                  currency === "USD"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                $ USD
              </button>
            </div>
          </div>

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
                {t("premium.savings")}
              </span>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                  {t("premium.yearly")}
                </span>
                {selectedPlan === "yearly" && (
                  <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
              </div>
              <p className="text-lg font-bold text-primary">
                {formatPrice(p.yearly)}
                <span className="text-xs font-normal text-muted-foreground">{t("premium.perMonth")}</span>
              </p>
              <p className="text-[10px] text-muted-foreground line-through">
                {formatPrice(p.monthly)}{t("premium.perMonth")}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">{t("premium.billedYearly")}</p>
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
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                  {t("premium.monthly")}
                </span>
                {selectedPlan === "monthly" && (
                  <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
              </div>
              <p className="text-lg font-bold text-foreground">
                {formatPrice(p.monthly)}
                <span className="text-xs font-normal text-muted-foreground">{t("premium.perMonth")}</span>
              </p>
              <p className="text-[10px] text-muted-foreground opacity-0">placeholder</p>
              <p className="text-[10px] text-muted-foreground mt-1">{t("premium.billedMonthly")}</p>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 space-y-3">
          <p className="text-xs text-muted-foreground text-center">
            {t("premium.cancelAnytime")}
          </p>
          <Button
            onClick={handleStart}
            className="w-full bg-gradient-primary text-primary-foreground shadow-warm h-12 text-base font-semibold"
            size="lg"
          >
            {t("premium.startTrial")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
