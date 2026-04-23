import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, MapPin, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
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

// Friendly clothing hint based on temperature
function tempHint(temp: number): string {
  if (temp <= 0) return "Coat";
  if (temp <= 8) return "Coat";
  if (temp <= 12) return "Layer";
  if (temp <= 16) return "Light";
  if (temp <= 22) return "Jacket";
  return "Tee";
}

export default function HeroCard({
  greeting,
  firstName,
  weather,
  weatherLoading,
  location,
}: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();

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
      className="rounded-3xl p-5 text-white relative overflow-hidden shadow-warm"
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
        {/* Greeting */}
        <div>
          <p className="text-white/70 text-xs font-medium">{dateLabel}</p>
          <h1 className="font-display text-2xl font-bold mt-0.5 leading-tight">
            {greeting},<br />
            {firstName} <span className="inline-block">👋</span>
          </h1>
        </div>

        {/* Inner weather card */}
        <div className="rounded-2xl p-4 bg-white/10 backdrop-blur-md border border-white/10">
          {weatherLoading ? (
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-white" />
              <span className="text-sm text-white/80">Loading weather…</span>
            </div>
          ) : weather ? (
            <>
              <div className="flex items-center gap-1.5 mb-2">
                <MapPin size={12} className="text-white/80" />
                <span className="text-[11px] font-bold tracking-wider uppercase text-white/85">
                  {weather.location}
                </span>
              </div>

              <div className="flex items-start justify-between gap-3">
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-5xl font-bold leading-none">
                    {weather.temperature}°
                  </span>
                  <div className="flex flex-col leading-tight">
                    <span className="text-sm font-semibold text-white/95">
                      {weather.description}
                    </span>
                    <span className="text-[11px] text-white/70">
                      H:{weather.feelsLike}° · L:
                      {Math.round(
                        weather.temperature -
                          (weather.temperature - weather.feelsLike) * 1.5
                      )}
                      °
                    </span>
                  </div>
                </div>

                {/* Condition icon chip */}
                <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/10 flex flex-col items-center justify-center shrink-0">
                  {getWeatherIcon(getWeatherCondition(weather.description), 24)}
                  <span className="text-[8px] font-bold tracking-wider mt-0.5 text-white/80 uppercase">
                    {weather.description.split(" ")[0].slice(0, 8)}
                  </span>
                </div>
              </div>

              {/* 4-day forecast */}
              {forecast.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mt-4">
                  {forecast.map((d, i) => (
                    <div
                      key={i}
                      className="rounded-xl bg-white/10 border border-white/10 px-1 py-2 flex flex-col items-center"
                    >
                      <span className="text-[10px] font-semibold text-white/80">
                        {d.date.toLocaleDateString(undefined, { weekday: "short" })}
                      </span>
                      <div className="my-1">
                        {getWeatherIcon(getWeatherCondition(d.description), 16)}
                      </div>
                      <span className="text-sm font-bold leading-none">
                        {d.temperature}°
                      </span>
                      <span className="text-[9px] text-white/70 mt-0.5">
                        {tempHint(d.temperature)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-white/80">
              Weather unavailable. Add a location in Settings.
            </p>
          )}
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate("/dashboard/suggest")}
          className="w-full rounded-2xl bg-white/15 hover:bg-white/20 active:bg-white/25 active:scale-[0.98] transition-all backdrop-blur-md border border-white/15 py-3.5 px-4 flex items-center justify-center gap-2 font-semibold text-base"
        >
          <Sparkles size={18} className="fill-white text-white" />
          <span>Get today's outfit</span>
        </button>
      </div>
    </motion.div>
  );
}
