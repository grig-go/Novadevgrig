// ============================================================================
// CHANNELS EDGE FUNCTION
// ============================================================================
// Dedicated edge function for managing channels (CRUD operations)
// ============================================================================

import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

const app = new Hono().basePath("/channels");

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
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  })
);

// ============================================================================
// HEALTH CHECK
// ============================================================================
app.get("/health", (c) => {
  return c.json({
    ok: true,
    service: "channels",
    message: "Channels service is running",
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// GET ALL CHANNELS
// ============================================================================
app.get("/", async (c) => {
  try {
    console.log("[CHANNELS] GET all channels - path:", c.req.path);
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("channels")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[CHANNELS] Database error:", error);
      throw error;
    }

    console.log(`[CHANNELS] Fetched ${data?.length || 0} channels`);
    return c.json({ ok: true, channels: data || [] });
  } catch (error) {
    console.error("Error fetching channels:", error);
    return c.json({ ok: false, error: String(error) }, 500);
  }
});

// ============================================================================
// CREATE NEW CHANNEL
// ============================================================================
app.post("/", async (c) => {
  try {
    console.log("[CHANNELS] POST create channel");
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

    if (error) {
      console.error("[CHANNELS] Database error:", error);
      throw error;
    }

    console.log(`[CHANNELS] Created channel: ${name} (${data.id})`);
    return c.json({ ok: true, channel: data }, 201);
  } catch (error) {
    console.error("Error creating channel:", error);
    return c.json({ ok: false, error: String(error) }, 500);
  }
});

// ============================================================================
// GET SINGLE CHANNEL BY ID
// ============================================================================
app.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    console.log(`[CHANNELS] GET single channel - id: ${id}, path: ${c.req.path}`);
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      console.log(`[CHANNELS] Invalid UUID format: ${id}`);
      return c.json({ ok: false, error: "Invalid channel ID format" }, 400);
    }
    
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from("channels")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error(`[CHANNELS] Database error for id ${id}:`, error);
      throw error;
    }

    console.log(`[CHANNELS] Fetched channel: ${id}`);
    return c.json({ ok: true, channel: data });
  } catch (error) {
    console.error("Error fetching channel:", error);
    return c.json({ ok: false, error: String(error) }, 500);
  }
});

// ============================================================================
// UPDATE EXISTING CHANNEL
// ============================================================================
app.patch("/:id", async (c) => {
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

// ============================================================================
// DELETE CHANNEL
// ============================================================================
app.delete("/:id", async (c) => {
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
// CATCH-ALL FOR DEBUGGING
// ============================================================================
app.all("*", (c) => {
  console.log(`[CHANNELS] Unmatched route - method: ${c.req.method}, path: ${c.req.path}, url: ${c.req.url}`);
  return c.json({ 
    ok: false, 
    error: "Route not found",
    debug: {
      method: c.req.method,
      path: c.req.path,
      url: c.req.url
    }
  }, 404);
});

// ============================================================================
// STARTUP
// ============================================================================
console.log("[CHANNELS] Edge function initialized");
Deno.serve(app.fetch);