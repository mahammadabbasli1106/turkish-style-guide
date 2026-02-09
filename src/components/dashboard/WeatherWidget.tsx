import { useTranslation } from "react-i18next";
import { Cloud, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

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

function getClothingTip(description: string, temperature: number, t: (key: string) => string): string {
  const desc = description.toLowerCase();
  if (desc.includes("rain") || desc.includes("drizzle") || desc.includes("shower")) {
    return t("weather.tipRain");
  }
  if (desc.includes("snow")) return t("weather.tipSnow");
  if (desc.includes("thunder")) return t("weather.tipThunder");
  if (temperature >= 30) return t("weather.tipHot");
  if (temperature >= 20) return t("weather.tipWarm");
  if (temperature >= 10) return t("weather.tipCool");
  if (temperature >= 0) return t("weather.tipCold");
  return t("weather.tipFreezing");
}

export default function WeatherWidget({ data, isLoading }: Props) {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-full px-5 py-3 shadow-card flex items-center justify-between gap-3"
    >
      {isLoading ? (
        <div className="flex items-center gap-2 w-full justify-center py-0.5">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{t("common.loading")}</span>
        </div>
      ) : data ? (
        <>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-foreground truncate">
              {data.location} · {data.temperature}° {data.description}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              {getClothingTip(data.description, data.temperature, t)}
            </span>
          </div>
          <Cloud size={20} className="text-muted-foreground shrink-0" />
        </>
      ) : (
        <div className="flex items-center gap-2 w-full justify-center py-0.5">
          <Cloud size={18} className="text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{t("settings.locationPlaceholder")}</span>
        </div>
      )}
    </motion.div>
  );
}
