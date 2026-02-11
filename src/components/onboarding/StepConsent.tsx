import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, Lock, Eye, Trash2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface StepConsentProps {
  agreed: boolean;
  setAgreed: (v: boolean) => void;
}

export default function StepConsent({ agreed, setAgreed }: StepConsentProps) {
  const { t } = useTranslation();
  const [showPolicy, setShowPolicy] = useState(false);

  return (
    <div className="text-center space-y-6">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#8A70D6]/10">
        <Shield className="h-8 w-8 text-[#8A70D6]" />
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {t("onboarding.consentTitle")}
        </h1>
        <p className="text-sm text-gray-500 mt-2">
          {t("onboarding.consentSubtitle")}
        </p>
      </div>

      {/* Info bullets */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200 text-left space-y-4">
        <div className="flex gap-3">
          <div className="mt-0.5 shrink-0 w-8 h-8 rounded-full bg-[#8A70D6]/10 flex items-center justify-center">
            <Eye className="h-4 w-4 text-[#8A70D6]" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              {t("onboarding.consentBodyTitle")}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {t("onboarding.consentBodyDesc")}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="mt-0.5 shrink-0 w-8 h-8 rounded-full bg-[#8A70D6]/10 flex items-center justify-center">
            <Eye className="h-4 w-4 text-[#8A70D6]" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              {t("onboarding.consentPhotoTitle")}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {t("onboarding.consentPhotoDesc")}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="mt-0.5 shrink-0 w-8 h-8 rounded-full bg-[#8A70D6]/10 flex items-center justify-center">
            <Lock className="h-4 w-4 text-[#8A70D6]" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              {t("onboarding.consentEncryptionTitle")}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {t("onboarding.consentEncryptionDesc")}
            </p>
          </div>
        </div>
      </div>

      {/* Checkbox */}
      <label className="flex items-start gap-3 bg-white rounded-2xl p-4 shadow-sm border border-gray-200 cursor-pointer text-left">
        <Checkbox
          checked={agreed}
          onCheckedChange={(v) => setAgreed(v === true)}
          className="mt-0.5"
        />
        <span className="text-sm text-gray-700 leading-snug">
          {t("onboarding.consentCheckbox")}
        </span>
      </label>

      {/* Withdraw note */}
      <div className="flex items-start gap-2 text-xs text-gray-400 px-2">
        <Trash2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>{t("onboarding.consentWithdraw")}</span>
      </div>

      {/* Privacy Policy link */}
      <button
        onClick={() => setShowPolicy(true)}
        className="text-sm text-[#8A70D6] font-medium hover:underline"
      >
        {t("onboarding.viewPrivacyPolicy")}
      </button>

      {/* Privacy Policy Modal */}
      <AnimatePresence>
        {showPolicy && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowPolicy(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-xl"
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">
                  {t("onboarding.privacyPolicyTitle")}
                </h2>
                <button
                  onClick={() => setShowPolicy(false)}
                  className="p-1 rounded-full hover:bg-gray-100"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              <div className="p-5 overflow-y-auto text-left text-sm text-gray-700 space-y-4 leading-relaxed">
                <p className="font-semibold">Privacy Policy — Version 1.0</p>
                <p>
                  tarzly.ai ("we", "our", "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your personal data.
                </p>
                <p className="font-semibold">1. Data We Collect</p>
                <p>
                  We collect the following data to provide our AI-powered styling service: display name, gender preference, height, weight, location, style preferences, clothing photos, and full-body photos.
                </p>
                <p className="font-semibold">2. How We Use Your Data</p>
                <p>
                  Your data is used solely to provide personalized outfit suggestions, virtual try-on features, and weather-based styling recommendations. We use AI models to analyze your body profile and wardrobe for accurate outfit matching.
                </p>
                <p className="font-semibold">3. Data Protection</p>
                <p>
                  All personal data is encrypted in transit and at rest. Your data is never sold or shared with third parties for marketing purposes. Access to your data is restricted through row-level security policies.
                </p>
                <p className="font-semibold">4. Your Rights</p>
                <p>
                  You can withdraw consent, export, or delete all your data at any time through Profile Settings. Upon account deletion, all your data is permanently removed from our systems.
                </p>
                <p className="font-semibold">5. Contact</p>
                <p>
                  For any privacy-related inquiries, please contact us through the app's support channels.
                </p>
                <p className="text-xs text-gray-400 mt-4">
                  Last updated: February 2026 • Version 1.0
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
