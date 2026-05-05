import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, Lock, Eye, Trash2, X, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface StepConsentProps {
  agreed: boolean;
  setAgreed: (v: boolean) => void;
}

export default function StepConsent({ agreed, setAgreed }: StepConsentProps) {
  const { t } = useTranslation();
  const [showPolicy, setShowPolicy] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);

  const updateAgreed = (consent: boolean, privacy: boolean, terms: boolean) => {
    setAgreed(consent && privacy && terms);
  };

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

      {/* Consent checkbox */}
      <label className="flex items-start gap-3 bg-white rounded-2xl p-4 shadow-sm border border-gray-200 cursor-pointer text-left">
        <Checkbox
          checked={consentChecked}
          onCheckedChange={(v) => {
            const val = v === true;
            setConsentChecked(val);
            updateAgreed(val, privacyChecked, termsChecked);
          }}
          className="mt-0.5"
        />
        <span className="text-sm text-gray-700 leading-snug">
          {t("onboarding.consentCheckbox")}
        </span>
      </label>

      {/* Privacy Policy checkbox */}
      <label className="flex items-start gap-3 bg-white rounded-2xl p-4 shadow-sm border border-gray-200 cursor-pointer text-left">
        <Checkbox
          checked={privacyChecked}
          onCheckedChange={(v) => {
            const val = v === true;
            setPrivacyChecked(val);
            updateAgreed(consentChecked, val, termsChecked);
          }}
          className="mt-0.5"
        />
        <span className="text-sm text-gray-700 leading-snug">
          I have read and agree to the{" "}
          <a
            href="https://sites.google.com/view/tarzly-privacy/home"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[#8A70D6] font-medium hover:underline inline-flex items-center gap-1"
          >
            Privacy Policy
            <ExternalLink className="h-3 w-3" />
          </a>
        </span>
      </label>

      {/* Terms & Conditions checkbox */}
      <label className="flex items-start gap-3 bg-white rounded-2xl p-4 shadow-sm border border-gray-200 cursor-pointer text-left">
        <Checkbox
          checked={termsChecked}
          onCheckedChange={(v) => {
            const val = v === true;
            setTermsChecked(val);
            updateAgreed(consentChecked, privacyChecked, val);
          }}
          className="mt-0.5"
        />
        <span className="text-sm text-gray-700 leading-snug">
          I have read and agree to the{" "}
          <a
            href="https://sites.google.com/view/tarzly-terms"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[#8A70D6] font-medium hover:underline inline-flex items-center gap-1"
          >
            Terms &amp; Conditions
            <ExternalLink className="h-3 w-3" />
          </a>
        </span>
      </label>

      {/* Withdraw note */}
      <div className="flex items-start gap-2 text-xs text-gray-400 px-2">
        <Trash2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>{t("onboarding.consentWithdraw")}</span>
      </div>
    </div>
  );
}
