import { useState } from "react";
import { Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Sparkles, CloudSun, MapPin, Loader2, RefreshCw, Heart } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  };
  weather: {
    location: string;
    temperature: number;
    description: string;
  };
  reasoning: string;
  style: string;
  occasion: string;
};

const styles = [
  { value: "casual", label: "Casual" },
  { value: "business", label: "Business" },
  { value: "streetwear", label: "Streetwear" },
  { value: "classic", label: "Classic" },
  { value: "sporty", label: "Sporty" },
  { value: "elegant", label: "Elegant" },
];

export default function OutfitSuggest() {
  const { user, session, loading } = useAuth();
  const queryClient = useQueryClient();
  const [style, setStyle] = useState("casual");
  const [location, setLocation] = useState("Istanbul");
  const [occasion, setOccasion] = useState("");
  const [currentSuggestion, setCurrentSuggestion] = useState<OutfitSuggestion | null>(null);

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
    mutationFn: async () => {
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("suggest-outfit", {
        body: { style, location, occasion },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return data as OutfitSuggestion;
    },
    onSuccess: (data) => {
      setCurrentSuggestion(data);
      queryClient.invalidateQueries({ queryKey: ["outfit-count"] });
      toast.success("Here's your perfect outfit!");
    },
    onError: (error: Error) => {
      console.error("Suggest error:", error);
      toast.error(error.message);
    },
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

  const hasEnoughClothes = clothingCount >= 3;

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8 max-w-4xl mx-auto"
      >
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold text-foreground">Get Your Outfit</h1>
          <p className="text-muted-foreground mt-1">
            Tell us where you're going and we'll pick the perfect outfit
          </p>
        </div>

        {/* Input form */}
        <div className="bg-card rounded-2xl p-6 shadow-card border border-border">
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-2">
                <MapPin size={16} className="text-primary" />
                Location
              </Label>
              <Input
                id="location"
                placeholder="Istanbul"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Sparkles size={16} className="text-primary" />
                Style
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
              <Label htmlFor="occasion">Occasion (optional)</Label>
              <Input
                id="occasion"
                placeholder="e.g., dinner date, office"
                value={occasion}
                onChange={(e) => setOccasion(e.target.value)}
              />
            </div>
          </div>

          <Button
            onClick={() => suggestMutation.mutate()}
            disabled={suggestMutation.isPending || !hasEnoughClothes}
            className="w-full bg-gradient-primary text-primary-foreground shadow-warm"
            size="lg"
          >
            {suggestMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                AI is styling your outfit...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                Get Outfit Suggestion
              </>
            )}
          </Button>

          {!hasEnoughClothes && (
            <p className="text-sm text-muted-foreground text-center mt-3">
              Add at least 3 clothing items to your wardrobe first
            </p>
          )}
        </div>

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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CloudSun size={32} />
                    <div>
                      <p className="font-semibold text-lg">{currentSuggestion.weather.location}</p>
                      <p className="text-primary-foreground/80">
                        {currentSuggestion.weather.temperature}°C • {currentSuggestion.weather.description}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="bg-primary-foreground/20 px-3 py-1 rounded-full text-sm capitalize">
                      {currentSuggestion.style}
                    </span>
                  </div>
                </div>
              </div>

              {/* Outfit items */}
              <div className="p-6">
                <h3 className="font-display text-xl font-semibold text-foreground mb-4">
                  Your Outfit
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {(["upper_body", "lower_body", "outerwear", "footwear"] as const).map((category) => {
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
                      <span className="font-medium text-foreground">Why this works: </span>
                      {currentSuggestion.reasoning}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => suggestMutation.mutate()}
                    disabled={suggestMutation.isPending}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Try Another
                  </Button>
                  <Button variant="ghost">
                    <Heart className="mr-2 h-4 w-4" />
                    Save Favorite
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </DashboardLayout>
  );
}
