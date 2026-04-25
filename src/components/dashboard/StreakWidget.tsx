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

  const radius = 13;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <Link to="/dashboard/streak" className="h-full block active:scale-[0.98] transition-transform">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="h-full rounded-2xl p-3 flex flex-col justify-between bg-primary text-primary-foreground"
      >
        {/* Top row: ring + label */}
        <div className="flex items-center gap-2">
          <div className="relative w-9 h-9 shrink-0">
            <svg width="36" height="36" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.18)"
                strokeWidth="4"
              />
              <motion.circle
                cx="18"
                cy="18"
                r={radius}
                fill="none"
                stroke="#c8b8ff"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                transform="rotate(-90 18 18)"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-display text-[12px] font-extrabold leading-none">
                {consecutiveStreak}
              </span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <Flame size={11} className="text-primary-foreground/85" />
              <p className="text-[11px] font-extrabold leading-none truncate">Style Streak</p>
            </div>
            <p className="text-[10px] text-primary-foreground/55 mt-1 leading-none truncate">
              Lv.{level} · {consecutiveStreak} day{consecutiveStreak === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {/* Bottom: next reward pill */}
        <div className="rounded-[9px] bg-primary-foreground/[0.12] px-2 py-1.5">
          {nextReward ? (
            <>
              <p className="text-[8px] text-primary-foreground/55 font-semibold leading-none">
                {toNext} more → unlock
              </p>
              <p className="text-[10px] font-extrabold mt-1 leading-tight line-clamp-2">
                {nextReward.name}
              </p>
            </>
          ) : (
            <p className="text-[10px] font-extrabold leading-tight">
              All rewards unlocked! 🎉
            </p>
          )}
        </div>
      </motion.div>
    </Link>
  );
}
