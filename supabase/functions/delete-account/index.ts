import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await userClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Delete all user data from every table
    const tables = [
      { table: "usage_events", column: "user_id" },
      { table: "style_checkins", column: "user_id" },
      { table: "try_on_sessions", column: "user_id" },
      { table: "outfit_suggestions", column: "user_id" },
      { table: "clothing_items", column: "user_id" },
      { table: "user_preferences", column: "user_id" },
      { table: "profiles", column: "auth_id" },
    ];

    for (const { table, column } of tables) {
      const { error } = await adminClient.from(table).delete().eq(column, user.id);
      if (error) {
        console.error(`Error deleting from ${table}:`, error.message);
      }
    }

    // Delete storage files
    try {
      const { data: files } = await adminClient.storage
        .from("clothing-images")
        .list(user.id);
      if (files && files.length > 0) {
        await adminClient.storage
          .from("clothing-images")
          .remove(files.map((f) => `${user.id}/${f.name}`));
      }
    } catch (e) {
      console.error("Error deleting storage files:", e);
    }

    // Delete auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error("Error deleting auth user:", deleteError.message);
      throw deleteError;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Delete account error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
