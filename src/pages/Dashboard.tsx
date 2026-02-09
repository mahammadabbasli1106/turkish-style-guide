import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import WeatherWidget from "@/components/dashboard/WeatherWidget";
import QuickActions from "@/components/dashboard/QuickActions";
import StatsRow from "@/components/dashboard/StatsRow";
import ActionCards from "@/components/dashboard/ActionCards";
import GettingStartedBanner from "@/components/dashboard/GettingStartedBanner";

type WeatherData = {
  temperature: number;
  description: string;
  location: string;
  feelsLike: number;
  humidity: number;
};

const weatherDescriptions: Record<number, string> = {
  0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Foggy", 48: "Foggy", 51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain", 71: "Light snow", 73: "Snow",
  75: "Heavy snow", 80: "Light showers", 81: "Showers", 82: "Heavy showers", 95: "Thunderstorm",
};

export default function Dashboard() {
  const { t } = useTranslation();
  const { user, loading, checkOnboardingCompleted } = useAuth();

  const { data: onboardingDone, isLoading: onboardingLoading } = useQuery({
    queryKey: ["onboarding-check", user?.id],
    queryFn: checkOnboardingCompleted,
    enabled: !!user,
  });

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

  const { data: weatherData, isLoading: weatherLoading } = useQuery({
    queryKey: ["current-weather", userPreferences?.default_location],
    queryFn: async (): Promise<WeatherData | null> => {
      const location = userPreferences?.default_location || "Istanbul";
      const geoResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`
      );
      const geoData = await geoResponse.json();
      if (!geoData.results?.length) return null;
      const { latitude, longitude, name } = geoData.results[0];
      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code&timezone=auto`
      );
      const weather = await weatherResponse.json();
      return {
        temperature: Math.round(weather.current.temperature_2m),
        feelsLike: Math.round(weather.current.apparent_temperature),
        humidity: weather.current.relative_humidity_2m,
        description: weatherDescriptions[weather.current.weather_code] || "Unknown",
        location: name,
      };
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 10,
  });

  const { data: profile } = useQuery({
    queryKey: ["profile-name", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("auth_id", user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  // All hooks above — conditional returns below
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!onboardingLoading && onboardingDone === false) return <Navigate to="/onboarding" replace />;

  const firstName = profile?.display_name?.split(" ")[0] || user.email?.split("@")[0] || "";

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6 max-w-lg mx-auto pb-6"
      >
        {/* Greeting */}
        <div className="pt-2">
          <p className="text-muted-foreground text-sm">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="font-display text-2xl font-bold text-foreground mt-1">
            {t("dashboard.welcome").replace("!", ",")} {firstName} 👋
          </h1>
        </div>

        {/* Weather */}
        <WeatherWidget data={weatherData} isLoading={weatherLoading} />

        {/* Quick Actions */}
        <QuickActions />

        {/* Stats */}
        <StatsRow clothingCount={clothingCount} outfitCount={outfitCount} />

        {/* Action Cards */}
        <ActionCards />

        {/* Getting Started */}
        {clothingCount < 5 && <GettingStartedBanner />}
      </motion.div>
    </DashboardLayout>
  );
}
