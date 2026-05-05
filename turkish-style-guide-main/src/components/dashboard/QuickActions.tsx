import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Shirt, Sparkles, ScanLine, Camera } from "lucide-react";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1 },
};

export default function QuickActions() {
  const { t } = useTranslation();

  const actions = [
    {
      to: "/dashboard/wardrobe",
      icon: Shirt,
      label: t("nav.wardrobe"),
      gradient: true,
    },
    {
      to: "/dashboard/suggest",
      icon: Sparkles,
      label: t("nav.suggest"),
      gradient: false,
    },
    {
      to: "/dashboard/try-on",
      icon: Camera,
      label: t("tryOn.title"),
      gradient: false,
    },
    {
      to: "/dashboard/instant-fit",
      icon: ScanLine,
      label: t("nav.instantFit"),
      gradient: false,
    },
  ];

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-4 gap-3"
    >
      {actions.map((action) => (
        <motion.div key={action.to} variants={item} whileTap={{ scale: 0.93 }} whileHover={{ scale: 1.08 }}>
          <Link to={action.to} className="flex flex-col items-center gap-2">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                action.gradient
                  ? "bg-gradient-primary text-primary-foreground shadow-warm"
                  : "bg-card border border-border text-foreground shadow-card"
              }`}
            >
              <action.icon size={24} />
            </div>
            <span className="text-xs font-medium text-muted-foreground text-center leading-tight">
              {action.label}
            </span>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
}
