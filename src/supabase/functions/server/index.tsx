// ============================================================================
// MAKE SERVER EDGE FUNCTION (Core Application Server)
// ============================================================================
// Handles providers, CMS, AI, sports, finance, etc.
// All weather functionality has been migrated to /supabase/functions/weather_dashboard
// ============================================================================

import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

const app = new Hono();

// ============================================================================
// SUPABASE CLIENT
// ============================================================================
const getSupabaseClient = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

// ============================================================================
// MIDDLEWARE
// ============================================================================
app.use("*", logger(console.log));
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "Cache-Control",
      "Pragma",
      "x-client-info",
      "apikey",
    ],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  })
);

// ============================================================================
// HEALTH CHECK
// ============================================================================
app.get("/make-server-cbef71cf/health", (c) => {
  return c.json({
    ok: true,
    service: "make-server-cbef71cf",
    message: "Server is running",
    build: new Date().toISOString(),
  });
});

// ============================================================================
// PROVIDERS MANAGEMENT (GENERIC)
// ============================================================================

app.post("/make-server-cbef71cf/providers", async (c) => {
  try {
    const body = await c.req.json();
    const supabase = getSupabaseClient();

    const { id, category, name, base_url, api_key, config } = body;
    if (!id || !category || !name) {
      return c.json(
        { ok: false, error: "Missing required provider fields" },
        400
      );
    }

    // Determine provider category prefix (weather removed)
    const categoryPrefix =
      category === "sports"
        ? "sports_provider:"
        : category === "finance"
        ? "finance_provider:"
        : category === "news"
        ? "news_provider:"
        : "provider:";

    const key = `${categoryPrefix}${id}`;

    const { data, error } = await supabase
      .from("data_providers")
      .upsert({
        key,
        category,
        name,
        base_url,
        api_key,
        config,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return c.json({ ok: true, provider: data });
  } catch (error) {
    console.error("Error creating/updating provider:", error);
    return c.json({ ok: false, error: String(error) }, 500);
  }
});

// ============================================================================
// PROVIDER SYNC / UPDATE LOGIC
// ============================================================================
// Cleaned of weather-specific references

app.post("/make-server-cbef71cf/sync-provider", async (c) => {
  try {
    const body = await c.req.json();
    const { category } = body;
    const supabase = getSupabaseClient();

    // Only sync relevant categories (weather removed)
    const categoryPrefix =
      category === "sports"
        ? "sports_provider:"
        : category === "finance"
        ? "finance_provider:"
        : category === "news"
        ? "news_provider:"
        : "provider:";

    const { data, error } = await supabase
      .from("data_providers")
      .select("*")
      .eq("category", category);

    if (error) throw error;

    console.log(`[PROVIDER SYNC] Synced ${data?.length || 0} for ${category}`);

    return c.json({ ok: true, category, providers: data });
  } catch (error) {
    console.error("Error syncing provider:", error);
    return c.json({ ok: false, error: String(error) }, 500);
  }
});

// ============================================================================
// WEATHER ROUTES - Moved to dedicated edge function
// ============================================================================
// All weather routes have been migrated to:
// /supabase/functions/weather_dashboard
//
// Use endpoints like:
//   /functions/v1/weather_dashboard/locations
//   /functions/v1/weather_dashboard/weather-data
//   /functions/v1/weather_dashboard/ai-insights
//
// The old inline weather handlers and helpers (convertToISOTimestamp, toInt)
// have been fully removed from this file.
// ============================================================================

// ============================================================================
// SPORTS ROUTES (Example Section)
// ============================================================================

app.get("/make-server-cbef71cf/sports-teams", async (c) => {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("sports_teams").select("*");
    if (error) throw error;
    return c.json({ ok: true, teams: data });
  } catch (error) {
    console.error("Error fetching sports teams:", error);
    return c.json({ ok: false, error: String(error) }, 500);
  }
});

app.get("/make-server-cbef71cf/sports-competitions", async (c) => {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("sports_competitions")
      .select("*");
    if (error) throw error;
    return c.json({ ok: true, competitions: data });
  } catch (error) {
    console.error("Error fetching competitions:", error);
    return c.json({ ok: false, error: String(error) }, 500);
  }
});

