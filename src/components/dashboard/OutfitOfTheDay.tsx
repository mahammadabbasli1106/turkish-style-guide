import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";

const dayKeys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

const styleLabels: Record<string, string> = {
  streetwear: "Urban Edge",
  classic: "Timeless Classic",
  business: "Power Professional",
  casual: "Effortless Cool",
  sporty: "Athletic Luxe",
  elegant: "Refined Minimalist",
};

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
        .slice(0, 4)
    : [];

  const dayName = dayKeys[new Date().getDay()];
  const styleTag = latestOutfit?.style
    ? styleLabels[latestOutfit.style] || latestOutfit.style
    : "";

  // CTA when no outfits
  if (!latestOutfit) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5 }}
      >
        <Link
          to="/dashboard/suggest"
          className="block rounded-2xl border border-border bg-card p-6 shadow-card hover:shadow-card-hover transition-shadow"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles size={16} className="text-primary" />
              </div>
              <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                {t("dashboard.dailyEditLabel")}
              </span>
            </div>
            <h3 className="font-display text-lg font-bold text-foreground">
              {t("dashboard.dailyEditCtaTitle")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("dashboard.dailyEditCtaDesc")}
            </p>
            <div className="flex items-center gap-1 text-primary text-sm font-medium pt-1">
              <span>{t("dashboard.dailyEditCtaAction")}</span>
              <ArrowRight size={14} />
            </div>
          </div>
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.5 }}
    >
      <Link
        to="/dashboard/history"
        className="block rounded-2xl border border-border bg-card overflow-hidden shadow-card hover:shadow-card-hover transition-shadow"
      >
        {/* Header */}
        <div className="p-5 pb-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles size={14} className="text-primary" />
              </div>
              <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                {t("dashboard.dailyEditLabel")}
              </span>
            </div>
            <ArrowRight size={16} className="text-muted-foreground" />
          </div>

          <h3 className="font-display text-lg font-bold text-foreground leading-tight">
            {t(`dashboard.dayVibe.${dayName}`)}{styleTag ? `: ${styleTag}` : ""}
          </h3>

          {latestOutfit.ai_reasoning && (
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {latestOutfit.ai_reasoning}
            </p>
          )}
        </div>

        {/* Thumbnails */}
        {images.length > 0 && (
          <div className="flex gap-1.5 px-5 pb-5">
            {images.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.25 + i * 0.06 }}
                className="w-16 h-16 rounded-xl overflow-hidden bg-secondary flex-shrink-0"
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
