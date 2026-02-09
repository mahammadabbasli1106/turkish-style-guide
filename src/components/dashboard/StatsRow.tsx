import { motion } from "framer-motion";
import { Shirt, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

type Props = {
  clothingCount: number;
  outfitCount: number;
};

export default function StatsRow({ clothingCount, outfitCount }: Props) {
  const { t } = useTranslation();

  const stats = [
    { label: t("dashboard.clothingItems"), value: clothingCount, icon: Shirt, gradient: true },
    { label: t("dashboard.outfitsCreated"), value: outfitCount, icon: Sparkles, gradient: false },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 + i * 0.05 }}
          className="bg-card rounded-2xl p-4 shadow-card border border-border"
        >
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${
              stat.gradient
                ? "bg-gradient-primary text-primary-foreground"
                : "bg-accent/20 text-accent"
            }`}
          >
            <stat.icon size={18} />
          </div>
          <p className="font-display text-2xl font-bold text-foreground">{stat.value}</p>
          <p className="text-xs text-muted-foreground">{stat.label}</p>
        </motion.div>
      ))}
    </div>
  );
}
