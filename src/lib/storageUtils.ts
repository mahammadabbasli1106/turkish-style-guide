import { supabase } from "@/integrations/supabase/client";

const SIGNED_URL_EXPIRY = 3600; // 1 hour

/**
 * Extract the storage path from a full public URL or return as-is if already a path.
 */
function extractStoragePath(bucket: string, urlOrPath: string): string {
  // If it's already a relative path (no http), return as-is
  if (!urlOrPath.startsWith("http")) return urlOrPath;

  // Extract path from public URL pattern: .../object/public/bucket-name/path
  const publicMarker = `/object/public/${bucket}/`;
  const publicIdx = urlOrPath.indexOf(publicMarker);
  if (publicIdx !== -1) {
    return urlOrPath.substring(publicIdx + publicMarker.length);
  }

  // Extract path from signed URL pattern: .../object/sign/bucket-name/path?token=...
  const signMarker = `/object/sign/${bucket}/`;
  const signIdx = urlOrPath.indexOf(signMarker);
  if (signIdx !== -1) {
    const pathWithQuery = urlOrPath.substring(signIdx + signMarker.length);
    return pathWithQuery.split("?")[0];
  }

  return urlOrPath;
}

/**
 * Generate a signed URL for a clothing-images file.
 * Handles both legacy public URLs and storage paths.
 */
export async function getSignedImageUrl(
  urlOrPath: string,
  bucket = "clothing-images",
  expiresIn = SIGNED_URL_EXPIRY
): Promise<string> {
  const path = extractStoragePath(bucket, urlOrPath);
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error || !data?.signedUrl) {
    console.error("Failed to create signed URL:", error);
    return urlOrPath; // fallback to original
  }
  return data.signedUrl;
}

/**
 * Generate signed URLs for an array of items with image_url field.
 */
export async function signImageUrls<T extends { image_url: string }>(
  items: T[],
  bucket = "clothing-images"
): Promise<T[]> {
  if (items.length === 0) return items;

  // Use bulk signed URLs for efficiency
  const paths = items.map((item) => extractStoragePath(bucket, item.image_url));
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls(paths, SIGNED_URL_EXPIRY);

  if (error || !data) {
    console.error("Failed to create signed URLs:", error);
    return items;
  }

  return items.map((item, i) => ({
    ...item,
    image_url: data[i]?.signedUrl || item.image_url,
  }));
}
