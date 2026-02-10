import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { MapPin, Loader2 } from "lucide-react";

export default function OnboardingPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [city, setCity] = useState("");
  const [saving, setSaving] = useState(false);

  const handleFinish = async () => {
    if (!user || !city.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          location: city.trim(),
          onboarding_completed: true,
        })
        .eq("auth_id", user.id);

      if (error) throw error;

      // Also set default_location in user_preferences
      await supabase
        .from("user_preferences")
        .upsert({
          user_id: user.id,
          default_location: city.trim(),
        }, { onConflict: "user_id" });

      toast.success(t("onboarding.complete"));
      navigate("/dashboard", { replace: true });
    } catch {
      toast.error(t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm flex flex-col items-center"
      >
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
          <MapPin className="w-10 h-10 text-primary" />
        </div>

        <h2 className="font-display text-2xl font-bold mb-2 text-center">
          {t("onboarding.locationTitle") || "Where are you based?"}
        </h2>
        <p className="text-muted-foreground text-sm mb-8 text-center max-w-xs">
          {t("onboarding.locationSubtitle") || "We'll use this to tailor weather-based outfit suggestions for you."}
        </p>

        <Input
          type="text"
          placeholder={t("settings.locationPlaceholder") || "e.g. Istanbul, New York"}
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="w-full h-14 px-4 bg-muted border-0 rounded-xl text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-foreground"
          autoFocus
        />

        <Button
          onClick={handleFinish}
          disabled={!city.trim() || saving}
          className="w-full h-14 bg-gradient-primary text-primary-foreground rounded-xl text-base font-medium mt-6"
        >
          {saving ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            t("common.continue") || "Continue"
          )}
        </Button>
      </motion.div>
    </div>
  );
}
