import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LayoutGrid, Shirt, Sparkles, ScanLine } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const AVATARS: Record<string, string> = {
  default: "https://api.dicebear.com/7.x/avataaars/svg?seed=default",
  cool: "https://api.dicebear.com/7.x/avataaars/svg?seed=cool",
  happy: "https://api.dicebear.com/7.x/avataaars/svg?seed=happy",
  style: "https://api.dicebear.com/7.x/avataaars/svg?seed=style",
  fashion: "https://api.dicebear.com/7.x/avataaars/svg?seed=fashion",
  chic: "https://api.dicebear.com/7.x/avataaars/svg?seed=chic",
  trendy: "https://api.dicebear.com/7.x/avataaars/svg?seed=trendy",
  classic: "https://api.dicebear.com/7.x/avataaars/svg?seed=classic",
  adventurer: "https://api.dicebear.com/7.x/avataaars/svg?seed=adventurer",
  bold: "https://api.dicebear.com/7.x/avataaars/svg?seed=bold",
  dreamer: "https://api.dicebear.com/7.x/avataaars/svg?seed=dreamer",
  rebel: "https://api.dicebear.com/7.x/avataaars/svg?seed=rebel",
};

type SideTab = {
  path: string;
  icon: typeof LayoutGrid;
  labelKey: string;
};

// Order on screen: Home · Wardrobe · [Outfit FAB] · Try-On · Profile
const leftTabs: SideTab[] = [
  { path: "/dashboard", icon: LayoutGrid, labelKey: "nav.dashboard" },
  { path: "/dashboard/wardrobe", icon: Shirt, labelKey: "nav.wardrobe" },
];

const rightTabs: SideTab[] = [
  { path: "/dashboard/instant-fit", icon: ScanLine, labelKey: "nav.instantFit" },
  // Profile is appended dynamically (uses avatar image)
];

export default function BottomTabBar() {
  const { t } = useTranslation();
  const location = useLocation();
  const { user } = useAuth();
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setKeyboardOpen(detail?.open ?? false);
    };
    window.addEventListener("keyboard-state", handler);
    return () => window.removeEventListener("keyboard-state", handler);
  }, []);

  const { data: profile } = useQuery({
    queryKey: ["profile-avatar", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("avatar_type")
        .eq("auth_id", user.id)
        .single();
      return data;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  const avatarType = profile?.avatar_type || "default";
  const avatarUrl = AVATARS[avatarType] || AVATARS.default;

  if (keyboardOpen) return null;

  const isActive = (path: string) => location.pathname === path;
  const centerActive = location.pathname === "/dashboard/suggest";

  const renderTab = (tab: SideTab) => {
    const active = isActive(tab.path);
    return (
      <Link
        key={tab.path}
        to={tab.path}
        className="relative flex-1 flex flex-col items-center gap-0.5 pt-1.5 pb-0.5"
      >
        {/* Top indicator pill */}
        {active && (
          <motion.span
            layoutId="bottom-nav-indicator"
            className="absolute -top-px left-1/2 -translate-x-1/2 h-[2.5px] w-5 rounded-full bg-primary"
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          />
        )}
        <motion.span
          whileTap={{ scale: 0.92 }}
          transition={{ type: "spring", stiffness: 400, damping: 18 }}
          className="inline-flex"
        >
          <tab.icon
            size={22}
            strokeWidth={active ? 2 : 1.7}
            className={`transition-colors duration-150 ${
              active ? "text-primary" : "text-muted-foreground"
            }`}
          />
        </motion.span>
        <span
          className={`text-[10px] font-bold tracking-tight leading-tight transition-colors duration-150 ${
            active ? "text-primary" : "text-muted-foreground"
          }`}
        >
          {t(tab.labelKey)}
        </span>
      </Link>
    );
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden pb-[env(safe-area-inset-bottom)] bg-card border-t border-border"
      aria-label="Primary"
    >
      <div className="relative mx-auto max-w-md flex items-start h-[62px] pt-1.5 px-1">
        {leftTabs.map(renderTab)}

        {/* Center FAB-style "Outfit" tab */}
        <Link
          to="/dashboard/suggest"
          className="relative flex-1 flex flex-col items-center gap-0.5 pt-1.5 pb-0.5"
          aria-label={t("nav.suggest")}
        >
          {centerActive && (
            <motion.span
              layoutId="bottom-nav-indicator"
              className="absolute -top-px left-1/2 -translate-x-1/2 h-[2.5px] w-5 rounded-full bg-primary"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
          <motion.div
            whileTap={{ scale: 0.92 }}
            transition={{ type: "spring", stiffness: 400, damping: 18 }}
            className="-mt-3.5 w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-[0_6px_14px_-4px_hsl(var(--primary)/0.55)] ring-4 ring-card"
          >
            <Sparkles size={20} className="fill-primary-foreground" />
          </motion.div>
          <span
            className={`mt-0.5 text-[10px] font-bold tracking-tight leading-tight ${
              centerActive ? "text-primary" : "text-primary"
            }`}
          >
            {t("nav.suggest")}
          </span>
        </Link>

        {rightTabs.map(renderTab)}

        {/* Profile tab (uses avatar image) */}
        {(() => {
          const active = isActive("/dashboard/settings");
          return (
            <Link
              to="/dashboard/settings"
              className="relative flex-1 flex flex-col items-center gap-0.5 pt-1.5 pb-0.5"
              aria-label={t("nav.profile")}
            >
              {active && (
                <motion.span
                  layoutId="bottom-nav-indicator"
                  className="absolute -top-px left-1/2 -translate-x-1/2 h-[2.5px] w-5 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <motion.img
                whileTap={{ scale: 0.92 }}
                src={avatarUrl}
                alt=""
                className={`w-[22px] h-[22px] rounded-full object-cover transition-all duration-150 ${
                  active ? "ring-2 ring-primary ring-offset-1 ring-offset-card" : "opacity-80"
                }`}
              />
              <span
                className={`text-[10px] font-bold tracking-tight leading-tight transition-colors duration-150 ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {t("nav.profile")}
              </span>
            </Link>
          );
        })()}
      </div>
    </nav>
  );
}
