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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Sparkles, CloudSun, MapPin, Loader2, RefreshCw, Heart, Building, Camera, Wand2, ChevronDown, AlertTriangle } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import confetti from "canvas-confetti";
import { useUsageLimits, LIMIT_REACHED_MESSAGE } from "@/hooks/useUsageLimits";
import LimitReachedCard from "@/components/suggest/LimitReachedCard";

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
          const { error } = await supabase
            .from("style_checkins")
            .insert({
              user_id: user.id,
              outfit_suggestion_id: data.id,
            });
          if (error) throw error;
          queryClient.invalidateQueries({ queryKey: ["style-streak"] });

          // Check total generation count for confetti milestone
          const { count } = await supabase
            .from("style_checkins")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id);

          const totalCount = count || 0;
          if (totalCount > 0 && totalCount % 10 === 0) {
            confetti({
              particleCount: 150,
              spread: 80,
              origin: { y: 0.6 },
              colors: ["#d4ff00", "#10B981", "#3B82F6", "#F59E0B", "#EF4444"],
            });
            toast.success(`🎉 ${totalCount} outfits generated! You're on fire!`);
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

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8 max-w-4xl mx-auto"
      >
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold text-foreground">{t("suggest.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("suggest.subtitle")}</p>
        </div>

        {/* Limit reached → show upgrade card instead of suggestion buttons */}
        {outfitSuggestLeft === 0 ? (
          <LimitReachedCard />
        ) : (
          <>
            {/* One-tap hero button */}
            <div className="space-y-3">
              <Button
                onClick={() =>
                  suggestMutation.mutate({
                    style: style || "casual",
                    occasion: "casual",
                    venue: "",
                    location: location || "Istanbul",
                  })
                }
                disabled={suggestMutation.isPending || !hasEnoughClothes}
                className="w-full h-16 text-lg font-semibold bg-gradient-primary text-primary-foreground shadow-warm rounded-2xl"
                size="lg"
              >
                {suggestMutation.isPending ? (
                  <motion.div className="flex items-center gap-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    >
                      <Sparkles className="h-6 w-6" />
                    </motion.div>
                    <span>{t("suggest.generating")}</span>
                  </motion.div>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-6 w-6" />
                    Dress me for today
                  </>
                )}
              </Button>

              {/* Suggestion counter */}
              {outfitSuggestLeft > 3 ? (
                <p className="text-xs text-muted-foreground text-center">
                  {outfitSuggestLeft} free suggestions remaining today · resets at midnight
                </p>
              ) : (
                <p className="text-xs text-warning text-center flex items-center justify-center gap-1.5 font-medium">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Only {outfitSuggestLeft} suggestion{outfitSuggestLeft === 1 ? "" : "s"} left today · resets at midnight
                </p>
              )}

              {!hasEnoughClothes && (
                <p className="text-sm text-muted-foreground text-center">
                  {t("suggest.needMoreItems")}
                </p>
              )}
            </div>

            {/* Collapsible: add more context (optional) */}
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-secondary/60 hover:bg-secondary transition-colors text-sm font-medium text-foreground">
                  <span>Add more context (optional)</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${advancedOpen ? "rotate-180" : ""}`}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="bg-card rounded-2xl p-6 shadow-card border border-border mt-3 space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="location" className="flex items-center gap-2">
                        <MapPin size={16} className="text-primary" />
                        {t("suggest.location")}
                      </Label>
                      <Input
                        id="location"
                        placeholder={t("suggest.locationPlaceholder")}
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="venue" className="flex items-center gap-2 text-foreground">
                        <Building size={16} />
                        {t("suggest.venue")}
                      </Label>
                      <Input
                        id="venue"
                        placeholder={t("suggest.venuePlaceholder")}
                        value={venue}
                        onChange={(e) => setVenue(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">{t("suggest.venueHint")}</p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-foreground">
                        <Sparkles size={16} />
                        {t("suggest.style")}
                      </Label>
                      <Select value={style} onValueChange={setStyle}>
                        <SelectTrigger>
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
                      <Label className="flex items-center gap-2 text-foreground">
                        {t("suggest.occasion")}
                      </Label>
                      <Select value={occasion} onValueChange={setOccasion}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("suggest.occasionPlaceholder")} />
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
                  </div>

                  <Button
                    onClick={() => suggestMutation.mutate({})}
                    disabled={
                      suggestMutation.isPending ||
                      !hasEnoughClothes ||
                      !style
                    }
                    variant="outline"
                    className="w-full"
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
                        {t("suggest.getOutfit")}
                      </>
                    )}
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </>
        )}

        {/* Outfit result */}
        <AnimatePresence mode="wait">
          {currentSuggestion && (
            <motion.div
              key={currentSuggestion.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="bg-card rounded-2xl overflow-hidden shadow-card border border-border"
            >
              {/* Weather header */}
              <div className="bg-gradient-primary p-6 text-primary-foreground">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <CloudSun size={32} />
                    <div>
                      <p className="font-semibold text-lg">{currentSuggestion.weather.location}</p>
                      <p className="text-primary-foreground/80">
                        {currentSuggestion.weather.temperature}°C 
                        {currentSuggestion.weather.feelsLike && ` (${t("weather.feelsLike")} ${currentSuggestion.weather.feelsLike}°C)`}
                        • {currentSuggestion.weather.description}
                        {currentSuggestion.weather.isRaining && " 🌧️"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span className="bg-primary-foreground/20 px-3 py-1 rounded-full text-sm capitalize">
                      {currentSuggestion.style}
                    </span>
                    <span className="bg-primary-foreground/20 px-3 py-1 rounded-full text-sm capitalize">
                      {currentSuggestion.occasion}
                    </span>
                  </div>
                </div>
              </div>

              {/* Venue analysis if available */}
              {currentSuggestion.venueAnalysis && (
                <div className="px-6 py-3 bg-accent/20 border-b border-border">
                  <p className="text-sm text-foreground">
                    <Building size={14} className="inline mr-2" />
                    <span className="font-medium">Venue insight:</span> {currentSuggestion.venueAnalysis}
                  </p>
                </div>
              )}

              {/* Outfit items */}
              <div className="p-6">
                <h3 className="font-display text-xl font-semibold text-foreground mb-4">
                  {t("suggest.yourOutfit")}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {(["upper_body", "lower_body", "outerwear", "footwear", "accessory"] as const).map((category) => {
                    const item = currentSuggestion.items[category];
                    if (!item) return null;
                    return (
                      <motion.div
                        key={category}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                        className="bg-secondary rounded-xl overflow-hidden"
                      >
                        <div className="aspect-square">
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="p-3">
                          <p className="text-sm font-medium text-foreground truncate">
                            {item.name}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {category.replace("_", " ")}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* AI reasoning */}
                {currentSuggestion.reasoning && (
                  <div className="bg-secondary/50 rounded-xl p-4">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{t("suggest.whyThisWorks")} </span>
                      {currentSuggestion.reasoning}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => suggestMutation.mutate({})}
                    disabled={suggestMutation.isPending}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {t("suggest.tryAnother")}
                  </Button>
                  <Button 
                    variant="ghost"
                    onClick={() => saveFavoriteMutation.mutate(currentSuggestion.id)}
                    disabled={saveFavoriteMutation.isPending}
                  >
                    <Heart className="mr-2 h-4 w-4" />
                    {t("suggest.saveFavorite")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleTryOnOutfit}
                    disabled={isGeneratingTryOn || !hasFullBodyPhoto}
                  >
                    {isGeneratingTryOn ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("tryOn.generating")}
                      </>
                    ) : (
                      <>
                        <Camera className="mr-2 h-4 w-4" />
                        {t("suggest.tryOnThisOutfit")}
                      </>
                    )}
                  </Button>
                </div>
                
                {!hasFullBodyPhoto && (
                  <p className="text-sm text-muted-foreground mt-3">
                    {t("suggest.needFullBodyPhoto")}
                  </p>
                )}
              </div>

              {/* Try-on result displayed directly below */}
              {tryOnImage && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="border-t border-border p-6"
                >
                  <h3 className="font-display text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Sparkles size={20} className="text-primary" />
                    {t("tryOn.result")}
                  </h3>
                  <div className="max-w-md mx-auto">
                    <div className="aspect-[3/4] rounded-2xl overflow-hidden shadow-card">
                      <img 
                        src={tryOnImage} 
                        alt="Try-on result" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </DashboardLayout>
  );
}
