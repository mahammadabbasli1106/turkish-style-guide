import { motion } from "framer-motion";
import { Menu, X, Globe } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitch from "@/components/LanguageSwitch";

const Navbar = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border"
    >
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <a href="#" className="font-display text-2xl font-bold tracking-tight text-gradient">
          tarzly.ai
        </a>

        <div className="hidden md:flex items-center gap-8">
          <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            How It Works
          </a>
          <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Features
          </a>
          <a href="#showcase" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Showcase
          </a>
          <LanguageSwitch />
          <Link to="/auth" className="bg-gradient-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-semibold shadow-warm hover:opacity-90 transition-opacity">
            {t("hero.cta")}
          </Link>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <LanguageSwitch />
          <button
            className="text-foreground"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="md:hidden border-t border-border bg-background/95 backdrop-blur-md"
        >
          <div className="px-6 py-4 flex flex-col gap-4">
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground" onClick={() => setIsOpen(false)}>How It Works</a>
            <a href="#features" className="text-sm font-medium text-muted-foreground" onClick={() => setIsOpen(false)}>Features</a>
            <a href="#showcase" className="text-sm font-medium text-muted-foreground" onClick={() => setIsOpen(false)}>Showcase</a>
            <Link to="/auth" onClick={() => setIsOpen(false)} className="bg-gradient-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-semibold text-center">
              {t("hero.cta")}
            </Link>
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
};

export default Navbar;
