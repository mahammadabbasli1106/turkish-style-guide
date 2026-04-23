import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Check, MapPin, Loader2, Sparkles } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import LanguageSwitch from "@/components/LanguageSwitch";
import StepFullBodyPhoto from "@/components/onboarding/StepFullBodyPhoto";
import StepConsent from "@/components/onboarding/StepConsent";
import StepWardrobeBuild from "@/components/onboarding/StepWardrobeBuild";
import { compressImage } from "@/lib/imageUtils";
import type { Database } from "@/integrations/supabase/types";

type StylePreference = Database["public"]["Enums"]["style_preference"];

const TOTAL_STEPS = 9;
const REVEAL_STEP = 9;

const GENDER_OPTIONS = [
  { value: "masculine", labelKey: "onboarding.masculine" },
  { value: "feminine", labelKey: "onboarding.feminine" },
  { value: "unisex", labelKey: "onboarding.unisex" },
];

const STYLE_OPTIONS: { value: StylePreference; labelKey: string; emoji: string }[] = [
  { value: "casual", labelKey: "onboarding.casual", emoji: "👕" },
  { value: "business", labelKey: "onboarding.business", emoji: "💼" },
  { value: "streetwear", labelKey: "onboarding.streetwear", emoji: "🔥" },
  { value: "classic", labelKey: "onboarding.classic", emoji: "🎩" },
  { value: "sporty", labelKey: "onboarding.sporty", emoji: "⚡" },
  { value: "elegant", labelKey: "onboarding.elegant", emoji: "✨" },
];

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
};

