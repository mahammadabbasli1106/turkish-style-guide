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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!SUPABASE_URL) throw new Error("SUPABASE_URL is not configured");
    if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization header required");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error("Invalid authentication");

    const { clothingItemId, userImageBase64 } = await req.json();

    if (!clothingItemId) throw new Error("Clothing item ID is required");
    if (!userImageBase64) throw new Error("User image is required");

    // Fetch the clothing item
    const { data: clothingItem, error: clothingError } = await supabase
      .from("clothing_items")
      .select("*")
      .eq("id", clothingItemId)
      .eq("user_id", user.id)
      .single();

    if (clothingError || !clothingItem) {
      throw new Error("Clothing item not found");
    }

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

    if (sessionError) {
      throw new Error("Failed to create try-on session");
    }

    // Generate virtual try-on using AI image generation
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Virtual try-on: Take this person and show them wearing the ${clothingItem.name} (${clothingItem.category.replace("_", " ")}, ${clothingItem.color || "neutral color"}). Create a realistic fashion photo of the person wearing this specific garment. Keep the person's face, body type, and pose similar to the original image. The result should look like a professional fashion photograph.`
              },
              {
                type: "image_url",
                image_url: {
                  url: userImageBase64
                }
              },
              {
                type: "image_url",
                image_url: {
                  url: clothingItem.image_url
                }
              }
            ]
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      // Update session status to failed
      await supabase
        .from("try_on_sessions")
        .update({ status: "failed" })
        .eq("id", session.id);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const generatedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!generatedImageUrl) {
      // Update session status to failed
      await supabase
        .from("try_on_sessions")
        .update({ status: "failed" })
        .eq("id", session.id);
      throw new Error("Failed to generate try-on image");
    }

    // Upload the generated image to storage
    const imageData = generatedImageUrl.split(",")[1]; // Remove base64 prefix
    const imageBuffer = Uint8Array.from(atob(imageData), c => c.charCodeAt(0));
    
    const fileName = `${user.id}/try-on-${session.id}.png`;
    const { error: uploadError } = await supabase.storage
      .from("clothing-images")
      .upload(fileName, imageBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      // Still return the base64 image even if upload fails
      await supabase
        .from("try_on_sessions")
        .update({ 
          status: "completed",
          result_image_url: generatedImageUrl 
        })
        .eq("id", session.id);

      return new Response(JSON.stringify({
        sessionId: session.id,
        resultImageUrl: generatedImageUrl,
        clothingItem: clothingItem,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("clothing-images")
      .getPublicUrl(fileName);

    // Update session with result
    await supabase
      .from("try_on_sessions")
      .update({ 
        status: "completed",
        result_image_url: publicUrl 
      })
      .eq("id", session.id);

    return new Response(JSON.stringify({
      sessionId: session.id,
      resultImageUrl: publicUrl,
      clothingItem: clothingItem,
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
