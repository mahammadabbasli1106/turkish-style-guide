import { useState } from "react";
import { Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { Heart, Trash2, Loader2, History, Star } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

type OutfitWithItems = {
  id: string;
  style: string | null;
  occasion: string | null;
  ai_reasoning: string | null;
  is_favorite: boolean | null;
  created_at: string;
  weather_info: {
    location?: string;
    temperature?: number;
    description?: string;
  } | null;
  upper_body: { id: string; name: string; image_url: string } | null;
  lower_body: { id: string; name: string; image_url: string } | null;
  outerwear: { id: string; name: string; image_url: string } | null;
  footwear: { id: string; name: string; image_url: string } | null;
};

export default function OutfitHistory() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "favorites">("all");

  const { data: outfits = [], isLoading } = useQuery({
    queryKey: ["outfit-history", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("outfit_suggestions")
        .select(`
          id,
          style,
          occasion,
          ai_reasoning,
          is_favorite,
          created_at,
          weather_info,
          upper_body:clothing_items!outfit_suggestions_upper_body_id_fkey(id, name, image_url),
          lower_body:clothing_items!outfit_suggestions_lower_body_id_fkey(id, name, image_url),
          outerwear:clothing_items!outfit_suggestions_outerwear_id_fkey(id, name, image_url),
          footwear:clothing_items!outfit_suggestions_footwear_id_fkey(id, name, image_url)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as OutfitWithItems[];
    },
    enabled: !!user,
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ id, isFavorite }: { id: string; isFavorite: boolean }) => {
      const { error } = await supabase
        .from("outfit_suggestions")
        .update({ is_favorite: !isFavorite })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outfit-history"] });
      toast.success(t("suggest.saved"));
    },
    onError: () => {
      toast.error(t("common.error"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("outfit_suggestions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outfit-history"] });
      queryClient.invalidateQueries({ queryKey: ["outfit-count"] });
      toast.success(t("history.delete"));
    },
    onError: () => {
      toast.error(t("common.error"));
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

  const filteredOutfits = filter === "favorites" 
    ? outfits.filter(o => o.is_favorite) 
    : outfits;

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">{t("history.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("history.subtitle")}</p>
          </div>

          <div className="flex gap-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              <History className="mr-2 h-4 w-4" />
              {t("history.all")} ({outfits.length})
            </Button>
            <Button
              variant={filter === "favorites" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("favorites")}
            >
              <Star className="mr-2 h-4 w-4" />
              {t("history.favorites")} ({outfits.filter(o => o.is_favorite).length})
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredOutfits.length === 0 ? (
          <div className="text-center py-16">
            <History className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-display text-xl font-semibold text-foreground mb-2">
              {t("history.noOutfits")}
            </h3>
            <p className="text-muted-foreground">{t("history.noOutfitsDesc")}</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredOutfits.map((outfit) => (
                <motion.div
                  key={outfit.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-card rounded-2xl overflow-hidden shadow-card border border-border"
                >
                  {/* Outfit preview images */}
                  <div className="grid grid-cols-2 gap-1 p-2">
                    {[outfit.upper_body, outfit.lower_body, outfit.outerwear, outfit.footwear]
                      .filter(Boolean)
                      .slice(0, 4)
                      .map((item, idx) => (
                        <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-secondary">
                          {item && (
                            <img 
                              src={item.image_url} 
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                      ))}
                  </div>

                  {/* Outfit details */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-foreground capitalize">
                          {outfit.style} - {outfit.occasion}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(outfit.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => toggleFavoriteMutation.mutate({ 
                            id: outfit.id, 
                            isFavorite: outfit.is_favorite || false 
                          })}
                        >
                          <Heart 
                            size={16} 
                            className={outfit.is_favorite ? "fill-primary text-primary" : ""} 
                          />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate(outfit.id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>

                    {outfit.weather_info && (
                      <div className="text-xs text-muted-foreground bg-secondary/50 rounded-lg px-3 py-2">
                        📍 {outfit.weather_info.location} • {outfit.weather_info.temperature}°C • {outfit.weather_info.description}
                      </div>
                    )}

                    {outfit.ai_reasoning && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {outfit.ai_reasoning}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </DashboardLayout>
  );
}