export default function Onboarding() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [gender, setGender] = useState("");
  const [height, setHeight] = useState(170);
  const [weight, setWeight] = useState(70);
  const [city, setCity] = useState("");
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<StylePreference[]>([]);
  const [fullBodyPhoto, setFullBodyPhoto] = useState<string | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [consentAgreed, setConsentAgreed] = useState(false);

  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [onboardingDone, setOnboardingDone] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("auth_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.onboarding_completed) setOnboardingDone(true);
        setCheckingOnboarding(false);
      });
  }, [user]);

  // Track wardrobe count for the wardrobe-build step (step 8)
  const [wardrobeCount, setWardrobeCount] = useState(0);
  useEffect(() => {
    if (!user || step !== 8) return;
    const fetchCount = async () => {
      const { count } = await supabase
        .from("clothing_items")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      setWardrobeCount(count || 0);
    };
    fetchCount();
    const interval = setInterval(fetchCount, 1500);
    return () => clearInterval(interval);
  }, [user, step]);

  // Auto-save on final step (REVEAL_STEP)
  useEffect(() => {
    if (step !== REVEAL_STEP || saving) return;
    const save = async () => {
      setSaving(true);
      try {
        // Upload full body photo if provided
        let fullBodyPhotoUrl: string | null = null;
        if (fullBodyPhoto) {
          const fileName = `${user!.id}/full-body-${Date.now()}.jpg`;
          const base64Data = fullBodyPhoto.split(",")[1];
          const byteArray = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
          const { error: uploadError } = await supabase.storage
            .from("try-on-images")
            .upload(fileName, byteArray, { contentType: "image/jpeg", upsert: true });
          if (!uploadError) {
            const { data: signedData } = await supabase.storage
              .from("try-on-images")
              .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year for profile photo
            fullBodyPhotoUrl = signedData?.signedUrl || null;
          }
        }

        const profileData = {
          auth_id: user!.id,
          display_name: displayName,
          gender,
          height,
          weight,
          height_unit: "cm" as const,
          weight_unit: "kg" as const,
          location: city,
          onboarding_completed: true,
          email: user!.email || null,
          full_body_photo_url: fullBodyPhotoUrl,
          privacy_consent_version: "1.0",
          privacy_consent_at: new Date().toISOString(),
        };

        await supabase
          .from("profiles")
          .upsert(profileData, { onConflict: "auth_id" });

        await supabase
          .from("user_preferences")
          .upsert(
            { user_id: user!.id, preferred_styles: selectedStyles, default_location: city },
            { onConflict: "user_id" }
          );

        await new Promise((r) => setTimeout(r, 3000));
        navigate("/dashboard", { replace: true });
      } catch {
        toast.error(t("common.error"));
        setSaving(false);
      }
    };
    save();
  }, [step]);

  if (loading || checkingOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <Loader2 className="h-8 w-8 animate-spin text-[#8A70D6]" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (onboardingDone) return <Navigate to="/dashboard" replace />;

  const goNext = () => { setDirection(1); setStep((s) => s + 1); };
  const goBack = () => { setDirection(-1); setStep((s) => s - 1); };

  const canContinue = () => {
    if (step === 1) return consentAgreed;
    if (step === 2) return displayName.trim().length > 0;
    if (step === 3) return gender.length > 0;
    if (step === 7) return selectedStyles.length >= 2;
    return true;
  };

  const searchCity = async (query: string) => {
    setCity(query);
    if (query.length < 2) { setCitySuggestions([]); return; }
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`
      );
      const data = await res.json();
      setCitySuggestions((data.results || []).map((r: any) => `${r.name}, ${r.country}`));
    } catch { setCitySuggestions([]); }
  };

  const detectLocation = async () => {
    setDetectingLocation(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      );
      const revRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&accept-language=en`
      );
      const revData = await revRes.json();
      const cityName = revData.address?.city || revData.address?.town || revData.address?.village || "";
      const country = revData.address?.country || "";
      if (cityName) setCity(`${cityName}, ${country}`);
    } catch {
      toast.error("Could not detect location");
    } finally { setDetectingLocation(false); }
  };

  const toggleStyle = (s: StylePreference) => {
    setSelectedStyles((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  };

  const progressPercent = (step / TOTAL_STEPS) * 100;

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col relative overflow-hidden">
      {/* Top bar */}
      <div className="sticky top-0 z-50 bg-[#F9FAFB]">
        <div className="h-1 bg-gray-200 w-full">
          <motion.div
            className="h-full bg-[#8A70D6] rounded-r-full"
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          />
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          {step > 1 && step < 8 ? (
            <button onClick={goBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition">
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
          ) : <div className="w-9" />}
          <span className="text-xs font-medium text-gray-400">
            {step < 8 && `${step} / ${TOTAL_STEPS}`}
          </span>
          <LanguageSwitch />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-28">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="w-full max-w-md"
          >
            {step === 1 && <StepConsent agreed={consentAgreed} setAgreed={setConsentAgreed} />}
            {step === 2 && <StepIdentity name={displayName} setName={setDisplayName} t={t} />}
            {step === 3 && <StepGender gender={gender} setGender={setGender} t={t} />}
            {step === 4 && <StepBody height={height} setHeight={setHeight} weight={weight} setWeight={setWeight} t={t} />}
            {step === 5 && (
              <StepLocation
                city={city} searchCity={searchCity} suggestions={citySuggestions}
                selectCity={(c) => { setCity(c); setCitySuggestions([]); }}
                detectLocation={detectLocation} detecting={detectingLocation} t={t}
              />
            )}
            {step === 6 && <StepFullBodyPhoto photo={fullBodyPhoto} setPhoto={setFullBodyPhoto} t={t} />}
            {step === 7 && <StepStyles selected={selectedStyles} toggle={toggleStyle} t={t} />}
            {step === 8 && <StepReveal t={t} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom CTA */}
      {step < 8 && (
        <div className="fixed bottom-0 inset-x-0 p-6 bg-gradient-to-t from-[#F9FAFB] via-[#F9FAFB] to-transparent">
          <Button
            onClick={goNext}
            disabled={!canContinue()}
            className="w-full max-w-md mx-auto h-14 rounded-2xl text-base font-semibold bg-[#8A70D6] hover:bg-[#7B61C7] text-white shadow-lg disabled:opacity-40 block"
          >
            {t("common.continue")}
          </Button>
        </div>
      )}
    </div>
  );
}

/* ── Step Components ── */

function StepIdentity({ name, setName, t }: { name: string; setName: (v: string) => void; t: any }) {
  return (
    <div className="text-center space-y-6">
      <div className="text-5xl">👋</div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("onboarding.identityTitle")}</h1>
        <p className="text-sm text-gray-500 mt-2">{t("onboarding.identitySubtitle")}</p>
      </div>
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("settings.displayNamePlaceholder")}
        className="text-center text-lg h-14 rounded-2xl border-gray-200 bg-white shadow-sm focus:border-[#8A70D6] focus:ring-[#8A70D6]"
        autoFocus
      />
    </div>
  );
}

