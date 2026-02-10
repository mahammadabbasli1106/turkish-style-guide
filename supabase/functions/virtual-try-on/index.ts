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
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");
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
      .insert({ user_id: user.id, clothing_item_id: clothingItemId, status: "processing" })
      .select()
      .single();

    if (sessionError) throw new Error("Failed to create try-on session");

    // Build clothing description for the vision prompt
    let clothingDesc = `${clothingItem.name} (${clothingItem.category.replace("_", " ")}, ${clothingItem.color || "neutral"})`;
    if (additionalItems.length > 0) {
      const extras = additionalItems.map((item: any) =>
        `${item.name} (${item.category.replace("_", " ")}, ${item.color || "neutral"})`
      ).join(", ");
      clothingDesc += `, also wearing: ${extras}`;
    }

    // Prepare image URLs for GPT-4o Vision
    const userImageUrl = userImageBase64.startsWith("data:")
      ? userImageBase64
      : userImageBase64.startsWith("http")
        ? userImageBase64
        : `data:image/jpeg;base64,${userImageBase64}`;

    const clothImageUrl = clothingItem.image_url;

    // ── Step A: Vision Analysis with GPT-4o ──
    console.log("Step A: Analyzing images with GPT-4o Vision...");

    const visionResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a forensic-level physical description writer. Your ONLY job is to output a single image-generation prompt. No preamble, no quotes, no explanation.

Rules:
1. Study the user photo. Write a dry, clinical, technical description: estimated age, ethnicity, exact hair style/length/color, facial structure (jaw shape, nose, brow), facial hair if any, body type (slim/athletic/stocky/etc), skin tone.
2. Study the clothing photo. Describe it factually: garment type, fabric, color, pattern, fit style.
3. Combine into ONE prompt in this exact format:

"A raw photograph of a [age]-year-old [ethnicity] [man/woman] with [hair description] and [facial features], [body type] build, wearing [clothing description], standing against a plain white wall. Soft natural window lighting, 8k resolution, shot on Sony A7R IV, 85mm lens, f/1.8, shallow depth of field."

Do NOT use words like: beautiful, stunning, elegant, gorgeous, artistic, dramatic, cinematic.
Do NOT add items not visible in the photos.
Do NOT describe emotions or poses beyond "standing naturally".
Keep it under 80 words. Be blunt and specific like a police report.`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze these two images. The first is a photo of the user. The second is a clothing item: ${clothingDesc}. Generate a photorealistic DALL-E 3 prompt showing this person wearing this clothing item naturally.`,
              },
              { type: "image_url", image_url: { url: userImageUrl } },
              { type: "image_url", image_url: { url: clothImageUrl } },
            ],
          },
        ],
        max_tokens: 500,
      }),
    });

    if (!visionResponse.ok) {
      const errText = await visionResponse.text();
      console.error("GPT-4o Vision error:", visionResponse.status, errText);
      await supabase.from("try_on_sessions").update({ status: "failed" }).eq("id", session.id);

      if (visionResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Vision analysis failed: ${visionResponse.status}`);
    }

    const visionData = await visionResponse.json();
    const generationPrompt = visionData.choices?.[0]?.message?.content;

    if (!generationPrompt) {
      await supabase.from("try_on_sessions").update({ status: "failed" }).eq("id", session.id);
      throw new Error("Vision model returned no description");
    }

    console.log("Step A complete. Prompt length:", generationPrompt.length);

    // ── Step B: Image Generation with DALL-E 3 ──
    console.log("Step B: Generating image with DALL-E 3...");

    const dalleResponse = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: generationPrompt,
        n: 1,
        size: "1024x1024",
        quality: "hd",
        style: "natural",
      }),
    });

    if (!dalleResponse.ok) {
      const errText = await dalleResponse.text();
      console.error("DALL-E 3 error:", dalleResponse.status, errText);
      await supabase.from("try_on_sessions").update({ status: "failed" }).eq("id", session.id);

      if (dalleResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Image generation failed: ${dalleResponse.status}`);
    }

    const dalleData = await dalleResponse.json();
    const resultImageUrl = dalleData.data?.[0]?.url;

    if (!resultImageUrl) {
      await supabase.from("try_on_sessions").update({ status: "failed" }).eq("id", session.id);
      throw new Error("DALL-E 3 returned no image");
    }

    console.log("Step B complete. Image generated successfully.");

    // Update session with result
    await supabase
      .from("try_on_sessions")
      .update({ status: "completed", result_image_url: resultImageUrl })
      .eq("id", session.id);

    return new Response(JSON.stringify({
      sessionId: session.id,
      resultImageUrl,
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
