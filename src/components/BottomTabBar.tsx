import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Home, Shirt, Sparkles, MessageCircle, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const tabs = [
  { path: "/dashboard", icon: Home, labelKey: "nav.dashboard" },
  { path: "/dashboard/wardrobe", icon: Shirt, labelKey: "nav.wardrobe" },
  { path: "/dashboard/suggest", icon: Sparkles, labelKey: "nav.suggest" },
  { path: "/dashboard/chat", icon: MessageCircle, labelKey: "nav.chat" },
  { path: "/dashboard/settings", icon: Settings, labelKey: "nav.settings" },
];

export default function BottomTabBar() {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-[env(safe-area-inset-bottom)] lg:hidden pointer-events-none">
      <div className="mx-4 mb-4 flex items-center justify-around h-16 w-full max-w-md bg-card/70 dark:bg-card/60 backdrop-blur-xl border border-border/40 rounded-3xl shadow-xl pointer-events-auto px-2">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className="flex flex-col items-center gap-0.5 min-w-[56px] relative"
            >
              <motion.div
                className="relative flex items-center justify-center w-10 h-8 rounded-2xl"
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      layoutId="tab-pill"
                      className="absolute inset-0 bg-primary/10 rounded-2xl"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    />
                  )}
                </AnimatePresence>
                <tab.icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 1.5}
                  className={`relative z-10 transition-colors duration-200 ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                  fill={isActive ? "currentColor" : "none"}
                />
              </motion.div>
              <span
                className={`text-[10px] leading-tight transition-colors duration-200 ${
                  isActive
                    ? "font-semibold text-primary"
                    : "font-medium text-muted-foreground"
                }`}
              >
                {t(tab.labelKey)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
