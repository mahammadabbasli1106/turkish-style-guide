import { useState, useRef, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { Camera, Upload, Loader2, RefreshCw, Sparkles, Check } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import PremiumUpgradeModal from "@/components/PremiumUpgradeModal";

type ClothingItem = {
  id: string;
  name: string;
  category: string;
  color: string | null;
  image_url: string;
};

export default function VirtualTryOn() {
  const { t } = useTranslation();
  const { user, session, loading } = useAuth();
  const [userImage, setUserImage] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<ClothingItem[]>([]);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { canTryOn, tryOnsLeft, tryOnLimit, isPremium, recordUsage } = useUsageLimits();

  // Fetch user's full body photo from profile
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

  // Set user image from profile if available
  useEffect(() => {
    if ((profile as any)?.full_body_photo_url && !userImage) {
      setUserImage((profile as any).full_body_photo_url);
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
      return data as ClothingItem[];
    },
    enabled: !!user,
  });

  const tryOnMutation = useMutation({
    mutationFn: async () => {
      if (!session || selectedItems.length === 0 || !displayImage) {
        throw new Error("Missing required data");
      }
      if (!canTryOn) {
        setPremiumOpen(true);
        throw new Error("__limit__");
      }

      // For multiple items, we'll create a combined prompt
      const itemDescriptions = selectedItems.map(item => 
        `${item.name} (${item.category.replace("_", " ")}, ${item.color || "neutral"})`
      ).join(", ");

      const { data, error } = await supabase.functions.invoke("virtual-try-on", {
        body: { 
          clothingItemId: selectedItems[0].id, // Primary item
          userImageBase64: displayImage,
          additionalItems: selectedItems.slice(1).map(item => ({
            id: item.id,
            name: item.name,
            category: item.category,
            color: item.color,
            image_url: item.image_url,
          })),
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.resultImageUrl) throw new Error("No result image received");
      
      return data;
    },
    onSuccess: async (data) => {
      setResultImage(data.resultImageUrl);
      toast.success(t("tryOn.result"));
      await recordUsage("virtual_tryon");
    },
    onError: (error: Error) => {
      if (error.message === "__limit__") return;
      console.error("Try-on error:", error);
      toast.error(error.message);
    },
  });

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

  const toggleItemSelection = (item: ClothingItem) => {
    setSelectedItems(prev => {
      const isSelected = prev.some(i => i.id === item.id);
      if (isSelected) {
        return prev.filter(i => i.id !== item.id);
      } else {
        return [...prev, item];
      }
    });
    setResultImage(null);
  };

  const handleReset = () => {
    setUserImage((profile as any)?.full_body_photo_url || null);
    setSelectedItems([]);
    setResultImage(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Use profile full body photo if available
  const displayImage = userImage || (profile as any)?.full_body_photo_url;

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8 max-w-6xl mx-auto"
      >
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold text-foreground">{t("tryOn.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("tryOn.subtitle")}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Left: User photo upload */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Camera size={20} className="text-primary" />
              {t("tryOn.uploadPhoto")}
            </h3>
            
            <div 
              className="aspect-[3/4] bg-card rounded-2xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {displayImage ? (
                <img 
                  src={displayImage} 
                  alt="Your photo" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-6">
                  <Upload size={48} className="mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Click to upload your photo</p>
                  <p className="text-xs text-muted-foreground mt-2">Full body photo works best</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            
            {(profile as any)?.full_body_photo_url && (
              <p className="text-xs text-muted-foreground text-center">
                {t("tryOn.usingProfilePhoto")}
              </p>
            )}
          </div>

          {/* Right: Result or clothing selection */}
          <div className="space-y-4">
            <AnimatePresence mode="wait">
              {resultImage ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-4"
                >
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Sparkles size={20} className="text-primary" />
                    {t("tryOn.result")}
                  </h3>
                  <div className="aspect-[3/4] bg-card rounded-2xl overflow-hidden shadow-card">
                    <img 
                      src={resultImage} 
                      alt="Try-on result" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={handleReset}
                    className="w-full"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {t("tryOn.tryAnother")}
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="selection"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">{t("tryOn.selectClothing")}</h3>
                    <span className="text-sm text-muted-foreground">
                      {selectedItems.length} {t("tryOn.selected")}
                    </span>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">{t("tryOn.multiSelectHint")}</p>
                  
                  {loadingClothes ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : clothingItems.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      Add clothes to your wardrobe first
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 max-h-[400px] overflow-y-auto">
                      {clothingItems.map((item) => {
                        const isSelected = selectedItems.some(i => i.id === item.id);
                        return (
                          <motion.div
                            key={item.id}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => toggleItemSelection(item)}
                            className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-colors ${
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
                          </motion.div>
                        );
                      })}
                    </div>
                  )}

                  {selectedItems.length > 0 && (
                    <div className="bg-secondary/50 rounded-xl p-3 space-y-2">
                      <p className="text-sm font-medium text-foreground">{t("tryOn.selectedItems")}:</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedItems.map(item => (
                          <span 
                            key={item.id}
                            className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full"
                          >
                            {item.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Generate button */}
        {!resultImage && (
          <div className="space-y-2">
            <Button
              onClick={() => tryOnMutation.mutate()}
              disabled={!displayImage || selectedItems.length === 0 || tryOnMutation.isPending}
              className="w-full bg-gradient-primary text-primary-foreground shadow-warm"
              size="lg"
            >
              {tryOnMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {t("tryOn.generating")}
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  {t("tryOn.generate")} {selectedItems.length > 0 && `(${selectedItems.length} ${t("tryOn.items")})`}
                </>
              )}
            </Button>
            {!isPremium && (
              <p className="text-xs text-muted-foreground text-center">
                {tryOnsLeft}/{tryOnLimit} try-ons left today
              </p>
            )}
          </div>
        )}
      </motion.div>

      <PremiumUpgradeModal
        open={premiumOpen}
        onOpenChange={setPremiumOpen}
        trigger="Daily Limit Reached — Upgrade to Premium"
      />
    </DashboardLayout>
  );
}
