import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Flame, Lock, CheckCircle2, HelpCircle, Calendar } from "lucide-react";
import {
  REWARDS,
  getLevel,
  getCheckinsIntoLevel,
  getCheckinsToNextLevel,
  getProgressInLevel,
  getNextReward,
  calculateConsecutiveStreak,
} from "@/lib/streakRewards";

export default function StreakDetail() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const { data: checkins = [] } = useQuery({
    queryKey: ["streak-checkins-detail", user?.id],
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;

  const totalCheckins = checkins.length;
  const level = getLevel(totalCheckins);
  const intoLevel = getCheckinsIntoLevel(totalCheckins);
  const toNext = getCheckinsToNextLevel(totalCheckins);
  const progress = getProgressInLevel(totalCheckins);
  const nextReward = getNextReward(totalCheckins);

  const dateStrings = checkins.map((c: any) => c.checked_in_at || c.created_at);
  const consecutiveStreak = calculateConsecutiveStreak(dateStrings);

  // Build a Set of YYYY-MM-DD check-in dates for the calendar grid
  const checkinDates = new Set<string>(
    dateStrings.map((d: string) => {
      const dt = new Date(d);
      return `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`;
    })
  );

  // Build last 35 days calendar (5 weeks)
  const calendarDays: { date: Date; checked: boolean; isToday: boolean }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 34; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    calendarDays.push({
      date: d,
      checked: checkinDates.has(key),
      isToday: i === 0,
    });
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-muted transition"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="font-display text-lg font-semibold text-foreground">Style Streak</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Hero card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-6 text-center text-white"
          style={{
            background: "linear-gradient(135deg, #6C3FA0 0%, #8B5FBF 50%, #A078D1 100%)",
          }}
        >
          <div className="inline-flex items-center gap-2 bg-white/15 px-3 py-1 rounded-full mb-3">
            <Flame size={14} style={{ color: "#d4ff00" }} />
            <span className="text-xs font-semibold">
              {consecutiveStreak}-day streak
            </span>
          </div>
          <p className="text-sm text-white/80">Level</p>
          <h2 className="font-display text-5xl font-bold mt-1">{level}</h2>

          {/* XP bar */}
          <div className="mt-5">
            <div className="flex justify-between text-xs text-white/80 mb-1.5">
              <span>{intoLevel} / 10 check-ins</span>
              <span>Lv. {level + 1}</span>
            </div>
            <div className="h-2 bg-white/15 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ background: "#d4ff00" }}
              />
            </div>
          </div>

          {nextReward && (
            <p className="text-xs text-white/80 mt-4">
              {toNext} more check-in{toNext === 1 ? "" : "s"} → {nextReward.name} {nextReward.icon}
            </p>
          )}
        </motion.div>

        {/* Reward timeline */}
        <div className="bg-card rounded-2xl p-5 border border-border">
          <h3 className="font-display text-base font-semibold text-foreground mb-4">
            Rewards
          </h3>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-5 top-2 bottom-2 w-0.5 bg-border" />

            <div className="space-y-5">
              {REWARDS.map((reward) => {
                const unlocked = level >= reward.level;
                const isCurrent = level === reward.level;
                return (
                  <div key={reward.level} className="relative flex items-start gap-4">
                    <div
                      className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        unlocked
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      } ${isCurrent ? "ring-4 ring-primary/20" : ""}`}
                    >
                      {unlocked ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Lock className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-muted-foreground">
                          Lv. {reward.level}
                        </span>
                        <span className="text-lg">{reward.icon}</span>
                        <span
                          className={`font-semibold ${
                            unlocked ? "text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {reward.name}
                        </span>
                      </div>
                      <p
                        className={`text-xs mt-0.5 ${
                          unlocked ? "text-muted-foreground" : "text-muted-foreground/70"
                        }`}
                      >
                        {reward.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Calendar grid */}
        <div className="bg-card rounded-2xl p-5 border border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-base font-semibold text-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Last 5 weeks
            </h3>
            <span className="text-xs text-muted-foreground">
              {totalCheckins} total check-in{totalCheckins === 1 ? "" : "s"}
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={i} className="text-center text-[10px] font-semibold text-muted-foreground">
                {d}
              </div>
            ))}
            {calendarDays.map((day, i) => (
              <div
                key={i}
                className={`aspect-square rounded-md flex items-center justify-center text-[10px] font-medium ${
                  day.checked
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground/60"
                } ${day.isToday ? "ring-2 ring-primary ring-offset-1 ring-offset-card" : ""}`}
                title={day.date.toLocaleDateString()}
              >
                {day.date.getDate()}
              </div>
            ))}
          </div>
        </div>

        {/* How do I earn points */}
        <div className="bg-muted/40 rounded-2xl p-5 border border-border">
          <h3 className="font-semibold text-foreground flex items-center gap-2 mb-2">
            <HelpCircle className="h-4 w-4 text-primary" />
            How do I earn points?
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Getting an outfit suggestion or logging a worn outfit counts as a daily check-in.
            Keep your streak alive by checking in every day to unlock new rewards faster!
          </p>
        </div>
      </div>
    </div>
  );
}
