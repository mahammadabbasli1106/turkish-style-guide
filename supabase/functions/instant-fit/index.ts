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

    // Server-side usage limit check
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: usageCount } = await supabase
      .from("usage_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("feature", "instant_fit")
      .gte("created_at", twentyFourHoursAgo);
    
    if ((usageCount ?? 0) >= 2) {
      return new Response(JSON.stringify({ error: "Daily limit reached. Please try again tomorrow." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { userImageBase64, clothingImageBase64 } = await req.json();
    if (!userImageBase64) throw new Error("User profile photo is required");
    if (!clothingImageBase64) throw new Error("Clothing photo is required");

    // Create try-on session
    const { data: session, error: sessionError } = await supabase
      .from("try_on_sessions")
      .insert({ user_id: user.id, status: "processing" })
      .select()
      .single();

    if (sessionError) throw new Error("Failed to create try-on session");

    // Prepare user image - extract base64 and mime directly
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

    // Prepare clothing image
    let clothB64: string;
    let clothMime: string;
    if (clothingImageBase64.startsWith("data:")) {
      const mimeMatch = clothingImageBase64.match(/^data:(image\/\w+);base64,/);
      clothMime = mimeMatch ? mimeMatch[1] : "image/jpeg";
      clothB64 = clothingImageBase64.replace(/^data:image\/\w+;base64,/, "");
    } else if (clothingImageBase64.startsWith("http")) {
      const r = await fetch(clothingImageBase64);
      const buf = new Uint8Array(await r.arrayBuffer());
      clothMime = r.headers.get("content-type") || "image/jpeg";
      clothB64 = encodeBase64(buf);
    } else {
      clothMime = "image/jpeg";
      clothB64 = clothingImageBase64;
    }

    console.log("Instant fit: editing user photo with captured clothing");

    const requestBody = JSON.stringify({
      contents: [{
        parts: [
          {
            text: `Edit this photo of a person. Replace ONLY the clothing on the person with the clothing shown in the second image.

CRITICAL RULES:
- Keep the EXACT same person - same face, same skin, same hair, same body proportions
- Keep the EXACT same pose, position, and angle
- Keep the EXACT same background, lighting, and environment
- ONLY change the clothes the person is wearing to match the clothing in the second image
- Make the new clothing fit naturally on the person's body
- The first image is the person, the second image shows the clothing item to put on them
- Output a photorealistic result`
          },
          { inline_data: { mime_type: userMime, data: userB64 } },
          { inline_data: { mime_type: clothMime, data: clothB64 } },
        ],
      }],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    });

    // Free source image memory
    userB64 = "";
    clothB64 = "";

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

    // Upload result to private try-on-images bucket under user's folder
    const fileName = `${user.id}/instantfit_${session.id}_${Date.now()}.png`;
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
    await supabase.from("usage_events").insert({ user_id: user.id, feature: "instant_fit" });

    return new Response(JSON.stringify({ sessionId: session.id, resultImageUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("instant-fit error:", error);
    const SAFE_ERRORS = ["User profile photo is required", "Clothing photo is required", "Rate limit exceeded, please try again later", "No image generated"];
    const rawMsg = error instanceof Error ? error.message : "";
    const safeMsg = SAFE_ERRORS.includes(rawMsg) ? rawMsg : "An error occurred. Please try again.";
    return new Response(JSON.stringify({ error: safeMsg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
