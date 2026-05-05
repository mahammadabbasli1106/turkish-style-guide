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

    // Server-side usage limit check
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: usageCount } = await supabase
      .from("usage_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("feature", "outfit_suggest")
      .gte("created_at", twentyFourHoursAgo);
    
    if ((usageCount ?? 0) >= 12) {
      return new Response(JSON.stringify({ error: "Daily limit reached. Please try again tomorrow." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
      ? `\nVENUE CONTEXT: "${venue}". You MUST infer its likely dress code (e.g. fine-dining = elegant; gym = sporty; office = business; club = streetwear/edgy) and ensure the outfit unambiguously fits that dress code. If venue and stated style conflict, lean toward the venue's expected dress code while staying within the user's chosen style family.`
      : "";

    const tempC = typeof weather.temperature === "number" ? weather.temperature : 20;
    const isCold = tempC < 15;
    const isMild = tempC >= 15 && tempC < 22;
    const isWarm = tempC >= 22 && tempC < 28;
    const isHot = tempC >= 28;

    const weatherRules = [
      isCold ? "TEMPERATURE IS COLD (<15°C): you MUST include outerwear if any is available." : "",
      isMild ? "TEMPERATURE IS MILD (15–22°C): light layering recommended; outerwear optional." : "",
      isWarm ? "TEMPERATURE IS WARM (22–28°C): NO outerwear unless raining. Prefer breathable upper_body." : "",
      isHot ? "TEMPERATURE IS HOT (≥28°C): absolutely NO outerwear. Lightest possible items only." : "",
      weather.isRaining ? "IT IS RAINING: prioritise water-resistant outerwear and closed footwear." : "",
    ].filter(Boolean).join("\n");

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
            content: `You are an expert fashion stylist AI. You MUST strictly honour the user's inputs (style, occasion, venue, weather) and pick items ONLY from the provided wardrobe by their exact UUID.

Return ONLY a JSON object with these exact fields:
- "upper_body_id": uuid string from wardrobe or null
- "lower_body_id": uuid string from wardrobe or null
- "outerwear_id": uuid string from wardrobe or null
- "footwear_id": uuid string from wardrobe or null
- "accessory_id": uuid string from wardrobe or null
- "reasoning": short string (max 2 sentences) explaining HOW the chosen items match the requested style, occasion, venue, and weather
- "venueAnalysis": short string about the venue's expected dress code (empty string if no venue)

HARD RULES (must not violate):
1. NEVER invent IDs. If a category has no items, return null for that category.
2. The combination of upper_body + lower_body + footwear must visually and semantically match the requested STYLE ("${style}") and OCCASION ("${occasion}").
3. Respect the WEATHER & VENUE rules below — they override stylistic preference.
4. Avoid combinations that clash heavily in formality (e.g. tuxedo trousers with sneakers for a wedding).
5. Reasoning must explicitly reference the style, occasion, and (if relevant) venue and temperature.`,
          },
          {
            role: "user",
            content: `REQUESTED STYLE: ${style}
REQUESTED OCCASION: ${occasion}
LOCATION: ${location || "Not specified"}
WEATHER: ${weather.description}, ${weather.temperature}°C${weather.feelsLike ? ` (feels like ${weather.feelsLike}°C)` : ""}, humidity ${weather.humidity}%${weather.isRaining ? ", currently raining" : ""}
${weatherRules}${venueInstruction}

AVAILABLE WARDROBE (only use these IDs):
${wardrobeDescription}

Pick the best outfit that satisfies STYLE + OCCASION + WEATHER + VENUE simultaneously.`,
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

    const selectedItems: Record<string, any> = {};
    const categories = ["upper_body", "lower_body", "outerwear", "footwear", "accessory"] as const;
    const idKeys = {
      upper_body: suggestion.upper_body_id,
      lower_body: suggestion.lower_body_id,
      outerwear: suggestion.outerwear_id,
      footwear: suggestion.footwear_id,
      accessory: suggestion.accessory_id,
    };

    for (const cat of categories) {
      const item = clothingItems.find(c => c.id === idKeys[cat]);
      if (item) {
        // Generate signed URL for the private bucket
        let signedUrl = item.image_url;
        try {
          // Extract storage path from URL or use as-is
          let storagePath = item.image_url;
          if (storagePath.startsWith("http")) {
            const publicMarker = "/object/public/clothing-images/";
            const signMarker = "/object/sign/clothing-images/";
            const pubIdx = storagePath.indexOf(publicMarker);
            const signIdx = storagePath.indexOf(signMarker);
            if (pubIdx !== -1) {
              storagePath = storagePath.substring(pubIdx + publicMarker.length);
            } else if (signIdx !== -1) {
              storagePath = storagePath.substring(signIdx + signMarker.length).split("?")[0];
            }
          }
          const { data: signedData } = await supabase.storage
            .from("clothing-images")
            .createSignedUrl(storagePath, 3600);
          if (signedData?.signedUrl) signedUrl = signedData.signedUrl;
        } catch (e) {
          console.error("Failed to sign URL for", cat, e);
        }
        selectedItems[cat] = { ...item, image_url: signedUrl };
      }
    }

    // Record usage server-side
    await supabase.from("usage_events").insert({ user_id: user.id, feature: "outfit_suggest" });

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
    const SAFE_ERRORS = ["Occasion is required", "Style is required", "No clothing items in wardrobe. Please add some clothes first.", "Failed to fetch wardrobe"];
    const rawMsg = error instanceof Error ? error.message : "";
    const safeMsg = SAFE_ERRORS.includes(rawMsg) ? rawMsg : "An error occurred. Please try again.";
    return new Response(JSON.stringify({ error: safeMsg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function getWeatherInfo(location: string | undefined) {
  const defaultLocation = "Istanbul";
  const rawLocation = location || defaultLocation;
  // Extract city name (before comma) for better geocoding results
  const searchLocation = rawLocation.split(",")[0].trim();

  try {
    // Try with the extracted city name first
    let geoData = await fetchGeoData(searchLocation);
    
    // If no results, try the full location string
    if ((!geoData.results || geoData.results.length === 0) && searchLocation !== rawLocation) {
      console.log(`Geocoding failed for "${searchLocation}", trying full: "${rawLocation}"`);
      geoData = await fetchGeoData(rawLocation);
    }

    if (!geoData.results || geoData.results.length === 0) {
      console.log(`Geocoding failed for "${rawLocation}", using fallback`);
      return getFallbackWeather(rawLocation);
    }

    const { latitude, longitude, name } = geoData.results[0];

    const weatherResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,weather_code,wind_speed_10m&timezone=auto`
    );

    if (!weatherResponse.ok) {
      console.log(`Weather API failed: ${weatherResponse.status}`);
      return getFallbackWeather(rawLocation);
    }

    const weatherData = await weatherResponse.json();
    const current = weatherData.current;
    const isRaining = current.rain > 0 || current.precipitation > 0;

    return {
      location: name || rawLocation,
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
    return getFallbackWeather(rawLocation);
  }
}

async function fetchGeoData(query: string) {
  const geoResponse = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`
  );
  if (!geoResponse.ok) return { results: [] };
  return await geoResponse.json();
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
