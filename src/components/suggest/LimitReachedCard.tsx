import { useState, useEffect } from "react";
import { Sparkles, Crown, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";

const DISMISS_KEY = "limit-card-dismissed-until";

function hoursUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diffMs = midnight.getTime() - now.getTime();
  const hours = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));
  return hours;
}

export default function LimitReachedCard() {
  const [dismissed, setDismissed] = useState(false);
  const [hoursLeft, setHoursLeft] = useState(hoursUntilMidnight());

  useEffect(() => {
    // Check stored dismissal
    const until = localStorage.getItem(DISMISS_KEY);
    if (until && Date.now() < Number(until)) {
      setDismissed(true);
    }

    // Refresh hours every 5 min
    const id = setInterval(() => setHoursLeft(hoursUntilMidnight()), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const handleDismiss = () => {
    const tomorrow = Date.now() + 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISS_KEY, String(tomorrow));
    setDismissed(true);
  };

  const handleUpgrade = () => {
    toast("Premium is coming soon! We'll let you know when it launches. ✨");
  };

  if (dismissed) {
    return (
      <div className="bg-muted/40 rounded-2xl p-4 text-center border border-border">
        <p className="text-sm text-muted-foreground">
          See you tomorrow for fresh suggestions! Resets in ~{hoursLeft} hour{hoursLeft === 1 ? "" : "s"}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Heading */}
      <div className="bg-card rounded-2xl p-6 border border-border text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mx-auto">
          <Clock className="h-6 w-6 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-bold text-foreground">
          You've used all your free suggestions for today
        </h2>
        <p className="text-sm text-muted-foreground">
          Resets at midnight — in approximately {hoursLeft} hour{hoursLeft === 1 ? "" : "s"}
        </p>
      </div>

      {/* Upgrade card */}
      <div className="rounded-2xl p-5 border-2 border-primary bg-gradient-to-br from-primary/5 to-primary/10 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
            <Crown className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Upgrade to Premium</p>
            <p className="text-xs text-muted-foreground">
              Unlimited suggestions every day · $5.99/month
            </p>
          </div>
        </div>
        <Button
          onClick={handleUpgrade}
          className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-xl"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Upgrade
        </Button>
      </div>

      {/* Dismiss link */}
      <div className="text-center">
        <button
          onClick={handleDismiss}
          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
        >
          Remind me tomorrow
        </button>
      </div>
    </div>
  );
}
