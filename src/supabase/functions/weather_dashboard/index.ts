// ============================================================================
// Weather Dashboard Edge Function
// Handles WeatherAPI + CSV providers + AI Insights safely
// ============================================================================
import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
// ============================================================================
// SUPABASE CLIENT
// ============================================================================
const getSupabaseClient = ()=>createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
const supabase = getSupabaseClient();
// ============================================================================
// SERVER SETUP
// ============================================================================
const BUILD_ID = new Date().toISOString();
console.log("[weather_dashboard] boot", BUILD_ID);
const app = new Hono().basePath("/weather_dashboard");
// Disable noisy logger that breaks JSON responses
// app.use("*", logger(console.log));
app.use("*", async (c, next)=>{
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
  exposeHeaders: [
    "Content-Length"
  ],
  maxAge: 600
}));
// ============================================================================
// HELPERS
// ============================================================================
async function safeJson(c) {
  try {
    return await c.req.json();
  } catch  {
    return {};
  }
}
function jsonErr(c, status, code, detail) {
  console.error(`[${code}]`, detail ?? "");
  return c.json({
    ok: false,
    error: code,
    detail: String(detail ?? "")
  }, status);
}
function generateLocationId(name, region) {
  const cleanName = name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  if (region) {
    const cleanRegion = region.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    const shortRegion = cleanRegion.split("-")[0];
    return `${cleanName}-${shortRegion}`;
  }
  return cleanName;
}
// ============================================================================
// HEALTH
// ============================================================================
app.get("/health", (c)=>c.json({
    status: "ok",
    service: "weather_dashboard",
    build: BUILD_ID
  }));
