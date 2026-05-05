import { useTranslation } from "react-i18next";
import { Cloud, Loader2, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import WeatherEffects, {
  getWeatherCondition,
  getWeatherGradient,
  isLightCondition,
} from "./WeatherEffects";

type WeatherData = {
  temperature: number;
  description: string;
  location: string;
  feelsLike: number;
  humidity: number;
};

type Props = {
  data: WeatherData | null | undefined;
  isLoading: boolean;
};

export default function WeatherWidget({ data, isLoading }: Props) {
  const { t } = useTranslation();

  if (isLoading) {
    return <Skeleton className="h-full w-full rounded-2xl" />;
  }

  if (!data) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="h-full bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-4 flex items-center justify-center"
      >
        <Cloud size={20} className="text-muted-foreground mr-2" />
        <span className="text-sm text-muted-foreground">{t("settings.locationPlaceholder")}</span>
      </motion.div>
    );
  }

  const condition = getWeatherCondition(data.description);
  const gradient = getWeatherGradient(condition);
  const lightBg = isLightCondition(condition);
  const textClass = lightBg ? "text-slate-800" : "text-white";
  const subTextClass = lightBg ? "text-slate-600" : "text-white/70";
  const textShadow = lightBg ? "none" : "0 1px 4px rgba(0,0,0,0.3)";

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={condition}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
        className="h-full rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden"
        style={{ background: gradient }}
      >
        {/* Weather effect overlay */}
        <WeatherEffects description={data.description} />

        {/* Content with text shadow for readability */}
        <div className="relative z-10 flex flex-col justify-between h-full">
          <div className="flex items-center gap-1" style={{ textShadow }}>
            <MapPin size={12} className={textClass} />
            <span className={`text-sm font-semibold ${textClass}`}>{data.location}</span>
          </div>

          <div
            className={`font-display text-4xl font-bold leading-none ${textClass}`}
            style={{ textShadow }}
          >
            {data.temperature}°
          </div>

          <div className="flex flex-col gap-0.5" style={{ textShadow }}>
            <div className="flex items-center gap-1">
              <Cloud size={14} className={subTextClass} />
              <span className={`text-xs ${subTextClass}`}>{data.description}</span>
            </div>
            <span className={`text-xs ${subTextClass}`}>
              H:{data.feelsLike}° L:
              {Math.round(data.temperature - (data.temperature - data.feelsLike) * 1.5)}°
            </span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
