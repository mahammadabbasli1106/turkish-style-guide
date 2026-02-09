import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { ArrowLeft, ArrowRight, Check, MapPin, Camera, Ruler, Target, User, Phone } from "lucide-react";

const STEPS = ["phone", "gender", "body", "style", "goal", "closet", "location"] as const;
type Step = typeof STEPS[number];

const COUNTRY_CODES = [
  { code: "+90", flag: "🇹🇷", name: "TR" },
  { code: "+1", flag: "🇺🇸", name: "US" },
  { code: "+44", flag: "🇬🇧", name: "UK" },
  { code: "+49", flag: "🇩🇪", name: "DE" },
  { code: "+33", flag: "🇫🇷", name: "FR" },
  { code: "+39", flag: "🇮🇹", name: "IT" },
  { code: "+34", flag: "🇪🇸", name: "ES" },
  { code: "+81", flag: "🇯🇵", name: "JP" },
  { code: "+82", flag: "🇰🇷", name: "KR" },
  { code: "+86", flag: "🇨🇳", name: "CN" },
  { code: "+91", flag: "🇮🇳", name: "IN" },
  { code: "+55", flag: "🇧🇷", name: "BR" },
  { code: "+7", flag: "🇷🇺", name: "RU" },
  { code: "+971", flag: "🇦🇪", name: "AE" },
  { code: "+966", flag: "🇸🇦", name: "SA" },
];

const STYLE_OPTIONS = [
  { id: "casual", label: "Casual", emoji: "🤍", description: "Relaxed, everyday comfort" },
  { id: "streetwear", label: "Streetwear", emoji: "🔥", description: "Urban, bold, trendy" },
  { id: "classic", label: "Classic", emoji: "💎", description: "Timeless, refined looks" },
  { id: "elegant", label: "Elegant", emoji: "✨", description: "Sophisticated, polished" },
  { id: "sporty", label: "Sporty", emoji: "⚡", description: "Athletic, active" },
  { id: "business", label: "Business", emoji: "👔", description: "Professional, sharp" },
];

const GOAL_OPTIONS = [
  { id: "find_style", label: "Finding my style", emoji: "🎯" },
  { id: "daily_inspo", label: "Daily outfit inspiration", emoji: "💡" },
  { id: "event_dressing", label: "Dressing for events", emoji: "🎉" },
  { id: "wardrobe_organize", label: "Organizing my wardrobe", emoji: "👗" },
  { id: "shopping_guide", label: "Smart shopping guide", emoji: "🛍️" },
];

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction < 0 ? 300 : -300, opacity: 0 }),
};

