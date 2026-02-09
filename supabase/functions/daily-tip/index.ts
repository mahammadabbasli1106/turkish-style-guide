import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { language = "en" } = await req.json().catch(() => ({}));

    const { data: items } = await supabase
      .from("clothing_items")
      .select("name, category, color, ai_tags, season")
      .eq("user_id", user.id)
      .limit(50);

    const { data: prefs } = await supabase
      .from("user_preferences")
      .select("preferred_styles")
      .eq("user_id", user.id)
      .maybeSingle();

    const wardrobeSummary = items && items.length > 0
      ? items.map((i) => `${i.name} (${i.category}, ${i.color || "unknown color"}${i.ai_tags?.length ? ", tags: " + i.ai_tags.join(", ") : ""})`).join("\n")
      : "No items in wardrobe yet.";

    const styles = prefs?.preferred_styles?.length
      ? prefs.preferred_styles.join(", ")
      : "not specified";

    const dayOfWeek = new Date().toLocaleDateString("en-US", { weekday: "long" });

    const prompt = `You are a personal fashion stylist AI for the app tarzly.ai. 
Generate ONE short, personalized daily style tip (max 2 sentences, ~30 words) based on the user's actual wardrobe items and style preferences.

Rules:
- Reference specific items from their wardrobe when possible (by name or type)
- Make it actionable and specific, not generic
- Consider the day of the week for context (e.g., Monday = work-ready, Friday = relaxed)
- If the wardrobe is empty, give a general but interesting fashion tip
- Respond in ${language === "tr" ? "Turkish" : "English"}
- Do NOT use quotes or bullet points, just the tip text directly

Day: ${dayOfWeek}
Preferred styles: ${styles}
Wardrobe items:
${wardrobeSummary}

Generate a personalized style tip.`;

    const GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("Gemini error:", status, await aiResponse.text());
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await aiResponse.json();
    const tip = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    return new Response(JSON.stringify({ tip }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("daily-tip error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
