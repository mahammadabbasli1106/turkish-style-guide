import { useState, useEffect, useRef, useCallback } from "react";
import { Navigate, useNavigate, useBlocker } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/sonner";
import { User, MapPin, Palette, Loader2, Save, Camera, AlertCircle, LogOut, Trash2, Shirt, Sparkles, Calendar, Shield } from "lucide-react";
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
  const saveButtonRef = useRef<HTMLDivElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [location, setLocation] = useState("");
  const [selectedStyles, setSelectedStyles] = useState<StylePreference[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState("default");
  const [fullBodyPhoto, setFullBodyPhoto] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const markDirty = useCallback(() => {
    if (!isDirty) {
      setIsDirty(true);
      setTimeout(() => {
        saveButtonRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, [isDirty]);

  // Block navigation when there are unsaved changes
  const blocker = useBlocker(isDirty);

  // Show confirmation when trying to navigate away with unsaved changes
  useEffect(() => {
    if (blocker.state === "blocked") {
      const leave = window.confirm(
        t("settings.unsavedWarning") || "You have unsaved changes. Are you sure you want to leave?"
      );
      if (leave) {
        blocker.proceed();
      } else {
        blocker.reset();
        saveButtonRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [blocker, t]);

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
    staleTime: 1000 * 60 * 5,
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
    staleTime: 1000 * 60 * 5,
  });

  // Fetch activity stats
  const { data: clothingCount = 0 } = useQuery({
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
    staleTime: 1000 * 60 * 5,
  });

  const { data: outfitCount = 0 } = useQuery({
    queryKey: ["outfit-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from("outfit_suggestions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      return count || 0;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  const { data: streakDays = 0 } = useQuery({
    queryKey: ["streak-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from("style_checkins")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      return count || 0;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
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
      markDirty();
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

      if (!fullBodyPhoto) {
        throw new Error(t("settings.fullBodyPhotoRequired"));
      }

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
      setIsDirty(false);
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
    markDirty();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
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
        className="max-w-lg mx-auto space-y-6 pb-8"
      >
        {/* ── Hero Profile Section ── */}
        <div className="relative rounded-3xl bg-gradient-to-br from-primary via-accent to-primary overflow-hidden pt-10 pb-6 px-6 text-center">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 left-8 text-4xl">✦</div>
            <div className="absolute top-8 right-12 text-3xl">✦</div>
            <div className="absolute bottom-8 left-16 text-2xl">✦</div>
            <div className="absolute bottom-4 right-8 text-4xl">✦</div>
          </div>

          {/* Avatar */}
          <div className="relative inline-block">
            <img
              src={selectedAvatarUrl}
              alt="Avatar"
              className="w-24 h-24 rounded-full border-4 border-primary-foreground/30 shadow-lg bg-card"
            />
            <Dialog>
              <DialogTrigger asChild>
                <button className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-card border-2 border-primary flex items-center justify-center shadow-md">
                  <Camera className="h-3.5 w-3.5 text-primary" />
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>{t("settings.selectAvatar")}</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-4 gap-3 py-4">
                  {AVATARS.map((avatar) => (
                    <button
                      key={avatar.id}
                      onClick={() => { setSelectedAvatar(avatar.id); markDirty(); }}
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
              </DialogContent>
            </Dialog>
          </div>

          {/* Name + premium */}
          <h2 className="font-display text-xl font-bold text-primary-foreground mt-4">
            {displayName || user.email?.split("@")[0]}
          </h2>
          <p className="text-xs text-primary-foreground/70 mt-2">{user.email}</p>
        </div>

        {/* ── Your Activity Card ── */}
        <div className="bg-card rounded-2xl p-5 shadow-card border border-border">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            {t("settings.yourActivity")}
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="w-10 h-10 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Shirt className="h-5 w-5 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">{t("settings.activityItems")}</p>
              <div className="mt-1.5 bg-primary/10 rounded-full py-1 px-3">
                <span className="text-sm font-bold text-primary">{clothingCount}</span>
              </div>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 mx-auto rounded-full bg-accent/10 flex items-center justify-center mb-2">
                <Sparkles className="h-5 w-5 text-accent" />
              </div>
              <p className="text-xs text-muted-foreground">{t("settings.activityOutfits")}</p>
              <div className="mt-1.5 bg-accent/10 rounded-full py-1 px-3">
                <span className="text-sm font-bold text-accent">{outfitCount}</span>
              </div>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">{t("settings.activityCheckins")}</p>
              <div className="mt-1.5 bg-primary/10 rounded-full py-1 px-3">
                <span className="text-sm font-bold text-primary">{streakDays}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Settings Form Card ── */}
        <div className="bg-card rounded-2xl p-6 shadow-card border border-border space-y-6">

          {/* Full body photo - compact */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-border bg-secondary flex items-center justify-center">
                  {fullBodyPhoto ? (
                    <img src={fullBodyPhoto} alt="Full body" className="w-full h-full object-cover" />
                  ) : (
                    <Camera size={20} className="text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{t("settings.fullBodyPhoto")} *</p>
                  <p className="text-xs text-muted-foreground">
                    {fullBodyPhoto ? t("settings.photoUploaded") : t("settings.fullBodyPhotoRequired")}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {fullBodyPhoto && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">{t("settings.viewPhoto")}</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-sm">
                      <DialogHeader>
                        <DialogTitle>{t("settings.fullBodyPhoto")}</DialogTitle>
                      </DialogHeader>
                      <img src={fullBodyPhoto} alt="Full body" className="w-full rounded-xl" />
                    </DialogContent>
                  </Dialog>
                )}
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploadingPhoto}>
                  {isUploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : fullBodyPhoto ? t("settings.changePhoto") : t("settings.uploadPhoto")}
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>
            <div className="flex items-center gap-2 p-3 bg-accent/20 rounded-lg border border-accent/30">
              <AlertCircle size={16} className="text-accent shrink-0" />
              <p className="text-xs text-foreground">{t("settings.fullBodyPhotoHint")}</p>
            </div>
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
                <Input id="email" value={user.email || ""} disabled className="bg-secondary" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">{t("settings.displayName")}</Label>
                <Input
                  id="displayName"
                  placeholder={t("settings.displayNamePlaceholder")}
                  value={displayName}
                  onChange={(e) => { setDisplayName(e.target.value); markDirty(); }}
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
                onChange={(e) => { setLocation(e.target.value); markDirty(); }}
              />
              <p className="text-xs text-muted-foreground">{t("settings.locationHint")}</p>
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
          <div ref={saveButtonRef}>
            {isDirty && (
              <div className="mb-3 p-3 bg-accent/20 border border-accent/40 rounded-xl text-center">
                <p className="text-sm font-medium text-foreground">
                  ⚠️ {t("settings.unsavedChanges") || "You have unsaved changes"}
                </p>
              </div>
            )}
            <Button
              onClick={() => saveProfileMutation.mutate()}
              disabled={saveProfileMutation.isPending || !fullBodyPhoto}
              className={`w-full bg-gradient-primary text-primary-foreground shadow-warm ${isDirty ? "animate-pulse" : ""}`}
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
          
          {!fullBodyPhoto && (
            <p className="text-sm text-destructive text-center">
              {t("settings.fullBodyPhotoRequired")}
            </p>
          )}

          {/* Log out */}
          <div className="pt-4 border-t border-border space-y-3">
            <a
              href="https://sites.google.com/view/tarzly-privacy/home"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Shield className="h-4 w-4" />
              Privacy Policy
            </a>
            <a
              href="https://sites.google.com/view/tarzly-terms"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Shield className="h-4 w-4" />
              Terms &amp; Conditions
            </a>
            <Button
              variant="ghost"
              className="w-full justify-center text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={async () => {
                try {
                  await signOut();
                  toast.success(t("settings.signedOut"));
                  navigate("/");
                } catch {
                  toast.error(t("common.error"));
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
                  {t("settings.deleteAccount")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("settings.deleteAccountTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("settings.deleteAccountDesc")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
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
                          throw new Error(err.error || t("common.error"));
                        }

                        await signOut();
                        toast.success(t("settings.accountDeleted"));
                        navigate("/");
                      } catch (err: any) {
                        toast.error(err.message || t("common.error"));
                      }
                    }}
                  >
                    {t("settings.deleteAccount")}
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
