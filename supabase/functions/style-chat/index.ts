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
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase env missing");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization header required");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error("Invalid authentication");

    const { messages } = await req.json();

    const { data: clothingItems } = await supabase
      .from("clothing_items")
      .select("name, category, color, season, ai_tags")
      .eq("user_id", user.id);

    const wardrobeSummary = clothingItems && clothingItems.length > 0
      ? `The user has ${clothingItems.length} items: ${clothingItems.map(i => `${i.name} (${i.category}, ${i.color || "unknown color"})`).join(", ")}`
      : "The user has no clothing items in their wardrobe yet.";

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, gender, height, weight, goals")
      .eq("auth_id", user.id)
      .single();

    const profileContext = profile
      ? `User: ${profile.display_name || "Unknown"}, Gender: ${profile.gender || "not specified"}, Goals: ${(profile.goals || []).join(", ") || "not specified"}`
      : "";

    const systemPrompt = `You are **tarzly.ai**, a friendly AI fashion stylist.

## STRICT Rules
- Be extremely concise. Max 2-3 sentences per section.
- Total response must be under 150 words.
- Use bullet points for lists.
- No long introductions or conclusions. Get straight to the point.
- Use **Markdown** formatting.
- Bold only labels, not item names: **Top:** White Cotton T-Shirt
- When recommending items, use their **exact names** from the wardrobe.
- Use emojis sparingly (1-2 max).
- Structure outfit suggestions as:
  **Top:** Item name
  **Bottom:** Item name
  **Shoes:** Item name
  **Why:** One sentence.

${profileContext}

Wardrobe: ${wardrobeSummary}

If wardrobe is empty, suggest adding items. Answer general fashion questions briefly.`;

    const openaiMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GEMINI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: openaiMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("OpenAI API error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // OpenAI already returns SSE in the format the frontend expects
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("style-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
