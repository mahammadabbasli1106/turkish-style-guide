import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { TrendingUp, Camera, ChevronRight } from "lucide-react";

export default function ActionCards() {
  const { t } = useTranslation();

  const cards = [
    {
      to: "/dashboard/suggest",
      icon: TrendingUp,
      title: t("dashboard.getOutfit"),
      desc: t("dashboard.outfitDesc"),
      iconColor: "text-primary",
    },
    {
      to: "/dashboard/try-on",
      icon: Camera,
      title: t("tryOn.title"),
      desc: t("tryOn.subtitle"),
      iconColor: "text-accent",
    },
  ];

  return (
    <div className="space-y-3">
      {cards.map((card, i) => (
        <motion.div
          key={card.to}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 + i * 0.05 }}
        >
          <Link
            to={card.to}
            className="flex items-center gap-4 bg-card rounded-2xl p-4 border border-border shadow-card active:scale-[0.98] transition-transform"
          >
            <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center shrink-0">
              <card.icon size={22} className={card.iconColor} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-sm">{card.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{card.desc}</p>
            </div>
            <ChevronRight size={18} className="text-muted-foreground shrink-0" />
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
