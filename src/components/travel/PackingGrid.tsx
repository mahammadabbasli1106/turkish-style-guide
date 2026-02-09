import { motion, AnimatePresence } from "framer-motion";
import { Shuffle, Sun, Moon, Plane as PlaneIcon, Footprints, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ClothingItem {
  id: string;
  name: string;
  category: string;
  color: string | null;
  image_url: string;
}

interface PackingList {
  daytime: ClothingItem[];
  evening: ClothingItem[];
  travel: ClothingItem[];
  shoes_outerwear: ClothingItem[];
}

interface SafetyStock {
  wildcard: number;
  lounge: number;
  extraUnderwear: number;
}

interface Props {
  packingList: PackingList;
  safetyStock: SafetyStock;
  totalItems: number;
  allItems: ClothingItem[];
  onShuffle: (category: keyof PackingList, itemIndex: number) => void;
}

const CATEGORIES: {
  key: keyof PackingList;
  emoji: string;
  labelKey: string;
  icon: typeof Sun;
}[] = [
  { key: "daytime", emoji: "🌞", labelKey: "travel.daytime", icon: Sun },
  { key: "evening", emoji: "🌙", labelKey: "travel.evening", icon: Moon },
  { key: "travel", emoji: "✈️", labelKey: "travel.travelLounge", icon: PlaneIcon },
  { key: "shoes_outerwear", emoji: "👟", labelKey: "travel.shoesOuterwear", icon: Footprints },
];

function ItemCard({
  item,
  onShuffle,
}: {
  item: ClothingItem;
  onShuffle: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-secondary rounded-xl overflow-hidden group relative"
    >
      <div className="aspect-square relative">
        <img
          src={item.image_url}
          alt={item.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <button
          onClick={onShuffle}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-card/90 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity active:scale-90 border border-border"
          title="Shuffle"
        >
          <Shuffle size={14} className="text-foreground" />
        </button>
      </div>
      <div className="p-2.5">
        <p className="text-xs font-medium text-foreground truncate">{item.name}</p>
        {item.color && (
          <p className="text-[10px] text-muted-foreground capitalize">{item.color}</p>
        )}
      </div>
    </motion.div>
  );
}

export default function PackingGrid({ packingList, safetyStock, totalItems, allItems, onShuffle }: Props) {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Summary */}
      <div className="bg-gradient-primary rounded-2xl p-4 text-primary-foreground shadow-warm">
        <p className="font-display text-lg font-bold">
          {t("travel.packingReady")} 🧳
        </p>
        <p className="text-sm text-primary-foreground/80">
          {totalItems} {t("travel.itemsPacked")}
        </p>
      </div>

      {/* Bento Grid Categories */}
      {CATEGORIES.map((cat) => {
        const items = packingList[cat.key];
        if (!items || items.length === 0) return null;

        return (
          <div key={cat.key} className="space-y-3">
            <h3 className="font-display text-base font-semibold text-foreground flex items-center gap-2">
              <span>{cat.emoji}</span>
              {t(cat.labelKey)}
              <span className="text-xs font-normal text-muted-foreground">
                ({items.length})
              </span>
            </h3>
            <div className="grid grid-cols-3 gap-2.5">
              <AnimatePresence mode="popLayout">
                {items.map((item, idx) => (
                  <ItemCard
                    key={`${cat.key}-${item.id}-${idx}`}
                    item={item}
                    onShuffle={() => onShuffle(cat.key, idx)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        );
      })}

      {/* Safety Stock Reminders */}
      <div className="bg-accent/15 rounded-2xl p-4 border border-accent/25 space-y-2">
        <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
          <AlertTriangle size={16} className="text-accent" />
          {t("travel.dontForget")}
        </h3>
        <ul className="text-xs text-muted-foreground space-y-1.5">
          {safetyStock.wildcard > 0 && (
            <li>✨ +{safetyStock.wildcard} {t("travel.wildcardItem")}</li>
          )}
          {safetyStock.lounge > 0 && (
            <li>🛋️ +{safetyStock.lounge} {t("travel.loungeOutfit")}</li>
          )}
          {safetyStock.extraUnderwear > 0 && (
            <li>🧦 +{safetyStock.extraUnderwear} {t("travel.extraUnderwear")}</li>
          )}
        </ul>
      </div>
    </motion.div>
  );
}
