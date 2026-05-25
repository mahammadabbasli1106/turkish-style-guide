import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Share2, Camera, Bookmark, Loader2, Check, Sparkles } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toPng } from "html-to-image";
import ShareCard from "@/components/outfit/ShareCard";

type OutfitItem = {
  id: string;
  name: string;
  category: string;
  color: string | null;
  image_url: string;
};

type OutfitSuggestion = {
  id: string;
  items: Partial<Record<"upper_body" | "lower_body" | "outerwear" | "footwear" | "accessory", OutfitItem>>;
  weather: {
    location: string;
    temperature: number;
    feelsLike?: number;
    description: string;
    isRaining?: boolean;
  };
  reasoning: string;
  style: string;
  occasion: string;
  venue?: string;
  venueAnalysis?: string;
  is_favorite?: boolean;
};

const CATEGORY_LABELS: Record<string, string> = {
  upper_body: "Upper body",
  lower_body: "Lower body",
  outerwear: "Outerwear",
  footwear: "Footwear",
  accessory: "Accessory",
};

const SHORT_LABELS: Record<string, string> = {
  upper_body: "Top",
  lower_body: "Bottom",
  outerwear: "Outer",
  footwear: "Shoes",
  accessory: "Accent",
};

export default function OutfitResult() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const suggestion = location.state?.suggestion as OutfitSuggestion | undefined;
  const [saved, setSaved] = useState(false);
  const [sharing, setSharing] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);

  // Mark viewed
  useEffect(() => {
    if (suggestion?.id) {
      supabase
        .from("outfit_suggestions")
        .update({ viewed_at: new Date().toISOString() })
        .eq("id", suggestion.id)
        .then(() => {});
    }
  }, [suggestion?.id]);

  const saveFavoriteMutation = useMutation({
    mutationFn: async () => {
      if (!suggestion) throw new Error("No outfit");
      const { error } = await supabase
        .from("outfit_suggestions")
        .update({ is_favorite: true })
        .eq("id", suggestion.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setSaved(true);
      toast.success("Outfit saved to favorites");
    },
    onError: () => {
      toast.error("Couldn't save outfit. Try again.");
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!suggestion) return <Navigate to="/dashboard/suggest" replace />;

  const itemList = (Object.entries(suggestion.items) as [string, OutfitItem][])
    .filter(([, v]) => !!v)
    .map(([cat, item]) => ({ cat, ...item }));

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const contextLine = [
    suggestion.occasion ? capitalize(suggestion.occasion) : null,
    suggestion.venue || suggestion.weather?.location,
    dateLabel,
  ]
    .filter(Boolean)
    .join(" · ");

  const handleShare = async () => {
    if (!shareCardRef.current) return;
    setSharing(true);
    try {
      const dataUrl = await toPng(shareCardRef.current, {
        cacheBust: true,
        pixelRatio: 1,
        skipFonts: true,
      });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `tarzly-outfit-${Date.now()}.png`, {
        type: "image/png",
      });

      // Try native share with file (works for IG Stories / WhatsApp on mobile)
      if (
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          files: [file],
          title: "My outfit by tarzly.ai",
          text: "Styled by tarzly.ai",
        });
      } else {
        // Fallback: download
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = file.name;
        link.click();
        toast.success("Outfit card saved to your device");
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        console.error("Share error:", err);
        toast.error("Couldn't share outfit. Try again.");
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header — round buttons in mockup */}
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-xl">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-card border border-border shadow-card hover:bg-secondary transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5 text-primary" />
          </button>
          <div className="text-base font-semibold text-foreground">Today's outfit</div>
          <button
            onClick={handleShare}
            disabled={sharing}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-card border border-border shadow-card hover:bg-secondary transition-colors disabled:opacity-50"
            aria-label="Share"
          >
            {sharing ? (
              <Loader2 className="h-5 w-5 text-primary animate-spin" />
            ) : (
              <Share2 className="h-5 w-5 text-primary" />
            )}
          </button>
        </div>
      </header>

      <motion.main
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-lg mx-auto px-4 pt-2 space-y-5"
      >
        {/* Context line */}
        <p className="text-sm text-muted-foreground text-center">{contextLine}</p>

        {/* AI Stylist reasoning card with purple left border */}
        {suggestion.reasoning && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl p-5 bg-primary/5 border border-primary/15 border-l-[5px] border-l-primary"
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold tracking-[0.15em] text-primary uppercase">
                AI Stylist
              </span>
            </div>
            <p className="text-sm leading-relaxed text-foreground">
              {suggestion.reasoning}
            </p>
            {suggestion.venueAnalysis && (
              <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-primary/15">
                {suggestion.venueAnalysis}
              </p>
            )}
          </motion.div>
        )}

        {/* Section header */}
        <div className="pt-1">
          <p className="text-[11px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
            Your outfit — {itemList.length} {itemList.length === 1 ? "piece" : "pieces"}
          </p>
        </div>

        {/* Item list — single white card with dividers */}
        <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
          {itemList.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className={`flex items-center gap-4 p-4 ${
                i < itemList.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-secondary flex-shrink-0">
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.opacity = "0.3";
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-foreground truncate">
                  {item.name}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                  {item.cat.replace("_", " ")}
                </p>
              </div>
              <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary shrink-0">
                {SHORT_LABELS[item.cat] || CATEGORY_LABELS[item.cat] || item.cat}
              </span>
            </motion.div>
          ))}
        </div>

        {/* CTAs */}
        <div className="space-y-3 pt-2">
          <Button
            onClick={() => navigate("/dashboard/try-on", { state: { suggestion } })}
            className="w-full h-12 bg-card border border-border text-foreground hover:bg-secondary font-semibold"
            variant="outline"
            size="lg"
          >
            <Camera className="mr-2 h-5 w-5 text-primary" />
            Virtual Try-On
          </Button>
          <Button
            onClick={() => saveFavoriteMutation.mutate()}
            disabled={saved || saveFavoriteMutation.isPending}
            variant="outline"
            className="w-full h-12 font-semibold"
            size="lg"
          >
            {saved ? (
              <>
                <Check className="mr-2 h-5 w-5" /> Saved
              </>
            ) : saveFavoriteMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Bookmark className="mr-2 h-5 w-5 text-primary" /> Save outfit
              </>
            )}
          </Button>
        </div>
      </motion.main>

      {/* Off-screen share card for export */}
      <div
        style={{
          position: "fixed",
          left: -10000,
          top: 0,
          pointerEvents: "none",
          opacity: 0,
        }}
        aria-hidden
      >
        <ShareCard
          ref={shareCardRef}
          items={itemList.map((i) => ({
            name: i.name,
            category: i.cat,
            image_url: i.image_url,
          }))}
          occasion={suggestion.occasion}
          venue={suggestion.venue}
          weather={suggestion.weather}
        />
      </div>
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
