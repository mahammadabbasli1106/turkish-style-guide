import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { Crown, Shirt, Sparkles, Camera, MessageCircle } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: string;
};

const features = [
  { icon: Shirt, label: "Unlimited Wardrobe" },
  { icon: Sparkles, label: "Unlimited AI Suggestions" },
  { icon: Camera, label: "Unlimited Try-Ons" },
  { icon: MessageCircle, label: "24/7 Personal Stylist Access" },
];

export default function PremiumUpgradeModal({ open, onOpenChange, trigger }: Props) {
  const handlePurchase = () => {
    toast.info("Coming Soon! Premium subscriptions will be available shortly.");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center items-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Crown className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-xl font-display">
            {trigger || "Upgrade to Premium"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Unlock the full power of your AI stylist
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 my-4">
          {features.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3 rounded-lg bg-secondary/50 px-4 py-3">
              <Icon className="h-5 w-5 text-primary shrink-0" />
              <span className="text-sm font-medium text-foreground">{label}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={handlePurchase}
            className="bg-gradient-primary text-primary-foreground shadow-warm"
          >
            <div className="text-center leading-tight">
              <div className="font-semibold">Monthly</div>
              <div className="text-xs opacity-80">$9.99/mo</div>
            </div>
          </Button>
          <Button
            onClick={handlePurchase}
            variant="outline"
            className="border-primary text-primary hover:bg-primary/5"
          >
            <div className="text-center leading-tight">
              <div className="font-semibold">Yearly</div>
              <div className="text-xs opacity-80">$95.99/yr — Save 20%</div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