// ============================================================================
// FINANCE ROUTES (Example)
// ============================================================================

app.get("/make-server-cbef71cf/finance-assets", async (c) => {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("finance_assets").select("*");
    if (error) throw error;
    return c.json({ ok: true, assets: data });
  } catch (error) {
    console.error("Error fetching finance assets:", error);
    return c.json({ ok: false, error: String(error) }, 500);
  }
});

// ============================================================================
// CMS ROUTES (Example)
// ============================================================================
app.get("/make-server-cbef71cf/content-pages", async (c) => {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("content_pages").select("*");
    if (error) throw error;
    return c.json({ ok: true, pages: data });
  } catch (error) {
    console.error("Error fetching pages:", error);
    return c.json({ ok: false, error: String(error) }, 500);
  }
});

// ============================================================================
// CHANNELS ROUTES
// ============================================================================

// GET all channels
app.get("/make-server-cbef71cf/channels", async (c) => {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("channels")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    
    return c.json({ ok: true, channels: data || [] });
  } catch (error) {
    console.error("Error fetching channels:", error);
    return c.json({ ok: false, error: String(error) }, 500);
  }
});

// GET single channel by ID
app.get("/make-server-cbef71cf/channels/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from("channels")
      .select("*")
      .eq("id", id)
      .single();
    
    if (error) throw error;
    
    return c.json({ ok: true, channel: data });
  } catch (error) {
    console.error("Error fetching channel:", error);
    return c.json({ ok: false, error: String(error) }, 500);
  }
});

// POST - Create new channel
app.post("/make-server-cbef71cf/channels", async (c) => {
  try {
    const body = await c.req.json();
    const { name, description, type, status, config } = body;
    
    if (!name) {
      return c.json(
        { ok: false, error: "Channel name is required" },
        400
      );
    }
    
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from("channels")
      .insert({
        name,
        description: description || null,
        type: type || null,
        status: status || "active",
        config: config || {},
      })
      .select()
      .single();
    
    if (error) throw error;
    
    console.log(`[CHANNELS] Created channel: ${name} (${data.id})`);
    return c.json({ ok: true, channel: data });
  } catch (error) {
    console.error("Error creating channel:", error);
    return c.json({ ok: false, error: String(error) }, 500);
  }
});

// PATCH - Update existing channel
app.patch("/make-server-cbef71cf/channels/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const { name, description, type, status, config } = body;
    
    const supabase = getSupabaseClient();
    
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (type !== undefined) updateData.type = type;
    if (status !== undefined) updateData.status = status;
    if (config !== undefined) updateData.config = config;
    
    const { data, error } = await supabase
      .from("channels")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();
    
    if (error) throw error;
    
    console.log(`[CHANNELS] Updated channel: ${id}`);
    return c.json({ ok: true, channel: data });
  } catch (error) {
    console.error("Error updating channel:", error);
    return c.json({ ok: false, error: String(error) }, 500);
  }
});

// DELETE - Delete channel
app.delete("/make-server-cbef71cf/channels/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const supabase = getSupabaseClient();
    
    const { error } = await supabase
      .from("channels")
      .delete()
      .eq("id", id);
    
    if (error) throw error;
    
    console.log(`[CHANNELS] Deleted channel: ${id}`);
    return c.json({ ok: true, message: "Channel deleted successfully" });
  } catch (error) {
    console.error("Error deleting channel:", error);
    return c.json({ ok: false, error: String(error) }, 500);
  }
});

// ============================================================================
// STARTUP / INITIALIZATION
// ============================================================================
// Removed obsolete:
// await initializeDefaultWeatherProvider();

console.log("[make-server-cbef71cf] boot complete");
Deno.serve(app.fetch);