import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    for (let j = 0; j < chunk.length; j++) {
      binary += String.fromCharCode(chunk[j]);
    }
  }
  return btoa(binary);
}

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

    let clothingDesc = `${clothingItem.name} (${clothingItem.category.replace("_", " ")}, ${clothingItem.color || "neutral"})`;
    if (additionalItems.length > 0) {
      const extras = additionalItems.map((item: any) =>
        `${item.name} (${item.category.replace("_", " ")}, ${item.color || "neutral"})`
      ).join(", ");
      clothingDesc += `, also wearing: ${extras}`;
    }

    // Prepare user image as base64
    let userB64 = userImageBase64;
    let userMime = "image/jpeg";
    if (userImageBase64.startsWith("data:")) {
      const m = userImageBase64.match(/^data:(image\/\w+);base64,(.+)$/);
      if (m) { userMime = m[1]; userB64 = m[2]; }
    } else if (userImageBase64.startsWith("http")) {
      const r = await fetch(userImageBase64);
      userB64 = arrayBufferToBase64(await r.arrayBuffer());
      userMime = r.headers.get("content-type") || "image/jpeg";
    }

    // Fetch clothing image as base64
    let clothB64 = "";
    let clothMime = "image/jpeg";
    if (clothingItem.image_url) {
      const r = await fetch(clothingItem.image_url);
      clothB64 = arrayBufferToBase64(await r.arrayBuffer());
      clothMime = r.headers.get("content-type") || "image/jpeg";
    }

    // ── STEP 1: Analysis with gemini-2.5-flash ──
    console.log("Step 1: Analyzing with gemini-2.5-flash...");

    const step1Url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const step1Resp = await fetch(step1Url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: `You are a forensic-level physical description writer. Output ONLY a single image-generation prompt. No preamble, no quotes, no explanation.

Rules:
1. Study the user photo: estimated age, ethnicity, exact hair style/length/color, facial structure, facial hair, body type, skin tone.
2. Study the clothing: garment type, fabric, color, pattern, fit.
3. Output ONE prompt:
"A raw photograph of a [age]-year-old [ethnicity] [man/woman] with [hair] and [face], [body] build, wearing [clothing], standing against a plain white wall. Soft natural window lighting, 8k resolution, shot on Sony A7R IV, 85mm lens, f/1.8, shallow depth of field."

No words like beautiful/stunning/elegant/gorgeous/artistic/dramatic/cinematic.
No items not in the photos. No emotions. Under 80 words. Like a police report.

Clothing item: ${clothingDesc}` },
            { inlineData: { mimeType: userMime, data: userB64 } },
            { inlineData: { mimeType: clothMime, data: clothB64 } },
          ]
        }],
        generationConfig: { maxOutputTokens: 500, temperature: 0.3 },
      }),
    });

    if (!step1Resp.ok) {
      const err = await step1Resp.text();
      console.error("Step 1 failed:", step1Resp.status, err);
      await supabase.from("try_on_sessions").update({ status: "failed" }).eq("id", session.id);
      throw new Error(`Analysis failed (${step1Resp.status}): ${err.substring(0, 200)}`);
    }

    const step1Data = await step1Resp.json();
    const prompt = step1Data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!prompt) {
      await supabase.from("try_on_sessions").update({ status: "failed" }).eq("id", session.id);
      throw new Error("Gemini returned no description");
    }
    console.log("Step 1 done. Prompt:", prompt.substring(0, 80));

    // ── STEP 2: Image generation with gemini-2.5-flash-image (NO FALLBACK) ──
    console.log("Step 2: Generating with gemini-2.5-flash-preview-image-generation...");

    const step2Url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-image-generation:generateContent?key=${GEMINI_API_KEY}`;
    const step2Resp = await fetch(step2Url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
      }),
    });

    if (!step2Resp.ok) {
      const err = await step2Resp.text();
      console.error("Step 2 failed:", step2Resp.status, err);
      await supabase.from("try_on_sessions").update({ status: "failed" }).eq("id", session.id);
      throw new Error(`Model gemini-2.5-flash-image failed (${step2Resp.status}): ${err.substring(0, 200)}`);
    }

    const step2Data = await step2Resp.json();
    let resultB64: string | null = null;
    let resultMime = "image/png";
    const parts = step2Data.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData) {
        resultB64 = part.inlineData.data;
        resultMime = part.inlineData.mimeType || "image/png";
        break;
      }
    }

    if (!resultB64) {
      await supabase.from("try_on_sessions").update({ status: "failed" }).eq("id", session.id);
      throw new Error("gemini-2.5-flash-image returned no image data");
    }

    console.log("Step 2 done. Image generated.");

    // Upload to storage
    const fileName = `tryon_${session.id}_${Date.now()}.png`;
    const binaryStr = atob(resultB64);
    const fileBytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      fileBytes[i] = binaryStr.charCodeAt(i);
    }

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
