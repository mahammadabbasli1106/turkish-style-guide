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
    const GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GOOGLE_GEMINI_API_KEY is not configured");
    }

    const { imageUrl } = await req.json();
    
    if (!imageUrl) {
      throw new Error("imageUrl is required");
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are a fashion AI assistant. Analyze this clothing image and categorize it.

You MUST respond with ONLY a valid JSON object, no markdown, no code blocks, no explanation.

The JSON object must contain:
- category: one of "upper_body", "lower_body", "outerwear", "footwear", "accessory"
- name: a descriptive name for the clothing item (e.g., "Navy Blue Oxford Shirt")
- color: the primary color(s)
- season: array of suitable seasons ["spring", "summer", "fall", "winter"]
- tags: array of descriptive tags (e.g., ["casual", "cotton", "button-down"])

Categories explained:
- upper_body: t-shirts, shirts, blouses, sweaters, tanks, polos
- lower_body: pants, jeans, shorts, skirts, trousers
- outerwear: jackets, coats, blazers, cardigans, hoodies
- footwear: shoes, boots, sneakers, sandals
- accessory: belts, hats, scarves, bags, jewelry`
                },
                {
                  inlineData: {
                    mimeType: "image/jpeg",
                    data: imageUrl.startsWith("data:") ? imageUrl.split(",")[1] : imageUrl,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
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
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!content) {
      throw new Error("No response from AI");
    }

    let result;
    try {
      const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      result = JSON.parse(cleanContent);
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ 
        error: "not_clothing",
        message: "The uploaded image does not appear to contain a clothing item. Please upload a clear photo of a single clothing item."
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
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
