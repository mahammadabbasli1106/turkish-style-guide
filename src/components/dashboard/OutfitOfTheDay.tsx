import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function OutfitOfTheDay() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const { data: latestOutfit } = useQuery({
    queryKey: ["latest-outfit", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("outfit_suggestions")
        .select(`
          id,
          outfit_name,
          ai_reasoning,
          occasion,
          style,
          created_at,
          upper_body:clothing_items!outfit_suggestions_upper_body_id_fkey(name, image_url),
          lower_body:clothing_items!outfit_suggestions_lower_body_id_fkey(name, image_url),
          footwear:clothing_items!outfit_suggestions_footwear_id_fkey(name, image_url),
          outerwear:clothing_items!outfit_suggestions_outerwear_id_fkey(name, image_url)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const images = latestOutfit
    ? [latestOutfit.upper_body, latestOutfit.lower_body, latestOutfit.footwear, latestOutfit.outerwear]
        .filter((item): item is { name: string; image_url: string } => !!item?.image_url)
        .slice(0, 3)
    : [];

  // CTA when no outfits exist
  if (!latestOutfit) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
      >
        <Link
          to="/dashboard/suggest"
          className="block bg-gradient-primary rounded-2xl p-5 text-primary-foreground shadow-warm"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles size={18} />
                <span className="font-semibold text-sm">{t("dashboard.ootdTitle")}</span>
              </div>
              <p className="text-primary-foreground/80 text-xs max-w-[200px]">
                {t("dashboard.ootdCta")}
              </p>
            </div>
            <ChevronRight size={20} className="text-primary-foreground/60" />
          </div>
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.5 }}
    >
      <Link
        to="/dashboard/history"
        className="block bg-card rounded-2xl border border-border shadow-card overflow-hidden"
      >
        <div className="p-4 pb-3">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className="text-accent" />
            <span className="text-xs font-semibold text-accent">{t("dashboard.ootdTitle")}</span>
          </div>
          <p className="font-display text-sm font-bold text-foreground">
            {latestOutfit.outfit_name || latestOutfit.occasion || t("suggest.yourOutfit")}
          </p>
          {latestOutfit.ai_reasoning && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {latestOutfit.ai_reasoning}
            </p>
          )}
        </div>
        {images.length > 0 && (
          <div className="flex gap-1 px-4 pb-4">
            {images.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + i * 0.08 }}
                className="w-16 h-16 rounded-xl overflow-hidden bg-secondary"
              >
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </motion.div>
            ))}
          </div>
        )}
      </Link>
    </motion.div>
  );
}
