import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import HeroCard from "@/components/dashboard/HeroCard";
import StreakWidget from "@/components/dashboard/StreakWidget";
import QuickActions from "@/components/dashboard/QuickActions";
import StatsStack from "@/components/dashboard/StatsStack";
import GettingStartedBanner from "@/components/dashboard/GettingStartedBanner";
import DashboardSkeleton from "@/components/dashboard/DashboardSkeleton";

import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { Loader2 } from "lucide-react";
import { useCallback } from "react";

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

function getTimeGreeting(t: (key: string) => string): string {
  const hour = new Date().getHours();
  if (hour < 12) return t("dashboard.goodMorning");
  if (hour < 18) return t("dashboard.goodAfternoon");
  return t("dashboard.goodEvening");
}

export default function Dashboard() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();


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

      // Try full location, then just the city part (before comma), then fallback
      const candidates = [location];
      if (location.includes(",")) candidates.push(location.split(",")[0].trim());

      let geoResult: any = null;
      for (const candidate of candidates) {
        const geoResponse = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(candidate)}&count=1&language=en&format=json`
        );
        const geoData = await geoResponse.json();
        if (geoData.results?.length) { geoResult = geoData.results[0]; break; }
      }
      if (!geoResult) return null;

      const { latitude, longitude, name } = geoResult;
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

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["current-weather"] });
    await queryClient.invalidateQueries({ queryKey: ["clothing-count"] });
    await queryClient.invalidateQueries({ queryKey: ["outfit-count"] });
  }, [queryClient]);

  const { containerRef, pullDistance, refreshing } = usePullToRefresh({
    onRefresh: handleRefresh,
  });

  // All hooks above — conditional returns below
  if (loading) {
    return (
      <DashboardLayout>
        <DashboardSkeleton />
      </DashboardLayout>
    );
  }

  

  const firstName = profile?.display_name?.split(" ")[0] || user.email?.split("@")[0] || "";

  return (
    <DashboardLayout>
      <div ref={containerRef} className="relative">
        {/* Pull-to-refresh indicator */}
        {(pullDistance > 0 || refreshing) && (
          <div
            className="flex justify-center items-center transition-all duration-200"
            style={{ height: refreshing ? 40 : pullDistance, overflow: "hidden" }}
          >
            <Loader2
              className={`h-5 w-5 text-primary ${refreshing ? "animate-spin" : ""}`}
              style={{ opacity: Math.min(pullDistance / 60, 1) }}
            />
          </div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4 max-w-lg mx-auto pb-6"
        >
          {/* Hero card: greeting + weather + forecast + CTA */}
          <HeroCard
            greeting={getTimeGreeting(t)}
            firstName={firstName}
            weather={weatherData}
            weatherLoading={weatherLoading}
            location={userPreferences?.default_location || "Istanbul"}
          />

          {/* Low-wardrobe banner — disappears permanently at 5 items */}
          {clothingCount < 5 && <GettingStartedBanner itemCount={clothingCount} />}

          {/* Streak (left) + stacked stats (right) */}
          <div className="grid grid-cols-2 gap-3 h-44">
            <StreakWidget />
            <StatsStack clothingCount={clothingCount} outfitCount={outfitCount} />
          </div>

          {/* Quick actions (kept) */}
          <div className="bg-card rounded-2xl p-4 border border-border shadow-card">
            <p className="text-sm font-semibold text-foreground mb-3">Quick actions</p>
            <QuickActions />
          </div>
        </motion.div>
      </div>

    </DashboardLayout>
  );
}