function StepGender({ gender, setGender, t }: { gender: string; setGender: (v: string) => void; t: any }) {
  return (
    <div className="text-center space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("onboarding.genderTitle2")}</h1>
        <p className="text-sm text-gray-500 mt-2">{t("onboarding.genderSubtitle2")}</p>
      </div>
      <div className="space-y-3">
        {GENDER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setGender(opt.value)}
            className={`w-full p-4 rounded-2xl border-2 transition-all text-left font-medium flex items-center justify-between bg-white shadow-sm ${
              gender === opt.value ? "border-[#8A70D6] bg-[#8A70D6]/5" : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <span className="text-gray-900">{t(opt.labelKey)}</span>
            {gender === opt.value && (
              <div className="w-6 h-6 rounded-full bg-[#8A70D6] flex items-center justify-center">
                <Check className="h-4 w-4 text-white" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function StepBody({ height, setHeight, weight, setWeight, t }: {
  height: number; setHeight: (v: number) => void; weight: number; setWeight: (v: number) => void; t: any;
}) {
  return (
    <div className="text-center space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("onboarding.bodyTitle2")}</h1>
        <p className="text-sm text-gray-500 mt-2">{t("onboarding.bodySubtitle2")}</p>
      </div>
      <div className="space-y-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-medium text-gray-600">{t("onboarding.height")}</span>
            <span className="text-xl font-bold text-[#8A70D6]">{height} cm</span>
          </div>
          <Slider value={[height]} onValueChange={([v]) => setHeight(v)} min={140} max={220} step={1} />
          <div className="flex justify-between text-xs text-gray-400 mt-2"><span>140</span><span>220</span></div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-medium text-gray-600">{t("onboarding.weight")}</span>
            <span className="text-xl font-bold text-[#8A70D6]">{weight} kg</span>
          </div>
          <Slider value={[weight]} onValueChange={([v]) => setWeight(v)} min={40} max={150} step={1} />
          <div className="flex justify-between text-xs text-gray-400 mt-2"><span>40</span><span>150</span></div>
        </div>
      </div>
    </div>
  );
}

function StepLocation({ city, searchCity, suggestions, selectCity, detectLocation, detecting, t }: {
  city: string; searchCity: (q: string) => void; suggestions: string[];
  selectCity: (c: string) => void; detectLocation: () => void; detecting: boolean; t: any;
}) {
  return (
    <div className="text-center space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("onboarding.locationTitle")}</h1>
        <p className="text-sm text-gray-500 mt-2">{t("onboarding.locationSubtitle")}</p>
      </div>
      <div className="relative">
        <Input
          value={city}
          onChange={(e) => searchCity(e.target.value)}
          placeholder={t("settings.locationPlaceholder")}
          className="text-center text-lg h-14 rounded-2xl border-gray-200 bg-white shadow-sm focus:border-[#8A70D6] focus:ring-[#8A70D6]"
        />
        {suggestions.length > 0 && (
          <div className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden z-10">
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => selectCity(s)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm text-gray-700 border-b border-gray-50 last:border-0">
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
      <button onClick={detectLocation} disabled={detecting}
        className="inline-flex items-center gap-2 text-[#8A70D6] font-medium text-sm hover:underline disabled:opacity-50">
        {detecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
        {t("onboarding.useCurrentLocation")}
      </button>
    </div>
  );
}

function StepStyles({ selected, toggle, t }: {
  selected: StylePreference[]; toggle: (s: StylePreference) => void; t: any;
}) {
  return (
    <div className="text-center space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("onboarding.styleTitle2")}</h1>
        <p className="text-sm text-gray-500 mt-2">{t("onboarding.styleSubtitle2")}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {STYLE_OPTIONS.map((opt) => {
          const isSelected = selected.includes(opt.value);
          return (
            <button key={opt.value} onClick={() => toggle(opt.value)}
              className={`relative p-5 rounded-2xl border-2 transition-all bg-white shadow-sm text-center ${
                isSelected ? "border-[#8A70D6] bg-[#8A70D6]/5" : "border-gray-200 hover:border-gray-300"
              }`}>
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#8A70D6] flex items-center justify-center">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
              <div className="text-2xl mb-2">{opt.emoji}</div>
              <span className="text-sm font-medium text-gray-900">{t(opt.labelKey)}</span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-gray-400">{t("onboarding.selectAtLeastTwo")}</p>
    </div>
  );
}

function StepReveal({ t }: { t: any }) {
  return (
    <div className="text-center space-y-8">
      <motion.div
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-[#8A70D6]/10"
      >
        <Sparkles className="h-12 w-12 text-[#8A70D6]" />
      </motion.div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("onboarding.revealTitle")}</h1>
        <p className="text-sm text-gray-500 mt-2">{t("onboarding.revealSubtitle")}</p>
      </div>
      <div className="flex justify-center gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div key={i} className="w-2 h-2 rounded-full bg-[#8A70D6]"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }} />
        ))}
      </div>
    </div>
  );
}
