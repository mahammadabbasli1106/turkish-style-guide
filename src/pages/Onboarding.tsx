import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { MapPin, Loader2, User, Palette, ChevronRight, ChevronLeft } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type StylePreference = Database["public"]["Enums"]["style_preference"];

const ALL_STYLES: { value: StylePreference; emoji: string; label: string }[] = [
  { value: "casual", emoji: "👕", label: "Casual" },
  { value: "business", emoji: "💼", label: "Business" },
  { value: "streetwear", emoji: "🔥", label: "Streetwear" },
  { value: "classic", emoji: "🎩", label: "Classic" },
  { value: "sporty", emoji: "🏋️", label: "Sporty" },
  { value: "elegant", emoji: "✨", label: "Elegant" },
];

const GENDER_OPTIONS = [
  { value: "male", emoji: "👨", label: "Male" },
  { value: "female", emoji: "👩", label: "Female" },
  { value: "other", emoji: "🧑", label: "Other" },
];

const TOTAL_STEPS = 3;

export default function OnboardingPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [gender, setGender] = useState("");
  const [city, setCity] = useState("");
  const [selectedStyles, setSelectedStyles] = useState<StylePreference[]>([]);
  const [saving, setSaving] = useState(false);

  const toggleStyle = (style: StylePreference) => {
    setSelectedStyles((prev) =>
      prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]
    );
  };

  const canProceed = () => {
    if (step === 0) return displayName.trim().length > 0 && gender.length > 0;
    if (step === 1) return city.trim().length > 0;
    if (step === 2) return selectedStyles.length > 0;
    return false;
  };

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim(),
          gender,
          location: city.trim(),
          onboarding_completed: true,
        })
        .eq("auth_id", user.id);

      if (error) throw error;

      await supabase
        .from("user_preferences")
        .upsert(
          {
            user_id: user.id,
            default_location: city.trim(),
            preferred_styles: selectedStyles,
          },
          { onConflict: "user_id" }
        );

      // Pre-set the cache to true so Dashboard won't redirect back
      queryClient.setQueryData(["onboarding-check", user.id], true);
      toast.success(t("onboarding.complete"));
      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error("Onboarding error:", err);
      toast.error(t("common.error") || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    } else {
      handleFinish();
    }
  };

  const slideVariants = {
    enter: { opacity: 0, x: 60 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -60 },
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-muted z-50">
        <motion.div
          className="h-full bg-primary"
          animate={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <div className="w-full max-w-sm">
        {/* Step indicator */}
        <div className="flex justify-center gap-2 mb-8">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step ? "w-8 bg-primary" : i < step ? "w-2 bg-primary/50" : "w-2 bg-muted"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 0: Name & Gender */}
          {step === 0 && (
            <motion.div
              key="step-0"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center"
            >
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                <User className="w-10 h-10 text-primary" />
              </div>
              <h2 className="font-display text-2xl font-bold mb-2 text-center">
                {t("onboarding.nameTitle")}
              </h2>
              <p className="text-muted-foreground text-sm mb-6 text-center max-w-xs">
                {t("onboarding.nameSubtitle")}
              </p>

              <Input
                type="text"
                placeholder={t("settings.displayNamePlaceholder") || "e.g. Alex"}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full h-14 px-4 bg-muted border-0 rounded-xl text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-foreground mb-6"
                autoFocus
              />

              <p className="text-sm font-medium text-foreground mb-3 self-start">
                {t("onboarding.genderLabel")}
              </p>
              <div className="grid grid-cols-3 gap-3 w-full">
                {GENDER_OPTIONS.map((g) => (
                  <button
                    key={g.value}
                    onClick={() => setGender(g.value)}
                    className={`flex flex-col items-center gap-1.5 py-4 rounded-xl border-2 transition-all ${
                      gender === g.value
                        ? "border-primary bg-primary/10 scale-[1.02]"
                        : "border-border bg-card hover:border-primary/30"
                    }`}
                  >
                    <span className="text-2xl">{g.emoji}</span>
                    <span className="text-xs font-medium text-foreground">{g.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 1: City */}
          {step === 1 && (
            <motion.div
              key="step-1"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center"
            >
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                <MapPin className="w-10 h-10 text-primary" />
              </div>
              <h2 className="font-display text-2xl font-bold mb-2 text-center">
                {t("onboarding.locationTitle")}
              </h2>
              <p className="text-muted-foreground text-sm mb-8 text-center max-w-xs">
                {t("onboarding.locationSubtitle")}
              </p>

              <Input
                type="text"
                placeholder={t("settings.locationPlaceholder") || "e.g. Istanbul, New York"}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full h-14 px-4 bg-muted border-0 rounded-xl text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-foreground"
                autoFocus
              />
            </motion.div>
          )}

          {/* Step 2: Style Preferences */}
          {step === 2 && (
            <motion.div
              key="step-2"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center"
            >
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                <Palette className="w-10 h-10 text-primary" />
              </div>
              <h2 className="font-display text-2xl font-bold mb-2 text-center">
                {t("onboarding.styleTitle")}
              </h2>
              <p className="text-muted-foreground text-sm mb-6 text-center max-w-xs">
                {t("onboarding.styleSubtitle")}
              </p>

              <div className="grid grid-cols-2 gap-3 w-full">
                {ALL_STYLES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => toggleStyle(s.value)}
                    className={`flex items-center gap-3 py-4 px-4 rounded-xl border-2 transition-all ${
                      selectedStyles.includes(s.value)
                        ? "border-primary bg-primary/10 scale-[1.02]"
                        : "border-border bg-card hover:border-primary/30"
                    }`}
                  >
                    <span className="text-2xl">{s.emoji}</span>
                    <span className="text-sm font-medium text-foreground">{s.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation buttons */}
        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              className="h-14 px-6 rounded-xl"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={!canProceed() || saving}
            className="flex-1 h-14 bg-gradient-primary text-primary-foreground rounded-xl text-base font-medium"
          >
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : step === TOTAL_STEPS - 1 ? (
              t("onboarding.finish")
            ) : (
              <span className="flex items-center gap-2">
                {t("common.continue") || "Continue"}
                <ChevronRight className="h-5 w-5" />
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
