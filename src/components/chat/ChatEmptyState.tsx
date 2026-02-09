import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Bot, Sparkles } from "lucide-react";

type Props = {
  onPromptClick: (prompt: string) => void;
};

const quickPrompts = [
  "What should I wear today?",
  "Suggest a date night outfit",
  "What goes with my jeans?",
];

export default function ChatEmptyState({ onPromptClick }: Props) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-6 py-12">
      <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-warm">
        <Bot size={32} className="text-primary-foreground" />
      </div>
      <div>
        <h2 className="font-display text-xl font-bold text-foreground">
          {t("chat.title")}
        </h2>
        <p className="text-muted-foreground text-sm mt-1 max-w-xs">
          {t("chat.subtitle")}
        </p>
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
        {quickPrompts.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onPromptClick(prompt)}
            className="text-xs bg-card border border-border rounded-full px-4 py-2 text-foreground hover:bg-secondary transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>
      <Link
        to="/dashboard/suggest"
        className="inline-flex items-center gap-2 bg-gradient-primary text-primary-foreground rounded-full px-6 py-3 font-semibold text-sm shadow-warm active:scale-95 transition-transform"
      >
        <Sparkles size={18} />
        {t("dashboard.getOutfit")}
      </Link>
    </div>
  );
}
