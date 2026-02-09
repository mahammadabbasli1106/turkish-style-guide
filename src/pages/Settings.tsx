import { useState, useEffect, useRef } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { User, MapPin, Palette, Loader2, Save, Camera, Upload, AlertCircle, LogOut, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type StylePreference = Database["public"]["Enums"]["style_preference"];

const ALL_STYLES: { value: StylePreference; label: string }[] = [
  { value: "casual", label: "Casual" },
  { value: "business", label: "Business" },
  { value: "streetwear", label: "Streetwear" },
  { value: "classic", label: "Classic" },
  { value: "sporty", label: "Sporty" },
  { value: "elegant", label: "Elegant" },
];

// Predefined avatars using DiceBear
const AVATARS = [
  { id: "default", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=default" },
  { id: "cool", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=cool" },
  { id: "happy", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=happy" },
  { id: "style", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=style" },
  { id: "fashion", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=fashion" },
  { id: "chic", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=chic" },
  { id: "trendy", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=trendy" },
  { id: "classic", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=classic" },
  { id: "adventurer", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=adventurer" },
  { id: "bold", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=bold" },
  { id: "dreamer", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=dreamer" },
  { id: "rebel", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=rebel" },
];

export default function Settings() {
  const { t } = useTranslation();
  const { user, loading, signOut } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [location, setLocation] = useState("");
  const [selectedStyles, setSelectedStyles] = useState<StylePreference[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState("default");
  const [fullBodyPhoto, setFullBodyPhoto] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

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
      setSelectedAvatar((profile as any).avatar_type || "default");
      setFullBodyPhoto((profile as any).full_body_photo_url || null);
    }
    if (preferences) {
      setSelectedStyles(preferences.preferred_styles || []);
    }
  }, [profile, preferences]);

  // Handle full body photo upload
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const fileName = `${user.id}/full-body-${Date.now()}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage
        .from("clothing-images")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("clothing-images")
        .getPublicUrl(fileName);

      setFullBodyPhoto(publicUrl);
      toast.success(t("settings.photoUploaded"));
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(t("common.error"));
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Save profile mutation
  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      // Validate full body photo is uploaded
      if (!fullBodyPhoto) {
        throw new Error(t("settings.fullBodyPhotoRequired"));
      }

      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          display_name: displayName,
          location: location,
          avatar_type: selectedAvatar,
          full_body_photo_url: fullBodyPhoto,
        } as any)
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
      queryClient.invalidateQueries({ queryKey: ["profile-avatar"] });
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

  const selectedAvatarUrl = AVATARS.find(a => a.id === selectedAvatar)?.url || AVATARS[0].url;

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
          {/* Avatar selection at top */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <User size={20} className="text-primary" />
              {t("settings.selectAvatar")}
            </div>

            <div className="flex flex-col items-center gap-4">
              <img 
                src={selectedAvatarUrl}
                alt="Selected avatar"
                className="w-24 h-24 rounded-full border-4 border-primary"
              />
              <div className="grid grid-cols-4 gap-3">
                {AVATARS.map((avatar) => (
                  <button
                    key={avatar.id}
                    onClick={() => setSelectedAvatar(avatar.id)}
                    className={`w-14 h-14 rounded-full overflow-hidden border-2 transition-all ${
                      selectedAvatar === avatar.id
                        ? "border-primary ring-2 ring-primary/30 scale-110"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <img src={avatar.url} alt={avatar.id} className="w-full h-full" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Full body photo upload - MANDATORY */}
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Camera size={20} className="text-primary" />
              {t("settings.fullBodyPhoto")} *
            </div>

            <div className="flex items-center gap-2 p-3 bg-accent/20 rounded-lg border border-accent/30">
              <AlertCircle size={16} className="text-accent" />
              <p className="text-sm text-foreground">{t("settings.fullBodyPhotoHint")}</p>
            </div>

            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`relative aspect-[3/4] max-w-xs mx-auto rounded-xl border-2 border-dashed cursor-pointer transition-colors overflow-hidden ${
                fullBodyPhoto ? "border-primary" : "border-border hover:border-primary/50"
              }`}
            >
              {fullBodyPhoto ? (
                <img 
                  src={fullBodyPhoto} 
                  alt="Full body" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                  <Upload size={40} className="text-muted-foreground mb-3" />
                  <p className="text-muted-foreground text-sm">{t("settings.uploadFullBodyPhoto")}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t("settings.fullBodyPhotoTip")}</p>
                </div>
              )}
              {isUploadingPhoto && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </div>

          {/* Profile section */}
          <div className="space-y-4 pt-4 border-t border-border">
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
            disabled={saveProfileMutation.isPending || !fullBodyPhoto}
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
          
          {!fullBodyPhoto && (
            <p className="text-sm text-destructive text-center">
              {t("settings.fullBodyPhotoRequired")}
            </p>
          )}

          {/* Log out */}
          <div className="pt-4 border-t border-border space-y-3">
            <Button
              variant="ghost"
              className="w-full justify-center text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={async () => {
                try {
                  await signOut();
                  toast.success("Signed out successfully");
                  navigate("/");
                } catch {
                  toast.error("Failed to sign out");
                }
              }}
            >
              <LogOut size={20} className="mr-2" />
              {t("nav.signOut")}
            </Button>

            {/* Delete Account */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-center text-destructive/70 hover:text-destructive hover:bg-destructive/10 text-sm"
                >
                  <Trash2 size={16} className="mr-2" />
                  Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action is permanent and cannot be undone. All your wardrobe items, outfits, streaks, and profile data will be permanently deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={async () => {
                      try {
                        const { data: { session } } = await supabase.auth.getSession();
                        if (!session) throw new Error("Not authenticated");

                        const resp = await fetch(
                          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`,
                          {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${session.access_token}`,
                            },
                          }
                        );

                        if (!resp.ok) {
                          const err = await resp.json().catch(() => ({}));
                          throw new Error(err.error || "Failed to delete account");
                        }

                        await signOut();
                        toast.success("Account deleted successfully");
                        navigate("/");
                      } catch (err: any) {
                        toast.error(err.message || "Failed to delete account");
                      }
                    }}
                  >
                    Delete Account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
