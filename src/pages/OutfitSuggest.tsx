import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { Sparkles, MapPin, Loader2, Building, Wand2, AlertTriangle, History } from "lucide-react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUsageLimits, LIMIT_REACHED_MESSAGE } from "@/hooks/useUsageLimits";
import LimitReachedCard from "@/components/suggest/LimitReachedCard";
import LevelUpModal from "@/components/streak/LevelUpModal";
import { getLevel, getCurrentReward } from "@/lib/streakRewards";

type OutfitItem = {
  id: string;
  name: string;
  category: string;
  color: string | null;
  image_url: string;
};

type OutfitSuggestion = {
  id: string;
  items: {
    upper_body?: OutfitItem;
    lower_body?: OutfitItem;
    outerwear?: OutfitItem;
    footwear?: OutfitItem;
    accessory?: OutfitItem;
  };
  weather: {
    location: string;
    temperature: number;
    feelsLike?: number;
    description: string;
    humidity?: number;
    isRaining?: boolean;
  };
  reasoning: string;
  style: string;
  occasion: string;
  venueAnalysis?: string;
};

export default function OutfitSuggest() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, session, loading } = useAuth();
  const queryClient = useQueryClient();
  const [style, setStyle] = useState("casual");
  const [location, setLocation] = useState("");
  const [occasion, setOccasion] = useState("");
  const [venue, setVenue] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [currentSuggestion, setCurrentSuggestion] = useState<OutfitSuggestion | null>(null);
  const [tryOnImage, setTryOnImage] = useState<string | null>(null);
  const [isGeneratingTryOn, setIsGeneratingTryOn] = useState(false);
  const [levelUpData, setLevelUpData] = useState<{ level: number; reward: ReturnType<typeof getCurrentReward> } | null>(null);
  const { canSuggestOutfit, outfitSuggestLeft, outfitSuggestLimit, recordUsage } = useUsageLimits();

  // Fetch user's profile for full body photo
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("auth_id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch user preferences for default location and preferred styles
  const { data: userPreferences } = useQuery({
    queryKey: ["user-preferences", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("user_preferences")
        .select("default_location, preferred_styles")
        .eq("user_id", user.id)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!user,
  });

  // Pre-fill location + style from user preferences
  useEffect(() => {
    if (userPreferences?.default_location && !location) {
      setLocation(userPreferences.default_location);
    }
    if (userPreferences?.preferred_styles?.[0]) {
      setStyle(userPreferences.preferred_styles[0]);
    }
  }, [userPreferences]);

  const styles = [
    { value: "casual", label: t("style.casual") },
    { value: "business", label: t("style.business") },
    { value: "streetwear", label: t("style.streetwear") },
    { value: "classic", label: t("style.classic") },
    { value: "sporty", label: t("style.sporty") },
    { value: "elegant", label: t("style.elegant") },
    { value: "bohemian", label: t("style.bohemian") },
    { value: "minimalist", label: t("style.minimalist") },
    { value: "vintage", label: t("style.vintage") },
    { value: "preppy", label: t("style.preppy") },
    { value: "artsy", label: t("style.artsy") },
    { value: "edgy", label: t("style.edgy") },
  ];

  const occasions = [
    { value: "work", label: t("occasion.work") },
    { value: "date", label: t("occasion.date") },
    { value: "party", label: t("occasion.party") },
    { value: "wedding", label: t("occasion.wedding") },
    { value: "interview", label: t("occasion.interview") },
    { value: "casual", label: t("occasion.casual") },
    { value: "brunch", label: t("occasion.brunch") },
    { value: "shopping", label: t("occasion.shopping") },
    { value: "gym", label: t("occasion.gym") },
    { value: "travel", label: t("occasion.travel") },
    { value: "meeting", label: t("occasion.meeting") },
    { value: "dinner", label: t("occasion.dinner") },
  ];

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

  const suggestMutation = useMutation({
    mutationFn: async (overrides?: { style?: string; occasion?: string; venue?: string; location?: string }) => {
      if (!session) throw new Error("Not authenticated");
      if (!canSuggestOutfit) {
        toast(LIMIT_REACHED_MESSAGE);
        throw new Error("__limit__");
      }
      const finalStyle = overrides?.style ?? style;
      const finalOccasion = overrides?.occasion ?? occasion;
      const finalVenue = overrides?.venue ?? venue;
      const finalLocation = overrides?.location ?? location;
      if (!finalStyle) throw new Error(t("suggest.styleRequired") || "Style is required");
      if (!finalOccasion) throw new Error(t("suggest.occasionRequired") || "Occasion is required");

      const { data, error } = await supabase.functions.invoke("suggest-outfit", {
        body: {
          style: finalStyle,
          location: finalLocation || "Istanbul",
          occasion: finalOccasion,
          venue: finalVenue || "",
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Carry venue through for the result screen context line
      return { ...data, venue: finalVenue || undefined } as OutfitSuggestion;
    },
    onSuccess: async (data) => {
      const enriched = { ...data, venue: venue || undefined };
      setCurrentSuggestion(enriched);
      setTryOnImage(null);
      queryClient.invalidateQueries({ queryKey: ["outfit-count"] });
      queryClient.invalidateQueries({ queryKey: ["outfit-history"] });

      // Record usage
      await recordUsage("outfit_suggest");

      // Always create a new check-in (no unique constraint anymore)
      if (user) {
        try {
          // Get count BEFORE inserting to detect level-up
          const { count: countBefore } = await supabase
            .from("style_checkins")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id);
          const previousLevel = getLevel(countBefore || 0);

          const { error } = await supabase
            .from("style_checkins")
            .insert({
              user_id: user.id,
              outfit_suggestion_id: data.id,
            });
          if (error) throw error;
          queryClient.invalidateQueries({ queryKey: ["style-streak"] });
          queryClient.invalidateQueries({ queryKey: ["streak-checkins"] });
          queryClient.invalidateQueries({ queryKey: ["streak-checkins-detail"] });

          const newCount = (countBefore || 0) + 1;
          const newLevel = getLevel(newCount);

          // Trigger level-up modal if user just leveled up
          if (newLevel > previousLevel) {
            const reward = getCurrentReward(newCount);
            setLevelUpData({ level: newLevel, reward });
          }
        } catch (err) {
          console.error("Streak check-in error:", err);
        }
      }

      // Navigate to the dedicated result screen
      navigate("/dashboard/suggest/result", { state: { suggestion: enriched } });
    },
    onError: (error: Error) => {
      if (error.message === "__limit__") return;
      console.error("Suggest error:", error);
      toast.error(error.message);
    },
  });

  const saveFavoriteMutation = useMutation({
    mutationFn: async (outfitId: string) => {
      const { error } = await supabase
        .from("outfit_suggestions")
        .update({ is_favorite: true })
        .eq("id", outfitId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("suggest.saved"));
      queryClient.invalidateQueries({ queryKey: ["outfit-history"] });
    },
    onError: () => {
      toast.error(t("common.error"));
    },
  });

  // Generate try-on image directly in-page
  const handleTryOnOutfit = async () => {
    if (!currentSuggestion || !profile) return;
    
    const fullBodyPhotoUrl = (profile as any).full_body_photo_url;
    if (!fullBodyPhotoUrl) {
      toast.error(t("suggest.needFullBodyPhoto"));
      return;
    }

    setIsGeneratingTryOn(true);
    try {
      // Get the first available clothing item from the suggestion
      const items = currentSuggestion.items;
      const primaryItem = items.upper_body || items.lower_body || items.outerwear;
      
      if (!primaryItem) {
        toast.error(t("common.error"));
        return;
      }

      const { data, error } = await supabase.functions.invoke("virtual-try-on", {
        body: { 
          clothingItemId: primaryItem.id,
          userImageBase64: fullBodyPhotoUrl,
          additionalItems: Object.values(items)
            .filter(item => item && item.id !== primaryItem.id)
            .map(item => ({
              id: item!.id,
              name: item!.name,
              category: item!.category,
              color: item!.color,
              image_url: item!.image_url,
            })),
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      setTryOnImage(data.resultImageUrl);
      toast.success(t("tryOn.result"));
    } catch (error: any) {
      console.error("Try-on error:", error);
      toast.error(error.message || t("common.error"));
    } finally {
      setIsGeneratingTryOn(false);
    }
  };

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

  const hasEnoughClothes = clothingCount >= 3;
  const hasFullBodyPhoto = !!(profile as any)?.full_body_photo_url;

  // Hours until midnight for limit reset
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const hoursLeft = Math.max(1, Math.round((midnight.getTime() - now.getTime()) / 3.6e6));

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 max-w-lg mx-auto"
      >
        {/* Brand header row */}
        <div className="flex items-center justify-between">
          <span className="font-display text-2xl font-extrabold text-primary tracking-tight">
            tarzly<span className="text-foreground/80">.ai</span>
          </span>
          <Link
            to="/dashboard/history"
            aria-label="Outfit history"
            className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center shadow-card hover:bg-secondary transition-colors"
          >
            <History size={18} className="text-foreground" />
          </Link>
        </div>

        {/* Title + weather context line */}
        <div className="text-center space-y-1">
          <h1 className="font-display text-3xl font-bold text-foreground">
            Get your outfit
          </h1>
          {currentSuggestion?.weather ? (
            <p className="text-sm text-muted-foreground">
              {currentSuggestion.weather.temperature}° · {currentSuggestion.weather.description} · {currentSuggestion.weather.location}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {location || "Istanbul"}
            </p>
          )}
        </div>

        {/* Limit reached → upgrade card */}
        {outfitSuggestLeft === 0 ? (
          <LimitReachedCard />
        ) : (
          <>
            {/* Hero CTA */}
            <Button
              onClick={() =>
                suggestMutation.mutate({
                  style: style || "casual",
                  occasion: occasion || "casual",
                  venue,
                  location: location || "Istanbul",
                })
              }
              disabled={suggestMutation.isPending || !hasEnoughClothes || !occasion}
              className="w-full h-16 text-lg font-semibold bg-gradient-primary text-primary-foreground shadow-warm rounded-2xl disabled:opacity-50"
              size="lg"
            >
              {suggestMutation.isPending ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="mr-2"
                  >
                    <Sparkles className="h-6 w-6" />
                  </motion.div>
                  <span>{t("suggest.generating")}</span>
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-6 w-6" />
                  Dress me for today
                </>
              )}
            </Button>

            {/* Suggestion progress card */}
            <div className="bg-card rounded-2xl p-4 border border-border shadow-card">
              <div className="flex items-center justify-between gap-3 mb-2">
                <p className={`text-sm font-medium ${outfitSuggestLeft <= 3 ? "text-warning" : "text-foreground"}`}>
                  {outfitSuggestLeft <= 3 && (
                    <AlertTriangle className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
                  )}
                  {outfitSuggestLeft} suggestion{outfitSuggestLeft === 1 ? "" : "s"} left · resets in {hoursLeft}h
                </p>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                  outfitSuggestLeft >= outfitSuggestLimit - 1
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                    : outfitSuggestLeft <= 3
                      ? "bg-warning/15 text-warning"
                      : "bg-secondary text-secondary-foreground"
                }`}>
                  {outfitSuggestLeft >= outfitSuggestLimit - 1 ? "Full" : `${outfitSuggestLeft}/${outfitSuggestLimit}`}
                </span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(outfitSuggestLeft / outfitSuggestLimit) * 100}%` }}
                  transition={{ duration: 0.6 }}
                  className="h-full bg-primary rounded-full"
                />
              </div>
            </div>

            {!hasEnoughClothes && (
              <p className="text-sm text-muted-foreground text-center">
                {t("suggest.needMoreItems")}
              </p>
            )}

            {/* OR ADD CONTEXT divider */}
            <div className="flex items-center gap-3 pt-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[11px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
                Or add context
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Context form */}
            <div className="bg-card rounded-2xl p-5 border border-border shadow-card space-y-4">
              <div className="space-y-2">
                <Label htmlFor="venue" className="text-xs text-muted-foreground font-medium">
                  Venue name
                </Label>
                <Input
                  id="venue"
                  placeholder="e.g. Starbucks, The Ritz…"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground font-medium">
                  Style
                </Label>
                <Select value={style} onValueChange={setStyle}>
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {styles.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground font-medium flex items-center gap-2">
                  Occasion
                  {!occasion && (
                    <span className="text-destructive font-semibold">required</span>
                  )}
                </Label>
                <Select value={occasion} onValueChange={setOccasion}>
                  <SelectTrigger
                    className={`bg-background ${!occasion ? "border-destructive ring-1 ring-destructive/40" : ""}`}
                  >
                    <SelectValue placeholder="Select an occasion" />
                  </SelectTrigger>
                  <SelectContent>
                    {occasions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Optional location override */}
              <div className="space-y-2">
                <Label htmlFor="location" className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                  <MapPin size={12} />
                  Location (optional)
                </Label>
                <Input
                  id="location"
                  placeholder={t("suggest.locationPlaceholder")}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="bg-background"
                />
              </div>

              <Button
                onClick={() => suggestMutation.mutate({})}
                disabled={
                  suggestMutation.isPending ||
                  !hasEnoughClothes ||
                  !style ||
                  !occasion
                }
                className="w-full h-12 bg-gradient-primary text-primary-foreground font-semibold disabled:opacity-50"
                size="lg"
              >
                {suggestMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {t("suggest.generating")}
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Get outfit suggestion
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </motion.div>

      {/* Level-up celebration */}
      {levelUpData && (
        <LevelUpModal
          open={!!levelUpData}
          level={levelUpData.level}
          reward={levelUpData.reward}
          onClose={() => setLevelUpData(null)}
        />
      )}
    </DashboardLayout>
  );
}
