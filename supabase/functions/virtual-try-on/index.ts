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

    // Build clothing description
    let clothingDesc = `${clothingItem.name} (${clothingItem.category.replace("_", " ")}, ${clothingItem.color || "neutral"})`;
    if (additionalItems.length > 0) {
      const extras = additionalItems.map((item: any) =>
        `${item.name} (${item.category.replace("_", " ")}, ${item.color || "neutral"})`
      ).join(", ");
      clothingDesc += `, also wearing: ${extras}`;
    }

    // Prepare image data for Gemini
    // For Gemini we need base64 data without the data URI prefix
    let userImageBase64Clean = userImageBase64;
    let userImageMimeType = "image/jpeg";
    if (userImageBase64.startsWith("data:")) {
      const match = userImageBase64.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        userImageMimeType = match[1];
        userImageBase64Clean = match[2];
      }
    } else if (userImageBase64.startsWith("http")) {
      // Fetch the image and convert to base64
      const imgResp = await fetch(userImageBase64);
      const imgBuf = await imgResp.arrayBuffer();
      userImageBase64Clean = btoa(String.fromCharCode(...new Uint8Array(imgBuf)));
      const ct = imgResp.headers.get("content-type");
      if (ct) userImageMimeType = ct;
    }

    // Fetch clothing image as base64
    let clothImageBase64 = "";
    let clothImageMimeType = "image/jpeg";
    if (clothingItem.image_url) {
      const imgResp = await fetch(clothingItem.image_url);
      const imgBuf = await imgResp.arrayBuffer();
      clothImageBase64 = btoa(String.fromCharCode(...new Uint8Array(imgBuf)));
      const ct = imgResp.headers.get("content-type");
      if (ct) clothImageMimeType = ct;
    }

    // ── STEP 1: Text Analysis with Gemini Flash ──
    console.log("Step 1: Analyzing images with Gemini 2.5 Flash...");

    const analysisUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const analysisPayload = {
      contents: [
        {
          parts: [
            {
              text: `You are a forensic-level physical description writer. Your ONLY job is to output a single image-generation prompt. No preamble, no quotes, no explanation.

Rules:
1. Study the user photo. Write a dry, clinical, technical description: estimated age, ethnicity, exact hair style/length/color, facial structure (jaw shape, nose, brow), facial hair if any, body type (slim/athletic/stocky/etc), skin tone.
2. Study the clothing photo. Describe it factually: garment type, fabric, color, pattern, fit style.
3. Combine into ONE prompt in this exact format:

"A raw photograph of a [age]-year-old [ethnicity] [man/woman] with [hair description] and [facial features], [body type] build, wearing [clothing description], standing against a plain white wall. Soft natural window lighting, 8k resolution, shot on Sony A7R IV, 85mm lens, f/1.8, shallow depth of field."

Do NOT use words like: beautiful, stunning, elegant, gorgeous, artistic, dramatic, cinematic.
Do NOT add items not visible in the photos.
Do NOT describe emotions or poses beyond "standing naturally".
Keep it under 80 words. Be blunt and specific like a police report.

The clothing item is: ${clothingDesc}. Generate the prompt now.`
            },
            {
              inlineData: {
                mimeType: userImageMimeType,
                data: userImageBase64Clean
              }
            },
            {
              inlineData: {
                mimeType: clothImageMimeType,
                data: clothImageBase64
              }
            }
          ]
        }
      ],
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.3,
      }
    };

    const analysisResponse = await fetch(analysisUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(analysisPayload),
    });

    if (!analysisResponse.ok) {
      const errText = await analysisResponse.text();
      console.error("Gemini analysis error:", analysisResponse.status, errText);
      await supabase.from("try_on_sessions").update({ status: "failed" }).eq("id", session.id);

      if (analysisResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Analysis failed: ${analysisResponse.status}`);
    }

    const analysisData = await analysisResponse.json();
    const generationPrompt = analysisData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generationPrompt) {
      await supabase.from("try_on_sessions").update({ status: "failed" }).eq("id", session.id);
      throw new Error("Gemini returned no description");
    }

    console.log("Step 1 complete. Prompt:", generationPrompt.substring(0, 100) + "...");

    // ── STEP 2: Image Generation with Gemini Image Model ──
    // Try gemini-2.5-flash-image first, fallback to imagen-3.0-generate-001
    console.log("Step 2: Generating image with gemini-2.5-flash-image...");

    let resultImageBase64: string | null = null;
    let resultMimeType = "image/png";

    // Attempt 1: gemini-2.5-flash-image
    const imageModels = [
      "gemini-2.5-flash-preview-image-generation",
      "imagen-3.0-generate-001",
    ];

    for (const model of imageModels) {
      console.log(`Trying model: ${model}`);

      try {
        if (model.startsWith("gemini")) {
          // Gemini image generation endpoint
          const imageUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

          const imagePayload = {
            contents: [
              {
                parts: [
                  {
                    text: generationPrompt
                  }
                ]
              }
            ],
            generationConfig: {
              responseModalities: ["TEXT", "IMAGE"],
            }
          };

          const imageResponse = await fetch(imageUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(imagePayload),
          });

          if (!imageResponse.ok) {
            const errText = await imageResponse.text();
            console.error(`${model} error:`, imageResponse.status, errText);

            if (imageResponse.status === 429) {
              await supabase.from("try_on_sessions").update({ status: "failed" }).eq("id", session.id);
              return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
                status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
            // Try next model
            continue;
          }

          const imageData = await imageResponse.json();
          // Extract image from Gemini response
          const parts = imageData.candidates?.[0]?.content?.parts || [];
          for (const part of parts) {
            if (part.inlineData) {
              resultImageBase64 = part.inlineData.data;
              resultMimeType = part.inlineData.mimeType || "image/png";
              break;
            }
          }

          if (resultImageBase64) {
            console.log(`Success with ${model}`);
            break;
          }
          console.log(`${model} returned no image, trying next...`);

        } else {
          // Imagen 3 endpoint
          const imagenUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${GEMINI_API_KEY}`;

          const imagenPayload = {
            instances: [{ prompt: generationPrompt }],
            parameters: {
              sampleCount: 1,
              aspectRatio: "1:1",
            }
          };

          const imagenResponse = await fetch(imagenUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(imagenPayload),
          });

          if (!imagenResponse.ok) {
            const errText = await imagenResponse.text();
            console.error(`${model} error:`, imagenResponse.status, errText);
            continue;
          }

          const imagenData = await imagenResponse.json();
          const prediction = imagenData.predictions?.[0];
          if (prediction?.bytesBase64Encoded) {
            resultImageBase64 = prediction.bytesBase64Encoded;
            resultMimeType = prediction.mimeType || "image/png";
            console.log(`Success with ${model}`);
            break;
          }
          console.log(`${model} returned no image, trying next...`);
        }
      } catch (err) {
        console.error(`Error with ${model}:`, err);
        continue;
      }
    }

    if (!resultImageBase64) {
      await supabase.from("try_on_sessions").update({ status: "failed" }).eq("id", session.id);
      throw new Error("All image generation models failed");
    }

    // Upload to Supabase storage
    const fileName = `tryon_${session.id}_${Date.now()}.png`;
    const fileBytes = Uint8Array.from(atob(resultImageBase64), c => c.charCodeAt(0));

    const { error: uploadError } = await supabase.storage
      .from("clothing-images")
      .upload(`tryons/${fileName}`, fileBytes, {
        contentType: resultMimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      // Return as data URI fallback
      const dataUri = `data:${resultMimeType};base64,${resultImageBase64}`;
      await supabase.from("try_on_sessions")
        .update({ status: "completed", result_image_url: dataUri })
        .eq("id", session.id);

      return new Response(JSON.stringify({ sessionId: session.id, resultImageUrl: dataUri }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: publicUrlData } = supabase.storage
      .from("clothing-images")
      .getPublicUrl(`tryons/${fileName}`);

    const resultImageUrl = publicUrlData.publicUrl;

    await supabase.from("try_on_sessions")
      .update({ status: "completed", result_image_url: resultImageUrl })
      .eq("id", session.id);

    console.log("Step 2 complete. Image uploaded successfully.");

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
