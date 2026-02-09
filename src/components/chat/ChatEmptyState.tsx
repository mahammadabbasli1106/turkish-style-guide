import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Bot, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";

type Props = {
  onPromptClick: (prompt: string) => void;
};

function useWeatherCondition() {
  const { user } = useAuth();
  const { data: prefs } = useQuery({
    queryKey: ["user-preferences", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("user_preferences")
        .select("default_location")
        .eq("user_id", user.id)
        .single();
      return data;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 10,
  });
  return prefs?.default_location || null;
}

function getTimeBasedChips(t: (k: string) => string): { emoji: string; label: string; prompt: string }[] {
  const hour = new Date().getHours();
  const chips: { emoji: string; label: string; prompt: string }[] = [];

  if (hour < 12) {
    chips.push({ emoji: "☀️", label: t("chat.chipMorning"), prompt: t("chat.chipMorningPrompt") });
  } else if (hour >= 18) {
    chips.push({ emoji: "🌙", label: t("chat.chipEvening"), prompt: t("chat.chipEveningPrompt") });
  }

  chips.push(
    { emoji: "💼", label: t("chat.chipWork"), prompt: t("chat.chipWorkPrompt") },
    { emoji: "📅", label: t("chat.chipDate"), prompt: t("chat.chipDatePrompt") },
    { emoji: "🏋️", label: t("chat.chipGym"), prompt: t("chat.chipGymPrompt") },
  );

  return chips.slice(0, 4);
}

export default function ChatEmptyState({ onPromptClick }: Props) {
  const { t } = useTranslation();
  const chips = getTimeBasedChips(t);

  return (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-6 py-12 px-4">
      <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-warm">
        <Bot size={32} className="text-primary-foreground" />
      </div>
      <div>
        <h2 className="font-display text-xl font-bold text-foreground">
          {t("chat.title")}
        </h2>
        <p className="text-muted-foreground text-sm mt-1 max-w-xs mx-auto">
          {t("chat.subtitle")}
        </p>
      </div>

      {/* Context-aware chips */}
      <div className="flex flex-wrap gap-2 justify-center">
        {chips.map((chip) => (
          <button
            key={chip.label}
            onClick={() => onPromptClick(chip.prompt)}
            className="text-xs bg-card border border-border rounded-full px-4 py-2.5 text-foreground hover:bg-secondary hover:border-primary/30 transition-all active:scale-95"
          >
            <span className="mr-1.5">{chip.emoji}</span>
            {chip.label}
          </button>
        ))}
      </div>

      <Link
        to="/dashboard/suggest"
        className="inline-flex items-center gap-2 bg-gradient-primary text-primary-foreground rounded-full px-6 py-3 font-semibold text-sm shadow-warm active:scale-95 transition-transform mt-2"
      >
        <Sparkles size={18} />
        {t("dashboard.getOutfit")}
      </Link>
    </div>
  );
}
