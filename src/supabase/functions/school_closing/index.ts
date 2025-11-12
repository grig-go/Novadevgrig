// ============================================================================
// /supabase/functions/school_closing/index.ts
// ============================================================================
import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import { XMLParser } from "npm:fast-xml-parser";
// ----------------------------------------------------------------------------
// Supabase client
// ----------------------------------------------------------------------------
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
console.log("[school_closing] Booting function…");
console.log("🔍 SUPABASE_URL:", SUPABASE_URL);
console.log("🔍 SUPABASE_SERVICE_ROLE_KEY (present?):", !!SUPABASE_SERVICE_ROLE_KEY);
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
// ----------------------------------------------------------------------------
// Server setup
// ----------------------------------------------------------------------------
const BUILD_ID = new Date().toISOString();
console.log("[school_closing] Build ID:", BUILD_ID);
const app = new Hono().basePath("/school_closing");
app.use("*", async (c, next)=>{
  console.log(`[${c.req.method}] ${c.req.path}`);
  await next();
});
app.use("/*", cors({
  origin: "*",
  allowHeaders: [
    "Content-Type",
    "Authorization",
    "Cache-Control",
    "Pragma",
    "x-client-info",
    "apikey"
  ],
  allowMethods: [
    "GET",
    "POST",
    "PUT",
    "DELETE",
    "OPTIONS"
  ],
  credentials: true
}));
// ----------------------------------------------------------------------------
// GET / - Fetch table contents for UI
// ----------------------------------------------------------------------------
app.get("/", async (c)=>{
  console.log("📥 Fetching school_closings table...");
  const { data, error } = await supabase.from("school_closings").select("*").order("fetched_at", {
    ascending: false
  });
  if (error) {
    console.error("❌ Error fetching school closings:", error);
    return c.json({
      error: error.message
    }, 500);
  }
  console.log(`✅ Retrieved ${data?.length || 0} rows`);
  return c.json(data);
});
// ----------------------------------------------------------------------------
// POST /manual - Add manual entry from UI
// ----------------------------------------------------------------------------
app.post("/manual", async (c)=>{
  console.log("📝 Received manual insert request");
  try {
    const body = await c.req.json();
    console.log("➡️ Manual entry payload:", body);
    const { state, city, county_name, organization_name, type, status_day, status_description, notes } = body;
    // Validate required fields
    if (!organization_name || !status_description) {
      console.error("❌ Missing required fields");
      return c.json({
        error: "organization_name and status_description are required"
      }, 400);
    }
    // ✅ Ensure "manual_entry" provider exists in data_providers table
    const { data: existingProvider } = await supabase.from("data_providers").select("provider_id").eq("provider_id", "manual_entry").single();
    if (!existingProvider) {
      console.log("📦 Creating manual_entry provider...");
      const { error: providerError } = await supabase.from("data_providers").insert({
        id: "manual_entry",
        type: "manual",
        category: "school_closings",
        name: "Manual Entry",
        description: "Manually added school closings",
        is_active: true
      });
      if (providerError) {
        console.error("❌ Failed to create manual provider:", providerError);
      // Continue anyway - it might already exist
      } else {
        console.log("✅ Manual provider created");
      }
    }
    const { data, error } = await supabase.from("school_closings").insert([
      {
        provider_id: "manual_entry",
        region_id: "manual",
        state: state || null,
        city: city || null,
        county_name: county_name || null,
        organization_name,
        type: type || "School",
        status_day: status_day || "Today",
        status_description,
        notes: notes ? notes + " (manual)" : "Manual entry",
        source_format: "manual",
        fetched_at: new Date().toISOString()
      }
    ]).select();
    if (error) {
      console.error("❌ Supabase insert error:", error);
      throw error;
    }
    console.log("✅ Manual entry inserted:", data);
    return c.json({
      ok: true,
      message: "✅ Manual entry added",
      data
    });
  } catch (err) {
    console.error("❌ Error inserting manual entry:", err);
    return c.json({
      ok: false,
      error: err.message
    }, 500);
  }
});
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// POST /fetch - Fetch XML and populate table (region_id only, flexible config)
// ----------------------------------------------------------------------------
app.post("/fetch", async (c)=>{
  console.log("⏰ [school_closing] /fetch triggered at", new Date().toISOString());
  console.log("📡 Request method:", c.req.method);
  try {
    // 1️⃣ Load provider config
    const { data: provider, error: providerError } = await supabase.from("data_providers").select("config, base_url").eq("id", "school_provider:news12_closings").single();
    if (providerError) throw providerError;
    if (!provider) throw new Error("Provider not found");
    const config = typeof provider.config === "string" ? JSON.parse(provider.config) : provider.config || {};
    // 2️⃣ Build list of region IDs (supports string, array, or none)
    let regionIds = [];
    if (Array.isArray(config.region_ids)) {
      regionIds = config.region_ids;
    } else if (typeof config.region_id === "string" && config.region_id.includes(",")) {
      regionIds = config.region_id.split(",").map((r)=>r.trim());
    } else if (config.region_id) {
      regionIds = [
        config.region_id
      ];
    } else {
      console.warn("⚠️ No region_id found in config — using null region");
      regionIds = [
        null
      ];
    }
    const parser = new XMLParser({
      ignoreAttributes: false,
      parseTagValue: true
    });
    let totalInserted = 0;
    // 3️⃣ Loop through region IDs
    for (const regionId of regionIds){
      const endpointTemplate = config.endpoint || "/GetClosings?sOrganizationName=&sRegionId={region_id}&sZoneId=";
      // replace placeholder if regionId exists, otherwise strip param
      const endpoint = regionId ? endpointTemplate.replace("{region_id}", regionId) : endpointTemplate.replace("sRegionId={region_id}", "");
      const url = `${provider.base_url}${endpoint}`;
      console.log(`🌐 Fetching XML for region_id: ${regionId ?? "null"}`);
      console.log(`🔗 URL: ${url}`);
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`⚠️ Region ${regionId ?? "null"} failed: HTTP ${res.status}`);
        continue;
      }
      const xmlText = await res.text();
      const parsed = parser.parse(xmlText);
      let records = parsed?.DataSet?.["diffgr:diffgram"]?.NewDataSet?.closings || [];
      if (!Array.isArray(records)) records = [
        records
      ].filter(Boolean);
      console.log(`📚 Region ${regionId ?? "null"}: ${records.length} records found`);
      if (records.length === 0) continue;
      // 4️⃣ Normalize and upsert
      const rows = records.map((item)=>({
          provider_id: "school_provider:news12_closings",
          region_id: regionId,
          state: item.STATE || null,
          city: item.CITY || null,
          county_name: item.COUNTY_NAME || null,
          organization_name: item.ORG_NAME || null,
          type: "School",
          status_day: item.STATUS_DAY || null,
          status_description: item.STATUS_DESCRIPTION || null,
          notes: `Fetched from News12 XML feed (region ${regionId ?? "none"})`,
          source_format: "xml",
          fetched_at: new Date().toISOString(),
          raw_data: item
        }));
      const { error: upsertError } = await supabase.from("school_closings").upsert(rows, {
        onConflict: "provider_id,organization_name,status_day",
        ignoreDuplicates: false
      });
      if (upsertError) {
        console.error(`❌ Upsert error for region ${regionId ?? "null"}:`, upsertError);
        continue;
      }
      console.log(`✅ Region ${regionId ?? "null"}: ${rows.length} records upserted`);
      totalInserted += rows.length;
    }
    console.log(`🎉 Done. Total upserted: ${totalInserted}`);
    return c.json({
      ok: true,
      message: `✅ Upserted ${totalInserted} records from ${regionIds.length} region(s)`,
      count: totalInserted
    });
  } catch (err) {
    console.error("❌ Fetch error:", err);
    return c.json({
      ok: false,
      error: err.message
    }, 500);
  }
});
// ----------------------------------------------------------------------------
// DELETE /school_closings/manual/:id - Delete a manual entry
// ----------------------------------------------------------------------------
app.delete("/manual/:id", async (c)=>{
  const id = c.req.param("id");
  const { data: record, error: fetchError } = await supabase.from("school_closings").select("id, provider_id, is_manual, notes").eq("id", id).single();
  if (fetchError || !record) {
    return c.json({
      error: "Entry not found"
    }, 404);
  }
  const isManual = record.provider_id === null || record.provider_id === "manual_entry" || record.is_manual === true || record.notes && record.notes.toLowerCase().includes("manual");
  if (!isManual) {
    return c.json({
      error: "Cannot delete non-manual entries (provider data)"
    }, 403);
  }
  const { error: deleteError } = await supabase.from("school_closings").delete().eq("id", id);
  if (deleteError) {
    console.error("❌ Error deleting manual entry:", deleteError);
    return c.json({
      error: deleteError.message
    }, 500);
  }
  return c.json({
    message: `✅ Manual entry ${id} deleted successfully`
  });
});
// ----------------------------------------------------------------------------
// Run server
// ----------------------------------------------------------------------------
console.log("[school_closing] Ready");
Deno.serve(app.fetch);
