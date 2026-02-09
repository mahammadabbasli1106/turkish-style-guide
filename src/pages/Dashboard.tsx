import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import WeatherWidget from "@/components/dashboard/WeatherWidget";
import StreakWidget from "@/components/dashboard/StreakWidget";
import QuickActions from "@/components/dashboard/QuickActions";
import StatsRow from "@/components/dashboard/StatsRow";
import ActionCards from "@/components/dashboard/ActionCards";
import GettingStartedBanner from "@/components/dashboard/GettingStartedBanner";
import DashboardSkeleton from "@/components/dashboard/DashboardSkeleton";
import FloatingActionButton from "@/components/FloatingActionButton";
import DailyTipCard from "@/components/dashboard/DailyTipCard";
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
  const { user, loading, checkOnboardingCompleted } = useAuth();
  const queryClient = useQueryClient();

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

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["current-weather"] });
    await queryClient.invalidateQueries({ queryKey: ["clothing-count"] });
    await queryClient.invalidateQueries({ queryKey: ["outfit-count"] });
  }, [queryClient]);

  const { containerRef, pullDistance, refreshing } = usePullToRefresh({
    onRefresh: handleRefresh,
  });

  // All hooks above — conditional returns below
  if (loading || onboardingLoading) {
    return (
      <DashboardLayout>
        <DashboardSkeleton />
      </DashboardLayout>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!onboardingLoading && onboardingDone === false) return <Navigate to="/onboarding" replace />;

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
          className="space-y-6 max-w-lg mx-auto pb-6"
        >
          {/* Greeting */}
          <div className="pt-2">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-muted-foreground text-sm"
            >
              {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </motion.p>
            <motion.h1
              className="font-display text-2xl font-bold text-foreground mt-1 flex flex-wrap gap-x-[0.3em]"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
              }}
            >
              {`${getTimeGreeting(t)}, ${firstName} 👋`.split(" ").map((word, i) => (
                <motion.span
                  key={i}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0, transition: { type: "spring", damping: 12, stiffness: 100 } },
                  }}
                >
                  {word}
                </motion.span>
              ))}
            </motion.h1>
          </div>

          {/* Weather + Streak row */}
          <div className="grid grid-cols-2 gap-3 h-40">
            <StreakWidget />
            <WeatherWidget data={weatherData} isLoading={weatherLoading} />
          </div>

        {/* Quick Actions */}
        <QuickActions />

        {/* Stats */}
        <StatsRow clothingCount={clothingCount} outfitCount={outfitCount} />

        {/* Action Cards */}
        <ActionCards />

        {/* Daily Tip */}
        <DailyTipCard />

        {/* Getting Started */}
        {clothingCount < 5 && <GettingStartedBanner />}
        </motion.div>
      </div>

      {/* FAB */}
      <FloatingActionButton />
    </DashboardLayout>
  );
}
