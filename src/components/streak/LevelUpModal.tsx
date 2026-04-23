import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { Reward } from "@/lib/streakRewards";

interface Props {
  open: boolean;
  level: number;
  reward: Reward;
  onClose: () => void;
}

export default function LevelUpModal({ open, level, reward, onClose }: Props) {
  useEffect(() => {
    if (!open) return;

    // Multi-burst confetti celebration
    const fire = (angle: number, originX: number) => {
      confetti({
        particleCount: 60,
        spread: 70,
        angle,
        origin: { x: originX, y: 0.6 },
        colors: ["#8A70D6", "#d4ff00", "#FFD700", "#FF6B9D", "#A078D1"],
      });
    };

    fire(60, 0.1);
    fire(120, 0.9);
    setTimeout(() => fire(90, 0.5), 250);
    setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 100,
        origin: { y: 0.5 },
        colors: ["#8A70D6", "#d4ff00", "#FFD700"],
      });
    }, 500);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", damping: 18, stiffness: 200 }}
            className="relative max-w-sm w-full bg-card rounded-3xl p-8 shadow-2xl text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <motion.p
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-xs font-semibold uppercase tracking-wider text-primary"
            >
              Level Up!
            </motion.p>

            <motion.h2
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, type: "spring", damping: 12 }}
              className="font-display text-4xl font-bold text-foreground mt-2"
            >
              Level {level}
            </motion.h2>

            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.5, type: "spring", damping: 10 }}
              className="text-7xl my-6"
            >
              {reward.icon}
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                New reward unlocked
              </p>
              <h3 className="font-display text-2xl font-bold text-foreground">{reward.name}</h3>
              <p className="text-sm text-muted-foreground mt-2">{reward.description}</p>
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="mt-8"
            >
              <Button
                onClick={onClose}
                className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-semibold"
              >
                Awesome!
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
