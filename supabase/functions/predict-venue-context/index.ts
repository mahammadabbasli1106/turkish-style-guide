import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VALID_STYLES = [
  "casual", "business", "streetwear", "classic", "sporty", "elegant",
  "bohemian", "minimalist", "vintage", "preppy", "artsy", "edgy",
];
const VALID_OCCASIONS = [
  "work", "date", "party", "wedding", "interview", "casual",
  "brunch", "shopping", "gym", "travel", "meeting", "dinner",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { venue, location } = await req.json();
    if (!venue || typeof venue !== "string" || venue.trim().length < 2) {
      return new Response(JSON.stringify({ error: "Venue required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are a fashion stylist. Given a venue name (and optional city), predict the most likely dress style and occasion.

Respond ONLY with JSON: {"style": "<one of: ${VALID_STYLES.join(", ")}>", "occasion": "<one of: ${VALID_OCCASIONS.join(", ")}>", "reason": "<short 1-sentence explanation>"}

Examples:
- "Starbucks" → {"style": "casual", "occasion": "casual", "reason": "Coffee shops are relaxed everyday spots."}
- "The Ritz Carlton" → {"style": "elegant", "occasion": "dinner", "reason": "Luxury hotels expect refined attire."}
- "Equinox Gym" → {"style": "sporty", "occasion": "gym", "reason": "Fitness venues call for athletic wear."}
- "Soho House" → {"style": "minimalist", "occasion": "dinner", "reason": "Members-only club, smart-casual elevated."}`,
          },
          {
            role: "user",
            content: `Venue: ${venue.trim()}${location ? `\nCity: ${location}` : ""}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit, try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("No AI response");

    let result;
    try {
      result = JSON.parse(content);
    } catch {
      throw new Error("Invalid AI response format");
    }

    // Validate against allowed values; fall back if not
    if (!VALID_STYLES.includes(result.style)) result.style = "casual";
    if (!VALID_OCCASIONS.includes(result.occasion)) result.occasion = "casual";

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("predict-venue-context error:", error);
    return new Response(JSON.stringify({ error: "Couldn't predict context" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
