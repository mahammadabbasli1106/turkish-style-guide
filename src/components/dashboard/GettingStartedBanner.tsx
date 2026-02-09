import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function GettingStartedBanner() {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
    >
      <Link
        to="/dashboard/wardrobe"
        className="flex items-center gap-4 bg-accent/15 rounded-2xl p-4 border border-accent/25 active:scale-[0.98] transition-transform"
      >
        <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center shrink-0">
          <Plus size={20} className="text-accent" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-foreground text-sm">🎯 {t("dashboard.manageWardrobe")}</p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {t("dashboard.wardrobeDesc")}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}
