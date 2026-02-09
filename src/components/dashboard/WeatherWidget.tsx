import { useTranslation } from "react-i18next";
import { CloudSun, Loader2, MapPin, Droplets, Thermometer } from "lucide-react";
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

export default function WeatherWidget({ data, isLoading }: Props) {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-gradient-primary rounded-2xl p-5 text-primary-foreground shadow-warm"
    >
      {isLoading ? (
        <div className="flex items-center gap-3 py-4 justify-center">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">{t("common.loading")}</span>
        </div>
      ) : data ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary-foreground/80">
              <MapPin size={14} />
              <span className="text-sm font-medium">{data.location}</span>
            </div>
            <CloudSun size={24} className="text-primary-foreground/90" />
          </div>
          <div className="flex items-end gap-2">
            <span className="font-display text-5xl font-bold leading-none">{data.temperature}°</span>
            <span className="text-primary-foreground/80 text-sm pb-1">{data.description}</span>
          </div>
          <div className="flex gap-4 pt-1">
            <div className="flex items-center gap-1.5 text-primary-foreground/70">
              <Thermometer size={14} />
              <span className="text-xs">{t("weather.feelsLike")} {data.feelsLike}°</span>
            </div>
            <div className="flex items-center gap-1.5 text-primary-foreground/70">
              <Droplets size={14} />
              <span className="text-xs">{data.humidity}%</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 py-4">
          <CloudSun size={24} />
          <span className="text-sm text-primary-foreground/80">{t("settings.locationPlaceholder")}</span>
        </div>
      )}
    </motion.div>
  );
}
