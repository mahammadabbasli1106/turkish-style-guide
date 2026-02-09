import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import TripForm from "@/components/travel/TripForm";
import PackingGrid from "@/components/travel/PackingGrid";
import { motion } from "framer-motion";
import { Plane, CloudSun, Loader2, ThermometerSun, Droplets, Shirt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DateRange } from "react-day-picker";
import { useQuery } from "@tanstack/react-query";

interface ClothingItem {
  id: string;
  name: string;
  category: string;
  color: string | null;
  image_url: string;
}

interface PackingList {
  daytime: ClothingItem[];
  evening: ClothingItem[];
  travel: ClothingItem[];
  shoes_outerwear: ClothingItem[];
}

interface WeatherResult {
  city: string;
  country: string;
  avgTemperature: number;
  minTemperature: number;
  maxTemperature: number;
  rainChance: number;
  maxRainChance: number;
  needsRainGear: boolean;
  descriptions: string[];
  source: string;
  tripDays: number;
}

interface PackingResult {
  packingList: PackingList;
  needs: Record<string, number>;
  safetyStock: { wildcard: number; lounge: number; extraUnderwear: number };
  totalItems: number;
  allItems: ClothingItem[];
}

export default function TravelMode() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [weatherResult, setWeatherResult] = useState<WeatherResult | null>(null);
  const [packingResult, setPackingResult] = useState<PackingResult | null>(null);

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

  const handlePlanTrip = async (data: {
    destination: string;
    dateRange: DateRange | undefined;
    vibe: string;
    packingStyle: string;
  }) => {
    setIsLoading(true);
    setPackingResult(null);
    setWeatherResult(null);

    try {
      // Step 1: Get weather via secure proxy
      const startDate = data.dateRange?.from?.toISOString() || new Date().toISOString();
      const endDate = data.dateRange?.to?.toISOString() || new Date(Date.now() + 3 * 86400000).toISOString();

      const { data: weatherData, error: weatherError } = await supabase.functions.invoke("travel-weather", {
        body: { city: data.destination, startDate, endDate },
      });

      if (weatherError) throw weatherError;
      if (weatherData.error) throw new Error(weatherData.error);
      
      setWeatherResult(weatherData);

      // Step 2: Generate packing list
      const { data: packingData, error: packingError } = await supabase.functions.invoke("travel-packing", {
        body: {
          tripDays: weatherData.tripDays,
          packingStyle: data.packingStyle,
          vibe: data.vibe,
          weather: {
            avgTemperature: weatherData.avgTemperature,
            needsRainGear: weatherData.needsRainGear,
            rainChance: weatherData.rainChance,
          },
        },
      });

      if (packingError) throw packingError;
      if (packingData.error) throw new Error(packingData.error);

      setPackingResult(packingData);
      toast.success(t("travel.packingReady") + " 🧳");
    } catch (error: any) {
      console.error("Travel planning error:", error);
      toast.error(error.message || t("common.error"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleShuffle = (category: keyof PackingList, itemIndex: number) => {
    if (!packingResult) return;

    const currentItem = packingResult.packingList[category][itemIndex];
    if (!currentItem) return;

    // Find alternatives from the same clothing category
    const sameCatItems = packingResult.allItems.filter(
      (item) =>
        item.category === currentItem.category &&
        item.id !== currentItem.id &&
        !Object.values(packingResult.packingList)
          .flat()
          .some((i) => i.id === item.id)
    );

    if (sameCatItems.length === 0) {
      toast.info(t("travel.noAlternatives"));
      return;
    }

    const replacement = sameCatItems[Math.floor(Math.random() * sameCatItems.length)];

    setPackingResult((prev) => {
      if (!prev) return prev;
      const newList = { ...prev.packingList };
      newList[category] = [...newList[category]];
      newList[category][itemIndex] = replacement;
      return { ...prev, packingList: newList };
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-2xl mx-auto space-y-6 pb-8"
      >
        {/* Header */}
        <div className="text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-primary flex items-center justify-center shadow-warm mb-3">
            <Plane size={28} className="text-primary-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {t("travel.title")}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t("travel.subtitle")}
          </p>
        </div>

        {/* Trip Form or Empty Wardrobe Message */}
        {clothingCount < 3 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl p-6 shadow-card border border-border text-center space-y-4"
          >
            <div className="w-12 h-12 mx-auto rounded-xl bg-accent/20 flex items-center justify-center">
              <Shirt size={24} className="text-accent" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{t("travel.needItems")}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t("travel.needItemsDesc")}
              </p>
            </div>
            <Link
              to="/dashboard/wardrobe"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-primary text-primary-foreground font-medium text-sm shadow-warm transition-transform active:scale-95"
            >
              <Shirt size={16} />
              {t("nav.wardrobe")}
            </Link>
          </motion.div>
        ) : (
          <TripForm onSubmit={handlePlanTrip} isLoading={isLoading} />
        )}

        {/* Loading State */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-3 py-8"
          >
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{t("travel.analyzing")}</p>
          </motion.div>
        )}

        {/* Weather Result */}
        {weatherResult && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl p-4 shadow-card border border-border"
          >
            <div className="flex items-center gap-3 mb-3">
              <CloudSun size={22} className="text-primary" />
              <div>
                <p className="font-semibold text-foreground text-sm">
                  {weatherResult.city}{weatherResult.country ? `, ${weatherResult.country}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {weatherResult.descriptions.join(" · ")}
                  {weatherResult.source === "seasonal" && ` (${t("travel.seasonalEstimate")})`}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-secondary/50 rounded-lg p-2.5 text-center">
                <ThermometerSun size={16} className="text-primary mx-auto mb-1" />
                <p className="font-bold text-foreground text-sm">{weatherResult.avgTemperature}°C</p>
                <p className="text-[10px] text-muted-foreground">{weatherResult.minTemperature}° – {weatherResult.maxTemperature}°</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-2.5 text-center">
                <Droplets size={16} className="text-primary mx-auto mb-1" />
                <p className="font-bold text-foreground text-sm">{weatherResult.rainChance}%</p>
                <p className="text-[10px] text-muted-foreground">{t("travel.rainChance")}</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-2.5 text-center">
                <Plane size={16} className="text-primary mx-auto mb-1" />
                <p className="font-bold text-foreground text-sm">{weatherResult.tripDays}</p>
                <p className="text-[10px] text-muted-foreground">{t("travel.days")}</p>
              </div>
            </div>
            {weatherResult.needsRainGear && (
              <div className="mt-3 bg-accent/15 rounded-lg px-3 py-2 text-xs text-accent font-medium">
                🌧️ {t("travel.rainGearAdded")}
              </div>
            )}
          </motion.div>
        )}

        {/* Packing Grid */}
        {packingResult && !isLoading && (
          <PackingGrid
            packingList={packingResult.packingList}
            safetyStock={packingResult.safetyStock}
            totalItems={packingResult.totalItems}
            allItems={packingResult.allItems}
            onShuffle={handleShuffle}
          />
        )}
      </motion.div>
    </DashboardLayout>
  );
}
