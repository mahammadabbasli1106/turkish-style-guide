import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { User, MapPin, Palette, Loader2, Save } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type StylePreference = Database["public"]["Enums"]["style_preference"];

const ALL_STYLES: { value: StylePreference; label: string }[] = [
  { value: "casual", label: "Casual" },
  { value: "business", label: "Business" },
  { value: "streetwear", label: "Streetwear" },
  { value: "classic", label: "Classic" },
  { value: "sporty", label: "Sporty" },
  { value: "elegant", label: "Elegant" },
];

export default function Settings() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState("");
  const [location, setLocation] = useState("");
  const [selectedStyles, setSelectedStyles] = useState<StylePreference[]>([]);

  // Fetch profile
  const { data: profile, isLoading: profileLoading } = useQuery({
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

  // Fetch preferences
  const { data: preferences, isLoading: prefsLoading } = useQuery({
    queryKey: ["preferences", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!user,
  });

  // Set initial values when data loads
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setLocation(profile.location || "");
    }
    if (preferences) {
      setSelectedStyles(preferences.preferred_styles || []);
    }
  }, [profile, preferences]);

  // Save profile mutation
  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          display_name: displayName,
          location: location,
        })
        .eq("auth_id", user.id);

      if (profileError) throw profileError;

      // Update or insert preferences
      const { error: prefsError } = await supabase
        .from("user_preferences")
        .upsert({
          user_id: user.id,
          default_location: location,
          preferred_styles: selectedStyles,
        }, {
          onConflict: "user_id",
        });

      if (prefsError) throw prefsError;
    },
    onSuccess: () => {
      toast.success(t("settings.saved"));
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["preferences"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const toggleStyle = (style: StylePreference) => {
    setSelectedStyles((prev) =>
      prev.includes(style)
        ? prev.filter((s) => s !== style)
        : [...prev, style]
    );
  };

  if (loading || profileLoading || prefsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto space-y-8"
      >
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold text-foreground">
            {t("settings.title")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("settings.subtitle")}</p>
        </div>

        <div className="bg-card rounded-2xl p-6 shadow-card border border-border space-y-6">
          {/* Profile section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <User size={20} className="text-primary" />
              {t("settings.profile")}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input
                  id="email"
                  value={user.email || ""}
                  disabled
                  className="bg-secondary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">{t("settings.displayName")}</Label>
                <Input
                  id="displayName"
                  placeholder={t("settings.displayNamePlaceholder")}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Location section */}
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <MapPin size={20} className="text-primary" />
              {t("settings.location")}
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultLocation">{t("settings.defaultLocation")}</Label>
              <Input
                id="defaultLocation"
                placeholder={t("settings.locationPlaceholder")}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {t("settings.locationHint")}
              </p>
            </div>
          </div>

          {/* Style preferences section */}
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Palette size={20} className="text-primary" />
              {t("settings.stylePreferences")}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {ALL_STYLES.map((style) => (
                <label
                  key={style.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedStyles.includes(style.value)
                      ? "bg-primary/10 border-primary"
                      : "bg-secondary/50 border-border hover:border-primary/50"
                  }`}
                >
                  <Checkbox
                    checked={selectedStyles.includes(style.value)}
                    onCheckedChange={() => toggleStyle(style.value)}
                  />
                  <span className="text-sm font-medium capitalize">
                    {t(`style.${style.value}`)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Save button */}
          <Button
            onClick={() => saveProfileMutation.mutate()}
            disabled={saveProfileMutation.isPending}
            className="w-full bg-gradient-primary text-primary-foreground shadow-warm"
          >
            {saveProfileMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("common.loading")}
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {t("common.save")}
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
