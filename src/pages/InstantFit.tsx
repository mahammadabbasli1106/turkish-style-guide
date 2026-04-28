import { useState, useRef } from "react";
import { Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { Camera, Loader2, RefreshCw, Sparkles, ShoppingBag, Download, Share2, ImageIcon } from "lucide-react";
import { compressImage } from "@/lib/imageUtils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUsageLimits, LIMIT_REACHED_MESSAGE } from "@/hooks/useUsageLimits";

export default function InstantFit() {
  const { t } = useTranslation();
  const { user, session, loading } = useAuth();
  const [clothingPhoto, setClothingPhoto] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "analyzing" | "generating" | "completed">("idle");
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { recordUsage } = useUsageLimits();

  // Instant fit has its own 2-usage limit
  const { data: instantFitCount = 0 } = useQuery({
    queryKey: ["instant-fit-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("usage_events")
        .select("id")
        .eq("user_id", user.id)
        .eq("feature", "instant_fit")
        .gte("created_at", twentyFourHoursAgo);
      return data?.length || 0;
    },
    enabled: !!user,
    staleTime: 1000 * 30,
  });

  const INSTANT_FIT_LIMIT = 2;
  const canUseInstantFit = instantFitCount < INSTANT_FIT_LIMIT;
  const instantFitLeft = Math.max(0, INSTANT_FIT_LIMIT - instantFitCount);

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

  const profilePhoto = (profile as any)?.full_body_photo_url;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!session || !clothingPhoto || !profilePhoto) throw new Error("Missing required data");
      if (!canUseInstantFit) {
        toast(LIMIT_REACHED_MESSAGE);
        throw new Error("__limit__");
      }

      setStatus("analyzing");

      const [compressedUser, compressedClothing] = await Promise.all([
        compressImage(profilePhoto, 512, 0.6),
        compressImage(clothingPhoto, 512, 0.6),
      ]);

      const stepTimer = setTimeout(() => setStatus("generating"), 4000);

      const { data, error } = await supabase.functions.invoke("instant-fit", {
        body: {
          userImageBase64: compressedUser,
          clothingImageBase64: compressedClothing,
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
      setStatus("completed");
      toast.success(t("instantFit.result"));
      await supabase.from("usage_events").insert({ user_id: user!.id, feature: "instant_fit" });
    },
    onError: (error: Error) => {
      setStatus("idle");
      if (error.message === "__limit__") return;
      console.error("Instant fit error:", error);
      toast.error(error.message);
    },
  });

  const handleCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image file"); return; }
    const reader = new FileReader();
    reader.onload = (e) => { setClothingPhoto(e.target?.result as string); setResultImage(null); setStatus("idle"); };
    reader.readAsDataURL(file);
  };

  const handleReset = () => { setClothingPhoto(null); setResultImage(null); setStatus("idle"); };

  const handleDownload = async () => {
    if (!resultImage) return;
    try {
      const response = await fetch(resultImage);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `instant-fit-${Date.now()}.png`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("Failed to download image"); }
  };

  const handleShare = async () => {
    if (!resultImage) return;
    try {
      const response = await fetch(resultImage);
      const blob = await response.blob();
      const file = new File([blob], "instant-fit.png", { type: "image/png" });
      if (navigator.share) { await navigator.share({ files: [file], title: "My Instant Fit" }); }
      else { handleDownload(); }
    } catch { toast.error("Failed to share image"); }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 max-w-lg mx-auto"
      >
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold text-foreground">{t("instantFit.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("instantFit.subtitle")}</p>
        </div>

        {!profilePhoto && (
          <div className="bg-destructive/10 text-destructive rounded-2xl p-4 text-sm text-center">
            {t("instantFit.noProfilePhoto")}
          </div>
        )}

        <AnimatePresence mode="wait">
          {resultImage ? (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-4">
              <div className="aspect-[3/4] bg-card rounded-2xl overflow-hidden shadow-card">
                <img src={resultImage} alt="Instant fit result" className="w-full h-full object-cover" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleDownload} className="flex-1">
                  <Download className="mr-2 h-4 w-4" /> {t("common.download")}
                </Button>
                <Button variant="outline" onClick={handleShare} className="flex-1">
                  <Share2 className="mr-2 h-4 w-4" /> {t("common.share")}
                </Button>
              </div>
              <Button variant="outline" onClick={handleReset} className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" /> {t("instantFit.tryAnother")}
              </Button>
            </motion.div>
          ) : (
            <motion.div key="capture" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div
                className="aspect-[3/4] bg-card rounded-2xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => cameraInputRef.current?.click()}
              >
                {clothingPhoto ? (
                  <img src={clothingPhoto} alt="Clothing" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-6">
                    <ShoppingBag size={48} className="mx-auto text-muted-foreground mb-4" />
                    <p className="text-foreground font-medium">{t("instantFit.captureHint")}</p>
                    <p className="text-xs text-muted-foreground mt-2">{t("instantFit.captureDesc")}</p>
                  </div>
                )}
              </div>
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleCapture} className="hidden" />

              {clothingPhoto && (
                <div className="space-y-2">
                  <Button
                    onClick={() => mutation.mutate()}
                    disabled={!profilePhoto || mutation.isPending}
                    className="w-full bg-gradient-primary text-primary-foreground shadow-warm"
                    size="lg"
                  >
                    {mutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        {status === "analyzing" ? "🔍 Analyzing clothing..." : "🎨 Fitting on you..."}
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-5 w-5" />
                        {t("instantFit.generate")}
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    {instantFitLeft}/{INSTANT_FIT_LIMIT} {t("instantFit.triesLeft")}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </DashboardLayout>
  );
}
