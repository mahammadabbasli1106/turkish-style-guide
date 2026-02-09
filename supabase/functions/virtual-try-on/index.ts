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
    const GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!GEMINI_API_KEY) throw new Error("GOOGLE_GEMINI_API_KEY is not configured");
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

    // Build prompt with all clothing items
    let clothingDescription = `${clothingItem.name} (${clothingItem.category.replace("_", " ")}, ${clothingItem.color || "neutral color"})`;
    
    if (additionalItems && additionalItems.length > 0) {
      const additionalDescriptions = additionalItems.map((item: any) => 
        `${item.name} (${item.category.replace("_", " ")}, ${item.color || "neutral color"})`
      ).join(", ");
      clothingDescription = `a complete outfit consisting of: ${clothingDescription}, ${additionalDescriptions}`;
    }

    // Build image parts for Gemini
    const imageParts: any[] = [
      {
        text: `Virtual try-on: Take this person and show them wearing ${clothingDescription}. Create a realistic fashion photo of the person wearing these specific garments. Keep the person's face, body type, and pose similar to the original image. The result should look like a professional fashion photograph with all the mentioned clothing items properly styled together.`
      },
    ];

    // Add user image
    const userImageData = userImageBase64.startsWith("data:") ? userImageBase64.split(",")[1] : userImageBase64;
    imageParts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: userImageData,
      },
    });

    // Helper to convert ArrayBuffer to base64 without stack overflow
    const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
      const bytes = new Uint8Array(buffer);
      let binary = "";
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
      }
      return btoa(binary);
    };

    // Add clothing item image if it's a base64 or accessible URL
    if (clothingItem.image_url) {
      if (clothingItem.image_url.startsWith("data:")) {
        imageParts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: clothingItem.image_url.split(",")[1],
          },
        });
      } else {
        try {
          const imgRes = await fetch(clothingItem.image_url);
          if (imgRes.ok) {
            const imgBuffer = await imgRes.arrayBuffer();
            const imgBase64 = arrayBufferToBase64(imgBuffer);
            imageParts.push({
              inlineData: {
                mimeType: imgRes.headers.get("content-type") || "image/jpeg",
                data: imgBase64,
              },
            });
          }
        } catch (e) {
          console.error("Failed to fetch clothing image:", e);
        }
      }
    }

    // Gemini 2.0 Flash can analyze images but cannot generate them.
    // We return a detailed styling analysis text instead.
    const requestBody = {
      contents: [{ parts: imageParts }],
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
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
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    // Since gemini-1.5-flash cannot generate images, we return a text description
    // The frontend should handle this gracefully
    if (!aiText) {
      await supabase
        .from("try_on_sessions")
        .update({ status: "failed" })
        .eq("id", session.id);
      throw new Error("Failed to generate try-on result");
    }

    // Update session 
    await supabase
      .from("try_on_sessions")
      .update({ 
        status: "completed",
        result_image_url: null,
      })
      .eq("id", session.id);

    return new Response(JSON.stringify({
      sessionId: session.id,
      resultImageUrl: null,
      description: aiText,
      clothingItem: clothingItem,
      note: "Image generation requires Imagen API. Currently returning AI styling analysis.",
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
