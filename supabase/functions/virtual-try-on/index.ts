import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FAL_KEY = Deno.env.get("FAL_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!FAL_KEY) throw new Error("FAL_KEY is not configured");
    if (!SUPABASE_URL) throw new Error("SUPABASE_URL is not configured");
    if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization header required");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error("Invalid authentication");

    const { clothingItemId, userImageBase64, additionalItems = [] } = await req.json();

    if (!clothingItemId) throw new Error("Clothing item ID is required");
    if (!userImageBase64) throw new Error("User image is required");

    // Fetch the primary clothing item
    const { data: clothingItem, error: clothingError } = await supabase
      .from("clothing_items")
      .select("*")
      .eq("id", clothingItemId)
      .eq("user_id", user.id)
      .single();

    if (clothingError || !clothingItem) throw new Error("Clothing item not found");

    // Create try-on session
    const { data: session, error: sessionError } = await supabase
      .from("try_on_sessions")
      .insert({
        user_id: user.id,
        clothing_item_id: clothingItemId,
        status: "processing",
      })
      .select()
      .single();

    if (sessionError) throw new Error("Failed to create try-on session");

    // --- Step 1: Upload images to Supabase Storage ---
    const timestamp = Date.now();

    // Helper: decode base64 (handles data URI or raw base64)
    const decodeBase64 = (input: string): { bytes: Uint8Array; mime: string } => {
      let base64 = input;
      let mime = "image/jpeg";
      if (input.startsWith("data:")) {
        const match = input.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          mime = match[1];
          base64 = match[2];
        }
      }
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return { bytes, mime };
    };

    // Helper: fetch image URL and return bytes
    const fetchImageBytes = async (url: string): Promise<{ bytes: Uint8Array; mime: string }> => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch image: ${url}`);
      const mime = res.headers.get("content-type") || "image/jpeg";
      const buffer = await res.arrayBuffer();
      return { bytes: new Uint8Array(buffer), mime };
    };

    // Upload user image
    let userImageBytes: Uint8Array;
    let userImageMime: string;
    if (userImageBase64.startsWith("http://") || userImageBase64.startsWith("https://")) {
      const fetched = await fetchImageBytes(userImageBase64);
      userImageBytes = fetched.bytes;
      userImageMime = fetched.mime;
    } else {
      const decoded = decodeBase64(userImageBase64);
      userImageBytes = decoded.bytes;
      userImageMime = decoded.mime;
    }

    const userImageExt = userImageMime.includes("png") ? "png" : "jpg";
    const userImagePath = `${user.id}/user_${timestamp}.${userImageExt}`;

    const { error: userUploadError } = await supabase.storage
      .from("try-on-images")
      .upload(userImagePath, userImageBytes, {
        contentType: userImageMime,
        upsert: true,
      });
    if (userUploadError) throw new Error(`Failed to upload user image: ${userUploadError.message}`);

    const { data: userImageUrlData } = supabase.storage
      .from("try-on-images")
      .getPublicUrl(userImagePath);
    const humanImageUrl = userImageUrlData.publicUrl;

    // Upload clothing image
    let clothingImageUrl: string;
    if (clothingItem.image_url.startsWith("http://") || clothingItem.image_url.startsWith("https://")) {
      // If already a public URL, use directly
      clothingImageUrl = clothingItem.image_url;
    } else {
      // Upload base64 clothing image
      const clothDecoded = decodeBase64(clothingItem.image_url);
      const clothExt = clothDecoded.mime.includes("png") ? "png" : "jpg";
      const clothPath = `${user.id}/cloth_${timestamp}.${clothExt}`;
      const { error: clothUploadError } = await supabase.storage
        .from("try-on-images")
        .upload(clothPath, clothDecoded.bytes, {
          contentType: clothDecoded.mime,
          upsert: true,
        });
      if (clothUploadError) throw new Error(`Failed to upload clothing image: ${clothUploadError.message}`);
      const { data: clothUrlData } = supabase.storage
        .from("try-on-images")
        .getPublicUrl(clothPath);
      clothingImageUrl = clothUrlData.publicUrl;
    }

    // Build garment description
    let garmentDesc = `${clothingItem.name} (${clothingItem.category.replace("_", " ")}, ${clothingItem.color || "neutral"})`;
    if (additionalItems.length > 0) {
      const extras = additionalItems.map((item: any) =>
        `${item.name} (${item.category.replace("_", " ")}, ${item.color || "neutral"})`
      ).join(", ");
      garmentDesc += `, ${extras}`;
    }

    // --- Step 2: Call Fal.ai IDM-VTON ---
    console.log("Calling Fal.ai IDM-VTON with:", { humanImageUrl, clothingImageUrl, garmentDesc });

    const falResponse = await fetch("https://queue.fal.run/fal-ai/idm-vton", {
      method: "POST",
      headers: {
        "Authorization": `Key ${FAL_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        human_image_url: humanImageUrl,
        garm_img_url: clothingImageUrl,
        garment_des: garmentDesc,
      }),
    });

    if (!falResponse.ok) {
      const errorText = await falResponse.text();
      console.error("Fal.ai error:", falResponse.status, errorText);

      await supabase
        .from("try_on_sessions")
        .update({ status: "failed" })
        .eq("id", session.id);

      if (falResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Fal.ai error: ${falResponse.status} - ${errorText}`);
    }

    const falResult = await falResponse.json();
    console.log("Fal.ai result:", JSON.stringify(falResult).slice(0, 500));

    // Fal.ai queue API returns a request_id for async processing
    // We need to poll for the result
    let resultImageUrl: string | null = null;

    if (falResult.images?.[0]?.url) {
      // Synchronous result
      resultImageUrl = falResult.images[0].url;
    } else if (falResult.request_id) {
      // Async queue - poll for result
      const requestId = falResult.request_id;
      const pollUrl = `https://queue.fal.run/fal-ai/idm-vton/requests/${requestId}/status`;
      const resultUrl = `https://queue.fal.run/fal-ai/idm-vton/requests/${requestId}`;

      // Poll for up to 120 seconds
      const maxAttempts = 60;
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise(r => setTimeout(r, 2000));

        const statusRes = await fetch(pollUrl, {
          headers: { "Authorization": `Key ${FAL_KEY}` },
        });

        if (!statusRes.ok) {
          console.error("Poll status error:", statusRes.status);
          continue;
        }

        const statusData = await statusRes.json();
        console.log(`Poll attempt ${i + 1}:`, statusData.status);

        if (statusData.status === "COMPLETED") {
          // Fetch the result
          const resultRes = await fetch(resultUrl, {
            headers: { "Authorization": `Key ${FAL_KEY}` },
          });
          if (resultRes.ok) {
            const resultData = await resultRes.json();
            console.log("Fal.ai completed result:", JSON.stringify(resultData).slice(0, 1000));
            resultImageUrl = resultData.image?.url 
              || resultData.images?.[0]?.url 
              || resultData.output?.url
              || (typeof resultData.image === "string" ? resultData.image : null)
              || null;
          } else {
            console.error("Failed to fetch result:", resultRes.status, await resultRes.text());
          }
          break;
        } else if (statusData.status === "FAILED") {
          throw new Error("Fal.ai processing failed");
        }
      }
    }

    if (!resultImageUrl) {
      await supabase
        .from("try_on_sessions")
        .update({ status: "failed" })
        .eq("id", session.id);
      throw new Error("Failed to generate try-on result - no image returned");
    }

    // Update session with result
    await supabase
      .from("try_on_sessions")
      .update({
        status: "completed",
        result_image_url: resultImageUrl,
      })
      .eq("id", session.id);

    // Clean up temporary uploaded images (best-effort)
    supabase.storage.from("try-on-images").remove([userImagePath]).catch(() => {});

    return new Response(JSON.stringify({
      sessionId: session.id,
      resultImageUrl: resultImageUrl,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("virtual-try-on error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
