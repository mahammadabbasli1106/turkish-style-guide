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
import { Plus, Trash2, Upload, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import PremiumUpgradeModal from "@/components/PremiumUpgradeModal";

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
  const [premiumOpen, setPremiumOpen] = useState(false);
  const { wardrobeCount, wardrobeLimit, canUploadClothing, isPremium } = useUsageLimits();

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
      return data as ClothingItem[];
    },
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from("clothing_items")
        .delete()
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clothing-items"] });
      queryClient.invalidateQueries({ queryKey: ["clothing-count"] });
      toast.success("Item deleted");
    },
    onError: () => {
      toast.error("Failed to delete item");
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user || !session) return;

    if (!canUploadClothing) {
      setPremiumOpen(true);
      event.target.value = "";
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("clothing-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("clothing-images")
        .getPublicUrl(fileName);

      const base64 = await fileToBase64(file);

      toast.loading("AI is analyzing your clothing...", { id: "categorize" });
      
      const { data: categoryData, error: categoryError } = await supabase.functions.invoke(
        "categorize-clothing",
        {
          body: { imageUrl: base64 },
        }
      );

      toast.dismiss("categorize");

      if (categoryError) throw categoryError;

      const { error: dbError } = await supabase
        .from("clothing_items")
        .insert({
          user_id: user.id,
          name: categoryData.name,
          category: categoryData.category,
          color: categoryData.color,
          season: categoryData.season || [],
          image_url: publicUrl,
          ai_tags: categoryData.tags || [],
        });

      if (dbError) throw dbError;

      queryClient.invalidateQueries({ queryKey: ["clothing-items"] });
      queryClient.invalidateQueries({ queryKey: ["clothing-count"] });
      toast.success(`Added: ${categoryData.name}`);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload clothing item");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        {/* Wardrobe progress bar - only show for free users */}
        {!isPremium && (
          <div className="bg-card rounded-xl p-4 border border-border shadow-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">
                {wardrobeCount}/{wardrobeLimit} slots used
              </span>
              {!canUploadClothing && (
                <button
                  onClick={() => setPremiumOpen(true)}
                  className="text-xs text-primary font-semibold hover:underline"
                >
                  Upgrade for unlimited
                </button>
              )}
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">My Wardrobe</h1>
            <p className="text-muted-foreground mt-1">
              {clothingItems.length} items • Upload to add more
            </p>
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <label className="relative">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={uploading || !canUploadClothing}
                    className="sr-only"
                  />
                  <Button
                    disabled={uploading || !canUploadClothing}
                    className="bg-gradient-primary text-primary-foreground shadow-warm cursor-pointer"
                    asChild
                    onClick={!canUploadClothing ? () => setPremiumOpen(true) : undefined}
                  >
                    <span>
                      {uploading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      {uploading ? "Uploading..." : "Add Clothing"}
                    </span>
                  </Button>
                </label>
              </TooltipTrigger>
              {!canUploadClothing && (
                <TooltipContent>
                  Wardrobe full. Upgrade to Premium for unlimited storage.
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            All ({clothingItems.length})
          </Button>
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
            >
              {categoryLabels[category]} ({groupedItems[category]?.length || 0})
            </Button>
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
            <h3 className="font-display text-xl font-semibold text-foreground mb-2">
              No items yet
            </h3>
            <p className="text-muted-foreground mb-6">
              Upload photos of your clothes to build your digital wardrobe
            </p>
            <label>
              <Input type="file" accept="image/*" onChange={handleFileUpload} className="sr-only" />
              <Button className="bg-gradient-primary text-primary-foreground" asChild>
                <span>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Item
                </span>
              </Button>
            </label>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            <AnimatePresence>
              {filteredItems.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="group relative bg-card rounded-xl overflow-hidden shadow-card border border-border hover:shadow-card-hover transition-shadow"
                >
                  <div className="aspect-square">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform">
                    <p className="text-primary-foreground text-sm font-medium truncate">
                      {item.name}
                    </p>
                    <p className="text-primary-foreground/70 text-xs capitalize">
                      {item.category.replace("_", " ")}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(item.id)}
                    className="absolute top-2 right-2 p-2 bg-destructive text-destructive-foreground rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/90"
                  >
                    <Trash2 size={16} />
                  </button>
                  <div className="absolute top-2 left-2">
                    <span className="text-xs bg-card/90 backdrop-blur-sm px-2 py-1 rounded-full text-foreground">
                      {categoryLabels[item.category]?.split(" ")[0]}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      <PremiumUpgradeModal
        open={premiumOpen}
        onOpenChange={setPremiumOpen}
        trigger="Wardrobe Full — Upgrade to Premium"
      />
    </DashboardLayout>
  );
}

// Helper function
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
