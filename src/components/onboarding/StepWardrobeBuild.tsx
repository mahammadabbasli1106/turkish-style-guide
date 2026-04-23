import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Plus, Trash2, Upload, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { signImageUrls } from "@/lib/storageUtils";

interface Props {
  t: any;
  onSkip: () => void;
}

const MIN_ITEMS = 3;

export default function StepWardrobeBuild({ t, onSkip }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [skipDialogOpen, setSkipDialogOpen] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["clothing-items", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("clothing_items")
        .select("id, name, category, image_url")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return signImageUrls(data as any[]);
    },
    enabled: !!user,
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !user) return;
    setUploading(true);
    let successCount = 0;

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      try {
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("clothing-images")
          .upload(fileName, file);
        if (uploadError) throw uploadError;

        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
        });

        const { data: categoryData, error: categoryError } = await supabase.functions.invoke(
          "categorize-clothing",
          { body: { imageUrl: base64 } }
        );
        if (categoryError) throw categoryError;

        const { error: dbError } = await supabase.from("clothing_items").insert({
          user_id: user.id,
          name: categoryData.name,
          category: categoryData.category,
          color: categoryData.color,
          season: categoryData.season || [],
          image_url: fileName,
          ai_tags: categoryData.tags || [],
        });
        if (dbError) throw dbError;
        successCount++;
      } catch (err) {
        console.error("Upload error:", err);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    if (successCount > 0) {
      queryClient.invalidateQueries({ queryKey: ["clothing-items"] });
      queryClient.invalidateQueries({ queryKey: ["clothing-count"] });
      toast.success(`Added ${successCount} item${successCount > 1 ? "s" : ""}`);
    }
    setUploading(false);
    event.target.value = "";
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("clothing_items").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["clothing-items"] });
    queryClient.invalidateQueries({ queryKey: ["clothing-count"] });
  };

  const count = items.length;
  const remaining = Math.max(0, MIN_ITEMS - count);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Add your first clothes</h1>
        <p className="text-sm text-gray-500 mt-2">
          Add at least {MIN_ITEMS} items to get your first suggestion.
        </p>
      </div>

      {/* Upload area */}
      <label className="block cursor-pointer">
        <input
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={handleFileUpload}
          disabled={uploading}
        />
        <div className="rounded-2xl border-2 border-dashed border-[#8A70D6]/40 bg-[#8A70D6]/5 p-8 text-center transition-colors hover:border-[#8A70D6] hover:bg-[#8A70D6]/10">
          {uploading ? (
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-[#8A70D6]" />
          ) : (
            <>
              <Upload className="h-8 w-8 mx-auto text-[#8A70D6] mb-2" />
              <p className="text-sm font-medium text-gray-900">Tap to upload photos</p>
              <p className="text-xs text-gray-500 mt-1">You can pick multiple at once</p>
            </>
          )}
        </div>
      </label>

      {/* Counter */}
      <p className="text-center text-sm font-medium text-gray-600">
        {count >= MIN_ITEMS
          ? `${count} items added — you're good to go!`
          : `${count} item${count === 1 ? "" : "s"} added — add ${remaining} more to continue`}
      </p>

      {/* Items grid */}
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-[#8A70D6]" />
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {items.slice(0, 9).map((item: any) => (
            <div key={item.id} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
              <button
                onClick={() => handleDelete(item.id)}
                className="absolute top-1 right-1 p-1 bg-red-500 rounded-md shadow-md"
                aria-label="Delete item"
              >
                <Trash2 className="h-3 w-3 text-white" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {/* Skip link */}
      <div className="text-center pt-2">
        <button
          onClick={() => setSkipDialogOpen(true)}
          className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2"
        >
          Skip for now
        </button>
      </div>

      <AlertDialog open={skipDialogOpen} onOpenChange={setSkipDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Skip wardrobe setup?
            </AlertDialogTitle>
            <AlertDialogDescription>
              With fewer than {MIN_ITEMS} items, suggestions may not work well. Skip anyway?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep adding</AlertDialogCancel>
            <AlertDialogAction onClick={onSkip}>Skip anyway</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
