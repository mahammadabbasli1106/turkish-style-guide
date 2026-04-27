import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decode as decodeBase64 } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase env missing");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization header required");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error("Invalid authentication");

    // Server-side usage limit check
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: usageCount } = await supabase
      .from("usage_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("feature", "virtual_tryon")
      .gte("created_at", twentyFourHoursAgo);
    
    if ((usageCount ?? 0) >= 12) {
      return new Response(JSON.stringify({ error: "Daily limit reached. Please try again tomorrow." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { clothingItemId, userImageBase64, clothingImageBase64, additionalItems = [] } = await req.json();
    if (!clothingItemId) throw new Error("Clothing item ID is required");
    if (!userImageBase64) throw new Error("User image is required");

    const { data: clothingItem, error: clothingError } = await supabase
      .from("clothing_items")
      .select("name, category, color")
      .eq("id", clothingItemId)
      .eq("user_id", user.id)
      .single();

    if (clothingError || !clothingItem) throw new Error("Clothing item not found");

    const { data: session, error: sessionError } = await supabase
      .from("try_on_sessions")
      .insert({ user_id: user.id, clothing_item_id: clothingItemId, status: "processing" })
      .select()
      .single();

    if (sessionError) throw new Error("Failed to create try-on session");

    // Build clothing description
    let clothingDesc = `${clothingItem.name} (${clothingItem.category.replace("_", " ")}, ${clothingItem.color || "neutral"})`;
    if (additionalItems.length > 0) {
      const extras = additionalItems.map((item: any) =>
        `${item.name} (${item.category.replace("_", " ")}, ${item.color || "neutral"})`
      ).join(", ");
      clothingDesc += `, and also: ${extras}`;
    }

    // Extract base64 and mime from user image (already compressed by client)
    let userB64: string;
    let userMime: string;
    if (userImageBase64.startsWith("data:")) {
      const mimeMatch = userImageBase64.match(/^data:(image\/\w+);base64,/);
      userMime = mimeMatch ? mimeMatch[1] : "image/jpeg";
      userB64 = userImageBase64.replace(/^data:image\/\w+;base64,/, "");
    } else {
      userMime = "image/jpeg";
      userB64 = userImageBase64;
    }

    // Use client-compressed clothing image if provided, otherwise skip
    let clothB64 = "";
    let clothMime = "image/jpeg";
    if (clothingImageBase64) {
      if (clothingImageBase64.startsWith("data:")) {
        const mimeMatch = clothingImageBase64.match(/^data:(image\/\w+);base64,/);
        clothMime = mimeMatch ? mimeMatch[1] : "image/jpeg";
        clothB64 = clothingImageBase64.replace(/^data:image\/\w+;base64,/, "");
      } else {
        clothB64 = clothingImageBase64;
      }
    }

    console.log("Editing user photo with clothing:", clothingDesc);

    // Build an enumerated list so the prompt and images line up
    const itemImages: { mime: string; b64: string; label: string }[] = [];
    if (clothB64) {
      itemImages.push({
        mime: clothMime,
        b64: clothB64,
        label: `${clothingItem.name} (${clothingItem.category.replace("_", " ")})`,
      });
    }
    for (const extra of additionalItems) {
      if (!extra?.imageBase64) continue;
      let b64 = extra.imageBase64 as string;
      let mime = "image/jpeg";
      if (b64.startsWith("data:")) {
        const m = b64.match(/^data:(image\/\w+);base64,/);
        mime = m ? m[1] : "image/jpeg";
        b64 = b64.replace(/^data:image\/\w+;base64,/, "");
      }
      itemImages.push({
        mime,
        b64,
        label: `${extra.name} (${String(extra.category).replace("_", " ")})`,
      });
    }

    const itemListLines = itemImages
      .map((it, i) => `  ${i + 2}. ${it.label}`)
      .join("\n");

    const promptText = `Edit image #1 (a photo of a person) so the person is wearing ALL of the following clothing items together as a complete outfit: ${clothingDesc}.

Reference images for the clothing items (use ALL of them):
${itemListLines}

CRITICAL RULES:
- Keep the EXACT same person — same face, skin tone, hair, and body proportions as image #1
- Keep the EXACT same pose, camera angle, framing, background, and lighting as image #1
- Replace ONLY the clothing on the person
- The person MUST end up wearing every single item listed above at the same time (e.g. a jacket goes OVER the shirt, trousers on the legs, etc.)
- Each new garment must visually match its reference image (color, pattern, cut, length, sleeves)
- Make every garment fit naturally and layer correctly
- Output ONE photorealistic image of the person in the full outfit`;

    const parts: any[] = [
      { text: promptText },
      { inline_data: { mime_type: userMime, data: userB64 } },
    ];

    // Free user image memory
    userB64 = "";

    for (const it of itemImages) {
      parts.push({ inline_data: { mime_type: it.mime, data: it.b64 } });
    }
    itemImages.length = 0;
    clothB64 = "";

    // Serialize and free parts array
    const requestBody = JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    });
    parts.length = 0;

    const editResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody,
      }
    );

    if (!editResp.ok) {
      const err = await editResp.text();
      console.error("Image edit failed:", editResp.status, err);
      await supabase.from("try_on_sessions").update({ status: "failed" }).eq("id", session.id);
      if (editResp.status === 429) throw new Error("Rate limit exceeded, please try again later");
      if (editResp.status === 402) throw new Error("Usage limit reached, please add credits");
      throw new Error(`Image editing failed (${editResp.status})`);
    }

    const editData = await editResp.json();
    let resultB64: string | null = null;
    let resultMime = "image/png";

    // Extract image from native Gemini response
    const candidateParts = editData.candidates?.[0]?.content?.parts || [];
    for (const part of candidateParts) {
      if (part.inlineData) {
        resultB64 = part.inlineData.data;
        resultMime = part.inlineData.mimeType || "image/png";
        break;
      }
    }

    if (!resultB64) {
      await supabase.from("try_on_sessions").update({ status: "failed" }).eq("id", session.id);
      throw new Error("No image generated");
    }

    console.log("Image edit done. Uploading...");

    // Upload result to private try-on-images bucket under user's folder
    const fileName = `${user.id}/tryon_${session.id}_${Date.now()}.png`;
    const fileBytes = decodeBase64(resultB64);

    const { error: uploadError } = await supabase.storage
      .from("try-on-images")
      .upload(fileName, fileBytes, { contentType: resultMime, upsert: true });

    let resultImageUrl: string;
    if (uploadError) {
      console.error("Upload error, using data URI:", uploadError);
      resultImageUrl = `data:${resultMime};base64,${resultB64}`;
    } else {
      // Create a signed URL that expires in 1 hour
      const { data: signedData, error: signError } = await supabase.storage
        .from("try-on-images")
        .createSignedUrl(fileName, 3600);
      if (signError || !signedData?.signedUrl) {
        console.error("Signed URL error:", signError);
        resultImageUrl = `data:${resultMime};base64,${resultB64}`;
      } else {
        resultImageUrl = signedData.signedUrl;
      }
    }

    await supabase.from("try_on_sessions")
      .update({ status: "completed", result_image_url: resultImageUrl })
      .eq("id", session.id);

    // Record usage server-side
    await supabase.from("usage_events").insert({ user_id: user.id, feature: "virtual_tryon" });

    return new Response(JSON.stringify({ sessionId: session.id, resultImageUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("virtual-try-on error:", error);
    const SAFE_ERRORS = ["Clothing item ID is required", "User image is required", "Clothing item not found", "Rate limit exceeded, please try again later", "No image generated"];
    const rawMsg = error instanceof Error ? error.message : "";
    const safeMsg = SAFE_ERRORS.includes(rawMsg) ? rawMsg : "An error occurred. Please try again.";
    return new Response(JSON.stringify({ error: safeMsg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