export default function OnboardingPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [saving, setSaving] = useState(false);

  // Form state
  const [countryCode, setCountryCode] = useState("+90");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [gender, setGender] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [heightUnit, setHeightUnit] = useState<"cm" | "ft">("cm");
  const [weightUnit, setWeightUnit] = useState<"kg" | "lb">("kg");
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [closetPermission, setClosetPermission] = useState(false);
  const [locationPermission, setLocationPermission] = useState(false);

  const step = STEPS[currentStep];

  const goNext = () => {
    if (currentStep < STEPS.length - 1) {
      setDirection(1);
      setCurrentStep((s) => s + 1);
    } else {
      handleFinish();
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((s) => s - 1);
    }
  };

  const toggleStyle = (id: string) => {
    setSelectedStyles((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : prev.length < 2 ? [...prev, id] : prev
    );
  };

  const toggleGoal = (id: string) => {
    setSelectedGoals((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          phone_number: phoneNumber,
          country_code: countryCode,
          gender,
          height: height ? parseFloat(height) : null,
          weight: weight ? parseFloat(weight) : null,
          height_unit: heightUnit,
          weight_unit: weightUnit,
          goals: selectedGoals,
          closet_permission_granted: closetPermission,
          location_permission_granted: locationPermission,
          onboarding_completed: true,
        })
        .eq("auth_id", user.id);

      if (error) throw error;

      // Save style preferences
      if (selectedStyles.length > 0) {
        await supabase
          .from("user_preferences")
          .update({ preferred_styles: selectedStyles as any })
          .eq("user_id", user.id);
      }

      // Request location if permitted
      if (locationPermission && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(() => {}, () => {});
      }

      toast.success(t("onboarding.complete"));
      navigate("/dashboard", { replace: true });
    } catch {
      toast.error(t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case "phone": return phoneNumber.length >= 6;
      case "gender": return !!gender;
      case "body": return !!height && !!weight;
      case "style": return selectedStyles.length === 2;
      case "goal": return selectedGoals.length >= 1;
      case "closet": return true;
      case "location": return true;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress bar */}
      <div className="px-6 pt-4 pb-2">
        <div className="flex items-center justify-between mb-2">
          {currentStep > 0 && (
            <button onClick={goBack} className="text-muted-foreground p-1">
              <ArrowLeft size={20} />
            </button>
          )}
          <div className="flex-1" />
          <span className="text-xs text-muted-foreground">
            {currentStep + 1}/{STEPS.length}
          </span>
        </div>
        <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-primary rounded-full"
            animate={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 flex flex-col px-6 pt-6 pb-4 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="flex-1 flex flex-col"
          >
            {/* Phone */}
            {step === "phone" && (
              <div className="flex-1 flex flex-col">
                <Phone className="w-8 h-8 text-primary mb-4" />
                <h2 className="font-display text-2xl font-bold mb-2">{t("onboarding.phoneTitle")}</h2>
                <p className="text-muted-foreground text-sm mb-8">{t("onboarding.phoneSubtitle")}</p>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="h-14 px-3 bg-muted border-0 rounded-xl text-foreground text-sm w-24"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.code}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="tel"
                    placeholder="555 123 4567"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ""))}
                    className="flex-1 h-14 px-4 bg-muted border-0 rounded-xl text-foreground"
                    autoFocus
                  />
                </div>
              </div>
            )}

            {/* Gender */}
            {step === "gender" && (
              <div className="flex-1 flex flex-col">
                <User className="w-8 h-8 text-primary mb-4" />
                <h2 className="font-display text-2xl font-bold mb-2">{t("onboarding.genderTitle")}</h2>
                <p className="text-muted-foreground text-sm mb-8">{t("onboarding.genderSubtitle")}</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: "male", label: t("onboarding.male"), emoji: "👨" },
                    { id: "female", label: t("onboarding.female"), emoji: "👩" },
                    { id: "non_binary", label: t("onboarding.nonBinary"), emoji: "🧑" },
                    { id: "prefer_not", label: t("onboarding.preferNot"), emoji: "🤐" },
                  ].map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setGender(g.id)}
                      className={`p-5 rounded-2xl border-2 transition-all text-left ${
                        gender === g.id
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card hover:border-primary/30"
                      }`}
                    >
                      <span className="text-2xl mb-2 block">{g.emoji}</span>
                      <span className="font-medium text-sm">{g.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Body */}
            {step === "body" && (
              <div className="flex-1 flex flex-col">
                <Ruler className="w-8 h-8 text-primary mb-4" />
                <h2 className="font-display text-2xl font-bold mb-2">{t("onboarding.bodyTitle")}</h2>
                <p className="text-muted-foreground text-sm mb-8">{t("onboarding.bodySubtitle")}</p>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium">{t("onboarding.height")}</label>
                      <div className="flex bg-muted rounded-lg p-0.5">
                        <button
                          onClick={() => setHeightUnit("cm")}
                          className={`px-3 py-1 text-xs rounded-md transition-colors ${heightUnit === "cm" ? "bg-primary text-primary-foreground" : ""}`}
                        >cm</button>
                        <button
                          onClick={() => setHeightUnit("ft")}
                          className={`px-3 py-1 text-xs rounded-md transition-colors ${heightUnit === "ft" ? "bg-primary text-primary-foreground" : ""}`}
                        >ft/in</button>
                      </div>
                    </div>
                    <Input
                      type="number"
                      placeholder={heightUnit === "cm" ? "175" : "5.9"}
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      className="h-14 px-4 bg-muted border-0 rounded-xl"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium">{t("onboarding.weight")}</label>
                      <div className="flex bg-muted rounded-lg p-0.5">
                        <button
                          onClick={() => setWeightUnit("kg")}
                          className={`px-3 py-1 text-xs rounded-md transition-colors ${weightUnit === "kg" ? "bg-primary text-primary-foreground" : ""}`}
                        >kg</button>
                        <button
                          onClick={() => setWeightUnit("lb")}
                          className={`px-3 py-1 text-xs rounded-md transition-colors ${weightUnit === "lb" ? "bg-primary text-primary-foreground" : ""}`}
                        >lb</button>
                      </div>
                    </div>
                    <Input
                      type="number"
                      placeholder={weightUnit === "kg" ? "70" : "154"}
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="h-14 px-4 bg-muted border-0 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Style */}
            {step === "style" && (
              <div className="flex-1 flex flex-col">
                <h2 className="font-display text-2xl font-bold mb-2">{t("onboarding.styleTitle")}</h2>
                <p className="text-muted-foreground text-sm mb-6">
                  {t("onboarding.styleSubtitle")} ({selectedStyles.length}/2)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {STYLE_OPTIONS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => toggleStyle(s.id)}
                      className={`p-4 rounded-2xl border-2 transition-all text-left relative ${
                        selectedStyles.includes(s.id)
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card hover:border-primary/30"
                      }`}
                    >
                      {selectedStyles.includes(s.id) && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                          <Check size={12} className="text-primary-foreground" />
                        </div>
                      )}
                      <span className="text-2xl mb-2 block">{s.emoji}</span>
                      <span className="font-medium text-sm block">{s.label}</span>
                      <span className="text-xs text-muted-foreground">{s.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Goal */}
            {step === "goal" && (
              <div className="flex-1 flex flex-col">
                <Target className="w-8 h-8 text-primary mb-4" />
                <h2 className="font-display text-2xl font-bold mb-2">{t("onboarding.goalTitle")}</h2>
                <p className="text-muted-foreground text-sm mb-6">{t("onboarding.goalSubtitle")}</p>
                <div className="space-y-3">
                  {GOAL_OPTIONS.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => toggleGoal(g.id)}
                      className={`w-full p-4 rounded-2xl border-2 transition-all text-left flex items-center gap-3 ${
                        selectedGoals.includes(g.id)
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card hover:border-primary/30"
                      }`}
                    >
                      <span className="text-xl">{g.emoji}</span>
                      <span className="font-medium text-sm">{g.label}</span>
                      {selectedGoals.includes(g.id) && (
                        <Check size={16} className="ml-auto text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Closet permission */}
            {step === "closet" && (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                  <Camera className="w-10 h-10 text-primary" />
                </div>
                <h2 className="font-display text-2xl font-bold mb-3">{t("onboarding.closetTitle")}</h2>
                <p className="text-muted-foreground text-sm mb-8 max-w-xs">
                  {t("onboarding.closetSubtitle")}
                </p>
                <div className="w-full space-y-3">
                  <Button
                    onClick={() => { setClosetPermission(true); goNext(); }}
                    className="w-full h-14 bg-gradient-primary text-primary-foreground rounded-xl text-base font-medium"
                  >
                    {t("onboarding.closetAllow")}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => { setClosetPermission(false); goNext(); }}
                    className="w-full h-14 rounded-xl text-base text-muted-foreground"
                  >
                    {t("onboarding.maybeLater")}
                  </Button>
                </div>
              </div>
            )}

            {/* Location */}
            {step === "location" && (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                  <MapPin className="w-10 h-10 text-primary" />
                </div>
                <h2 className="font-display text-2xl font-bold mb-3">{t("onboarding.locationTitle")}</h2>
                <p className="text-muted-foreground text-sm mb-8 max-w-xs">
                  {t("onboarding.locationSubtitle")}
                </p>
                <div className="w-full space-y-3">
                  <Button
                    onClick={() => { setLocationPermission(true); handleFinish(); }}
                    disabled={saving}
                    className="w-full h-14 bg-gradient-primary text-primary-foreground rounded-xl text-base font-medium"
                  >
                    {saving ? t("common.loading") : t("onboarding.locationAllow")}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => { setLocationPermission(false); handleFinish(); }}
                    disabled={saving}
                    className="w-full h-14 rounded-xl text-base text-muted-foreground"
                  >
                    {t("onboarding.maybeLater")}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom button (not on closet/location steps which have their own buttons) */}
      {step !== "closet" && step !== "location" && (
        <div className="px-6 pb-8 pt-2">
          <Button
            onClick={goNext}
            disabled={!canProceed()}
            className="w-full h-14 bg-foreground text-background hover:bg-foreground/90 rounded-xl text-base font-medium disabled:opacity-40"
          >
            <span>{t("common.continue")}</span>
            <ArrowRight size={18} className="ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}
