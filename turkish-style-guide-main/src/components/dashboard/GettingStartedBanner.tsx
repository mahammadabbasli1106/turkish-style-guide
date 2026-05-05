import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, AlertTriangle } from "lucide-react";

interface Props {
  itemCount: number;
}

export default function GettingStartedBanner({ itemCount }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
    >
      <Link
        to="/dashboard/wardrobe"
        className="flex items-center gap-4 bg-warning/10 rounded-2xl p-4 border border-warning/30 active:scale-[0.98] transition-transform"
      >
        <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center shrink-0">
          <AlertTriangle size={20} className="text-warning" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground text-sm">
            Your wardrobe has {itemCount} {itemCount === 1 ? "item" : "items"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Add more for better suggestions
          </p>
        </div>
        <div className="flex items-center gap-1 text-warning text-xs font-semibold shrink-0">
          <Plus size={14} />
          Add clothing
        </div>
      </Link>
    </motion.div>
  );
}
