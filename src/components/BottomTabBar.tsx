import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Home, Shirt, Sparkles, MessageCircle, Settings } from "lucide-react";

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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors min-w-[56px] ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground active:text-foreground"
              }`}
            >
              <tab.icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className={`text-[10px] leading-tight ${isActive ? "font-semibold" : "font-medium"}`}>
                {t(tab.labelKey)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
