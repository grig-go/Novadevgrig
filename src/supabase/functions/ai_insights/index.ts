/**
 * AI Insights Edge Function
 * --------------------------------------------------------------
 * Centralized edge function for managing AI insights across dashboards.
 * Stores insights in dedicated tables per dashboard (e.g., ai_insights_elections, ai_insights_weather).
 */

import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2";

const app = new Hono();
app.use("*", logger());
app.use("/*", cors());

console.log("[ai_insights] Starting AI Insights server...");

const BUILD_ID = "ai_insights_v1.0.0";

// =============================================================================
// SUPABASE CLIENT SETUP
// =============================================================================
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// =============================================================================
// HEALTH CHECK
// =============================================================================
app.get("/ai_insights/health", (c) => {
  return c.json({
    status: "ok",
    service: "ai_insights",
    build: BUILD_ID,
  });
});

// =============================================================================
// ELECTIONS AI INSIGHTS ROUTES
// =============================================================================

// Get all election AI insights
app.get("/ai_insights/elections", async (c) => {
  try {
    console.log("📡 [ai_insights] Fetching election AI insights...");

    const { data, error } = await supabase
      .from("ai_insights_elections")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ [ai_insights] Error fetching election insights:", error);
      return c.json({ error: error.message }, 500);
    }

    console.log(`✅ [ai_insights] Fetched ${data?.length || 0} election insights`);
    return c.json({ insights: data || [] });
  } catch (error) {
    console.error("❌ [ai_insights] Exception fetching election insights:", error);
    return c.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});

// Save a new election AI insight
app.post("/ai_insights/elections", async (c) => {
  try {
    const body = await c.req.json();
    const {
      question,
      response,
      selectedRaces = [],
      insightType,
      provider,
      model,
      category,
      topic,
      metadata = {},
    } = body;

    console.log("📡 [ai_insights] Saving new election AI insight...");
    console.log("   Question:", question?.substring(0, 100));
    console.log("   Insight Type:", insightType);
    console.log("   Category:", category);

    // Build metadata object
    const insightMetadata = {
      question,
      selectedRaces,
      insightType,
      provider,
      model,
      ...metadata,
    };

    const { data, error } = await supabase
      .from("ai_insights_elections")
      .insert({
        insight: response,
        category: category || insightType || "general",
        topic: topic || question?.substring(0, 100),
        metadata: insightMetadata,
      })
      .select()
      .single();

    if (error) {
      console.error("❌ [ai_insights] Error saving election insight:", error);
      return c.json({ error: error.message }, 500);
    }

    console.log("✅ [ai_insights] Election insight saved with ID:", data.id);
    return c.json({ insight: data });
  } catch (error) {
    console.error("❌ [ai_insights] Exception saving election insight:", error);
    return c.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});

// Delete an election AI insight
app.delete("/ai_insights/elections/:id", async (c) => {
  try {
    const id = c.req.param("id");
    console.log(`📡 [ai_insights] Deleting election insight with ID: ${id}`);

    const { error } = await supabase
      .from("ai_insights_elections")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("❌ [ai_insights] Error deleting election insight:", error);
      return c.json({ error: error.message }, 500);
    }

    console.log("✅ [ai_insights] Election insight deleted");
    return c.json({ success: true });
  } catch (error) {
    console.error("❌ [ai_insights] Exception deleting election insight:", error);
    return c.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});

// =============================================================================
// EXPORT
// =============================================================================
export default { fetch: app.fetch };
