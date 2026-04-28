import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import LanguageSwitch from "@/components/LanguageSwitch";
import BottomTabBar from "@/components/BottomTabBar";
import DarkModeToggle from "@/components/DarkModeToggle";
import { motion } from "framer-motion";
import tarzlyIcon from "@/assets/tarzly-icon.png";
import { 
  Home, 
  Shirt, 
  Sparkles, 
  History, 
  Camera,
  LogOut,
  Settings
} from "lucide-react";
import { toast } from "@/components/ui/sonner";

type Props = {
  children: ReactNode;
};

export default function DashboardLayout({ children }: Props) {
  const { t } = useTranslation();
  const { signOut, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: "/dashboard", icon: Home, label: t("nav.dashboard") },
    { path: "/dashboard/wardrobe", icon: Shirt, label: t("nav.wardrobe") },
    { path: "/dashboard/suggest", icon: Sparkles, label: t("nav.suggest") },
    { path: "/dashboard/try-on", icon: Camera, label: t("nav.tryOn") },
    { path: "/dashboard/history", icon: History, label: t("nav.history") },
    { path: "/dashboard/settings", icon: Settings, label: t("nav.settings") },
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out successfully");
      navigate("/");
    } catch {
      toast.error("Failed to sign out");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
       <header className="lg:hidden sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <Link to="/dashboard" className="flex items-center gap-2 min-w-0">
              <img src={tarzlyIcon} alt="" className="w-8 h-8 rounded-lg shrink-0" />
              <span className="font-display text-lg font-bold text-gradient truncate">tarzly.ai</span>
            </Link>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="flex items-center gap-1"
          >
            <DarkModeToggle />
            <LanguageSwitch />
          </motion.div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-card border-r border-border p-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <Link to="/dashboard" className="font-display text-2xl font-bold text-gradient mb-8 block">
              tarzly.ai
            </Link>
          </motion.div>

          <nav className="flex-1 space-y-2">
            {navItems.map((item, i) => {
              const isActive = location.pathname === item.path;
              return (
                <motion.div
                  key={item.path}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 * i, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                  <Link
                    to={item.path}
                    className={`group flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-300 ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-secondary"
                    }`}
                  >
                    <motion.span
                      whileHover={{ scale: 1.12 }}
                      transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
                      className={`inline-flex transition-colors duration-300 ${
                        !isActive ? "group-hover:text-primary" : ""
                      }`}
                    >
                      <item.icon size={20} />
                    </motion.span>
                    {item.label}
                  </Link>
                </motion.div>
              );
            })}
          </nav>

          <div className="pt-6 border-t border-border space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground truncate max-w-[120px]">
                {user?.email}
              </span>
              <div className="flex items-center gap-1">
                <DarkModeToggle />
                <LanguageSwitch />
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleSignOut}
            >
              <LogOut size={20} className="mr-3" />
              {t("nav.signOut")}
            </Button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 w-full p-4 lg:p-8 pb-24 lg:pb-8 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* Bottom tab bar for mobile */}
      <BottomTabBar />
    </div>
  );
}
