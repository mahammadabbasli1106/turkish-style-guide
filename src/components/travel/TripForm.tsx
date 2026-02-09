import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { MapPin, Calendar, Briefcase, PartyPopper, Shirt, SlidersHorizontal, Plane } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";

type PackingStyle = "minimalist" | "comfort" | "fashionista";
type TripVibe = "business" | "casual" | "party";

interface TripFormData {
  destination: string;
  dateRange: DateRange | undefined;
  vibe: TripVibe;
  packingStyle: PackingStyle;
}

interface Props {
  onSubmit: (data: TripFormData) => void;
  isLoading: boolean;
}

const VIBES: { value: TripVibe; label: string; icon: typeof Briefcase; emoji: string }[] = [
  { value: "business", label: "Business", icon: Briefcase, emoji: "💼" },
  { value: "casual", label: "Casual", icon: Shirt, emoji: "😎" },
  { value: "party", label: "Party / Night Out", icon: PartyPopper, emoji: "🎉" },
];

const PACKING_LABELS: Record<number, { label: string; style: PackingStyle; desc: string }> = {
  0: { label: "Minimalist", style: "minimalist", desc: "Essentials only" },
  1: { label: "Comfort", style: "comfort", desc: "Essentials + 20% options" },
  2: { label: "Fashionista", style: "fashionista", desc: "Max options, multiple outfits/day" },
};

export default function TripForm({ onSubmit, isLoading }: Props) {
  const { t } = useTranslation();
  const [destination, setDestination] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [vibe, setVibe] = useState<TripVibe>("casual");
  const [packingSlider, setPackingSlider] = useState([1]);

  const packingInfo = PACKING_LABELS[packingSlider[0]];

  const handleSubmit = () => {
    if (!destination.trim()) return;
    onSubmit({
      destination: destination.trim(),
      dateRange,
      vibe,
      packingStyle: packingInfo.style,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl p-5 shadow-card border border-border space-y-5"
    >
      {/* Destination */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <MapPin size={16} className="text-primary" />
          {t("travel.destination")}
        </Label>
        <Input
          placeholder={t("travel.destinationPlaceholder")}
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          maxLength={100}
        />
      </div>

      {/* Date Range */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <Calendar size={16} className="text-primary" />
          {t("travel.dates")}
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !dateRange?.from && "text-muted-foreground"
              )}
            >
              {dateRange?.from ? (
                dateRange.to ? (
                  `${format(dateRange.from, "MMM d")} – ${format(dateRange.to, "MMM d, yyyy")}`
                ) : (
                  format(dateRange.from, "MMM d, yyyy")
                )
              ) : (
                t("travel.selectDates")
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarUI
              mode="range"
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={1}
              disabled={(date) => date < new Date()}
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Trip Vibe */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">{t("travel.vibe")}</Label>
        <div className="grid grid-cols-3 gap-2">
          {VIBES.map((v) => (
            <button
              key={v.value}
              onClick={() => setVibe(v.value)}
              className={cn(
                "flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-center",
                vibe === v.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/50"
              )}
            >
              <span className="text-xl">{v.emoji}</span>
              <span className="text-xs font-medium">{v.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Packing Style Slider */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <SlidersHorizontal size={16} className="text-primary" />
          {t("travel.packingStyle")}
        </Label>
        <div className="px-2">
          <Slider
            value={packingSlider}
            onValueChange={setPackingSlider}
            min={0}
            max={2}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between mt-2">
            <span className="text-[10px] text-muted-foreground">Minimalist</span>
            <span className="text-[10px] text-muted-foreground">Comfort</span>
            <span className="text-[10px] text-muted-foreground">Fashionista</span>
          </div>
        </div>
        <div className="bg-secondary/50 rounded-lg px-3 py-2 text-center">
          <p className="text-sm font-semibold text-foreground">{packingInfo.label}</p>
          <p className="text-xs text-muted-foreground">{packingInfo.desc}</p>
        </div>
      </div>

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={!destination.trim() || isLoading}
        className="w-full bg-gradient-primary text-primary-foreground shadow-warm"
        size="lg"
      >
        <Plane className="mr-2 h-5 w-5" />
        {isLoading ? t("common.loading") : t("travel.generatePacking")}
      </Button>
    </motion.div>
  );
}
