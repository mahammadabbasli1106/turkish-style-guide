import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Lightbulb, Sparkles, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const TIPS_EN = [
  "A well-fitted white tee is the most versatile piece you can own.",
  "When in doubt, monochrome always looks intentional.",
  "Rolling your sleeves adds instant polish to any shirt.",
  "Invest in quality shoes — they make or break an outfit.",
  "Layering adds depth even to the simplest outfits.",
  "Match your belt to your shoes for a pulled-together look.",
  "Dark denim works for both casual and semi-formal occasions.",
  "Accessorize with one statement piece to elevate basics.",
  "Tuck in your shirt to define your silhouette instantly.",
  "Neutral tones mix effortlessly — build your base with them.",
];

const TIPS_TR = [
  "İyi oturan beyaz bir tişört, en çok yönlü parçanızdır.",
  "Emin olmadığınızda tek renk her zaman bilinçli görünür.",
  "Kolları sıvamak her gömleğe anında şıklık katar.",
  "Kaliteli ayakkabılara yatırım yapın — kombini yapan veya bozan onlardır.",
  "Katmanlama en basit kombinlere bile derinlik katar.",
  "Kemeri ayakkabıyla eşleştirmek derli toplu bir görünüm sağlar.",
  "Koyu denim hem günlük hem yarı resmi durumlar için idealdir.",
  "Temel parçaları yükseltmek için tek bir dikkat çekici aksesuar kullanın.",
  "Gömleğinizi içine alın — silüetinizi anında belirler.",
  "Nötr tonlar zahmetsizce uyum sağlar — gardırobunuzun temelini onlarla kurun.",
];

export default function DailyTipCard() {
  const { i18n, t } = useTranslation();
  const { user } = useAuth();
  const tips = i18n.language === "tr" ? TIPS_TR : TIPS_EN;

  // Static fallback tip
  const fallbackTip = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return tips[dayOfYear % tips.length];
  }, [tips]);

  // AI-generated tip (cached for 1 hour)
  const { data: aiTip, isLoading: aiLoading, refetch, isFetching } = useQuery({
    queryKey: ["daily-ai-tip", user?.id, i18n.language],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("daily-tip", {
        body: { language: i18n.language },
      });
      if (error) throw error;
      if (data?.error) {
        if (data.error.includes("Rate limited") || data.error.includes("credits")) {
          toast.error(data.error);
        }
        throw new Error(data.error);
      }
      return data?.tip as string;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 60, // 1 hour
    retry: false,
  });

  const tip = aiTip || fallbackTip;
  const isAI = !!aiTip;

  // Typewriter state
  const [displayedText, setDisplayedText] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayedText("");
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayedText(tip.slice(0, i));
      if (i >= tip.length) {
        clearInterval(interval);
        setDone(true);
      }
    }, 30);
    return () => clearInterval(interval);
  }, [tip]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="bg-card rounded-2xl p-4 border border-border shadow-card"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center shrink-0 mt-0.5">
          {isAI ? (
            <Sparkles size={18} className="text-accent" />
          ) : (
            <Lightbulb size={18} className="text-accent" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-accent">
              {isAI ? t("dashboard.aiTip") : t("dashboard.dailyTip")}
            </p>
            {done && !isFetching && (
              <button
                onClick={() => refetch()}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                aria-label="Refresh tip"
              >
                <RefreshCw size={12} />
              </button>
            )}
            {isFetching && (
              <RefreshCw size={12} className="text-muted-foreground animate-spin" />
            )}
          </div>
          <p className="text-sm text-foreground leading-relaxed">
            {displayedText}
            {!done && (
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                className="inline-block w-[2px] h-[14px] bg-foreground ml-0.5 align-middle"
              />
            )}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