// ============================================================================
// WEATHER LOCATIONS
// ============================================================================
// GET all locations
app.get("/locations", async (c)=>{
  try {
    const { data, error } = await supabase.from("weather_locations").select("*").eq("is_active", true).neq("provider_id", "weather_provider:news12_local") // ✅ exclude static CSV provider
    .order("name");
    if (error) return jsonErr(c, 500, "LOCATIONS_FETCH_FAILED", error.message);
    return c.json({
      ok: true,
      locations: data || []
    });
  } catch (err) {
    return jsonErr(c, 500, "LOCATIONS_FETCH_FAILED", err);
  }
});
// POST add a new location
app.post("/locations", async (c)=>{
  try {
    const body = await safeJson(c);
    const { id, name, admin1, country, lat, lon, elevation_m, stationId, provider_id, provider_name } = body;
    if (!id || !name || lat === undefined || lon === undefined) {
      return jsonErr(c, 400, "INVALID_LOCATION", "Missing required fields: id, name, lat, lon");
    }
    // Get default provider if not specified
    let finalProviderId = provider_id;
    let finalProviderName = provider_name;
    if (!finalProviderId) {
      const { data: providers, error: provError } = await supabase.from("data_providers").select("*").eq("category", "weather").eq("is_active", true);
      if (provError) {
        console.error("Error fetching provider:", provError);
        return jsonErr(c, 500, "PROVIDER_FETCH_FAILED", provError.message);
      }
      const weatherApiProvider = providers?.find((p)=>p.type === "weatherapi" || p.name === "WeatherAPI.com");
      if (weatherApiProvider) {
        finalProviderId = weatherApiProvider.id;
        finalProviderName = weatherApiProvider.name;
      }
    }
    const locationData = {
      id,
      name,
      admin1: admin1 || "",
      country: country || "",
      lat,
      lon,
      elevation_m: elevation_m || null,
      station_id: stationId || null,
      provider_id: finalProviderId,
      provider_name: finalProviderName,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    console.log(`📍 Adding location: ${name} (${lat}, ${lon})`);
    const { data, error } = await supabase.from("weather_locations").upsert(locationData, {
      onConflict: "id"
    }).select().single();
    if (error) {
      console.error("Failed to add location:", error);
      return jsonErr(c, 500, "LOCATION_ADD_FAILED", error.message);
    }
    console.log(`✅ Location added: ${name}`);
    return c.json({
      ok: true,
      location: data
    });
  } catch (err) {
    console.error("Error adding location:", err);
    return jsonErr(c, 500, "LOCATION_ADD_FAILED", err);
  }
});
// DELETE a location
app.delete("/locations/:id", async (c)=>{
  try {
    const id = c.req.param("id");
    console.log(`🗑️ Deleting location: ${id}`);
    // Delete location and all related data
    const { error: locError } = await supabase.from("weather_locations").delete().eq("id", id);
    if (locError) {
      console.error("Failed to delete location:", locError);
      return jsonErr(c, 500, "LOCATION_DELETE_FAILED", locError.message);
    }
    console.log(`✅ Location deleted: ${id}`);
    return c.json({
      ok: true,
      success: true
    });
  } catch (err) {
    console.error("Error deleting location:", err);
    return jsonErr(c, 500, "LOCATION_DELETE_FAILED", err);
  }
});
// PUT update location (for overrides like custom_name)
app.put("/locations/:id", async (c)=>{
  try {
    const id = c.req.param("id");
    const body = await safeJson(c);
    const { custom_name } = body;
    console.log(`✏️ Updating location ${id} with custom_name: ${custom_name}`);
    // Update the location's custom_name
    const { data, error } = await supabase.from("weather_locations").update({
      custom_name: custom_name || null,
      updated_at: new Date().toISOString()
    }).eq("id", id).select().single();
    if (error) {
      console.error("Failed to update location:", error);
      return jsonErr(c, 500, "LOCATION_UPDATE_FAILED", error.message);
    }
    console.log(`✅ Location updated: ${id}`);
    return c.json({
      ok: true,
      location: data
    });
  } catch (err) {
    console.error("Error updating location:", err);
    return jsonErr(c, 500, "LOCATION_UPDATE_FAILED", err);
  }
});
// SEARCH locations using WeatherAPI geocoding
app.get("/locations/search", async (c)=>{
  try {
    const query = c.req.query("q");
    if (!query) {
      return jsonErr(c, 400, "INVALID_QUERY", "Query parameter 'q' is required");
    }
    // Get active provider
    const { data: providers, error: provError } = await supabase.from("data_providers").select("*").eq("category", "weather").eq("is_active", true);
    if (provError) {
      console.error("Error fetching provider:", provError);
      return jsonErr(c, 500, "PROVIDER_FETCH_FAILED", provError.message);
    }
    // Find WeatherAPI provider
    const weatherApiProvider = providers?.find((p)=>p.type === "weatherapi" || p.name === "WeatherAPI.com");
    if (!weatherApiProvider) {
      console.error("No WeatherAPI provider found. Available providers:", providers);
      return jsonErr(c, 400, "NO_ACTIVE_PROVIDER", "No active WeatherAPI provider configured. Please configure a provider in Settings.");
    }
    console.log(`Using provider: ${weatherApiProvider.name}`);
    const apiKey = weatherApiProvider.api_key;
    if (!apiKey) {
      return jsonErr(c, 500, "API_KEY_MISSING", "WeatherAPI key not configured");
    }
    const searchUrl = `https://api.weatherapi.com/v1/search.json?key=${apiKey}&q=${query}`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) {
      throw new Error(`Weather API error: ${searchRes.status}`);
    }
    const searchResults = await searchRes.json();
    const formattedResults = searchResults.map((loc)=>{
      return {
        id: generateLocationId(loc.name, loc.region),
        name: loc.name,
        admin1: loc.region,
        country: loc.country,
        lat: loc.lat,
        lon: loc.lon,
        provider_id: weatherApiProvider.id,
        provider_name: weatherApiProvider.name,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });
    return c.json({
      ok: true,
      results: formattedResults
    });
  } catch (err) {
    console.error("Error searching locations:", err);
    return jsonErr(c, 500, "LOCATION_SEARCH_FAILED", err);
  }
});
// ============================================================================
// WEATHER DATA FETCH & UPSERT (Multi-provider, skips CSV / News12 providers)
// ============================================================================
async function fetchWeatherAPI(provider, locations) {
  const apiKey = provider.api_key;
  if (!apiKey) {
    console.error(`⚠️ API key missing for ${provider.name}`);
    return [];
  }
  const results = await Promise.all(locations.map(async (loc)=>{
    try {
      const { id, lat, lon, name, custom_name, admin1, country } = loc;
      if (!lat || !lon || lat === 0 || lon === 0) {
        console.warn(`[skip] ${name}: invalid lat/lon (${lat}, ${lon})`);
        return {
          success: false,
          name,
          reason: "invalid lat/lon"
        };
      }
      console.log(`🌤️ Fetching WeatherAPI for ${name} (${lat},${lon})`);
      const url = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${lat},${lon}&days=14&aqi=yes&alerts=yes`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`WeatherAPI error: ${res.status}`);
      const forecast = await res.json();
      const current = forecast.current;
      const location = forecast.location;
      
      // UPSERT current weather
      await supabase.from("weather_current").upsert({
        location_id: id,
        lat,
        lon,
        name,
        admin1: admin1 || location.region,
        country: country || location.country,
        timestamp: current.last_updated,
        temp_f: current.temp_f,
        temp_c: current.temp_c,
        feels_like_f: current.feelslike_f,
        feels_like_c: current.feelslike_c,
        condition_text: current.condition.text,
        condition_icon: current.condition.icon,
        humidity: current.humidity,
        wind_mph: current.wind_mph,
        wind_kph: current.wind_kph,
        wind_degree: current.wind_degree,
        wind_direction: current.wind_dir,
        pressure_in: current.pressure_in,
        pressure_mb: current.pressure_mb,
        visibility_miles: current.vis_miles,
        visibility_km: current.vis_km,
        cloud_cover: current.cloud,
        uv_index: current.uv,
        precip_mm: current.precip_mm,
        updated_at: new Date().toISOString()
      }, {
        onConflict: "location_id"
      });

      // UPSERT air quality if available
      if (current.air_quality) {
        const aq = current.air_quality;
        await supabase.from("weather_air_quality").upsert({
          location_id: id,
          timestamp: current.last_updated,
          aqi: Math.round(aq["us-epa-index"] || aq["gb-defra-index"] || 0),
          category: "Good",
          standard: "US EPA",
          pm25: aq.pm2_5,
          pm10: aq.pm10,
          o3: aq.o3,
          no2: aq.no2,
          so2: aq.so2,
          co: aq.co,
          updated_at: new Date().toISOString()
        }, {
          onConflict: "location_id"
        });
      }

      // UPSERT hourly forecast
      const hourlyItems = forecast.forecast.forecastday.flatMap((d)=>d.hour.map((h)=>({
        location_id: id,
        forecast_time: h.time,
        temp_f: h.temp_f,
        temp_c: h.temp_c,
        condition_text: h.condition.text,
        condition_icon: h.condition.icon,
        humidity: h.humidity,
        wind_kph: h.wind_kph,
        wind_mph: h.wind_mph,
        wind_degree: h.wind_degree,
        precip_probability: h.chance_of_rain / 100,
        precip_mm: h.precip_mm,
        cloud_cover: h.cloud,
        uv_index: h.uv
      })));
      if (hourlyItems.length > 0) {
        await supabase.from("weather_hourly_forecast").upsert(hourlyItems, {
          onConflict: "location_id,forecast_time"
        });
      }

      // UPSERT daily forecast
      const dailyItems = forecast.forecast.forecastday.map((d)=>({
        location_id: id,
        forecast_date: d.date,
        condition_text: d.day.condition.text,
        condition_icon: d.day.condition.icon,
        temp_max_f: d.day.maxtemp_f,
        temp_min_f: d.day.mintemp_f,
        temp_max_c: d.day.maxtemp_c,
        temp_min_c: d.day.mintemp_c,
        precip_probability: d.day.daily_chance_of_rain / 100,
        precip_mm: d.day.totalprecip_mm,
        uv_index: d.day.uv,
        sunrise: d.astro.sunrise,
        sunset: d.astro.sunset
      }));
      if (dailyItems.length > 0) {
        await supabase.from("weather_daily_forecast").upsert(dailyItems, {
          onConflict: "location_id,forecast_date"
        });
      }

      // UPSERT alerts
      const alertItems = forecast.alerts?.alert?.map((a)=>{
        const alertId = `${id}_${a.event}_${a.effective}`;
        return {
          id: alertId,
          location_id: id,
          event: a.event,
          headline: a.headline,
          description: a.desc,
          severity: a.severity,
          urgency: a.urgency,
          certainty: a.certainty,
          areas: a.areas ? [a.areas] : [],
          start_time: a.effective,
          end_time: a.expires,
          source: "WeatherAPI",
          instruction: a.instruction || "",
          links: [],
          provider_id: provider.id,
          provider_type: "weatherapi",
          fetched_at: new Date().toISOString()
        };
      }) || [];
      if (alertItems.length > 0) {
        await supabase.from("weather_alerts").upsert(alertItems, {
          onConflict: "id"
        });
      }

      // Build location name field with override support
      const locationNameField = custom_name ? {
        originalValue: name,
        overriddenValue: custom_name,
        isOverridden: true
      } : name;

      // Return data in the format frontend expects
      return {
        success: true,
        name,
        data: {
          location: {
            id,
            name: locationNameField,
            admin1: admin1 || location.region,
            country: country || location.country,
            lat,
            lon,
            provider_id: loc.provider_id
          },
          data: {
            current: {
              asOf: current.last_updated,
              temperature: { value: current.temp_f, unit: "°F" },
              feelsLike: { value: current.feelslike_f, unit: "°F" },
              humidity: current.humidity,
              uvIndex: current.uv,
              summary: current.condition.text,
              icon: current.condition.text.toLowerCase(),
              wind: {
                speed: { value: current.wind_mph, unit: "mph" },
                direction_deg: current.wind_degree,
                direction_cardinal: current.wind_dir
              },
              pressure: { value: current.pressure_in, unit: "in" },
              visibility: { value: current.vis_miles, unit: "mi" },
              cloudCover: current.cloud,
              airQuality: current.air_quality ? {
                aqi: Math.round(current.air_quality["us-epa-index"] || 0),
                category: "Good",
                standard: "US EPA",
                pm25: current.air_quality.pm2_5,
                pm10: current.air_quality.pm10,
                o3: current.air_quality.o3,
                no2: current.air_quality.no2,
                so2: current.air_quality.so2,
                co: current.air_quality.co
              } : null
            },
            hourly: {
              items: forecast.forecast.forecastday[0]?.hour?.slice(0, 24).map((h)=>({
                time: h.time,
                temperature: { value: h.temp_f, unit: "°F" },
                icon: h.condition.text.toLowerCase(),
                precipProbability: h.chance_of_rain / 100
              })) || [],
              stepHours: 1
            },
            daily: {
              items: forecast.forecast.forecastday?.map((d)=>({
                date: d.date,
                summary: d.day.condition.text,
                icon: d.day.condition.text.toLowerCase(),
                tempMax: { value: d.day.maxtemp_f, unit: "°F" },
                tempMin: { value: d.day.mintemp_f, unit: "°F" },
                precipProbability: d.day.daily_chance_of_rain / 100
              })) || []
            },
            alerts: forecast.alerts?.alert?.map((a)=>({
              event: a.event,
              headline: a.headline,
              description: a.desc,
              severity: a.severity,
              urgency: a.urgency,
              areas: [a.areas],
              start: a.effective,
              end: a.expires,
              source: "WeatherAPI"
            })) || []
          }
        }
      };
    } catch (err) {
      console.error(`❌ Weather fetch failed for ${loc.name}:`, err);
      return {
        success: false,
        name: loc.name,
        error: String(err)
      };
    }
  }));
  return results;
}

// ============================================================================
// Fetch weather data from database tables (for CSV/other providers)
// ============================================================================
async function fetchFromDatabase(locations) {
  const results = await Promise.all(locations.map(async (loc) => {
    try {
      const { id, lat, lon, name, custom_name, admin1, country, provider_id } = loc;
      
      console.log(`📊 Fetching data from DB for ${name} (${id})`);
      
      // Fetch current weather
      const { data: currentData } = await supabase
        .from("weather_current")
        .select("*")
        .eq("location_id", id)
        .single();
      
      // Fetch hourly forecast (next 24 hours)
      const { data: hourlyData } = await supabase
        .from("weather_hourly_forecast")
        .select("*")
        .eq("location_id", id)
        .gte("forecast_time", new Date().toISOString())
        .order("forecast_time")
        .limit(24);
      
      // Fetch daily forecast
      const { data: dailyData } = await supabase
        .from("weather_daily_forecast")
        .select("*")
        .eq("location_id", id)
        .gte("forecast_date", new Date().toISOString().split('T')[0])
        .order("forecast_date")
        .limit(14);
      
      // Fetch alerts
      const { data: alertsData } = await supabase
        .from("weather_alerts")
        .select("*")
        .eq("location_id", id)
        .gte("end_time", new Date().toISOString())
        .order("start_time");
      
      // Fetch air quality
      const { data: aqData } = await supabase
        .from("weather_air_quality")
        .select("*")
        .eq("location_id", id)
        .single();
      
      // Build location name field with override support
      const locationNameField = custom_name ? {
        originalValue: name,
        overriddenValue: custom_name,
        isOverridden: true
      } : name;
      
      // Helper function to get temperature value (handles both schemas)
      const getTemp = (data: any, fahrenheitField: string, valueField: string) => {
        // WeatherAPI schema uses temp_f, feels_like_f, etc.
        if (data[fahrenheitField] !== undefined && data[fahrenheitField] !== null) {
          return data[fahrenheitField];
        }
        // CSV schema uses temperature_value, feels_like_value, etc.
        if (data[valueField] !== undefined && data[valueField] !== null) {
          return data[valueField];
        }
        return null;
      };
      
      // Helper function to get wind speed
      const getWindSpeed = (data: any) => {
        if (data.wind_mph !== undefined && data.wind_mph !== null) {
          return data.wind_mph; // WeatherAPI schema
        }
        if (data.wind_speed_value !== undefined && data.wind_speed_value !== null) {
          return data.wind_speed_value; // CSV schema
        }
        return null;
      };
      
      // Helper function to get wind direction
      const getWindDirection = (data: any) => {
        if (data.wind_direction !== undefined && data.wind_direction !== null) {
          return data.wind_direction; // WeatherAPI schema
        }
        if (data.wind_direction_cardinal !== undefined && data.wind_direction_cardinal !== null) {
          return data.wind_direction_cardinal; // CSV schema
        }
        return null;
      };
      
      // Helper function to get pressure
      const getPressure = (data: any) => {
        if (data.pressure_in !== undefined && data.pressure_in !== null) {
          return data.pressure_in; // WeatherAPI schema
        }
        if (data.pressure_value !== undefined && data.pressure_value !== null) {
          return data.pressure_value; // CSV schema
        }
        return null;
      };
      
      // Helper function to get visibility
      const getVisibility = (data: any) => {
        if (data.visibility_miles !== undefined && data.visibility_miles !== null) {
          return data.visibility_miles; // WeatherAPI schema
        }
        if (data.visibility_value !== undefined && data.visibility_value !== null) {
          return data.visibility_value; // CSV schema
        }
        return null;
      };
      
      return {
        success: true,
        name,
        data: {
          location: {
            id,
            name: locationNameField,
            admin1: admin1 || "",
            country: country || "",
            lat,
            lon,
            provider_id
          },
          data: {
            current: currentData ? {
              asOf: currentData.timestamp || currentData.as_of,
              temperature: { 
                value: getTemp(currentData, 'temp_f', 'temperature_value'), 
                unit: "°F" 
              },
              feelsLike: { 
                value: getTemp(currentData, 'feels_like_f', 'feels_like_value'), 
                unit: "°F" 
              },
              humidity: currentData.humidity,
              uvIndex: currentData.uv_index,
              summary: currentData.condition_text || currentData.summary,
              icon: (currentData.condition_text || currentData.summary || "")?.toLowerCase(),
              wind: {
                speed: { 
                  value: getWindSpeed(currentData), 
                  unit: "mph" 
                },
                direction_deg: currentData.wind_degree || currentData.wind_direction_deg,
                direction_cardinal: getWindDirection(currentData)
              },
              pressure: { 
                value: getPressure(currentData), 
                unit: "in" 
              },
              visibility: { 
                value: getVisibility(currentData), 
                unit: "mi" 
              },
              cloudCover: currentData.cloud_cover,
              airQuality: aqData ? {
                aqi: aqData.aqi,
                category: aqData.category || "Good",
                standard: aqData.standard || "US EPA",
                pm25: aqData.pm25,
                pm10: aqData.pm10,
                o3: aqData.o3,
                no2: aqData.no2,
                so2: aqData.so2,
                co: aqData.co
              } : null
            } : null,
            hourly: {
              items: (hourlyData || []).map((h) => ({
                time: h.forecast_time,
                temperature: { 
                  value: getTemp(h, 'temp_f', 'temperature_value'), 
                  unit: "°F" 
                },
                icon: (h.condition_text || h.summary || "")?.toLowerCase(),
                precipProbability: h.precip_probability || 0
              })),
              stepHours: 1
            },
            daily: {
              items: (dailyData || []).map((d) => ({
                date: d.forecast_date,
                summary: d.condition_text || d.summary,
                icon: (d.condition_text || d.summary || "")?.toLowerCase(),
                tempMax: { 
                  value: getTemp(d, 'temp_max_f', 'temp_max_value'), 
                  unit: "°F" 
                },
                tempMin: { 
                  value: getTemp(d, 'temp_min_f', 'temp_min_value'), 
                  unit: "°F" 
                },
                precipProbability: d.precip_probability || 0
              }))
            },
            alerts: (alertsData || []).map((a) => ({
              event: a.event,
              headline: a.headline,
              description: a.description,
              severity: a.severity,
              urgency: a.urgency,
              areas: a.areas || [],
              start: a.start_time,
              end: a.end_time,
              source: a.source || "Unknown"
            }))
          }
        }
      };
    } catch (err) {
      console.error(`❌ Failed to fetch data from DB for ${loc.name}:`, err);
      return {
        success: false,
        name: loc.name,
        error: String(err)
      };
    }
  }));
  return results;
}

// ============================================================================
// GET /weather-data — Fetch all active providers + all locations
// ============================================================================
app.get("/weather-data", async (c)=>{
  try {
    console.log("=== Fetching Weather Data for ALL active providers ===");
    
    // Fetch all active weather providers
    const { data: providers, error: provError } = await supabase.from("data_providers").select("*").eq("category", "weather").eq("is_active", true);
    if (provError) {
      console.error("Error fetching providers:", provError);
      return jsonErr(c, 500, "PROVIDERS_FETCH_FAILED", provError.message);
    }
    if (!providers || providers.length === 0) {
      return jsonErr(c, 400, "NO_PROVIDERS", "No active weather providers configured.");
    }
    console.log(`🔍 Found ${providers.length} active weather providers`);
    
    // ✅ Fetch ALL active locations (including CSV/News12)
    const { data: allLocations, error: locError } = await supabase
      .from("weather_locations")
      .select("*")
      .eq("is_active", true)
      .order("name");
      
    if (locError) {
      console.error("Error fetching locations:", locError);
      return jsonErr(c, 500, "LOCATIONS_FETCH_FAILED", locError.message);
    }
    if (!allLocations?.length) {
      console.log("⚠️ No active weather locations found");
      return c.json({
        ok: true,
        providers: [],
        locationsProcessed: 0,
        data: []
      });
    }
    
    console.log(`📍 Found ${allLocations.length} total active locations`);
    
    // Group by provider_id for efficiency
    const grouped = allLocations.reduce((acc, loc)=>{
      if (!acc[loc.provider_id]) acc[loc.provider_id] = [];
      acc[loc.provider_id].push(loc);
      return acc;
    }, {});
    
    const allResults = [];
    
    // Loop through each provider and its matching locations
    for (const provider of providers){
      const locations = grouped[provider.id] || [];
      console.log(`🌐 Processing provider ${provider.name} (${provider.type}) with ${locations.length} locations`);
      if (!locations.length) continue;
      
      let results = [];
      switch(provider.type){
        case "weatherapi":
          // Fetch from WeatherAPI and save to database
          results = await fetchWeatherAPI(provider, locations);
          break;
        case "csv":
          // Fetch from database only (CSV data already imported)
          console.log(`📄 Fetching CSV provider (${provider.name}) data from database`);
          results = await fetchFromDatabase(locations);
          break;
        default:
          console.warn(`⚠️ No fetch logic yet for provider type: ${provider.type}`);
          // Default: try to fetch from database
          results = await fetchFromDatabase(locations);
      }
      allResults.push(...results);
    }
    
    // Combine and report
    const successful = allResults.filter((r)=>r.success);
    const failed = allResults.filter((r)=>!r.success);
    
    console.log(`✅ Weather fetch complete: ${successful.length}/${allResults.length} successful`);
    if (failed.length > 0) {
      console.warn(`⚠️ Failed locations:`, failed.map(f => f.name));
    }
    
    return c.json({
      ok: true,
      providers: providers.map((p)=>p.name),
      locationsProcessed: allLocations.length,
      data: successful.map((r)=>r.data)
    });
  } catch (error) {
    console.error("❌ WEATHER_DATA_FETCH_FAILED:", error);
    return jsonErr(c, 500, "WEATHER_DATA_FETCH_FAILED", error);
  }
});
// ============================================================================
// PROVIDERS
// ============================================================================
app.get("/providers", async (c)=>{
  try {
    const { data, error } = await supabase.from("data_providers").select("*").eq("category", "weather").order("name");
    if (error) return jsonErr(c, 500, "PROVIDERS_FETCH_FAILED", error.message);
    const formatted = (data || []).map((p)=>({
        id: p.id,
        name: p.name,
        type: p.type,
        isActive: p.is_active,
        source_url: p.source_url,
        language: p.metadata?.language || "en",
        temperatureUnit: p.metadata?.temperature_unit || "f",
        metadata: p.metadata || {}
      }));
    return c.json({
      ok: true,
      providers: formatted
    });
  } catch (err) {
    return jsonErr(c, 500, "PROVIDERS_FETCH_FAILED", err);
  }
});
// POST/PUT provider (for updating API keys, settings, etc.)
app.post("/providers", async (c)=>{
  try {
    const body = await safeJson(c);
    const { id, name, type, source_url, is_active, metadata } = body;
    if (!id || !name || !type) {
      return jsonErr(c, 400, "INVALID_PROVIDER", "Missing required fields: id, name, type");
    }
    const providerData = {
      id,
      name,
      type,
      category: "weather",
      source_url: source_url || null,
      is_active: is_active ?? true,
      metadata: metadata || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const { data, error } = await supabase.from("data_providers").upsert(providerData, {
      onConflict: "id"
    }).select().single();
    if (error) return jsonErr(c, 500, "PROVIDER_SAVE_FAILED", error.message);
    return c.json({
      ok: true,
      provider: data
    });
  } catch (err) {
    return jsonErr(c, 500, "PROVIDER_SAVE_FAILED", err);
  }
});
app.put("/providers", async (c)=>{
  // Reuse POST logic for PUT
  return app.post("/providers", c);
});
// ============================================================================
// AI INSIGHTS
// ============================================================================
app.get("/ai-insights", async (c)=>{
  try {
    const { data, error } = await supabase.from("ai_insights_weather").select("*").order("created_at", {
      ascending: false
    });
    if (error) return jsonErr(c, 500, "INSIGHTS_FETCH_FAILED", error.message);
    return c.json({
      ok: true,
      insights: data || []
    });
  } catch (err) {
    return jsonErr(c, 500, "INSIGHTS_FETCH_FAILED", err);
  }
});
app.post("/ai-insights", async (c)=>{
  try {
    const body = await safeJson(c);
    const { question, response, selectedLocations, insightType, provider, model } = body;
    if (!question || !response) {
      return jsonErr(c, 400, "INVALID_INSIGHT", "Question and response required");
    }
    console.log(`💾 Saving AI insight: "${question.substring(0, 50)}..."`);
    console.log(`📊 Insight data:`, {
      question,
      insightType,
      provider,
      model,
      selectedLocations
    });
    const { data, error } = await supabase.from("ai_insights_weather").insert({
      topic: question,
      insight: response,
      category: insightType || "all",
      metadata: JSON.stringify({
        question,
        insightType,
        provider,
        model,
        selectedLocations
      }),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).select().single();
    if (error) {
      console.error("❌ Error saving insight to database:", error);
      console.error("❌ Error details:", JSON.stringify(error, null, 2));
      return jsonErr(c, 500, "INSIGHT_SAVE_FAILED", error.message);
    }
    console.log(`✅ Insight saved with ID: ${data.id}`);
    return c.json({
      ok: true,
      insight: data
    });
  } catch (err) {
    console.error("❌ Exception saving insight:", err);
    return jsonErr(c, 500, "INSIGHT_SAVE_FAILED", err);
  }
});
app.delete("/ai-insights/:id", async (c)=>{
  try {
    const id = c.req.param("id");
    const { error } = await supabase.from("ai_insights_weather").delete().eq("id", id);
    if (error) return jsonErr(c, 500, "INSIGHT_DELETE_FAILED", error.message);
    return c.json({
      ok: true,
      success: true
    });
  } catch (err) {
    return jsonErr(c, 500, "INSIGHT_DELETE_FAILED", err);
  }
});
// ============================================================================
// ============================================================================
// WEATHER CSV INGEST (News12 format — with timestamp + dedupe fix)
// ============================================================================
app.get("/weather-data-csv", async (c)=>{
  try {
    console.log("🌦️ [CSV] Starting ingestion (News12 with time/dedupe fixes)");
    // 1️⃣ Load provider
    const { data: providers, error: provErr } = await supabase.from("data_providers").select("*").eq("category", "weather").eq("type", "csv").eq("is_active", true);
    if (provErr) throw new Error(provErr.message);
    const provider = providers?.[0];
    if (!provider?.source_url) throw new Error("No active CSV provider with source_url");
    // 2️⃣ Fetch CSV
    const res = await fetch(provider.source_url);
    if (!res.ok) throw new Error(`Failed to fetch CSV: ${res.status} ${res.statusText}`);
    const csvText = await res.text();
    const delimiter = csvText.includes("\t") ? "\t" : ",";
    let lines = csvText.trim().split(/\r?\n/);
    // 🧹 Skip "Generated:" header
    if (lines[0].startsWith("Generated:")) lines = lines.slice(1);
    const headers = lines[0].split(delimiter).map((h)=>h.trim());
    const rows = lines.slice(1).map((l)=>{
      const vals = l.split(delimiter);
      return Object.fromEntries(headers.map((h, i)=>[
          h,
          vals[i]?.trim()
        ]));
    });
    console.log(`✅ Parsed ${rows.length} CSV rows`);
    // 🕓 Helper to parse time-only strings (like "6:15 AM")
    function parseTime(timeStr) {
      if (!timeStr || !timeStr.trim()) return null;
      const now = new Date();
      const [time, modifier] = timeStr.split(" ");
      let [hours, minutes] = time.split(":").map(Number);
      if (modifier?.toUpperCase() === "PM" && hours < 12) hours += 12;
      if (modifier?.toUpperCase() === "AM" && hours === 12) hours = 0;
      const parsed = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes || 0);
      return parsed.toISOString();
    }
    // 3️⃣ Create/Upsert weather_locations
    const uniqueLocs = new Map();
    for (const r of rows){
      const locName = r.LocationName?.trim();
      if (!locName) continue;
      if (!uniqueLocs.has(locName)) {
        uniqueLocs.set(locName, {
          id: generateLocationId(locName, "news12"),
          name: locName,
          admin1: "New Jersey",
          country: "United States of America",
          lat: 0,
          lon: 0,
          provider_id: provider.id,
          provider_name: provider.name,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    }
    const locations = Array.from(uniqueLocs.values());
    const { error: locErr } = await supabase.from("weather_locations").upsert(locations, {
      onConflict: "id"
    });
    if (locErr) throw new Error("weather_locations upsert failed: " + locErr.message);
    console.log(`📍 Upserted ${locations.length} weather_locations`);
    // 4️⃣ Build current + forecast arrays
    const currentRows = [];
    const forecastRows = [];
    for (const r of rows){
      const location = r.LocationName?.trim();
      const forecastName = r.ForecastName?.trim().toLowerCase();
      if (!location || !forecastName) continue;
      const location_id = generateLocationId(location, "news12");
      const common = {
        wind_speed_value: Number(r.WindSpeed) || null,
        wind_speed_unit: "mph",
        wind_direction_cardinal: r.WindDirection || null,
        wind_direction_deg: Number(r.WindDegree) || null,
        humidity: Number(r.Humidity) || null,
        pressure_value: Number(r.Pressure) || null,
        pressure_unit: "mb",
        uv_index: Number(r.UvIndexVal) || null,
        visibility_value: Number(r.Visibility) || null,
        visibility_unit: "mi",
        summary: r.ShortText || null,
        icon: r.MediaFile || null,
        sunrise: parseTime(r.Sunrise),
        sunset: parseTime(r.Sunset)
      };
      if (forecastName === "current") {
        currentRows.push({
          location_id,
          as_of: new Date().toISOString(),
          temperature_value: Number(r.Temp) || null,
          temperature_unit: "F",
          feels_like_value: Number(r.Temp2) || null,
          feels_like_unit: "F",
          ...common,
          provider_id: provider.id,
          provider_type: "csv",
          fetched_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        });
      } else {
        forecastRows.push({
          location_id,
          forecast_date: new Date(),
          temp_max_value: Number(r.Temp) || null,
          temp_min_value: Number(r.Temp2) || null,
          temp_max_unit: "F",
          temp_min_unit: "F",
          precip_probability: Number(r.Pop) || null,
          uv_index_max: Number(r.UvIndexVal) || null,
          ...common,
          provider_id: provider.id,
          created_at: new Date().toISOString()
        });
      }
    }
    // Deduplicate by location_id for current, and by (location_id, forecast_date) for forecast
    const dedupe = (arr, keyFn)=>{
      const map = new Map();
      for (const item of arr)map.set(keyFn(item), item);
      return Array.from(map.values());
    };
    const dedupedCurrent = dedupe(currentRows, (r)=>r.location_id);
    const dedupedForecast = dedupe(forecastRows, (r)=>`${r.location_id}-${r.forecast_date}`);
    console.log(`🌡️ Prepared ${dedupedCurrent.length} current rows and ${dedupedForecast.length} forecast rows`);
    // 5️⃣ Upsert current + forecast
    if (dedupedCurrent.length > 0) {
      const { error: currErr } = await supabase.from("weather_current").upsert(dedupedCurrent, {
        onConflict: "location_id"
      });
      if (currErr) throw new Error("weather_current upsert failed: " + currErr.message);
    }
    if (dedupedForecast.length > 0) {
      const { error: foreErr } = await supabase.from("weather_daily_forecast").upsert(dedupedForecast, {
        onConflict: "location_id,forecast_date,provider_id"
      });
      if (foreErr) throw new Error("weather_daily_forecast upsert failed: " + foreErr.message);
    }
    await supabase.from("data_providers").update({
      last_run: new Date().toISOString()
    }).eq("id", provider.id);
    console.log(`✅ Import complete: ${locations.length} locations, ${dedupedCurrent.length} current, ${dedupedForecast.length} forecast`);
    return c.json({
      ok: true,
      imported: dedupedCurrent.length + dedupedForecast.length,
      provider: provider.name,
      success: true
    });
  } catch (err) {
    console.error("❌ CSV import failed:", err);
    return c.json({
      ok: false,
      imported: 0,
      warning: "CSV import failed",
      detail: err.message
    }, 500);
  }
});
// ============================================================================
// START SERVER
// ============================================================================
console.log(`[weather_dashboard] Ready at ${BUILD_ID}`);
Deno.serve(app.fetch);