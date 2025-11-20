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
    const { state, city, county_name, organization_name, type, status_day, status_description, notes, delay_minutes, dismissal_time } = body;
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
    // Build raw_data object
    const raw_data = {};
    if (delay_minutes) raw_data.DELAY = parseInt(delay_minutes);
    if (dismissal_time) raw_data.DISMISSAL = dismissal_time;
    if (notes) raw_data.NOTES = notes;
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
        fetched_at: new Date().toISOString(),
        raw_data: Object.keys(raw_data).length > 0 ? raw_data : null
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
// POST /fetch - Fetch XML and populate table (region_id + zone_id support)
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
    const parser = new XMLParser({
      ignoreAttributes: false,
      parseTagValue: true
    });
    let totalInserted = 0;
    // ----------------------------------------------------------------------------
    // 2️⃣ If sample_url exists — ignore regions and use directly
    // ----------------------------------------------------------------------------
    if (config.sample_url && config.sample_url.trim() !== "") {
      const url = config.sample_url;
      const regionId = "42"; // fixed demo region
      const zoneId = ""; // not used for sample mode
      console.log("🧩 Using sample_url (bypassing base_url/endpoint):", url);
      console.log(`🌐 Fetching sample XML as region_id: ${regionId}`);

      // Try direct fetch first, then fallback to proxies
      let res;
      let fetchSuccess = false;

      try {
        console.log(`🔗 Fetching sample XML directly: ${url}`);
        res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; SchoolClosingBot/1.0)',
            'Accept': 'text/xml, application/xml, */*',
          },
        });
        if (res.ok) {
          fetchSuccess = true;
        }
      } catch (directError) {
        console.warn(`⚠️ Direct fetch failed:`, directError.message);
      }

      // Try proxies if direct fetch failed
      if (!fetchSuccess) {
        const proxies = [
          { name: 'corsproxy.io', url: (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}` },
          { name: 'thingproxy', url: (u: string) => `https://thingproxy.freeboard.io/fetch/${u}` },
        ];

        for (const proxy of proxies) {
          try {
            console.log(`🔄 Trying ${proxy.name} for sample XML...`);
            res = await fetch(proxy.url(url));
            if (res.ok) {
              fetchSuccess = true;
              console.log(`✅ ${proxy.name} successful`);
              break;
            }
          } catch (e) {
            console.warn(`⚠️ ${proxy.name} failed`);
          }
        }
      }

      if (!res || !res.ok) throw new Error(`Failed to fetch sample XML: ${res?.status || 'all methods failed'}`);
      const xmlText = await res.text();
      const parsed = parser.parse(xmlText);
      let records = parsed?.DataSet?.["diffgr:diffgram"]?.NewDataSet?.closings || [];
      if (!Array.isArray(records)) records = [
        records
      ].filter(Boolean);
      console.log(`📚 Sample mode: ${records.length} records found`);
      // 🧹 Clean existing rows for provider (region 42)
      console.log(`🧹 Cleaning existing rows for provider=school_provider:news12_closings, region=${regionId}`);
      const { data: deletedRows, error: deleteError } = await supabase.from("school_closings").delete().eq("provider_id", "school_provider:news12_closings").eq("region_id", regionId).select();
      if (deleteError) {
        console.warn("⚠️ Failed to clean existing rows:", deleteError);
      } else {
        console.log(`🗑️ Deleted ${deletedRows?.length || 0} existing rows`);
      }

      // 🧩 Upsert new records
      const rows = records.map((item)=>({
          provider_id: "school_provider:news12_closings",
          region_id: regionId,
          zone_id: zoneId,
          state: item.STATE || null,
          city: item.CITY || null,
          county_name: item.COUNTY_NAME || null,
          organization_name: item.ORG_NAME || null,
          type: "School",
          status_day: item.STATUS_DAY || null,
          status_description: item.STATUS_DESCRIPTION || null,
          notes: "Fetched from sample XML feed",
          source_format: "xml",
          fetched_at: new Date().toISOString(),
          raw_data: item
        }));

      console.log(`📝 Upserting ${rows.length} records...`);
      console.log(`📋 Sample records to upsert:`, rows.slice(0, 2).map(r => ({
        org: r.organization_name,
        status: r.status_description,
        day: r.status_day
      })));

      const { data: upsertedRows, error: upsertError } = await supabase.from("school_closings").upsert(rows, {
        onConflict: "provider_id,organization_name,status_day",
        ignoreDuplicates: false
      }).select();

      if (upsertError) {
        console.error(`❌ Upsert error:`, upsertError);
        throw upsertError;
      }

      console.log(`✅ Sample mode: ${upsertedRows?.length || rows.length} records upserted successfully`);
      totalInserted = upsertedRows?.length || rows.length;
    } else {
      // ----------------------------------------------------------------------------
      // 3️⃣ Live mode: use base_url + endpoint
      // ----------------------------------------------------------------------------
      let regionZonePairs = [];
      // ✅ New structured regions array
      if (Array.isArray(config.regions)) {
        regionZonePairs = config.regions.map((r)=>({
            region_id: r.region_id,
            zone_id: r.zone_id || ""
          }));
        console.log("✅ Using structured regions array:", regionZonePairs);
      } else {
        // ⚙️ Legacy fallback (region_id/zone_id strings)
        const regionIds = (config.region_id || "").split(",").map((r)=>r.trim()).filter(Boolean);
        const zoneIds = (config.zone_id || "").split(",").map((z)=>z.trim());
        regionZonePairs = regionIds.map((region_id, i)=>({
            region_id,
            zone_id: zoneIds[i] || ""
          }));
        if (regionZonePairs.length === 0) regionZonePairs = [
          {
            region_id: "42",
            zone_id: ""
          }
        ];
        console.log("⚠️ Using legacy region/zone config:", regionZonePairs);
      }
      // ----------------------------------------------------------------------------
      // Fetch each region/zone pair
      // ----------------------------------------------------------------------------
      for (const pair of regionZonePairs){
        const { region_id, zone_id } = pair;
        const baseUrl = provider.base_url && provider.base_url.trim() !== "" ? provider.base_url : null;
        if (!baseUrl) {
          console.warn("⚠️ No base_url found — skipping region", region_id);
          continue;
        }
        const endpointTemplate = config.endpoint || "/GetClosings?sOrganizationName=&sRegionId={region_id}&sZoneId={zone_id}";
        // Replace placeholders
        let endpoint = endpointTemplate.replace("{region_id}", region_id || "").replace("{zone_id}", zone_id || "");
        
        // Fix double slash issue
        if (baseUrl.endsWith("/") && endpoint.startsWith("/")) {
          endpoint = endpoint.substring(1);
        } else if (!baseUrl.endsWith("/") && !endpoint.startsWith("/")) {
          endpoint = `/${endpoint}`;
        }
        
        const url = `${baseUrl}${endpoint}`;
        console.log(`🌐 Fetching XML for region_id=${region_id}, zone_id=${zone_id}`);
        console.log(`🔗 URL: ${url}`);

        let xmlText;

        try {
          // Legacy server redirects HTTP to HTTPS but has TLS issues
          // Solution: Use a CORS proxy or alternative fetching method

          const useProxy = config.use_cors_proxy === true;
          let fetchUrl = url;

          if (useProxy) {
            // Use CORS Anywhere or similar proxy
            const proxyUrl = config.cors_proxy_url || 'https://corsproxy.io/?';
            fetchUrl = `${proxyUrl}${encodeURIComponent(url)}`;
            console.log(`🔄 Using CORS proxy: ${fetchUrl}`);
          } else {
            console.log(`🔗 Fetching directly: ${url}`);
          }

          const res = await fetch(fetchUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; SchoolClosingBot/1.0)',
              'Accept': 'text/xml, application/xml, */*',
            },
          });

          console.log(`📊 Response status: ${res.status}`);

          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          }

          xmlText = await res.text();
          console.log(`✅ Fetch successful, received ${xmlText.length} bytes`);

        } catch (fetchError) {
          console.error(`❌ Direct fetch failed for region ${region_id}:`, fetchError.message);

          // Fallback to proxy services (skip legacy TLS due to Deno limitations)
          const proxies = [
            {
              name: 'corsproxy.io',
              url: (targetUrl: string) => `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
            },
            {
              name: 'thingproxy.freeboard.io',
              url: (targetUrl: string) => `https://thingproxy.freeboard.io/fetch/${targetUrl}`,
            },
            {
              name: 'api.codetabs.com',
              url: (targetUrl: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`,
            },
          ];

          let proxySuccess = false;

          for (const proxy of proxies) {
            try {
              console.log(`🔄 Trying proxy: ${proxy.name}...`);
              const proxyUrl = proxy.url(url);

              // Add timeout for proxy requests
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

              const proxyRes = await fetch(proxyUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (compatible; SchoolClosingBot/1.0)',
                },
                signal: controller.signal,
              });

              clearTimeout(timeoutId);

              if (!proxyRes.ok) {
                console.warn(`⚠️ ${proxy.name} returned ${proxyRes.status}`);
                continue;
              }

              xmlText = await proxyRes.text();
              console.log(`✅ Proxy ${proxy.name} successful, received ${xmlText.length} bytes`);
              proxySuccess = true;
              break;
            } catch (proxyError) {
              console.warn(`⚠️ ${proxy.name} failed:`, proxyError.message);
              continue;
            }
          }

          if (!proxySuccess) {
            console.error(`❌ All fetch methods failed for region ${region_id}`);
            continue;
          }
        }

        const parsed = parser.parse(xmlText);
        let records = parsed?.DataSet?.["diffgr:diffgram"]?.NewDataSet?.closings || [];
        if (!Array.isArray(records)) records = [
          records
        ].filter(Boolean);
        console.log(`📚 Region ${region_id}: ${records.length} records found`);
        if (records.length === 0) {
          console.log(`⏭️ Skipping region ${region_id} - no records to insert`);
          continue;
        }

        // 🧹 Clean existing rows for same provider + region + zone
        console.log(`🧹 Cleaning existing rows for provider=school_provider:news12_closings, region=${region_id}, zone=${zone_id}`);
        const { data: deletedRows, error: deleteError } = await supabase.from("school_closings").delete().eq("provider_id", "school_provider:news12_closings").eq("region_id", region_id).eq("zone_id", zone_id).select();
        if (deleteError) {
          console.warn(`⚠️ Failed to clean old records for region ${region_id}, zone ${zone_id}:`, deleteError);
        } else {
          console.log(`🗑️ Deleted ${deletedRows?.length || 0} existing rows for region ${region_id}`);
        }

        // 🧩 Prepare and upsert new records
        const rows = records.map((item)=>({
            provider_id: "school_provider:news12_closings",
            region_id,
            zone_id,
            state: item.STATE || null,
            city: item.CITY || null,
            county_name: item.COUNTY_NAME || null,
            organization_name: item.ORG_NAME || null,
            type: "School",
            status_day: item.STATUS_DAY || null,
            status_description: item.STATUS_DESCRIPTION || null,
            notes: `Fetched from News12 XML feed (region ${region_id}, zone ${zone_id})`,
            source_format: "xml",
            fetched_at: new Date().toISOString(),
            raw_data: item
          }));

        console.log(`📝 Upserting ${rows.length} records for region ${region_id}...`);
        console.log(`📋 Sample records to upsert:`, rows.slice(0, 2).map(r => ({
          org: r.organization_name,
          status: r.status_description,
          day: r.status_day
        })));

        const { data: upsertedRows, error: upsertError } = await supabase.from("school_closings").upsert(rows, {
          onConflict: "provider_id,organization_name,status_day",
          ignoreDuplicates: false
        }).select();

        if (upsertError) {
          console.error(`❌ Upsert error for region ${region_id}:`, upsertError);
          continue;
        }

        console.log(`✅ Region ${region_id}, Zone ${zone_id}: ${upsertedRows?.length || rows.length} records upserted successfully`);
        totalInserted += upsertedRows?.length || rows.length;
      }
    } // 👈 closes live mode else block
    // ----------------------------------------------------------------------------
    // Final summary and response
    // ----------------------------------------------------------------------------
    console.log(`🎉 Done. Total upserted: ${totalInserted}`);
    return c.json({
      ok: true,
      message: `✅ Upserted ${totalInserted} record(s)`,
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
// PUT /manual/:id - Update a manual entry
// ----------------------------------------------------------------------------
app.put("/manual/:id", async (c)=>{
  const id = c.req.param("id");
  console.log("📝 Received manual update request for id:", id);
  try {
    const body = await c.req.json();
    console.log("➡️ Manual update payload:", body);
    // Verify entry exists and is manual
    const { data: record, error: fetchError } = await supabase.from("school_closings").select("id, provider_id, is_manual, notes").eq("id", id).single();
    if (fetchError || !record) {
      return c.json({
        error: "Entry not found"
      }, 404);
    }
    const isManual = record.provider_id === null || record.provider_id === "manual_entry" || record.is_manual === true || record.notes && record.notes.toLowerCase().includes("manual");
    if (!isManual) {
      return c.json({
        error: "Cannot update non-manual entries (provider data)"
      }, 403);
    }
    const { state, city, county_name, organization_name, type, status_day, status_description, notes, delay_minutes, dismissal_time } = body;
    // Validate required fields
    if (!organization_name || !status_description) {
      console.error("❌ Missing required fields");
      return c.json({
        error: "organization_name and status_description are required"
      }, 400);
    }
    // Build raw_data object
    const raw_data = {};
    if (delay_minutes) raw_data.DELAY = parseInt(delay_minutes);
    if (dismissal_time) raw_data.DISMISSAL = dismissal_time;
    if (notes) raw_data.NOTES = notes;
    // Update the record
    const { data, error } = await supabase.from("school_closings").update({
      state: state || null,
      city: city || null,
      county_name: county_name || null,
      organization_name,
      type: type || "School",
      status_day: status_day || "Today",
      status_description,
      notes: notes ? notes + " (manual)" : "Manual entry",
      raw_data: Object.keys(raw_data).length > 0 ? raw_data : null,
      fetched_at: new Date().toISOString()
    }).eq("id", id).select();
    if (error) {
      console.error("❌ Supabase update error:", error);
      throw error;
    }
    console.log("✅ Manual entry updated:", data);
    return c.json({
      ok: true,
      message: "✅ Manual entry updated",
      data
    });
  } catch (err) {
    console.error("❌ Error updating manual entry:", err);
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
