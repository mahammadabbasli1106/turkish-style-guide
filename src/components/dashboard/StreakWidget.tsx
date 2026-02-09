import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Flame } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

function calculateStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const sorted = dates
    .map((d) => new Date(d))
    .sort((a, b) => b.getTime() - a.getTime());

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const mostRecent = new Date(sorted[0]);
  mostRecent.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((today.getTime() - mostRecent.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays > 1) return 0;

  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    prev.setHours(0, 0, 0, 0);
    curr.setHours(0, 0, 0, 0);
    const gap = Math.floor((prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24));
    if (gap === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function getLevel(streak: number) {
  return Math.floor(streak / 7) + 1;
}

function getProgressInLevel(streak: number) {
  return (streak % 7) / 7;
}

export default function StreakWidget() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const { data: streak = 0, isLoading } = useQuery({
    queryKey: ["style-streak", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { data, error } = await supabase
        .from("style_checkins")
        .select("checked_in_at")
        .eq("user_id", user.id)
        .order("checked_in_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      return calculateStreak((data || []).map((r) => r.checked_in_at));
    },
    enabled: !!user,
  });

  if (isLoading) {
    return <Skeleton className="h-full w-full rounded-2xl" />;
  }

  const progress = getProgressInLevel(streak);
  const level = getLevel(streak);
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="h-full rounded-2xl p-4 flex flex-col items-center justify-between"
      style={{
        background: "linear-gradient(135deg, #1a1a1a 0%, #2a2a1a 50%, #1a2a1a 100%)",
      }}
    >
      {/* Circular progress */}
      <div className="relative flex items-center justify-center">
        <svg width="88" height="88" viewBox="0 0 88 88">
          <circle
            cx="44"
            cy="44"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="6"
          />
          <motion.circle
            cx="44"
            cy="44"
            r={radius}
            fill="none"
            stroke="#d4ff00"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
            transform="rotate(-90 44 44)"
          />
        </svg>
        <span className="absolute font-display text-2xl font-bold text-white">
          {streak}
        </span>
      </div>

      {/* Label */}
      <div className="flex items-center gap-1 mt-1">
        <Flame size={14} style={{ color: "#d4ff00" }} />
        <span className="text-xs font-semibold text-white">
          {t("dashboard.streakLabel")}
        </span>
      </div>
      <span className="text-[10px] text-white/70">
        Lv.{level} · {Math.round(progress * 100)}%
      </span>
    </motion.div>
  );
}
