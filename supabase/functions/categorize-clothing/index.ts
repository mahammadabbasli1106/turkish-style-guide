import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const { imageUrl } = await req.json();

    if (!imageUrl) {
      throw new Error("imageUrl is required");
    }

    const imageContent = imageUrl.startsWith("data:")
      ? { type: "image_url" as const, image_url: { url: imageUrl } }
      : { type: "image_url" as const, image_url: { url: imageUrl } };

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GEMINI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are a fashion AI assistant. Analyze clothing images and return ONLY a JSON object with these fields:
- "category": one of "upper_body", "lower_body", "outerwear", "footwear", "accessory"
- "name": a descriptive name (e.g. "Navy Blue Oxford Shirt")
- "color": primary color(s)
- "season": array of suitable seasons from ["spring", "summer", "fall", "winter"]
- "tags": array of descriptive tags (e.g. ["casual", "cotton", "button-down"])

Categories: upper_body (t-shirts, shirts, blouses, sweaters), lower_body (pants, jeans, shorts, skirts), outerwear (jackets, coats, blazers, hoodies), footwear (shoes, boots, sneakers, sandals), accessory (belts, hats, scarves, bags, jewelry).

If the image is not a clothing item, return: {"error": "not_clothing"}`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this clothing image and categorize it." },
              imageContent,
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    let result;
    try {
      result = JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({
        error: "not_clothing",
        message: "The uploaded image does not appear to contain a clothing item. Please upload a clear photo of a single clothing item.",
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (result.error === "not_clothing") {
      return new Response(JSON.stringify({
        error: "not_clothing",
        message: "The uploaded image does not appear to contain a clothing item.",
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("categorize-clothing error:", error);
    return new Response(JSON.stringify({ error: "An error occurred. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
