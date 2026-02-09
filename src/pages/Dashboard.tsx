import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Shirt, Sparkles, CloudSun, TrendingUp, Camera, History, Loader2, MapPin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type WeatherData = {
  temperature: number;
  description: string;
  location: string;
  feelsLike: number;
  humidity: number;
};

export default function Dashboard() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();

  const { data: clothingCount = 0 } = useQuery({
    queryKey: ["clothing-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from("clothing_items")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: outfitCount = 0 } = useQuery({
    queryKey: ["outfit-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from("outfit_suggestions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      return count || 0;
    },
    enabled: !!user,
  });

  // Fetch user's default location from preferences
  const { data: userPreferences } = useQuery({
    queryKey: ["user-preferences", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("user_preferences")
        .select("default_location")
        .eq("user_id", user.id)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch current weather for user's city
  const { data: weatherData, isLoading: weatherLoading } = useQuery({
    queryKey: ["current-weather", userPreferences?.default_location],
    queryFn: async (): Promise<WeatherData | null> => {
      const location = userPreferences?.default_location || "Istanbul";
      
      // Get coordinates from location name
      const geoResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`
      );
      const geoData = await geoResponse.json();
      
      if (!geoData.results || geoData.results.length === 0) {
        return null;
      }

      const { latitude, longitude, name } = geoData.results[0];

      // Get current weather
      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code&timezone=auto`
      );
      const weather = await weatherResponse.json();

      // Weather code descriptions
      const weatherDescriptions: Record<number, string> = {
        0: "Clear sky",
        1: "Mainly clear",
        2: "Partly cloudy",
        3: "Overcast",
        45: "Foggy",
        48: "Foggy",
        51: "Light drizzle",
        53: "Drizzle",
        55: "Heavy drizzle",
        61: "Light rain",
        63: "Rain",
        65: "Heavy rain",
        71: "Light snow",
        73: "Snow",
        75: "Heavy snow",
        80: "Light showers",
        81: "Showers",
        82: "Heavy showers",
        95: "Thunderstorm",
      };

      return {
        temperature: Math.round(weather.current.temperature_2m),
        feelsLike: Math.round(weather.current.apparent_temperature),
        humidity: weather.current.relative_humidity_2m,
        description: weatherDescriptions[weather.current.weather_code] || "Unknown",
        location: name,
      };
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const stats = [
    { label: t("dashboard.clothingItems"), value: clothingCount, icon: Shirt, color: "bg-primary" },
    { label: t("dashboard.outfitsCreated"), value: outfitCount, icon: Sparkles, color: "bg-accent" },
  ];

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            {t("dashboard.welcome")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("dashboard.overview")}
          </p>
        </div>

        {/* Current Weather Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-primary rounded-2xl p-6 text-primary-foreground shadow-warm"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-primary-foreground/20 p-3 rounded-xl">
                <CloudSun size={32} />
              </div>
              <div>
                <p className="text-primary-foreground/80 text-sm">{t("weather.current")}</p>
                {weatherLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{t("common.loading")}</span>
                  </div>
                ) : weatherData ? (
                  <>
                    <p className="font-display text-3xl font-bold">{weatherData.temperature}°C</p>
                    <p className="text-primary-foreground/90">{weatherData.description}</p>
                  </>
                ) : (
                  <p className="text-primary-foreground/80">{t("settings.locationPlaceholder")}</p>
                )}
              </div>
            </div>
            {weatherData && (
              <div className="text-right">
                <div className="flex items-center gap-1 text-primary-foreground/80 mb-1">
                  <MapPin size={14} />
                  <span className="text-sm">{weatherData.location}</span>
                </div>
                <p className="text-sm text-primary-foreground/70">
                  {t("weather.feelsLike")}: {weatherData.feelsLike}°C
                </p>
                <p className="text-sm text-primary-foreground/70">
                  {t("weather.humidity")}: {weatherData.humidity}%
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid sm:grid-cols-2 gap-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-card rounded-xl p-6 shadow-card border border-border"
            >
              <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center mb-3`}>
                <stat.icon size={20} className="text-primary-foreground" />
              </div>
              <p className="font-display text-3xl font-bold text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/dashboard/wardrobe">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-primary rounded-xl p-6 text-primary-foreground cursor-pointer shadow-warm h-full"
            >
              <Shirt size={28} className="mb-3" />
              <h3 className="font-display text-lg font-semibold mb-1">{t("dashboard.manageWardrobe")}</h3>
              <p className="text-primary-foreground/80 text-sm">
                {t("dashboard.wardrobeDesc")}
              </p>
            </motion.div>
          </Link>

          <Link to="/dashboard/suggest">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-card rounded-xl p-6 border border-border cursor-pointer shadow-card hover:shadow-card-hover transition-shadow h-full"
            >
              <TrendingUp size={28} className="text-primary mb-3" />
              <h3 className="font-display text-lg font-semibold text-foreground mb-1">
                {t("dashboard.getOutfit")}
              </h3>
              <p className="text-muted-foreground text-sm">
                {t("dashboard.outfitDesc")}
              </p>
            </motion.div>
          </Link>

          <Link to="/dashboard/try-on">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-card rounded-xl p-6 border border-border cursor-pointer shadow-card hover:shadow-card-hover transition-shadow h-full"
            >
              <Camera size={28} className="text-accent mb-3" />
              <h3 className="font-display text-lg font-semibold text-foreground mb-1">
                {t("tryOn.title")}
              </h3>
              <p className="text-muted-foreground text-sm">
                {t("tryOn.subtitle")}
              </p>
            </motion.div>
          </Link>

          <Link to="/dashboard/history">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-card rounded-xl p-6 border border-border cursor-pointer shadow-card hover:shadow-card-hover transition-shadow h-full"
            >
              <History size={28} className="text-muted-foreground mb-3" />
              <h3 className="font-display text-lg font-semibold text-foreground mb-1">
                {t("history.title")}
              </h3>
              <p className="text-muted-foreground text-sm">
                {t("history.subtitle")}
              </p>
            </motion.div>
          </Link>
        </div>

        {clothingCount < 5 && (
          <div className="bg-accent/20 rounded-xl p-6 border border-accent/30">
            <h3 className="font-semibold text-foreground mb-2">🎯 Getting Started</h3>
            <p className="text-muted-foreground text-sm">
              Add at least 5 clothing items to your wardrobe to unlock AI outfit suggestions. 
              We recommend having a mix of tops, bottoms, and outerwear for the best results!
            </p>
          </div>
        )}
      </motion.div>
    </DashboardLayout>
  );
}
