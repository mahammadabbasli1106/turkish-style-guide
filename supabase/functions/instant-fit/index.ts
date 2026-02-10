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

    // Prepare user image as data URI
    let userDataUri = userImageBase64;
    if (!userImageBase64.startsWith("data:")) {
      if (userImageBase64.startsWith("http")) {
        const r = await fetch(userImageBase64);
        const buf = new Uint8Array(await r.arrayBuffer());
        const mime = r.headers.get("content-type") || "image/jpeg";
        userDataUri = `data:${mime};base64,${encodeBase64(buf)}`;
      } else {
        userDataUri = `data:image/jpeg;base64,${userImageBase64}`;
      }
    }

    // Prepare clothing image as data URI
    let clothDataUri = clothingImageBase64;
    if (!clothingImageBase64.startsWith("data:")) {
      if (clothingImageBase64.startsWith("http")) {
        const r = await fetch(clothingImageBase64);
        const buf = new Uint8Array(await r.arrayBuffer());
        const mime = r.headers.get("content-type") || "image/jpeg";
        clothDataUri = `data:${mime};base64,${encodeBase64(buf)}`;
      } else {
        clothDataUri = `data:image/jpeg;base64,${clothingImageBase64}`;
      }
    }

    console.log("Instant fit: editing user photo with captured clothing");

    // Prepare inline data for native Gemini API
    const userB64 = userDataUri.startsWith("data:")
      ? userDataUri.replace(/^data:image\/\w+;base64,/, "")
      : userDataUri;
    const userMimeMatch = userDataUri.match(/^data:(image\/\w+);base64,/);
    const userMime = userMimeMatch ? userMimeMatch[1] : "image/jpeg";

    const clothB64 = clothDataUri.startsWith("data:")
      ? clothDataUri.replace(/^data:image\/\w+;base64,/, "")
      : clothDataUri;
    const clothMimeMatch = clothDataUri.match(/^data:(image\/\w+);base64,/);
    const clothMime = clothMimeMatch ? clothMimeMatch[1] : "image/jpeg";

    const editResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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

    // Upload result
    const fileName = `instantfit_${session.id}_${Date.now()}.png`;
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
    console.error("instant-fit error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
