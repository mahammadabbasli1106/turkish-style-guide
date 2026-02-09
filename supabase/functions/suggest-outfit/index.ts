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

    const { style, location, occasion, venue } = await req.json();

    if (!occasion) throw new Error("Occasion is required");
    if (!style) throw new Error("Style is required");

    const { data: clothingItems, error: clothingError } = await supabase
      .from("clothing_items")
      .select("*")
      .eq("user_id", user.id);

    if (clothingError) throw new Error("Failed to fetch wardrobe");
    if (!clothingItems || clothingItems.length === 0) {
      throw new Error("No clothing items in wardrobe. Please add some clothes first.");
    }

    const wardrobe = {
      upper_body: clothingItems.filter(c => c.category === "upper_body"),
      lower_body: clothingItems.filter(c => c.category === "lower_body"),
      outerwear: clothingItems.filter(c => c.category === "outerwear"),
      footwear: clothingItems.filter(c => c.category === "footwear"),
      accessory: clothingItems.filter(c => c.category === "accessory"),
    };

    const weather = await getWeatherInfo(location);

    const wardrobeDescription = Object.entries(wardrobe)
      .map(([category, items]) => {
        if (items.length === 0) return `${category}: none available`;
        return `${category}: ${items.map(i => `${i.name} (id: ${i.id}, color: ${i.color || 'unknown'})`).join(", ")}`;
      })
      .join("\n");

    const venueInstruction = venue
      ? `\n8. Analyze the venue "${venue}" - consider its type, expected dress code, and atmosphere when choosing the outfit.`
      : "";

    const prompt = `You are an expert fashion stylist AI. Given a user's wardrobe, real weather conditions, style preferences, venue information, and occasion, suggest the absolute best outfit combination.

Rules:
1. ALWAYS pick items that work well together (color coordination, style matching, formality level)
2. STRONGLY consider the weather - temperature, rain, humidity affect clothing choices
3. Match the style preference AND occasion appropriately
4. Consider the venue type and its dress code/atmosphere
5. Only use items from the provided wardrobe - NEVER suggest items not in the list
6. For cold weather (below 15°C), always include outerwear if available
7. For rainy weather, prioritize water-resistant or appropriate items${venueInstruction}

You MUST respond with ONLY a valid JSON object, no markdown, no code blocks, no explanation:
{
  "upper_body_id": "uuid or null",
  "lower_body_id": "uuid or null", 
  "outerwear_id": "uuid or null if not needed based on weather",
  "footwear_id": "uuid or null",
  "accessory_id": "uuid or null",
  "reasoning": "Detailed explanation of why this combination works for the weather, occasion, and venue",
  "venueAnalysis": "Brief description of the venue type, dress code, and atmosphere (or empty string if no venue)"
}

If a category is empty in the wardrobe, use null for that field.

Create the perfect outfit for:
- Style: ${style}
- Occasion: ${occasion}
- Location: ${location || "Not specified"}
- Venue: ${venue || "Not specified"}
- Weather: ${weather.description}, ${weather.temperature}°C, Humidity: ${weather.humidity}%, ${weather.feelsLike ? `Feels like: ${weather.feelsLike}°C` : ""}${weather.isRaining ? ", Currently raining" : ""}

Available wardrobe:
${wardrobeDescription}`;

    const MAX_RETRIES = 3;
    let response: Response | null = null;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" },
          }),
        }
      );

      if (response.ok || (response.status !== 429 && response.status < 500)) break;

      await response.text();

      if (attempt < MAX_RETRIES) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
        console.log(`Gemini request failed (${response.status}), retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
        await new Promise(r => setTimeout(r, delay));
      }
    }

    if (!response || !response.ok) {
      const status = response?.status ?? 500;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Gemini API error: ${status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) throw new Error("No response from AI");

    let suggestion;
    try {
      const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      suggestion = JSON.parse(cleanContent);
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse outfit suggestion");
    }

    const { data: savedSuggestion, error: saveError } = await supabase
      .from("outfit_suggestions")
      .insert({
        user_id: user.id,
        upper_body_id: suggestion.upper_body_id,
        lower_body_id: suggestion.lower_body_id,
        outerwear_id: suggestion.outerwear_id,
        footwear_id: suggestion.footwear_id,
        style: style,
        weather_info: weather,
        occasion: occasion,
        ai_reasoning: suggestion.reasoning,
        outfit_name: `${style} outfit for ${occasion}`,
        viewed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (saveError) {
      console.error("Failed to save suggestion:", saveError);
    }

    const selectedItems = {
      upper_body: clothingItems.find(c => c.id === suggestion.upper_body_id),
      lower_body: clothingItems.find(c => c.id === suggestion.lower_body_id),
      outerwear: clothingItems.find(c => c.id === suggestion.outerwear_id),
      footwear: clothingItems.find(c => c.id === suggestion.footwear_id),
      accessory: clothingItems.find(c => c.id === suggestion.accessory_id),
    };

    return new Response(JSON.stringify({
      ...savedSuggestion,
      items: selectedItems,
      weather,
      reasoning: suggestion.reasoning,
      venueAnalysis: suggestion.venueAnalysis || null,
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

async function getWeatherInfo(location: string | undefined) {
  const defaultLocation = "Istanbul";
  const searchLocation = location || defaultLocation;
  
  try {
    const geoResponse = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchLocation)}&count=1&language=en&format=json`
    );
    
    if (!geoResponse.ok) {
      console.error("Geocoding failed:", geoResponse.status);
      return getFallbackWeather(searchLocation);
    }

    const geoData = await geoResponse.json();
    
    if (!geoData.results || geoData.results.length === 0) {
      console.warn("Location not found:", searchLocation);
      return getFallbackWeather(searchLocation);
    }

    const { latitude, longitude, name } = geoData.results[0];

    const weatherResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,weather_code,wind_speed_10m&timezone=auto`
    );

    if (!weatherResponse.ok) {
      console.error("Weather API failed:", weatherResponse.status);
      return getFallbackWeather(searchLocation);
    }

    const weatherData = await weatherResponse.json();
    const current = weatherData.current;

    const weatherDescription = getWeatherDescription(current.weather_code);
    const isRaining = current.rain > 0 || current.precipitation > 0;

    return {
      location: name || searchLocation,
      temperature: Math.round(current.temperature_2m),
      feelsLike: Math.round(current.apparent_temperature),
      description: weatherDescription,
      humidity: current.relative_humidity_2m,
      windSpeed: current.wind_speed_10m,
      isRaining: isRaining,
      needsOuterwear: current.temperature_2m < 18 || isRaining,
    };
  } catch (error) {
    console.error("Weather API error:", error);
    return getFallbackWeather(searchLocation);
  }
}

function getWeatherDescription(code: number): string {
  const descriptions: Record<number, string> = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Foggy", 48: "Depositing rime fog",
    51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
    61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
    71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow", 77: "Snow grains",
    80: "Slight rain showers", 81: "Moderate rain showers", 82: "Violent rain showers",
    85: "Slight snow showers", 86: "Heavy snow showers",
    95: "Thunderstorm", 96: "Thunderstorm with slight hail", 99: "Thunderstorm with heavy hail",
  };
  return descriptions[code] || "Unknown";
}

function getFallbackWeather(location: string) {
  return {
    location, temperature: 20, feelsLike: 20, description: "Weather data unavailable",
    humidity: 50, windSpeed: 5, isRaining: false, needsOuterwear: false,
  };
}
