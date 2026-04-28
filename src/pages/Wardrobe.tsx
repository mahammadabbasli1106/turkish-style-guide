import { useState } from "react";
import { Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/sonner";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useUsageLimits, LIMIT_REACHED_MESSAGE } from "@/hooks/useUsageLimits";
import { signImageUrls } from "@/lib/storageUtils";

type ClothingItem = {
  id: string;
  name: string;
  category: string;
  color: string | null;
  season: string[];
  image_url: string;
  ai_tags: string[];
  created_at: string;
};

export default function Wardrobe() {
  const { t } = useTranslation();
  const { user, session, loading } = useAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { wardrobeCount, wardrobeLimit, canUploadClothing } = useUsageLimits();

  const categoryLabels: Record<string, string> = {
    upper_body: t("wardrobe.tops"),
    lower_body: t("wardrobe.bottoms"),
    outerwear: t("wardrobe.outerwear"),
    footwear: t("wardrobe.footwear"),
    accessory: t("wardrobe.accessories"),
  };

  const { data: clothingItems = [], isLoading } = useQuery({
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

  const deleteMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from("clothing_items").delete().eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clothing-items"] });
      queryClient.invalidateQueries({ queryKey: ["clothing-count"] });
      toast.success("Item deleted");
    },
    onError: () => { toast.error("Failed to delete item"); },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !user || !session) return;

    if (!canUploadClothing) {
      toast(LIMIT_REACHED_MESSAGE);
      event.target.value = "";
      return;
    }

    setUploading(true);
    let successCount = 0;
    let duplicateCount = 0;

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;

      if (wardrobeCount + successCount >= wardrobeLimit) {
        toast(LIMIT_REACHED_MESSAGE);
        break;
      }

      let uploadedPath: string | null = null;
      const toastId = `categorize-${Date.now()}-${Math.random()}`;

      try {
        const fileExt = (file.name.split(".").pop() || "jpg").toLowerCase();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("clothing-images")
          .upload(fileName, file);

        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
        uploadedPath = fileName;

        const base64 = await fileToBase64(file);

        toast.loading("AI is analyzing your clothing...", { id: toastId });

        // Retry up to 3x for transient edge runtime errors (503/cold start)
        let categoryData: any = null;
        let categoryError: any = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          const res = await supabase.functions.invoke("categorize-clothing", {
            body: { imageUrl: base64 },
          });
          categoryData = res.data;
          categoryError = res.error;
          const msg = String(categoryError?.message || "").toLowerCase();
          const isTransient =
            categoryError &&
            (msg.includes("non-2xx") ||
              msg.includes("503") ||
              msg.includes("temporarily") ||
              msg.includes("failed to send"));
          if (!isTransient) break;
          await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
        }

        toast.dismiss(toastId);

        if (categoryError) {
          throw new Error("The AI service is briefly unavailable. Please try again in a moment.");
        }
        if (categoryData?.error) {
          throw new Error(categoryData.message || categoryData.error);
        }
        if (!categoryData?.category || !categoryData?.name) {
          throw new Error("AI couldn't recognize this clothing item");
        }

        // Duplicate detection: same name + category + color already in wardrobe
        const normalizedName = String(categoryData.name).trim().toLowerCase();
        const normalizedColor = (categoryData.color || "").trim().toLowerCase();
        const isDuplicate = clothingItems.some(
          (existing) =>
            existing.category === categoryData.category &&
            existing.name.trim().toLowerCase() === normalizedName &&
            (existing.color || "").trim().toLowerCase() === normalizedColor
        );

        if (isDuplicate) {
          // Skip insert, clean up the uploaded image
          await supabase.storage.from("clothing-images").remove([uploadedPath]);
          duplicateCount++;
          continue;
        }

        const { error: dbError } = await supabase
          .from("clothing_items")
          .insert({
            user_id: user.id,
            name: categoryData.name,
            category: categoryData.category,
            color: categoryData.color,
            season: categoryData.season || [],
            image_url: fileName,
            ai_tags: categoryData.tags || [],
          });

        if (dbError) throw new Error(`Save failed: ${dbError.message}`);
        successCount++;
      } catch (error: any) {
        toast.dismiss(toastId);
        console.error("Upload error:", error);
        // Clean up orphaned storage upload if categorize/save failed
        if (uploadedPath) {
          await supabase.storage.from("clothing-images").remove([uploadedPath]).catch(() => {});
        }
        toast.error(error?.message || `Failed to upload ${file.name}`);
      }
    }

    if (successCount > 0) {
      queryClient.invalidateQueries({ queryKey: ["clothing-items"] });
      queryClient.invalidateQueries({ queryKey: ["clothing-count"] });
      toast.success(`Added ${successCount} item${successCount > 1 ? "s" : ""}`);
    }
    if (duplicateCount > 0) {
      toast(`Skipped ${duplicateCount} duplicate${duplicateCount > 1 ? "s" : ""} already in your wardrobe`);
    }

    setUploading(false);
    event.target.value = "";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const categories = Object.keys(categoryLabels);
  const filteredItems = selectedCategory
    ? clothingItems.filter((item) => item.category === selectedCategory)
    : clothingItems;

  const groupedItems = categories.reduce((acc, category) => {
    acc[category] = clothingItems.filter((item) => item.category === category);
    return acc;
  }, {} as Record<string, ClothingItem[]>);

  const progressPercent = Math.min((wardrobeCount / wardrobeLimit) * 100, 100);

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg mx-auto space-y-3 w-full overflow-x-hidden"
      >
        {/* Page heading + slot meter combined */}
        <div className="bg-card rounded-2xl px-4 py-3 border border-border shadow-card">
          <div className="flex items-baseline justify-between mb-2">
            <h1 className="font-display text-lg font-extrabold text-foreground tracking-tight">
              {t("wardrobe.title")}
            </h1>
            <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">
              {wardrobeCount}/{wardrobeLimit}
            </span>
          </div>
          <Progress value={progressPercent} className="h-1" />
        </div>

        {/* Add clothing CTA + filter chips on the same row band */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <label className="block">
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  disabled={uploading || !canUploadClothing}
                  className="sr-only"
                />
                <Button
                  disabled={uploading || !canUploadClothing}
                  className="w-full h-10 bg-gradient-primary text-primary-foreground shadow-warm rounded-xl text-[13px] font-bold cursor-pointer"
                  asChild
                  onClick={!canUploadClothing ? () => toast(LIMIT_REACHED_MESSAGE) : undefined}
                >
                  <span>
                    {uploading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    {uploading ? t("wardrobe.uploadingDots") : t("wardrobe.addClothing")}
                  </span>
                </Button>
              </label>
            </TooltipTrigger>
            {!canUploadClothing && (
              <TooltipContent>
                {t("wardrobe.full", { max: wardrobeLimit })}
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>

        {/* Category filter chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-bold transition-colors ${
              selectedCategory === null
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-foreground hover:bg-secondary"
            }`}
          >
            {t("wardrobe.all")} ({clothingItems.length})
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-bold transition-colors ${
                selectedCategory === category
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-foreground hover:bg-secondary"
              }`}
            >
              {categoryLabels[category]} ({groupedItems[category]?.length || 0})
            </button>
          ))}
        </div>

        {/* Items grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16">
            <Shirt className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-display text-xl font-semibold text-foreground mb-2">{t("wardrobe.noItems")}</h3>
            <p className="text-muted-foreground mb-6">{t("wardrobe.noItemsDesc")}</p>
            <label>
              <Input type="file" accept="image/*" multiple onChange={handleFileUpload} className="sr-only" />
              <Button className="bg-gradient-primary text-primary-foreground" asChild>
                <span><Plus className="mr-2 h-4 w-4" />{t("wardrobe.addFirst")}</span>
              </Button>
            </label>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
            <AnimatePresence>
              {filteredItems.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="group relative bg-card rounded-lg overflow-hidden shadow-card border border-border hover:shadow-card-hover transition-shadow"
                >
                  <div className="aspect-square">
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-0 left-0 right-0 p-2 translate-y-full group-hover:translate-y-0 transition-transform">
                    <p className="text-primary-foreground text-[11px] font-medium truncate">{item.name}</p>
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(item.id)}
                    className="absolute top-1 right-1 p-1.5 bg-destructive text-destructive-foreground rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/90"
                  >
                    <Trash2 size={12} />
                  </button>
                  <div className="absolute top-1 left-1">
                    <span className="text-[10px] bg-card/90 backdrop-blur-sm px-1.5 py-0.5 rounded-full text-foreground leading-none">
                      {categoryLabels[item.category]?.split(" ")[0]}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </DashboardLayout>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });
}

function Shirt({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
    </svg>
  );
}
