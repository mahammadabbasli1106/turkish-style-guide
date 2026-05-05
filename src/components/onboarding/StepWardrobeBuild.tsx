import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Trash2, Upload, AlertTriangle, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
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

type UploadJob = {
  id: string;
  fileName: string;
  previewUrl: string;
  status: "uploading" | "categorizing" | "saving" | "done" | "error";
  errorMessage?: string;
  // Cached data for retry
  storagePath?: string;
  base64?: string;
};

export default function StepWardrobeBuild({ t, onSkip }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [jobs, setJobs] = useState<UploadJob[]>([]);
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

  const updateJob = (id: string, patch: Partial<UploadJob>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  };

  const removeJob = (id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });

  const processJob = async (job: UploadJob, file?: File) => {
    if (!user) return;
    try {
      let storagePath = job.storagePath;
      let base64 = job.base64;

      // Upload if not yet uploaded
      if (!storagePath && file) {
        updateJob(job.id, { status: "uploading" });
        const fileExt = file.name.split(".").pop() || "jpg";
        storagePath = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("clothing-images")
          .upload(storagePath, file);
        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
        base64 = await fileToBase64(file);
        updateJob(job.id, { storagePath, base64 });
      }

      if (!storagePath || !base64) throw new Error("Missing file data");

      // AI categorize (retry transient 503/cold-start errors)
      updateJob(job.id, { status: "categorizing", errorMessage: undefined });
      let categoryData: any = null;
      let categoryError: any = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const res = await supabase.functions.invoke("categorize-clothing", {
          body: { imageUrl: base64 },
        });
        categoryData = res.data;
        categoryError = res.error;
        const msg = String(categoryError?.message || "").toLowerCase();
        const isTransient =
          categoryError &&
          (msg.includes("non-2xx") ||
            msg.includes("503") ||
            msg.includes("temporarily") ||
            msg.includes("failed to send"));
        if (!isTransient) break;
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
      }
      if (categoryError) throw new Error("AI service is briefly unavailable. Please try again.");
      if (categoryData?.error) throw new Error(categoryData.message || categoryData.error);
      if (!categoryData?.category) throw new Error("AI couldn't recognize the item");

      // Duplicate check — silently skip if same name+category+color exists
      const normName = String(categoryData.name).trim().toLowerCase();
      const normColor = (categoryData.color || "").trim().toLowerCase();
      const dup = (items as any[]).some(
        (existing) =>
          existing.category === categoryData.category &&
          (existing.name || "").trim().toLowerCase() === normName &&
          (existing.color || "").trim().toLowerCase() === normColor
      );
      if (dup) {
        // Clean up uploaded file
        await supabase.storage.from("clothing-images").remove([storagePath]).catch(() => {});
        updateJob(job.id, { status: "done", errorMessage: undefined });
        setTimeout(() => removeJob(job.id), 1200);
        toast("Already in your wardrobe — skipped");
        return;
      }

      // Save to DB
      updateJob(job.id, { status: "saving" });
      const { error: dbError } = await supabase.from("clothing_items").insert({
        user_id: user.id,
        name: categoryData.name,
        category: categoryData.category,
        color: categoryData.color,
        season: categoryData.season || [],
        image_url: storagePath,
        ai_tags: categoryData.tags || [],
      });
      if (dbError) throw new Error(`Save failed: ${dbError.message}`);

      updateJob(job.id, { status: "done" });
      queryClient.invalidateQueries({ queryKey: ["clothing-items"] });
      queryClient.invalidateQueries({ queryKey: ["clothing-count"] });

      // Auto-clear successful job after 1.2s
      setTimeout(() => removeJob(job.id), 1200);
    } catch (err: any) {
      console.error("Job error:", err);
      updateJob(job.id, {
        status: "error",
        errorMessage: err?.message || "Something went wrong",
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !user) return;

    const newJobs: { job: UploadJob; file: File }[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const job: UploadJob = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        fileName: file.name,
        previewUrl: URL.createObjectURL(file),
        status: "uploading",
      };
      newJobs.push({ job, file });
    }

    setJobs((prev) => [...prev, ...newJobs.map((n) => n.job)]);
    event.target.value = "";

    // Process in parallel
    await Promise.all(newJobs.map(({ job, file }) => processJob(job, file)));
  };

  const retryJob = (job: UploadJob) => {
    updateJob(job.id, { status: "categorizing", errorMessage: undefined });
    processJob(job);
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
  const anyUploading = jobs.some((j) => j.status !== "done" && j.status !== "error");

  const statusLabel = (j: UploadJob) => {
    switch (j.status) {
      case "uploading":
        return "Uploading…";
      case "categorizing":
        return "AI is analyzing…";
      case "saving":
        return "Saving…";
      case "done":
        return "Added!";
      case "error":
        return j.errorMessage || "Failed";
    }
  };

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
          disabled={anyUploading}
        />
        <div className="rounded-2xl border-2 border-dashed border-[#8A70D6]/40 bg-[#8A70D6]/5 p-8 text-center transition-colors hover:border-[#8A70D6] hover:bg-[#8A70D6]/10">
          <Upload className="h-8 w-8 mx-auto text-[#8A70D6] mb-2" />
          <p className="text-sm font-medium text-gray-900">Tap to upload photos</p>
          <p className="text-xs text-gray-500 mt-1">You can pick multiple at once</p>
        </div>
      </label>

      {/* Counter */}
      <p className="text-center text-sm font-medium text-gray-600">
        {count >= MIN_ITEMS
          ? `${count} items added — you're good to go!`
          : `${count} item${count === 1 ? "" : "s"} added — add ${remaining} more to continue`}
      </p>

      {/* Active upload jobs (per-file progress) */}
      {jobs.length > 0 && (
        <div className="space-y-2">
          {jobs.map((job) => {
            const isError = job.status === "error";
            const isDone = job.status === "done";
            return (
              <div
                key={job.id}
                className={`flex items-center gap-3 rounded-xl border p-2.5 bg-white ${
                  isError
                    ? "border-red-200 bg-red-50"
                    : isDone
                    ? "border-green-200 bg-green-50"
                    : "border-gray-200"
                }`}
              >
                <img
                  src={job.previewUrl}
                  alt=""
                  className="w-12 h-12 rounded-lg object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">{job.fileName}</p>
                  <p
                    className={`text-xs mt-0.5 ${
                      isError
                        ? "text-red-600"
                        : isDone
                        ? "text-green-600"
                        : "text-gray-500"
                    }`}
                  >
                    {statusLabel(job)}
                  </p>
                  {!isError && !isDone && (
                    <div className="mt-1.5 h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#8A70D6] transition-all duration-500"
                        style={{
                          width:
                            job.status === "uploading"
                              ? "33%"
                              : job.status === "categorizing"
                              ? "66%"
                              : "90%",
                        }}
                      />
                    </div>
                  )}
                </div>
                <div className="shrink-0 flex items-center gap-1">
                  {isError && (
                    <>
                      <button
                        onClick={() => retryJob(job)}
                        className="p-1.5 rounded-md bg-[#8A70D6] text-white hover:bg-[#7B61C7] transition"
                        aria-label="Retry"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => removeJob(job.id)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 transition"
                        aria-label="Dismiss"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </>
                  )}
                  {isDone && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                  {!isError && !isDone && (
                    <Loader2 className="h-4 w-4 animate-spin text-[#8A70D6]" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Items grid */}
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-[#8A70D6]" />
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {items.slice(0, 9).map((item: any) => (
            <div
              key={item.id}
              className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-50"
            >
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
