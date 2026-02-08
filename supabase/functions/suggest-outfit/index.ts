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

    // Create client with user's token
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Verify user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error("Invalid authentication");

    const { style, location, occasion } = await req.json();

    // Fetch user's wardrobe
    const { data: clothingItems, error: clothingError } = await supabase
      .from("clothing_items")
      .select("*")
      .eq("user_id", user.id);

    if (clothingError) throw new Error("Failed to fetch wardrobe");
    if (!clothingItems || clothingItems.length === 0) {
      throw new Error("No clothing items in wardrobe. Please add some clothes first.");
    }

    // Organize by category
    const wardrobe = {
      upper_body: clothingItems.filter(c => c.category === "upper_body"),
      lower_body: clothingItems.filter(c => c.category === "lower_body"),
      outerwear: clothingItems.filter(c => c.category === "outerwear"),
      footwear: clothingItems.filter(c => c.category === "footwear"),
    };

    // Get weather data (simplified - using mock for demo, can integrate real API)
    const weather = await getWeatherInfo(location);

    // Build prompt for AI
    const wardrobeDescription = Object.entries(wardrobe)
      .map(([category, items]) => {
        if (items.length === 0) return `${category}: none available`;
        return `${category}: ${items.map(i => `${i.name} (id: ${i.id}, color: ${i.color})`).join(", ")}`;
      })
      .join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a fashion stylist AI. Given a user's wardrobe, weather conditions, and style preferences, suggest the best outfit combination.

Rules:
1. Always pick items that work well together (color coordination, style matching)
2. Consider the weather when recommending layers
3. Match the style preference requested
4. Only use items from the provided wardrobe

Respond with a JSON object:
{
  "upper_body_id": "uuid or null",
  "lower_body_id": "uuid or null", 
  "outerwear_id": "uuid or null if not needed",
  "footwear_id": "uuid or null",
  "reasoning": "Brief explanation of why this combination works"
}

If a category is empty in the wardrobe, use null for that field.`
          },
          {
            role: "user",
            content: `Create an outfit for:
- Style: ${style || "casual"}
- Occasion: ${occasion || "everyday"}
- Weather: ${weather.description}, ${weather.temperature}°C
- Location: ${location || "Not specified"}

Available wardrobe:
${wardrobeDescription}`
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
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) throw new Error("No response from AI");

    let suggestion;
    try {
      const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      suggestion = JSON.parse(cleanContent);
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse outfit suggestion");
    }

    // Save the suggestion to database
    const { data: savedSuggestion, error: saveError } = await supabase
      .from("outfit_suggestions")
      .insert({
        user_id: user.id,
        upper_body_id: suggestion.upper_body_id,
        lower_body_id: suggestion.lower_body_id,
        outerwear_id: suggestion.outerwear_id,
        footwear_id: suggestion.footwear_id,
        style: style || "casual",
        weather_info: weather,
        occasion: occasion,
        ai_reasoning: suggestion.reasoning,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Failed to save suggestion:", saveError);
    }

    // Fetch the full clothing items for the response
    const selectedItems = {
      upper_body: clothingItems.find(c => c.id === suggestion.upper_body_id),
      lower_body: clothingItems.find(c => c.id === suggestion.lower_body_id),
      outerwear: clothingItems.find(c => c.id === suggestion.outerwear_id),
      footwear: clothingItems.find(c => c.id === suggestion.footwear_id),
    };

    return new Response(JSON.stringify({
      ...savedSuggestion,
      items: selectedItems,
      weather,
      reasoning: suggestion.reasoning,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("suggest-outfit error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Simple weather function - returns mock data
// In production, integrate with a real weather API like OpenWeatherMap
async function getWeatherInfo(location: string | undefined) {
  // Mock weather data based on current time and generic conditions
  const hour = new Date().getHours();
  const isDay = hour >= 6 && hour < 20;
  
  // Simulated weather for demonstration
  const conditions = [
    { description: "Sunny", temperature: 24, needsOuterwear: false },
    { description: "Cloudy", temperature: 18, needsOuterwear: true },
    { description: "Partly cloudy", temperature: 22, needsOuterwear: false },
    { description: "Rainy", temperature: 15, needsOuterwear: true },
  ];
  
  const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
  
  return {
    location: location || "Istanbul",
    temperature: randomCondition.temperature,
    description: isDay ? randomCondition.description : `Night, ${randomCondition.description.toLowerCase()}`,
    needsOuterwear: randomCondition.needsOuterwear || randomCondition.temperature < 18,
    humidity: Math.floor(Math.random() * 40) + 40,
    icon: isDay ? "sun" : "moon",
  };
}
