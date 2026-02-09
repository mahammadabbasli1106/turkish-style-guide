import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
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
  if (desc.includes("snow")) {
    return t("weather.tipSnow");
  }
  if (desc.includes("thunder")) {
    return t("weather.tipThunder");
  }
  if (temperature >= 30) return t("weather.tipHot");
  if (temperature >= 20) return t("weather.tipWarm");
  if (temperature >= 10) return t("weather.tipCool");
  if (temperature >= 0) return t("weather.tipCold");
  return t("weather.tipFreezing");
}

export default function WeatherWidget({ data, isLoading }: Props) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span className="text-xs">{t("common.loading")}</span>
      </div>
    );
  }

  if (!data) return null;

  const tip = getClothingTip(data.description, data.temperature, t);

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap"
    >
      <span className="font-medium text-foreground">{data.location}</span>
      <span className="text-border">•</span>
      <span>{data.temperature}° {data.description}</span>
      <span className="text-border">•</span>
      <span className="italic text-muted-foreground/80">"{tip}"</span>
    </motion.div>
  );
}
