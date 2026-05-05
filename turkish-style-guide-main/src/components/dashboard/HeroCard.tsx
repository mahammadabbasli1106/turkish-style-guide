import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Sparkles, MapPin, Loader2 } from "lucide-react";
import {
  getWeatherCondition,
  getWeatherIcon,
} from "./WeatherIconLib";

type WeatherData = {
  temperature: number;
  description: string;
  location: string;
  feelsLike: number;
  humidity: number;
};

type ForecastDay = {
  date: Date;
  temperature: number;
  weatherCode: number;
  description: string;
};

type Props = {
  greeting: string;
  firstName: string;
  weather: WeatherData | null | undefined;
  weatherLoading: boolean;
  location: string;
};

const weatherDescriptions: Record<number, string> = {
  0: "Clear",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Foggy",
  51: "Drizzle",
  53: "Drizzle",
  55: "Drizzle",
  61: "Rain",
  63: "Rain",
  65: "Heavy rain",
  71: "Snow",
  73: "Snow",
  75: "Heavy snow",
  80: "Showers",
  81: "Showers",
  82: "Heavy showers",
  95: "Thunderstorm",
};

// Friendly clothing hint based on temperature — returns a translation key
function tempHintKey(temp: number): string {
  if (temp <= 8) return "tempHint.coat";
  if (temp <= 12) return "tempHint.layer";
  if (temp <= 16) return "tempHint.light";
  if (temp <= 22) return "tempHint.jacket";
  return "tempHint.tee";
}

export default function HeroCard({
  greeting,
  firstName,
  weather,
  weatherLoading,
  location,
}: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Fetch 4-day forecast based on resolved location from current weather query
  const { data: forecast = [] } = useQuery({
    queryKey: ["forecast-4day", location],
    queryFn: async (): Promise<ForecastDay[]> => {
      if (!location) return [];
      const candidates = [location];
      if (location.includes(",")) candidates.push(location.split(",")[0].trim());
      let geo: any = null;
      for (const c of candidates) {
        const r = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(c)}&count=1&language=en&format=json`
        );
        const d = await r.json();
        if (d.results?.length) {
          geo = d.results[0];
          break;
        }
      }
      if (!geo) return [];
      const r = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${geo.latitude}&longitude=${geo.longitude}&daily=temperature_2m_max,weather_code&timezone=auto&forecast_days=5`
      );
      const w = await r.json();
      const days: ForecastDay[] = [];
      // Skip today (index 0); next 4 days
      for (let i = 1; i <= 4 && i < (w.daily?.time?.length || 0); i++) {
        days.push({
          date: new Date(w.daily.time[i]),
          temperature: Math.round(w.daily.temperature_2m_max[i]),
          weatherCode: w.daily.weather_code[i],
          description: weatherDescriptions[w.daily.weather_code[i]] || "",
        });
      }
      return days;
    },
    enabled: !!location,
    staleTime: 1000 * 60 * 30,
  });

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-3xl px-5 pt-5 pb-5 text-white relative overflow-hidden shadow-warm"
      style={{
        background:
          "linear-gradient(155deg, hsl(265, 60%, 55%) 0%, hsl(280, 65%, 50%) 60%, hsl(255, 55%, 38%) 100%)",
      }}
    >
      {/* Subtle decorative blobs */}
      <div
        className="absolute -top-16 -right-16 w-48 h-48 rounded-full pointer-events-none"
        style={{ background: "rgba(255,255,255,0.08)", filter: "blur(30px)" }}
      />
      <div
        className="absolute -bottom-20 -left-12 w-56 h-56 rounded-full pointer-events-none"
        style={{ background: "rgba(255,255,255,0.06)", filter: "blur(40px)" }}
      />

      <div className="relative z-10 space-y-4">
        {/* Greeting row with profile chip */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-white/55 text-[11px] font-semibold">{dateLabel}</p>
            <h1 className="font-display text-[19px] font-extrabold mt-0.5 leading-tight tracking-tight truncate">
              {greeting},
            </h1>
            <h1 className="font-display text-[19px] font-extrabold leading-tight tracking-tight truncate">
              {firstName} <span className="inline-block">👋</span>
            </h1>
          </div>
        </div>

        {/* Inner weather + CTA card */}
        <div className="rounded-2xl p-3.5 bg-white/[0.13] border border-white/10">
          {weatherLoading ? (
            <div className="flex items-center gap-3 py-2">
              <Loader2 className="h-5 w-5 animate-spin text-white" />
              <span className="text-sm text-white/80">{t("dashboard.loadingWeather")}</span>
            </div>
          ) : weather ? (
            <>
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <div>
                  <div className="flex items-center gap-1 mb-0.5">
                    <MapPin size={10} className="text-white/55" />
                    <span className="text-[9px] font-bold tracking-wider uppercase text-white/55">
                      {weather.location}
                    </span>
                  </div>
                  <div className="flex items-end gap-1.5">
                    <span className="font-display text-[40px] font-extrabold leading-[0.85] tracking-tighter">
                      {weather.temperature}°
                    </span>
                    <div className="flex flex-col leading-tight pb-0.5">
                      <span className="text-[11px] font-semibold text-white/80">
                        {weather.description}
                      </span>
                      <span className="text-[10px] text-white/45">
                        H:{weather.feelsLike}° · L:
                        {Math.round(
                          weather.temperature -
                            (weather.temperature - weather.feelsLike) * 1.5
                        )}
                        °
                      </span>
                    </div>
                  </div>
                </div>

                {/* Condition icon chip */}
                <div className="bg-white/[0.14] rounded-[13px] px-2.5 py-2 flex flex-col items-center shrink-0">
                  {getWeatherIcon(getWeatherCondition(weather.description), 22)}
                  <span className="text-[8px] font-bold tracking-wider mt-0.5 text-white/50 uppercase">
                    {weather.description.split(" ")[0].slice(0, 8)}
                  </span>
                </div>
              </div>

              {/* 4-day forecast */}
              {forecast.length > 0 && (
                <div className="grid grid-cols-4 gap-1 mb-2.5">
                  {forecast.map((d, i) => (
                    <div
                      key={i}
                      className="rounded-[9px] bg-white/10 px-1 py-1.5 flex flex-col items-center"
                    >
                      <span className="text-[9px] font-bold text-white/55">
                        {d.date.toLocaleDateString(undefined, { weekday: "short" })}
                      </span>
                      <div className="my-0.5">
                        {getWeatherIcon(getWeatherCondition(d.description), 14)}
                      </div>
                      <span className="text-[10px] font-extrabold leading-none">
                        {d.temperature}°
                      </span>
                      <span className="text-[8px] text-white/45 mt-0.5">
                        {t(tempHintKey(d.temperature))}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* CTA inside weather card */}
              <button
                onClick={() => navigate("/dashboard/suggest")}
                className="w-full rounded-[11px] bg-white/[0.18] hover:bg-white/[0.24] active:bg-white/30 active:scale-[0.98] transition-all border border-white/[0.28] py-2.5 px-3 flex items-center justify-center gap-1.5 font-bold text-[12px]"
              >
                <Sparkles size={14} className="fill-white text-white" />
                <span>{t("dashboard.getTodaysOutfit")}</span>
              </button>
            </>
          ) : (
            <p className="text-sm text-white/80 py-2">
              {t("dashboard.weatherUnavailable")}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
