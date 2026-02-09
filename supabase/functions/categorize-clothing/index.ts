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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { imageUrl } = await req.json();
    
    if (!imageUrl) {
      throw new Error("imageUrl is required");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a fashion AI assistant. Analyze clothing images and categorize them.
            
Respond with a JSON object containing:
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
- accessory: belts, hats, scarves, bags, jewelry

Respond ONLY with valid JSON, no markdown or explanation.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this clothing item and categorize it:"
              },
              {
                type: "image_url",
                image_url: { url: imageUrl }
              }
            ]
          }
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
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("No response from AI");
    }

    // Parse the JSON response
    let result;
    try {
      // Clean up potential markdown formatting
      const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      result = JSON.parse(cleanContent);
    } catch {
      // AI returned non-JSON (e.g. "this is not a clothing item")
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
