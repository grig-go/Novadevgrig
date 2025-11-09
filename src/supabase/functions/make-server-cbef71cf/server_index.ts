/**
 * Main Server Index for make-server-cbef71cf
 * --------------------------------------------------------------
 * Handles Weather, Sports, and Finance categories.
 * News logic has been moved to its own Edge Function: /functions/news_dashboard
 */ import { Hono } from "npm:hono";
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
    // WEATHER PROVIDER
    // =========================================================
    case "weather":
      {
        try {
          const providerConfig = config || {};
          const language = providerConfig.language || "en";
          const temperatureUnit = (providerConfig.temperatureUnit || "f").toLowerCase();
          const tempSuffix = temperatureUnit === "c" ? "_c" : "_f";
          const tempUnitSymbol = temperatureUnit === "c" ? "°C" : "°F";
          console.log(`🌤️ Using temperature unit: ${temperatureUnit.toUpperCase()} (${tempUnitSymbol})`);
          const testUrl = `${base_url}/forecast.json?key=${api_key}&q=51.5074,-0.1278&days=3&aqi=no&alerts=no&lang=${language}`;
          console.log(`🌤️ Weather test URL: ${testUrl.replace(api_key, "***")}`);
          const res = await fetch(testUrl, {
            signal: AbortSignal.timeout(10000)
          });
          if (!res.ok) {
            const txt = await res.text();
            testResult = {
              success: false,
              message: `Weather API returned HTTP ${res.status}`,
              details: txt.substring(0, 200)
            };
            break;
          }
          const data = await res.json();
          const currentData = data.current || {};
          const location = data.location || {};
          const forecast = data.forecast?.forecastday || [];
          const result = {
            location: {
              name: location.name,
              region: location.region,
              country: location.country,
              lat: location.lat,
              lon: location.lon,
              localtime: location.localtime
            },
            current: {
              condition: currentData.condition?.text,
              icon: currentData.condition?.icon,
              temperature: currentData[`temp${tempSuffix}`],
              feelsLike: currentData[`feelslike${tempSuffix}`],
              dewPoint: currentData[`dewpoint${tempSuffix}`] || 0,
              wind: {
                speed: currentData.wind_mph || currentData.wind_kph,
                direction: currentData.wind_dir
              },
              humidity: currentData.humidity,
              pressure: currentData.pressure_mb,
              uv: currentData.uv
            },
            forecast: forecast.map((day)=>({
                date: day.date,
                day: {
                  condition: day.day.condition?.text,
                  icon: day.day.condition?.icon,
                  tempMax: day.day[`maxtemp${tempSuffix}`],
                  tempMin: day.day[`mintemp${tempSuffix}`],
                  humidity: day.day.avghumidity,
                  rainChance: day.day.daily_chance_of_rain
                },
                hours: (day.hour || []).map((hour)=>({
                    time: hour.time,
                    condition: hour.condition?.text,
                    icon: hour.condition?.icon,
                    temperature: hour[`temp${tempSuffix}`],
                    feelsLike: hour[`feelslike${tempSuffix}`],
                    dewPoint: hour[`dewpoint${tempSuffix}`] || 0,
                    humidity: hour.humidity,
                    wind: {
                      speed: hour.wind_mph || hour.wind_kph,
                      direction: hour.wind_dir
                    },
                    rainChance: hour.chance_of_rain
                  }))
              }))
          };
          testResult = {
            success: true,
            message: "Weather provider OK",
            details: {
              ...result,
              providerSettings: {
                temperatureUnit,
                language
              }
            }
          };
        } catch (error) {
          testResult = {
            success: false,
            message: `Weather API test failed: ${error.message}`,
            details: error.stack
          };
        }
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
    // FINANCE PROVIDER
    // =========================================================
    case "finance":
      {
        try {
          const testUrl = `${base_url}/ping`;
          console.log(`💰 Testing Finance API: ${testUrl}`);
          const res = await fetch(testUrl, {
            signal: AbortSignal.timeout(10000)
          });
          const data = await res.json();
          testResult = {
            success: true,
            message: "Finance API OK",
            details: data
          };
        } catch (error) {
          testResult = {
            success: false,
            message: `Finance API failed: ${error.message}`
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
