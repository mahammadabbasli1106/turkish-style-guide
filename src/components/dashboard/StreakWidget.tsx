import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Flame } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getLevel,
  getProgressInLevel,
  getCheckinsToNextLevel,
  getNextReward,
  calculateConsecutiveStreak,
} from "@/lib/streakRewards";

export default function StreakWidget() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const { data: checkins = [], isLoading } = useQuery({
    queryKey: ["streak-checkins", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("style_checkins")
        .select("checked_in_at, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  if (isLoading) {
    return <Skeleton className="h-full w-full rounded-2xl" />;
  }

  const totalCheckins = checkins.length;
  const dateStrings = checkins.map((c: any) => c.checked_in_at || c.created_at);
  const consecutiveStreak = calculateConsecutiveStreak(dateStrings);
  const progress = getProgressInLevel(totalCheckins);
  const level = getLevel(totalCheckins);
  const toNext = getCheckinsToNextLevel(totalCheckins);
  const nextReward = getNextReward(totalCheckins);

  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <Link to="/dashboard/streak" className="h-full block active:scale-[0.98] transition-transform">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="h-full rounded-2xl p-3 flex flex-col items-center justify-between text-center"
        style={{
          background: "linear-gradient(135deg, #6C3FA0 0%, #8B5FBF 50%, #A078D1 100%)",
        }}
      >
        {/* Circular progress */}
        <div className="relative flex items-center justify-center">
          <svg width="76" height="76" viewBox="0 0 76 76">
            <circle
              cx="38"
              cy="38"
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="5"
            />
            <motion.circle
              cx="38"
              cy="38"
              r={radius}
              fill="none"
              stroke="#d4ff00"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
              transform="rotate(-90 38 38)"
            />
          </svg>
          <div className="absolute flex flex-col items-center leading-none">
            <span className="font-display text-xl font-bold text-white">
              {consecutiveStreak}
            </span>
            <span className="text-[8px] text-white/80 font-semibold">DAY</span>
          </div>
        </div>

        {/* Label + level */}
        <div className="flex items-center gap-1">
          <Flame size={12} style={{ color: "#d4ff00" }} />
          <span className="text-[11px] font-semibold text-white">Lv.{level}</span>
        </div>

        {/* Next reward hint */}
        {nextReward ? (
          <p className="text-[9px] text-white/85 leading-tight px-1 line-clamp-2">
            {toNext} more → {nextReward.name}
          </p>
        ) : (
          <p className="text-[9px] text-white/85 leading-tight">All rewards unlocked! 🎉</p>
        )}
      </motion.div>
    </Link>
  );
}
