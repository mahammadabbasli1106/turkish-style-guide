import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Shirt, Sparkles, MessageCircle } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const fabActions = [
  { to: "/dashboard/wardrobe", icon: Shirt, labelKey: "fab.addClothing" },
  { to: "/dashboard/suggest", icon: Sparkles, labelKey: "fab.getOutfit" },
  { to: "/dashboard/chat", icon: MessageCircle, labelKey: "fab.chat" },
];

export default function FloatingActionButton() {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50">
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/40 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            {/* Actions */}
            <div className="absolute bottom-16 right-0 flex flex-col-reverse items-end gap-3">
              {fabActions.map((action, i) => (
                <motion.div
                  key={action.to}
                  initial={{ opacity: 0, scale: 0.5, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.5, y: 20 }}
                  transition={{ delay: i * 0.05, duration: 0.2 }}
                >
                  <Link
                    to={action.to}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3"
                  >
                    <span className="bg-card text-foreground text-xs font-medium px-3 py-1.5 rounded-lg shadow-card border border-border whitespace-nowrap">
                      {t(action.labelKey)}
                    </span>
                    <div className="w-11 h-11 rounded-full bg-card border border-border shadow-card flex items-center justify-center text-foreground">
                      <action.icon size={20} />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileTap={{ scale: 0.9 }}
        className="w-14 h-14 rounded-full bg-gradient-primary text-primary-foreground shadow-warm flex items-center justify-center relative z-10"
      >
        <motion.div
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {open ? <X size={24} /> : <Plus size={24} />}
        </motion.div>
      </motion.button>
    </div>
  );
}
