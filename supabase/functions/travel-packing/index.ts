import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type PackingStyle = "minimalist" | "comfort" | "fashionista";
type TripVibe = "business" | "casual" | "party";

interface ClothingItem {
  id: string;
  name: string;
  category: string;
  color: string | null;
  image_url: string;
  season: string[] | null;
  ai_tags: string[] | null;
}

interface WeatherData {
  avgTemperature: number;
  needsRainGear: boolean;
  rainChance: number;
}

function calculatePackingNeeds(
  tripDays: number,
  packingStyle: PackingStyle,
  vibe: TripVibe,
  weather: WeatherData
) {
  // Base counts
  let tops = tripDays; // 1 top per day
  let bottoms = Math.ceil(tripDays / 2); // 1 bottom per 2 days
  let outerwear = 0;
  let footwear = 1; // base: 1 pair
  let accessories = 0;

  // Packing style multipliers
  if (packingStyle === "comfort") {
    tops = Math.ceil(tops * 1.2);
    bottoms = Math.ceil(bottoms * 1.2);
  } else if (packingStyle === "fashionista") {
    tops = Math.ceil(tops * 1.5);
    bottoms = Math.ceil(bottoms * 1.3);
    footwear = 2; // extra shoes
    accessories = 2;
  } else {
    // minimalist — keep base
    accessories = 0;
  }

  // Weather adjustments
  if (weather.avgTemperature < 15) {
    outerwear = Math.max(1, Math.ceil(tripDays / 3));
  }
  if (weather.needsRainGear) {
    outerwear = Math.max(outerwear, 1); // at least 1 rain layer
  }

  // Vibe adjustments
  if (vibe === "party") {
    tops += 1; // extra statement piece for nights
    footwear = Math.max(footwear, 2); // dress shoes + casual
  } else if (vibe === "business") {
    tops += 1; // backup formal
    bottoms += 1; // extra formal bottom
  }

  // Safety stock
  const wildcardCount = 1; // 1 wildcard/statement piece
  const loungeCount = 1;   // 1 lounge outfit
  const extraUnderwear = Math.ceil(tripDays / 3); // +1 per 3 days

  return {
    upper_body: Math.min(tops, 15),
    lower_body: Math.min(bottoms, 10),
    outerwear: Math.min(outerwear, 5),
    footwear: Math.min(footwear, 4),
    accessory: Math.min(accessories, 5),
    wildcardCount,
    loungeCount,
    extraUnderwear,
  };
}

function categorizeForOutput(
  items: ClothingItem[],
  vibe: TripVibe,
  weather: WeatherData
): {
  daytime: ClothingItem[];
  evening: ClothingItem[];
  travel: ClothingItem[];
  shoes_outerwear: ClothingItem[];
} {
  const daytime: ClothingItem[] = [];
  const evening: ClothingItem[] = [];
  const travel: ClothingItem[] = [];
  const shoes_outerwear: ClothingItem[] = [];

  for (const item of items) {
    const tags = (item.ai_tags || []).map(t => t.toLowerCase());
    const cat = item.category;

    if (cat === "footwear" || cat === "outerwear") {
      shoes_outerwear.push(item);
    } else if (
      tags.some(t => ["lounge", "casual", "comfortable", "sweatpants", "leggings", "hoodie"].includes(t))
    ) {
      travel.push(item);
    } else if (
      vibe === "party" && tags.some(t => ["elegant", "party", "dress", "statement", "sequin", "silk"].includes(t))
    ) {
      evening.push(item);
    } else if (
      tags.some(t => ["formal", "evening", "elegant", "dress"].includes(t))
    ) {
      evening.push(item);
    } else {
      daytime.push(item);
    }
  }

  // Ensure travel has at least one item by moving from daytime if needed
  if (travel.length === 0 && daytime.length > 1) {
    travel.push(daytime.pop()!);
  }

  return { daytime, evening, travel, shoes_outerwear };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase env missing");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization header required");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error("Invalid authentication");

    const { tripDays, packingStyle, vibe, weather } = await req.json();

    // Validate inputs
    if (!tripDays || tripDays < 1 || tripDays > 30) throw new Error("Invalid trip days (1-30)");
    if (!["minimalist", "comfort", "fashionista"].includes(packingStyle)) throw new Error("Invalid packing style");
    if (!["business", "casual", "party"].includes(vibe)) throw new Error("Invalid trip vibe");

    // Fetch user's wardrobe
    const { data: clothingItems, error: clothingError } = await supabase
      .from("clothing_items")
      .select("*")
      .eq("user_id", user.id);

    if (clothingError) throw new Error("Failed to fetch wardrobe");
    if (!clothingItems || clothingItems.length < 3) {
      throw new Error("Add at least 3 items to your wardrobe to use Travel Mode");
    }

    const weatherData: WeatherData = {
      avgTemperature: weather?.avgTemperature ?? 20,
      needsRainGear: weather?.needsRainGear ?? false,
      rainChance: weather?.rainChance ?? 0,
    };

    // Calculate needs
    const needs = calculatePackingNeeds(tripDays, packingStyle as PackingStyle, vibe as TripVibe, weatherData);

    // Select items from wardrobe
    const byCategory: Record<string, ClothingItem[]> = {
      upper_body: [],
      lower_body: [],
      outerwear: [],
      footwear: [],
      accessory: [],
    };

    for (const item of clothingItems) {
      if (byCategory[item.category]) {
        byCategory[item.category].push(item);
      }
    }

    // Shuffle arrays for variety
    const shuffle = <T>(arr: T[]): T[] => {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    };

    // Pick items based on calculated needs
    const selectedItems: ClothingItem[] = [];

    const pickItems = (category: string, count: number) => {
      const available = shuffle(byCategory[category] || []);
      const picked = available.slice(0, count);
      selectedItems.push(...picked);
      return picked;
    };

    pickItems("upper_body", needs.upper_body);
    pickItems("lower_body", needs.lower_body);
    pickItems("outerwear", needs.outerwear);
    pickItems("footwear", needs.footwear);
    pickItems("accessory", needs.accessory);

    // Categorize into display groups
    const categorized = categorizeForOutput(selectedItems, vibe as TripVibe, weatherData);

    // Add safety stock info
    const safetyStock = {
      wildcard: needs.wildcardCount,
      lounge: needs.loungeCount,
      extraUnderwear: needs.extraUnderwear,
    };

    return new Response(JSON.stringify({
      packingList: categorized,
      needs,
      safetyStock,
      totalItems: selectedItems.length,
      allItems: selectedItems, // for shuffle feature
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("travel-packing error:", error);
    const SAFE_ERRORS = ["Invalid trip days (1-30)", "Invalid packing style", "Invalid trip vibe", "Add at least 3 items to your wardrobe to use Travel Mode", "Failed to fetch wardrobe"];
    const rawMsg = error instanceof Error ? error.message : "";
    const safeMsg = SAFE_ERRORS.includes(rawMsg) ? rawMsg : "An error occurred. Please try again.";
    return new Response(JSON.stringify({ error: safeMsg }), {
      status: rawMsg.includes("wardrobe") || rawMsg.includes("Invalid") ? 400 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
