import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as encodeBase64, decode as decodeBase64 } from "https://deno.land/std@0.168.0/encoding/base64.ts";

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

    const { clothingItemId, userImageBase64, additionalItems = [] } = await req.json();
    if (!clothingItemId) throw new Error("Clothing item ID is required");
    if (!userImageBase64) throw new Error("User image is required");

    const { data: clothingItem, error: clothingError } = await supabase
      .from("clothing_items")
      .select("*")
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

    // Prepare user image - extract base64 and mime
    let userB64: string;
    let userMime: string;
    if (userImageBase64.startsWith("data:")) {
      const mimeMatch = userImageBase64.match(/^data:(image\/\w+);base64,/);
      userMime = mimeMatch ? mimeMatch[1] : "image/jpeg";
      userB64 = userImageBase64.replace(/^data:image\/\w+;base64,/, "");
    } else if (userImageBase64.startsWith("http")) {
      const r = await fetch(userImageBase64);
      const buf = new Uint8Array(await r.arrayBuffer());
      userMime = r.headers.get("content-type") || "image/jpeg";
      userB64 = encodeBase64(buf);
    } else {
      userMime = "image/jpeg";
      userB64 = userImageBase64;
    }

    // Prepare clothing image - fetch from storage URL
    let clothB64 = "";
    let clothMime = "image/jpeg";
    if (clothingItem.image_url) {
      const r = await fetch(clothingItem.image_url);
      const buf = new Uint8Array(await r.arrayBuffer());
      clothMime = r.headers.get("content-type") || "image/jpeg";
      clothB64 = encodeBase64(buf);
    }

    console.log("Editing user photo with clothing:", clothingDesc);

    const parts: any[] = [
      {
        text: `Edit this photo of a person. Replace ONLY the clothing on the person with: ${clothingDesc}.

CRITICAL RULES:
- Keep the EXACT same person - same face, same skin, same hair, same body proportions
- Keep the EXACT same pose, position, and angle
- Keep the EXACT same background, lighting, and environment
- ONLY change the clothes the person is wearing
- Make the new clothing fit naturally on the person's body
- The second image shows the clothing item to put on the person
- Output a photorealistic result`
      },
      { inline_data: { mime_type: userMime, data: userB64 } },
    ];

    // Free user image memory
    userB64 = "";

    if (clothB64) {
      parts.push({ inline_data: { mime_type: clothMime, data: clothB64 } });
      clothB64 = "";
    }

    const editResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
          },
        }),
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

    // Upload result
    const fileName = `tryon_${session.id}_${Date.now()}.png`;
    const fileBytes = decodeBase64(resultB64);

    const { error: uploadError } = await supabase.storage
      .from("clothing-images")
      .upload(`tryons/${fileName}`, fileBytes, { contentType: resultMime, upsert: true });

    let resultImageUrl: string;
    if (uploadError) {
      console.error("Upload error, using data URI:", uploadError);
      resultImageUrl = `data:${resultMime};base64,${resultB64}`;
    } else {
      const { data: pubUrl } = supabase.storage.from("clothing-images").getPublicUrl(`tryons/${fileName}`);
      resultImageUrl = pubUrl.publicUrl;
    }

    await supabase.from("try_on_sessions")
      .update({ status: "completed", result_image_url: resultImageUrl })
      .eq("id", session.id);

    return new Response(JSON.stringify({ sessionId: session.id, resultImageUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("virtual-try-on error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
