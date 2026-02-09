import { useTranslation } from "react-i18next";
import { Cloud, Loader2, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="h-full bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-4 flex flex-col justify-between"
    >
      <div className="flex items-center gap-1 text-foreground">
        <MapPin size={12} />
        <span className="text-sm font-semibold">{data.location}</span>
      </div>

      <div className="font-display text-4xl font-bold text-foreground leading-none">
        {data.temperature}°
      </div>

      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1 text-muted-foreground">
          <Cloud size={14} />
          <span className="text-xs">{data.description}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          H:{data.feelsLike}° L:{Math.round(data.temperature - (data.temperature - data.feelsLike) * 1.5)}°
        </span>
      </div>
    </motion.div>
  );
}
