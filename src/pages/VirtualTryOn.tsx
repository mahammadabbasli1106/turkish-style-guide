import { useState, useRef, useEffect } from "react";
import { Navigate, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import {
  ArrowLeft,
  Camera,
  Upload,
  Loader2,
  Sparkles,
  Check,
  Download,
  Share2,
  Bookmark,
  User as UserIcon,
  Shirt,
} from "lucide-react";
import { compressImage } from "@/lib/imageUtils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUsageLimits, LIMIT_REACHED_MESSAGE } from "@/hooks/useUsageLimits";
import { signImageUrls, getSignedImageUrl } from "@/lib/storageUtils";

type ClothingItem = {
  id: string;
  name: string;
  category: string;
  color: string | null;
  image_url: string;
  ai_tags?: string[] | null;
  season?: string[] | null;
};

const CATEGORY_LABELS: Record<string, string> = {
  upper_body: "Upper body",
  lower_body: "Lower body",
  outerwear: "Outerwear",
  footwear: "Footwear",
  accessory: "Accessory",
};

// Best-effort: parse a color string to a usable CSS color or fall back
function colorToCss(c: string | null | undefined): string {
  if (!c) return "hsl(var(--muted))";
  const s = c.toLowerCase().trim();
  // Hex
  if (s.startsWith("#")) return s;
  // Common color names → simple hex map
  const map: Record<string, string> = {
    black: "#111827",
    white: "#f8fafc",
    gray: "#6b7280",
    grey: "#6b7280",
    navy: "#1e3a5f",
    blue: "#3b82f6",
    "light blue": "#bfdbfe",
    "dark blue": "#1e3a8a",
    red: "#ef4444",
    pink: "#ec4899",
    purple: "#8b5cf6",
    green: "#10b981",
    olive: "#6b7e3a",
    yellow: "#facc15",
    orange: "#f97316",
    brown: "#92400e",
    beige: "#e7d4b5",
    cream: "#f5e6c5",
    tan: "#d2b48c",
    khaki: "#bdb76b",
  };
  if (map[s]) return map[s];
  return s;
}

export default function VirtualTryOn() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const incomingSuggestion = (routerLocation.state as any)?.suggestion;
  const { user, session, loading } = useAuth();
  const [userImage, setUserImage] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<ClothingItem[]>([]);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [tryOnStatus, setTryOnStatus] =
    useState<"idle" | "analyzing" | "generating" | "completed">("idle");
  const [autoStarted, setAutoStarted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { canTryOn, tryOnsLeft, tryOnLimit, recordUsage } = useUsageLimits();

  // User profile for full body photo
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("auth_id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    const photoUrl = (profile as any)?.full_body_photo_url;
    if (photoUrl && !userImage) {
      getSignedImageUrl(photoUrl).then((url) => setUserImage(url));
    }
  }, [profile]);

  const { data: clothingItems = [], isLoading: loadingClothes } = useQuery({
    queryKey: ["clothing-items", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("clothing_items")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return signImageUrls(data as ClothingItem[]);
    },
    enabled: !!user,
  });

  // Compute display image up here so it's available to the mutation closure
  const displayImage = userImage || (profile as any)?.full_body_photo_url;

  // Toggle a clothing item; keep one item per category for a coherent outfit
  const toggleItem = (item: ClothingItem) => {
    setSelectedItems((prev) => {
      const exists = prev.find((p) => p.id === item.id);
      if (exists) return prev.filter((p) => p.id !== item.id);
      const filtered = prev.filter((p) => p.category !== item.category);
      return [...filtered, item];
    });
    setResultImage(null);
  };

  const tryOnMutation = useMutation({
    mutationFn: async () => {
      if (selectedItems.length === 0 || !displayImage) {
        throw new Error("Pick at least one item and add your photo");
      }
      if (!canTryOn) {
        toast(LIMIT_REACHED_MESSAGE);
        throw new Error("__limit__");
      }

      setTryOnStatus("analyzing");

      // Primary item = first in priority order; rest become additionalItems
      const order = ["outerwear", "upper_body", "lower_body", "footwear", "accessory"] as const;
      const sorted = [...selectedItems].sort(
        (a, b) =>
          order.indexOf(a.category as any) - order.indexOf(b.category as any)
      );
      const primary = sorted[0];
      const extras = sorted.slice(1);

      const compressedUserImage = await compressImage(displayImage, 512, 0.6);
      const compressedItemImage = await compressImage(primary.image_url, 512, 0.6);

      const stepTimer = setTimeout(() => setTryOnStatus("generating"), 4000);

      const { data, error } = await supabase.functions.invoke("virtual-try-on", {
        body: {
          clothingItemId: primary.id,
          userImageBase64: compressedUserImage,
          clothingImageBase64: compressedItemImage,
          additionalItems: extras.map((e) => ({
            name: e.name,
            category: e.category,
            color: e.color,
          })),
        },
      });

      clearTimeout(stepTimer);
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.resultImageUrl) throw new Error("No result image received");

      return data;
    },
    onSuccess: async (data) => {
      setResultImage(data.resultImageUrl);
      setTryOnStatus("completed");
      toast.success(t("tryOn.result"));
      await recordUsage("virtual_tryon");
    },
    onError: (error: Error) => {
      setTryOnStatus("idle");
      if (error.message === "__limit__") return;
      console.error("Try-on error:", error);
      toast.error(error.message || "Try-on failed. Please try again.");
    },
  });

  // Auto-select ALL items from an incoming outfit suggestion
  useEffect(() => {
    if (autoStarted) return;
    if (!incomingSuggestion?.items) return;
    if (!clothingItems.length) return;

    const ids = Object.values(incomingSuggestion.items)
      .map((it: any) => it?.id)
      .filter(Boolean) as string[];
    const matches = clothingItems.filter((c) => ids.includes(c.id));
    if (matches.length === 0) return;

    setSelectedItems(matches);
    setAutoStarted(true);
  }, [incomingSuggestion, clothingItems, autoStarted]);

  // Once we have selected items + display image + capacity, trigger generation.
  useEffect(() => {
    if (!autoStarted) return;
    if (selectedItems.length === 0 || !displayImage) return;
    if (resultImage || tryOnMutation.isPending) return;
    if (!canTryOn) return;
    tryOnMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStarted, selectedItems, displayImage, canTryOn]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setUserImage(e.target?.result as string);
      setResultImage(null);
    };
    reader.readAsDataURL(file);
  };

  const handleReset = () => {
    setSelectedItem(null);
    setResultImage(null);
    setTryOnStatus("idle");
  };

  const handleDownload = async () => {
    if (!resultImage) return;
    try {
      const response = await fetch(resultImage);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `try-on-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download image");
    }
  };

  const handleShare = async () => {
    if (!resultImage) return;
    try {
      const response = await fetch(resultImage);
      const blob = await response.blob();
      const file = new File([blob], "try-on.png", { type: "image/png" });
      if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "My Virtual Try-On" });
      } else {
        handleDownload();
      }
    } catch {
      toast.error("Failed to share image");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const displayImage = userImage || (profile as any)?.full_body_photo_url;

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-card border border-border shadow-card hover:bg-secondary transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5 text-primary" />
        </button>
        <h1 className="text-base font-semibold text-foreground">Virtual Try-On</h1>
        <button
          onClick={handleShare}
          disabled={!resultImage}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-card border border-border shadow-card hover:bg-secondary transition-colors disabled:opacity-40"
          aria-label="Share"
        >
          <Share2 className="h-5 w-5 text-primary" />
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-5 max-w-lg mx-auto"
      >
        <h2 className="font-display text-2xl font-bold text-foreground text-center">
          {resultImage ? "Here's how it looks on you" : "Pick a piece to try on"}
        </h2>

        {/* Two-up preview: Item → On You */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
          {/* Item slot */}
          <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-primary/10 border border-primary/15 flex flex-col items-center justify-center relative">
            {selectedItem ? (
              <img
                src={selectedItem.image_url}
                alt={selectedItem.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <>
                <Shirt className="h-10 w-10 text-primary/70 mb-2" strokeWidth={1.5} />
                <span className="text-sm font-semibold text-primary/80">Item</span>
              </>
            )}
          </div>

          {/* Arrow */}
          <span className="text-2xl text-muted-foreground/60 font-light">›</span>

          {/* On you slot */}
          <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-accent/15 border border-accent/20 flex flex-col items-center justify-center relative">
            {tryOnMutation.isPending ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-xs font-medium text-primary text-center px-2">
                  {tryOnStatus === "analyzing" ? "Analyzing…" : "Designing…"}
                </span>
              </div>
            ) : resultImage ? (
              <img
                src={resultImage}
                alt="Try-on result"
                className="w-full h-full object-cover"
              />
            ) : displayImage ? (
              <img
                src={displayImage}
                alt="You"
                className="w-full h-full object-cover opacity-50"
                onClick={() => fileInputRef.current?.click()}
              />
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-2"
              >
                <UserIcon className="h-10 w-10 text-accent/80" strokeWidth={1.5} />
                <span className="text-sm font-semibold text-accent">On you</span>
                <span className="text-[10px] text-muted-foreground">Tap to upload</span>
              </button>
            )}
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />

        {/* Item details card */}
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl p-5 border border-border shadow-card space-y-3"
          >
            <div>
              <p className="font-display text-lg font-bold text-foreground leading-tight">
                {selectedItem.name}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {CATEGORY_LABELS[selectedItem.category] || selectedItem.category}
                {selectedItem.ai_tags?.length ? " · AI detected" : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {selectedItem.color && (
                <>
                  <span
                    className="w-6 h-6 rounded-full border border-border shrink-0"
                    style={{ background: colorToCss(selectedItem.color) }}
                    title={selectedItem.color}
                  />
                  {/* Show second swatch if compound color (e.g. "navy/black") */}
                  {selectedItem.color.includes("/") && (
                    <span
                      className="w-6 h-6 rounded-full border border-border shrink-0 -ml-3"
                      style={{ background: colorToCss(selectedItem.color.split("/")[1]) }}
                    />
                  )}
                </>
              )}
              {selectedItem.season?.map((s) => (
                <span
                  key={s}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary capitalize"
                >
                  {s}
                </span>
              ))}
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-accent/15 text-accent capitalize">
                {CATEGORY_LABELS[selectedItem.category] || selectedItem.category}
              </span>
            </div>
          </motion.div>
        )}

        {/* CTAs (post-result) */}
        {resultImage ? (
          <div className="space-y-3">
            <Button
              onClick={handleDownload}
              className="w-full h-12 bg-card border border-border text-foreground hover:bg-secondary font-semibold"
              variant="outline"
              size="lg"
            >
              <Bookmark className="mr-2 h-5 w-5 text-primary" />
              Save to wardrobe
            </Button>
            <Button
              onClick={handleShare}
              variant="outline"
              className="w-full h-12 font-semibold"
              size="lg"
            >
              <Share2 className="mr-2 h-5 w-5 text-primary" />
              Share this look
            </Button>
            <button
              onClick={handleReset}
              className="w-full text-center text-sm font-medium text-muted-foreground py-2 hover:text-foreground transition-colors"
            >
              Try another item
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <Button
              onClick={() => tryOnMutation.mutate()}
              disabled={
                !displayImage || !selectedItem || tryOnMutation.isPending || !canTryOn
              }
              className="w-full h-12 bg-gradient-primary text-primary-foreground shadow-warm font-semibold disabled:opacity-50"
              size="lg"
            >
              {tryOnMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {tryOnStatus === "analyzing"
                    ? "Analyzing your style…"
                    : "Designing your outfit…"}
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Try this on
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              {tryOnsLeft}/{tryOnLimit} try-ons left today
            </p>
          </div>
        )}

        {/* Wardrobe selector — only shown before result */}
        {!resultImage && (
          <div className="space-y-3 pt-2">
            <p className="text-[11px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
              From your wardrobe
            </p>
            {loadingClothes ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : clothingItems.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-border bg-card/50">
                <p className="text-sm text-muted-foreground">
                  Add clothes to your wardrobe first
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {clothingItems.map((item) => {
                  const isSelected = selectedItem?.id === item.id;
                  return (
                    <motion.button
                      key={item.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setSelectedItem(item);
                        setResultImage(null);
                      }}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-colors ${
                        isSelected
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-transparent hover:border-primary/50"
                      }`}
                    >
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                      {isSelected && (
                        <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-1">
                          <Check size={12} />
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </DashboardLayout>
  );
}
