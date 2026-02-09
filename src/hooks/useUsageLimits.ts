import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";

export type UsageFeature = "outfit_suggest" | "virtual_tryon" | "style_chat";

const LIMITS: Record<UsageFeature, number> = {
  outfit_suggest: 2,
  virtual_tryon: 2,
  style_chat: 5,
};

const WARDROBE_LIMIT = 20;

export function useUsageLimits() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Check premium status
  const { data: isPremium = false } = useQuery({
    queryKey: ["is-premium", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("profiles")
        .select("is_premium")
        .eq("auth_id", user.id)
        .single();
      return data?.is_premium ?? false;
    },
    enabled: !!user,
    staleTime: 1000 * 60,
  });

  const { data: usageCounts = { outfit_suggest: 0, virtual_tryon: 0, style_chat: 0 } } = useQuery({
    queryKey: ["usage-counts", user?.id],
    queryFn: async () => {
      if (!user) return { outfit_suggest: 0, virtual_tryon: 0, style_chat: 0 };
      const { data, error } = await supabase
        .from("usage_events")
        .select("feature")
        .eq("user_id", user.id)
        .gte("created_at", twentyFourHoursAgo);

      if (error) throw error;

      const counts = { outfit_suggest: 0, virtual_tryon: 0, style_chat: 0 };
      (data || []).forEach((row: { feature: string }) => {
        if (row.feature in counts) {
          counts[row.feature as UsageFeature]++;
        }
      });
      return counts;
    },
    enabled: !!user,
    staleTime: 1000 * 30,
  });

  const { data: wardrobeCount = 0 } = useQuery({
    queryKey: ["clothing-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from("clothing_items")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      return count || 0;
    },
    enabled: !!user,
  });

  const recordUsage = async (feature: UsageFeature) => {
    if (!user) return;
    await supabase.from("usage_events").insert({
      user_id: user.id,
      feature,
    });
    queryClient.invalidateQueries({ queryKey: ["usage-counts"] });
  };

  return {
    isPremium,
    wardrobeCount,
    wardrobeLimit: WARDROBE_LIMIT,
    canUploadClothing: isPremium || wardrobeCount < WARDROBE_LIMIT,

    outfitSuggestCount: usageCounts.outfit_suggest,
    outfitSuggestLimit: LIMITS.outfit_suggest,
    canSuggestOutfit: isPremium || usageCounts.outfit_suggest < LIMITS.outfit_suggest,
    outfitSuggestLeft: isPremium ? Infinity : Math.max(0, LIMITS.outfit_suggest - usageCounts.outfit_suggest),

    tryOnCount: usageCounts.virtual_tryon,
    tryOnLimit: LIMITS.virtual_tryon,
    canTryOn: isPremium || usageCounts.virtual_tryon < LIMITS.virtual_tryon,
    tryOnsLeft: isPremium ? Infinity : Math.max(0, LIMITS.virtual_tryon - usageCounts.virtual_tryon),

    chatCount: usageCounts.style_chat,
    chatLimit: LIMITS.style_chat,
    canChat: isPremium || usageCounts.style_chat < LIMITS.style_chat,
    chatMessagesLeft: isPremium ? Infinity : Math.max(0, LIMITS.style_chat - usageCounts.style_chat),

    recordUsage,
  };
}
