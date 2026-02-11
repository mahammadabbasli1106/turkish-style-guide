import { useState, useRef } from "react";
import { Camera, Upload, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { compressImage } from "@/lib/imageUtils";

interface StepFullBodyPhotoProps {
  photo: string | null;
  setPhoto: (v: string | null) => void;
  t: any;
}

export default function StepFullBodyPhoto({ photo, setPhoto, t }: StepFullBodyPhotoProps) {
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUri = e.target?.result as string;
        const compressed = await compressImage(dataUri, 800, 0.7);
        setPhoto(compressed);
        setLoading(false);
      };
      reader.onerror = () => setLoading(false);
      reader.readAsDataURL(file);
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="text-center space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {t("onboarding.photoTitle")}
        </h1>
        <p className="text-sm text-gray-500 mt-2">
          {t("onboarding.photoSubtitle")}
        </p>
      </div>

      {photo ? (
        <div className="relative inline-block">
          <img
            src={photo}
            alt="Full body"
            className="w-48 h-64 object-cover rounded-2xl border-2 border-[#8A70D6] shadow-lg mx-auto"
          />
          <button
            onClick={() => setPhoto(null)}
            className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center shadow-md"
          >
            <X className="h-4 w-4 text-white" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="w-48 h-64 mx-auto rounded-2xl border-2 border-dashed border-gray-300 bg-white flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-[#8A70D6] transition-colors shadow-sm"
        >
          {loading ? (
            <Loader2 className="h-8 w-8 animate-spin text-[#8A70D6]" />
          ) : (
            <>
              <Camera className="h-10 w-10 text-gray-400" />
              <span className="text-sm text-gray-500 font-medium">
                {t("onboarding.tapToUpload")}
              </span>
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      <p className="text-xs text-gray-400">
        {t("onboarding.photoHint")}
      </p>
    </div>
  );
}
