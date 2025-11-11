/**
 * Main Server Index for make-server-cbef71cf
 * --------------------------------------------------------------
 * MINIMAL TESTING UTILITY - Only handles Sports provider testing.
 * 
 * Migrated to dedicated edge functions:
 * - Weather: /functions/weather_dashboard
 * - News: /functions/news_dashboard
 * - Finance: /functions/finance_dashboard
 */
import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
const app = new Hono();
app.use("*", logger());
app.use("/*", cors());
console.log("[make-server] Starting core server...");
// =============================================================
// HEALTH CHECK
// =============================================================
app.get("/make-server-cbef71cf/health", (c)=>c.json({
    ok: true,
    version: "core-no-news"
  }));
// =============================================================
// TEST PROVIDER ENDPOINT
// =============================================================
app.post("/make-server-cbef71cf/test-provider", async (c)=>{
  const body = await c.req.json();
  const { category, type, api_key, api_secret, base_url, config } = body;
  console.log(`🧪 Testing provider [${category}] (${type})`);
  let testResult = {
    success: false,
    message: ""
  };
  switch(category?.toLowerCase()){
    // =========================================================
    // WEATHER PROVIDER - MOVED TO weather_dashboard edge function
    // =========================================================
    case "weather":
      {
        testResult = {
          success: false,
          message: "Weather provider testing has been moved to the weather_dashboard edge function. Please use /functions/v1/weather_dashboard/test-provider instead.",
          details: "This endpoint no longer handles weather provider testing."
        };
        break;
      }
    // =========================================================
    // SPORTS PROVIDER
    // =========================================================
    case "sports":
      {
        try {
          const testUrl = type === "sportsradar" ? `${base_url}/soccer/trial/v4/en/competitions.json?api_key=${api_key}` : `${base_url}/football/leagues?api_token=${api_key}`;
          console.log(`⚽ Testing Sports API: ${testUrl.replace(api_key, "***")}`);
          const res = await fetch(testUrl, {
            signal: AbortSignal.timeout(10000)
          });
          if (!res.ok) {
            const txt = await res.text();
            testResult = {
              success: false,
              message: `Sports API returned HTTP ${res.status}`,
              details: txt.substring(0, 200)
            };
          } else {
            const data = await res.json();
            const count = data.competitions?.length || data.data?.length || 0;
            testResult = {
              success: true,
              message: `Connected to sports provider (${count} leagues)`,
              details: data
            };
          }
        } catch (error) {
          testResult = {
            success: false,
            message: `Sports API failed: ${error.message}`
          };
        }
        break;
      }
    // =========================================================
    // DEFAULT
    // =========================================================
    default:
      testResult = {
        success: false,
        message: "Unknown provider category"
      };
  }
  return c.json(testResult);
});
export default app;