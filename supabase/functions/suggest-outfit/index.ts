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
            content: `You are an expert fashion stylist AI. Given a user's wardrobe, weather, style preferences, venue, and occasion, suggest the best outfit. Return ONLY a JSON object with these fields:
- "upper_body_id": uuid string or null
- "lower_body_id": uuid string or null
- "outerwear_id": uuid string or null (include if cold/rainy)
- "footwear_id": uuid string or null
- "accessory_id": uuid string or null
- "reasoning": string explaining why this combination works
- "venueAnalysis": string about venue dress code (empty string if no venue)

Rules: Only use item IDs from the provided wardrobe. For cold weather (<15°C) include outerwear. For rain prioritize appropriate items. Match style and occasion. If a category has no items, use null.`,
          },
          {
            role: "user",
            content: `Style: ${style}
Occasion: ${occasion}
Location: ${location || "Not specified"}
Venue: ${venue || "Not specified"}
Weather: ${weather.description}, ${weather.temperature}°C, Humidity: ${weather.humidity}%, ${weather.feelsLike ? `Feels like: ${weather.feelsLike}°C` : ""}${weather.isRaining ? ", Currently raining" : ""}${venueInstruction}

Available wardrobe:
${wardrobeDescription}`,
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
    if (!content) throw new Error("No response from AI");

    const suggestion = JSON.parse(content);

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

    if (!geoResponse.ok) return getFallbackWeather(searchLocation);

    const geoData = await geoResponse.json();
    if (!geoData.results || geoData.results.length === 0) return getFallbackWeather(searchLocation);

    const { latitude, longitude, name } = geoData.results[0];

    const weatherResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,weather_code,wind_speed_10m&timezone=auto`
    );

    if (!weatherResponse.ok) return getFallbackWeather(searchLocation);

    const weatherData = await weatherResponse.json();
    const current = weatherData.current;
    const isRaining = current.rain > 0 || current.precipitation > 0;

    return {
      location: name || searchLocation,
      temperature: Math.round(current.temperature_2m),
      feelsLike: Math.round(current.apparent_temperature),
      description: getWeatherDescription(current.weather_code),
      humidity: current.relative_humidity_2m,
      windSpeed: current.wind_speed_10m,
      isRaining,
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
