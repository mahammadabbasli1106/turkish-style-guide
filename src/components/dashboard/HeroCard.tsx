import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Sparkles, ArrowRight, Cloud } from "lucide-react";

type WeatherData = {
  temperature: number;
  description: string;
  location: string;
  feelsLike: number;
  humidity: number;
};

type Props = {
  greeting: string;
  firstName: string;
  weather: WeatherData | null | undefined;
  weatherLoading: boolean;
  location: string;
};

// Friendly clothing hint based on temperature
function tempHint(temp: number, t: (k: string) => string): string {
  if (temp <= 8) return t("tempHint.coat");
  if (temp <= 12) return t("tempHint.layer");
  if (temp <= 16) return t("tempHint.light");
  if (temp <= 22) return t("tempHint.jacket");
  return t("tempHint.tee");
}

export default function HeroCard({
  greeting,
  firstName,
  weather,
  weatherLoading,
  location: _location,
}: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const goSuggest = () => navigate("/dashboard/suggest");

  return (
    <div>
      {/* Greeting — sits on page background, above the card */}
      <div className="px-2 pt-1 pb-3">
        <p className="text-[12px] text-muted-foreground font-medium">
          {dateLabel}
        </p>
        <h1 className="font-display text-[26px] font-bold text-foreground leading-tight mt-1 tracking-[-0.5px]">
          {greeting}, {firstName} <span className="inline-block">👋</span>
        </h1>
      </div>

      {/* Hero card */}
      <motion.button
        type="button"
        onClick={goSuggest}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full text-left overflow-hidden rounded-[26px] p-5 text-white shadow-warm active:scale-[0.99] transition-transform"
        style={{ background: "#4f46e5" }}
      >
        {/* Decorative circle */}
        <div
          className="absolute -top-16 -right-16 w-56 h-56 rounded-full pointer-events-none"
          style={{ background: "rgba(255,255,255,0.06)" }}
        />

        <div className="relative z-10">
          {/* Top chips */}
          <div className="flex items-center justify-between gap-2 mb-5">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-[11px] py-[5px] text-[11px] font-semibold text-white"
              style={{ background: "rgba(255,255,255,0.15)" }}
            >
              <Sparkles size={12} className="fill-white text-white" />
              {t("dashboard.aiStylist", { defaultValue: "AI Stylist" })}
            </span>
            {!weatherLoading && weather && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-[11px] py-[5px] text-[11px] font-semibold"
                style={{
                  background: "rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.85)",
                }}
              >
                <Cloud size={12} />
                {weather.temperature}° · {tempHint(weather.temperature, t)}
              </span>
            )}
          </div>

          {/* Headline */}
          <h2 className="font-display text-[28px] font-extrabold text-white leading-[1.1] tracking-[-0.8px]">
            {t("dashboard.heroHeadline", { defaultValue: "What should I wear today?" })}
          </h2>
          <p
            className="text-[13px] mt-1.5 mb-4"
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            {t("dashboard.heroSubtext", {
              defaultValue: "Personalized for your wardrobe & weather",
            })}
          </p>

          {/* CTA row */}
          <div className="flex items-stretch gap-2.5">
            <div
              className="flex-1 rounded-[13px] bg-white py-[13px] px-5 flex items-center justify-center gap-2"
            >
              <Sparkles size={16} style={{ color: "#4f46e5" }} className="fill-current" />
              <span className="text-[15px] font-bold" style={{ color: "#1a1a1a" }}>
                {t("dashboard.getTodaysOutfit")}
              </span>
            </div>
            <div
              className="w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0"
              style={{ background: "rgba(255,255,255,0.15)" }}
            >
              <ArrowRight size={22} className="text-white" />
            </div>
          </div>
        </div>
      </motion.button>
    </div>
  );
}
