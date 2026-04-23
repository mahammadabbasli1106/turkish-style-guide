import { motion } from "framer-motion";
import AnimatedCounter from "./AnimatedCounter";

type Props = {
  clothingCount: number;
  outfitCount: number;
};

/**
 * Stacked vertical stats — used on the right side of the dashboard
 * next to the StreakWidget. Matches the mockup with two big number cards.
 */
export default function StatsStack({ clothingCount, outfitCount }: Props) {
  const stats = [
    { value: clothingCount, label: "items" },
    { value: outfitCount, label: "outfits" },
  ];

  return (
    <div className="flex flex-col gap-3 h-full">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 + i * 0.05 }}
          className="flex-1 bg-card rounded-2xl border border-border shadow-card flex flex-col items-center justify-center"
        >
          <p className="font-display text-3xl font-bold text-foreground leading-none">
            <AnimatedCounter value={stat.value} />
          </p>
          <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
        </motion.div>
      ))}
    </div>
  );
}
