import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import LanguageSwitch from "@/components/LanguageSwitch";
import { lovable } from "@/integrations/lovable";

export default function AuthPage() {
  const { t } = useTranslation();
  const { user, loading, signIn, signUp } = useAuth();
  const [step, setStep] = useState<"email" | "password">("email");
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleEmailContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) setStep("password");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (isSignUp) {
        const { error } = await signUp(email, password);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success("Check your email to confirm your account!");
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            setIsSignUp(true);
            toast.error("Account not found. Please sign up.");
          } else {
            toast.error(error.message);
          }
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (error) {
        toast.error(error.message);
      }
    } catch {
      toast.error("Failed to sign in with Google");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
      <div className="absolute top-4 right-4">
        <LanguageSwitch />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm flex flex-col items-center"
      >
        {/* Logo */}
        <div className="mb-8">
          <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-warm">
            <span className="text-primary-foreground font-display text-2xl font-bold">T</span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-semibold text-foreground mb-1">tarzly.ai</h1>
        <p className="text-sm text-muted-foreground mb-8">{t("auth.signIn")}</p>

        {step === "email" ? (
          <form onSubmit={handleEmailContinue} className="w-full space-y-4">
            <div className="relative">
              <Input
                type="email"
                placeholder={t("auth.email")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-14 px-4 bg-muted border-0 rounded-xl text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-foreground"
                required
              />
              {email && (
                <button type="button" onClick={() => setEmail("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X size={18} />
                </button>
              )}
            </div>
            <Button type="submit" className="w-full h-14 bg-foreground text-background hover:bg-foreground/90 rounded-xl text-base font-medium">
              {t("common.continue") || "Continue"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <button type="button" onClick={() => setStep("email")} className="text-sm text-muted-foreground hover:text-foreground mb-2">
              ← {email}
            </button>
            <Input
              type="password"
              placeholder={t("auth.password")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-14 px-4 bg-muted border-0 rounded-xl text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-foreground"
              required
              minLength={6}
              autoFocus
            />
            <Button type="submit" disabled={isSubmitting} className="w-full h-14 bg-foreground text-background hover:bg-foreground/90 rounded-xl text-base font-medium">
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : isSignUp ? t("auth.signUp") : t("auth.signIn")}
            </Button>
            <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="w-full text-sm text-muted-foreground hover:text-foreground">
              {isSignUp ? t("auth.hasAccount") : t("auth.noAccount")}
            </button>
          </form>
        )}

        {/* Divider */}
        <div className="flex items-center w-full my-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-muted-foreground text-xs px-4">{t("auth.orContinueWith") || "or"}</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Social */}
        <div className="w-full space-y-3">
          <Button type="button" variant="outline" onClick={handleGoogleSignIn} disabled={isGoogleLoading} className="w-full h-14 bg-card border border-border hover:bg-muted rounded-xl text-base font-medium">
            {isGoogleLoading ? (
              <Loader2 className="mr-3 h-5 w-5 animate-spin" />
            ) : (
              <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            {t("auth.signInWithGoogle") || "Continue with Google"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
