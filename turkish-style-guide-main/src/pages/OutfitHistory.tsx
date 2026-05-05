import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "@/components/ui/sonner";
import { Heart, Loader2, History, ArrowLeft, RotateCw } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

type OutfitItemRef = {
  id: string;
  name: string;
  image_url: string;
} | null;

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
  upper_body: OutfitItemRef;
  lower_body: OutfitItemRef;
  outerwear: OutfitItemRef;
  footwear: OutfitItemRef;
};

// Card component that uses swipe-to-reveal-delete
function OutfitCard({
  outfit,
  onToggleFav,
  onDelete,
  onWearAgain,
}: {
  outfit: OutfitWithItems;
  onToggleFav: () => void;
  onDelete: () => void;
  onWearAgain: () => void;
}) {
  const [dragX, setDragX] = useState(0);
  const items = [
    outfit.upper_body,
    outfit.lower_body,
    outfit.outerwear,
    outfit.footwear,
  ].filter(Boolean) as NonNullable<OutfitItemRef>[];

  return (
    <div className="relative">
      {/* Delete background revealed on left swipe */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            className={`absolute inset-y-0 right-0 w-24 bg-destructive rounded-2xl flex items-center justify-center text-destructive-foreground font-semibold text-sm transition-opacity ${
              dragX < -40 ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            aria-label="Delete outfit"
          >
            Delete
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this outfit?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the outfit from your history. This action can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDragX(0)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete();
                setDragX(0);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <motion.article
        drag="x"
        dragConstraints={{ left: -96, right: 0 }}
        dragElastic={0.05}
        onDrag={(_, info) => setDragX(info.offset.x)}
        onDragEnd={(_, info) => {
          // Snap open if dragged past threshold, otherwise snap closed
          if (info.offset.x < -50) setDragX(-96);
          else setDragX(0);
        }}
        animate={{ x: dragX }}
        transition={{ type: "spring", damping: 30, stiffness: 350 }}
        className="bg-card rounded-2xl border border-border shadow-card p-4 relative"
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0">
            <h3 className="font-display text-base font-bold text-foreground capitalize truncate">
              {outfit.style && outfit.occasion
                ? `${outfit.occasion} · ${outfit.weather_info?.location || outfit.style}`
                : outfit.style || outfit.occasion || "Outfit"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {format(new Date(outfit.created_at), "EEE MMM d")}
              {outfit.weather_info?.temperature !== undefined &&
                ` · ${outfit.weather_info.temperature}°`}
              {outfit.weather_info?.description &&
                ` ${outfit.weather_info.description}`}
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFav();
            }}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary transition-colors shrink-0"
            aria-label={outfit.is_favorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart
              size={18}
              className={
                outfit.is_favorite
                  ? "fill-destructive text-destructive"
                  : "text-muted-foreground"
              }
            />
          </button>
        </div>

        {/* Mini icon row */}
        {items.length > 0 && (
          <div className="flex gap-2 mb-3">
            {items.slice(0, 4).map((item, idx) => (
              <div
                key={idx}
                className="w-12 h-12 rounded-xl overflow-hidden bg-secondary border border-border shrink-0"
              >
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        )}

        <button
          onClick={onWearAgain}
          className="w-full py-2.5 rounded-xl bg-secondary/60 hover:bg-secondary text-sm font-semibold text-foreground/70 flex items-center justify-center gap-2 transition-colors"
        >
          <RotateCw size={14} />
          Wear again
        </button>
      </motion.article>
    </div>
  );
}

export default function OutfitHistory() {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
      toast.success("Outfit deleted");
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

  const filteredOutfits =
    filter === "favorites" ? outfits.filter((o) => o.is_favorite) : outfits;

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 max-w-lg mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-card border border-border shadow-card hover:bg-secondary transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5 text-primary" />
        </button>
        <h1 className="text-base font-semibold text-foreground">Outfit history</h1>
        <div className="w-10" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4 max-w-lg mx-auto"
      >
        {/* Filter tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-card/60 border border-border">
          <button
            onClick={() => setFilter("all")}
            className={`py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              filter === "all"
                ? "bg-primary text-primary-foreground shadow-warm"
                : "text-muted-foreground"
            }`}
          >
            All ({outfits.length})
          </button>
          <button
            onClick={() => setFilter("favorites")}
            className={`py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              filter === "favorites"
                ? "bg-primary text-primary-foreground shadow-warm"
                : "text-muted-foreground"
            }`}
          >
            Favorites ({outfits.filter((o) => o.is_favorite).length})
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredOutfits.length === 0 ? (
          <div className="text-center py-16">
            <History className="w-14 h-14 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-display text-lg font-semibold text-foreground mb-1">
              {filter === "favorites" ? "No favorites yet" : "No outfits yet"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {filter === "favorites"
                ? "Tap the heart on any outfit to save it"
                : "Get your first outfit suggestion"}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <AnimatePresence>
                {filteredOutfits.map((outfit) => (
                  <motion.div
                    key={outfit.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <OutfitCard
                      outfit={outfit}
                      onToggleFav={() =>
                        toggleFavoriteMutation.mutate({
                          id: outfit.id,
                          isFavorite: outfit.is_favorite || false,
                        })
                      }
                      onDelete={() => deleteMutation.mutate(outfit.id)}
                      onWearAgain={() =>
                        navigate("/dashboard/suggest/result", {
                          state: {
                            suggestion: {
                              id: outfit.id,
                              items: {
                                upper_body: outfit.upper_body,
                                lower_body: outfit.lower_body,
                                outerwear: outfit.outerwear,
                                footwear: outfit.footwear,
                              },
                              weather: outfit.weather_info || {},
                              reasoning: outfit.ai_reasoning || "",
                              style: outfit.style || "",
                              occasion: outfit.occasion || "",
                              is_favorite: outfit.is_favorite,
                            },
                          },
                        })
                      }
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <p className="text-center text-xs text-muted-foreground pt-2">
              Swipe left on any card to delete
            </p>
          </>
        )}
      </motion.div>
    </DashboardLayout>
  );
}
