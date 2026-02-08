import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Download, Smartphone, CheckCircle, Share } from "lucide-react";
import LanguageSwitch from "@/components/LanguageSwitch";
import { Link } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallApp() {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Check if iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4 flex justify-between items-center">
        <Link to="/" className="font-display text-2xl font-bold text-gradient">
          StyleAI
        </Link>
        <LanguageSwitch />
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center space-y-8"
        >
          <div className="w-24 h-24 mx-auto bg-gradient-primary rounded-3xl flex items-center justify-center shadow-warm">
            <Smartphone size={48} className="text-primary-foreground" />
          </div>

          <div className="space-y-3">
            <h1 className="font-display text-3xl font-bold text-foreground">
              {t("pwa.install")}
            </h1>
            <p className="text-muted-foreground">
              {t("pwa.installPrompt")}
            </p>
          </div>

          {isInstalled ? (
            <div className="bg-accent/10 text-accent-foreground rounded-2xl p-6 space-y-4">
              <CheckCircle size={48} className="mx-auto text-accent" />
              <p className="font-medium">App is already installed!</p>
              <Link to="/dashboard">
                <Button className="w-full bg-gradient-primary text-primary-foreground">
                  Open App
                </Button>
              </Link>
            </div>
          ) : isIOS ? (
            <div className="bg-card rounded-2xl p-6 shadow-card border border-border space-y-4">
              <h3 className="font-semibold text-foreground">Install on iOS</h3>
              <ol className="text-left text-muted-foreground space-y-3">
                <li className="flex items-start gap-3">
                  <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm flex-shrink-0">1</span>
                  <span>Tap the <Share size={16} className="inline" /> Share button in Safari</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm flex-shrink-0">2</span>
                  <span>Scroll down and tap "Add to Home Screen"</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm flex-shrink-0">3</span>
                  <span>Tap "Add" to install</span>
                </li>
              </ol>
            </div>
          ) : deferredPrompt ? (
            <Button
              onClick={handleInstall}
              size="lg"
              className="w-full bg-gradient-primary text-primary-foreground shadow-warm"
            >
              <Download className="mr-2 h-5 w-5" />
              {t("common.install")}
            </Button>
          ) : (
            <div className="bg-card rounded-2xl p-6 shadow-card border border-border space-y-4">
              <h3 className="font-semibold text-foreground">Install on Android</h3>
              <ol className="text-left text-muted-foreground space-y-3">
                <li className="flex items-start gap-3">
                  <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm flex-shrink-0">1</span>
                  <span>Open Chrome browser menu (⋮)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm flex-shrink-0">2</span>
                  <span>Tap "Install app" or "Add to Home screen"</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm flex-shrink-0">3</span>
                  <span>Tap "Install" to confirm</span>
                </li>
              </ol>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Why install?</h3>
            <ul className="text-muted-foreground space-y-2">
              <li>✓ Works offline</li>
              <li>✓ Faster loading</li>
              <li>✓ Full screen experience</li>
              <li>✓ Quick access from home screen</li>
            </ul>
          </div>

          <Link to="/dashboard" className="block">
            <Button variant="ghost">
              Continue in browser instead
            </Button>
          </Link>
        </motion.div>
      </main>
    </div>
  );
}
