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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const OWM_KEY = Deno.env.get("OPENWEATHERMAP_API_KEY");

    if (!OWM_KEY) throw new Error("Weather API key not configured");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase env missing");

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization header required");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error("Invalid authentication");

    const { city, startDate, endDate } = await req.json();
    
    if (!city || typeof city !== "string" || city.length > 100) {
      throw new Error("Invalid city parameter");
    }

    const sanitizedCity = city.replace(/[^a-zA-ZÀ-ÿçÇğĞıİöÖşŞüÜ\s\-]/g, "").trim();
    if (!sanitizedCity) throw new Error("Invalid city name");

    // Calculate days until trip
    const now = new Date();
    const tripStart = startDate ? new Date(startDate) : now;
    const tripEnd = endDate ? new Date(endDate) : new Date(now.getTime() + 3 * 86400000);
    const daysUntilTrip = Math.ceil((tripStart.getTime() - now.getTime()) / 86400000);
    const tripDays = Math.max(1, Math.ceil((tripEnd.getTime() - tripStart.getTime()) / 86400000));

    let weatherData;
    let usedForecast = false;

    // Try forecast API if trip is within 5 days
    if (daysUntilTrip <= 5) {
      try {
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(sanitizedCity)}&appid=${OWM_KEY}&units=metric&cnt=${Math.min(40, tripDays * 8)}`;
        const forecastRes = await fetch(forecastUrl);
        
        if (forecastRes.ok) {
          const forecastData = await forecastRes.json();
          usedForecast = true;
          
          // Analyze forecast data
          const forecasts = forecastData.list || [];
          const temps = forecasts.map((f: any) => f.main.temp);
          const rainChances = forecasts.map((f: any) => {
            const rain = f.rain?.["3h"] || 0;
            const pop = f.pop || 0;
            return Math.max(pop * 100, rain > 0 ? 80 : 0);
          });

          const avgTemp = temps.length > 0 ? temps.reduce((a: number, b: number) => a + b, 0) / temps.length : 20;
          const maxRainChance = rainChances.length > 0 ? Math.max(...rainChances) : 0;
          const avgRainChance = rainChances.length > 0 ? rainChances.reduce((a: number, b: number) => a + b, 0) / rainChances.length : 0;
          
          // Get weather descriptions
          const weatherDescriptions = [...new Set(forecasts.map((f: any) => f.weather[0]?.description))];

          weatherData = {
            city: forecastData.city?.name || sanitizedCity,
            country: forecastData.city?.country || "",
            avgTemperature: Math.round(avgTemp),
            minTemperature: Math.round(Math.min(...temps)),
            maxTemperature: Math.round(Math.max(...temps)),
            rainChance: Math.round(avgRainChance),
            maxRainChance: Math.round(maxRainChance),
            needsRainGear: maxRainChance > 50,
            descriptions: weatherDescriptions.slice(0, 3),
            source: "forecast",
            tripDays,
          };
        }
      } catch (e) {
        console.error("Forecast API error:", e);
      }
    }

    // Fallback: use seasonal logic
    if (!weatherData) {
      // Get coordinates for the city to determine hemisphere
      try {
        const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(sanitizedCity)}&limit=1&appid=${OWM_KEY}`;
        const geoRes = await fetch(geoUrl);
        const geoData = await geoRes.json();
        
        const lat = geoData[0]?.lat || 41; // Default Istanbul
        const isNorthernHemisphere = lat >= 0;
        const month = tripStart.getMonth(); // 0-11

        // Seasonal temperature estimation
        let seasonalTemp: number;
        let seasonalRain: number;
        let seasonDescription: string;

        if (isNorthernHemisphere) {
          if (month >= 5 && month <= 8) { // Jun-Sep: Summer
            seasonalTemp = 28;
            seasonalRain = 15;
            seasonDescription = "Summer (warm/hot)";
          } else if (month >= 2 && month <= 4) { // Mar-May: Spring
            seasonalTemp = 16;
            seasonalRain = 40;
            seasonDescription = "Spring (mild, possible rain)";
          } else if (month >= 9 && month <= 10) { // Oct-Nov: Fall
            seasonalTemp = 14;
            seasonalRain = 45;
            seasonDescription = "Fall (cool, possible rain)";
          } else { // Dec-Feb: Winter
            seasonalTemp = 5;
            seasonalRain = 50;
            seasonDescription = "Winter (cold)";
          }
        } else {
          // Southern hemisphere: reversed seasons
          if (month >= 5 && month <= 8) {
            seasonalTemp = 8;
            seasonalRain = 45;
            seasonDescription = "Winter (cold)";
          } else if (month >= 11 || month <= 1) {
            seasonalTemp = 26;
            seasonalRain = 20;
            seasonDescription = "Summer (warm/hot)";
          } else if (month >= 2 && month <= 4) {
            seasonalTemp = 16;
            seasonalRain = 35;
            seasonDescription = "Fall (cool)";
          } else {
            seasonalTemp = 18;
            seasonalRain = 30;
            seasonDescription = "Spring (mild)";
          }
        }

        weatherData = {
          city: geoData[0]?.name || sanitizedCity,
          country: geoData[0]?.country || "",
          avgTemperature: seasonalTemp,
          minTemperature: seasonalTemp - 5,
          maxTemperature: seasonalTemp + 5,
          rainChance: seasonalRain,
          maxRainChance: seasonalRain + 15,
          needsRainGear: seasonalRain > 50,
          descriptions: [seasonDescription],
          source: "seasonal",
          tripDays,
        };
      } catch {
        // Ultimate fallback
        weatherData = {
          city: sanitizedCity,
          country: "",
          avgTemperature: 20,
          minTemperature: 15,
          maxTemperature: 25,
          rainChance: 30,
          maxRainChance: 40,
          needsRainGear: false,
          descriptions: ["Weather data unavailable"],
          source: "fallback",
          tripDays,
        };
      }
    }

    return new Response(JSON.stringify(weatherData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("travel-weather error:", error);
    const SAFE_ERRORS = ["Invalid city parameter", "Invalid city name", "Invalid authentication", "Authorization header required"];
    const rawMsg = error instanceof Error ? error.message : "";
    const safeMsg = SAFE_ERRORS.includes(rawMsg) ? rawMsg : "An error occurred. Please try again.";
    return new Response(JSON.stringify({ error: safeMsg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
