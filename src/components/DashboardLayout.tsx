import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import LanguageSwitch from "@/components/LanguageSwitch";
import { 
  Home, 
  Shirt, 
  Sparkles, 
  History, 
  Camera,
  LogOut,
  Menu,
  X,
  Settings
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Props = {
  children: ReactNode;
};

export default function DashboardLayout({ children }: Props) {
  const { t } = useTranslation();
  const { signOut, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    } catch (error) {
      toast.error("Failed to sign out");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <header className="lg:hidden sticky top-0 z-50 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <Link to="/dashboard" className="font-display text-xl font-bold text-gradient">
            StyleAI
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitch />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <motion.nav
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute left-0 right-0 top-full bg-card border-b border-border py-4 px-4 shadow-lg"
          >
            <div className="space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    location.pathname === item.path
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-secondary"
                  }`}
                >
                  <item.icon size={20} />
                  {item.label}
                </Link>
              ))}
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut size={20} />
                {t("nav.signOut")}
              </button>
            </div>
          </motion.nav>
        )}
      </header>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-card border-r border-border p-6">
          <Link to="/dashboard" className="font-display text-2xl font-bold text-gradient mb-8">
            StyleAI
          </Link>

          <nav className="flex-1 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  location.pathname === item.path
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-secondary"
                }`}
              >
                <item.icon size={20} />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="pt-6 border-t border-border space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground truncate max-w-[140px]">
                {user?.email}
              </span>
              <LanguageSwitch />
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
        <main className="flex-1 p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
