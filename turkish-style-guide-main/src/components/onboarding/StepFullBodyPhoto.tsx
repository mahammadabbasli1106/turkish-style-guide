import { useState, useRef } from "react";
import { Camera, ImageIcon, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { compressImage } from "@/lib/imageUtils";

interface StepFullBodyPhotoProps {
  photo: string | null;
  setPhoto: (v: string | null) => void;
  t: any;
}

export default function StepFullBodyPhoto({ photo, setPhoto, t }: StepFullBodyPhotoProps) {
  const [loading, setLoading] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

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
        <div className="w-48 mx-auto space-y-3">
          <div className="w-48 h-64 rounded-2xl border-2 border-dashed border-gray-300 bg-white flex flex-col items-center justify-center gap-3 shadow-sm">
            {loading ? (
              <Loader2 className="h-8 w-8 animate-spin text-[#8A70D6]" />
            ) : (
              <>
                <Camera className="h-10 w-10 text-gray-400" />
                <span className="text-sm text-gray-500 font-medium px-4 text-center">
                  {t("onboarding.tapToUpload")}
                </span>
              </>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => cameraInputRef.current?.click()}
              disabled={loading}
              className="h-11 rounded-xl"
            >
              <Camera className="h-4 w-4 mr-1" />
              {t("onboarding.camera") || "Camera"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => galleryInputRef.current?.click()}
              disabled={loading}
              className="h-11 rounded-xl"
            >
              <ImageIcon className="h-4 w-4 mr-1" />
              {t("onboarding.gallery") || "Gallery"}
            </Button>
          </div>
        </div>
      )}

      <input
        ref={cameraInputRef}
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
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
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
