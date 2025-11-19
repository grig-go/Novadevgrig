import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import * as kv from "./kv_store.tsx";
const BUILD_ID = new Date().toISOString();
console.log("[make-server-cbef71cf] boot", BUILD_ID);
const app = new Hono();
// Enable logger
app.use('*', logger(console.log));
// CORS configuration
const corsHeaders = {
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
};
// Enable CORS for all routes
app.use("/*", cors(corsHeaders));
// Health check endpoint
app.get("/make-server-cbef71cf/health", (c)=>{
  return c.json({
    status: "ok",
    build: BUILD_ID
  });
});
// ============================================================================
// PROVIDER CONNECTION TESTING
// ============================================================================
/**
 * Test provider credentials and connectivity
 * Tests different endpoints based on provider category
 */ app.post("/make-server-cbef71cf/test-provider", async (c)=>{
  try {
    const body = await safeJson(c);
    const { category, type, api_key, api_secret, base_url, config } = body;
    console.log(`🧪 Testing provider: category=${category}, type=${type}`);
    // Validate required fields
    if (!category || !type) {
      return c.json({
        success: false,
        error: "Missing required fields: category and type"
      }, 400);
    }
    if (!api_key) {
      return c.json({
        success: false,
        error: "API key is required for testing"
      }, 400);
    }
    if (!base_url) {
      return c.json({
        success: false,
        error: "Base URL is required for testing"
      }, 400);
    }
    let testResult = {
      success: false,
      message: "",
      details: null
    };
    // Test based on category
    switch(category.toLowerCase()){
      case "weather":
        {
          // Test weather API with London coordinates
          try {
            const testUrl = `${base_url}/current.json?key=${api_key}&q=51.5074,-0.1278&aqi=no`;
            console.log(`🌤️ Testing weather API: ${testUrl.replace(api_key, '***')}`);
            const response = await fetch(testUrl, {
              signal: AbortSignal.timeout(10000)
            });
            if (!response.ok) {
              const errorText = await response.text();
              testResult = {
                success: false,
                message: `Weather API returned error: HTTP ${response.status}`,
                details: errorText.substring(0, 200)
              };
            } else {
              const data = await response.json();
              testResult = {
                success: true,
                message: `Successfully fetched weather data for ${data.location?.name || 'test location'}`,
                details: {
                  location: data.location?.name,
                  country: data.location?.country,
                  temperature: data.current?.temp_c,
                  condition: data.current?.condition?.text
                }
              };
            }
          } catch (error) {
            testResult = {
              success: false,
              message: `Weather API test failed: ${error.message}`,
              details: error instanceof Error ? error.stack : null
            };
          }
          break;
        }
      case "sports":
        {
          if (type === "sportmonks") {
            // Test SportMonks API with leagues endpoint
            try {
              const testUrl = `${base_url}/football/leagues?api_token=${api_key}`;
              console.log(`⚽ Testing SportMonks API: ${testUrl.replace(api_key, '***')}`);
              const response = await fetch(testUrl, {
                signal: AbortSignal.timeout(10000)
              });
              if (!response.ok) {
                const errorText = await response.text();
                testResult = {
                  success: false,
                  message: `SportMonks API returned error: HTTP ${response.status}`,
                  details: errorText.substring(0, 200)
                };
              } else {
                const data = await response.json();
                const leagueCount = data.data?.length || 0;
                testResult = {
                  success: true,
                  message: `Successfully connected to SportMonks API (${leagueCount} leagues available)`,
                  details: {
                    leaguesFound: leagueCount,
                    sampleLeagues: data.data?.slice(0, 3).map((l)=>l.name)
                  }
                };
              }
            } catch (error) {
              testResult = {
                success: false,
                message: `SportMonks API test failed: ${error.message}`,
                details: error instanceof Error ? error.stack : null
              };
            }
          } else if (type === "sportsradar") {
            // Test Sportsradar API
            try {
              // Test with soccer/competitions endpoint
              const testUrl = `${base_url}/soccer/trial/v4/en/competitions.json?api_key=${api_key}`;
              console.log(`⚽ Testing Sportsradar API: ${testUrl.replace(api_key, '***')}`);
              const response = await fetch(testUrl, {
                signal: AbortSignal.timeout(10000)
              });
              if (!response.ok) {
                const errorText = await response.text();
                testResult = {
                  success: false,
                  message: `Sportsradar API returned error: HTTP ${response.status}`,
                  details: errorText.substring(0, 200)
                };
              } else {
                const data = await response.json();
                const competitionCount = data.competitions?.length || 0;
                testResult = {
                  success: true,
                  message: `Successfully connected to Sportsradar API (${competitionCount} competitions available)`,
                  details: {
                    competitionsFound: competitionCount
                  }
                };
              }
            } catch (error) {
              testResult = {
                success: false,
                message: `Sportsradar API test failed: ${error.message}`,
                details: error instanceof Error ? error.stack : null
              };
            }
          } else {
            testResult = {
              success: false,
              message: `Unknown sports provider type: ${type}`
            };
          }
          break;
        }
      case "news":
        {
          if (type === "newsapi") {
            // Test NewsAPI with top headlines
            try {
              const testUrl = `${base_url}/top-headlines?country=us&pageSize=1&apiKey=${api_key}`;
              console.log(`📰 Testing NewsAPI: ${testUrl.replace(api_key, '***')}`);
              const response = await fetch(testUrl, {
                signal: AbortSignal.timeout(10000)
              });
              if (!response.ok) {
                const errorText = await response.text();
                testResult = {
                  success: false,
                  message: `NewsAPI returned error: HTTP ${response.status}`,
                  details: errorText.substring(0, 200)
                };
              } else {
                const data = await response.json();
                testResult = {
                  success: true,
                  message: `Successfully connected to NewsAPI (${data.totalResults || 0} articles available)`,
                  details: {
                    totalResults: data.totalResults,
                    status: data.status
                  }
                };
              }
            } catch (error) {
              testResult = {
                success: false,
                message: `NewsAPI test failed: ${error.message}`,
                details: error instanceof Error ? error.stack : null
              };
            }
          } else if (type === "newsdata") {
            // Test NewsData.io
            try {
              const testUrl = `${base_url}/news?apikey=${api_key}&language=en&size=1`;
              console.log(`📰 Testing NewsData: ${testUrl.replace(api_key, '***')}`);
              const response = await fetch(testUrl, {
                signal: AbortSignal.timeout(10000)
              });
              if (!response.ok) {
                const errorText = await response.text();
                testResult = {
                  success: false,
                  message: `NewsData returned error: HTTP ${response.status}`,
                  details: errorText.substring(0, 200)
                };
              } else {
                const data = await response.json();
                testResult = {
                  success: true,
                  message: `Successfully connected to NewsData (${data.totalResults || 0} articles available)`,
                  details: {
                    totalResults: data.totalResults,
                    status: data.status
                  }
                };
              }
            } catch (error) {
              testResult = {
                success: false,
                message: `NewsData test failed: ${error.message}`,
                details: error instanceof Error ? error.stack : null
              };
            }
          } else {
            testResult = {
              success: false,
              message: `Unknown news provider type: ${type}`
            };
          }
          break;
        }
      case "finance":
        {
          if (type === "alpaca") {
            // Test Alpaca API
            if (!api_secret) {
              testResult = {
                success: false,
                message: "Alpaca requires both API key and secret"
              };
            } else {
              try {
                const testUrl = `${base_url}/v2/account`;
                console.log(`💰 Testing Alpaca API: ${testUrl}`);
                const response = await fetch(testUrl, {
                  headers: {
                    "APCA-API-KEY-ID": api_key,
                    "APCA-API-SECRET-KEY": api_secret
                  },
                  signal: AbortSignal.timeout(10000)
                });
                if (!response.ok) {
                  const errorText = await response.text();
                  testResult = {
                    success: false,
                    message: `Alpaca API returned error: HTTP ${response.status}`,
                    details: errorText.substring(0, 200)
                  };
                } else {
                  const data = await response.json();
                  testResult = {
                    success: true,
                    message: `Successfully connected to Alpaca account: ${data.account_number}`,
                    details: {
                      accountNumber: data.account_number,
                      status: data.status,
                      currency: data.currency
                    }
                  };
                }
              } catch (error) {
                testResult = {
                  success: false,
                  message: `Alpaca API test failed: ${error.message}`,
                  details: error instanceof Error ? error.stack : null
                };
              }
            }
          } else if (type === "coingecko") {
            // Test CoinGecko API
            try {
              const testUrl = `${base_url}/ping`;
              console.log(`🪙 Testing CoinGecko API: ${testUrl}`);
              const headers = {
                "Content-Type": "application/json"
              };
              // CoinGecko API key is optional for free tier
              if (api_key) {
                headers["x-cg-demo-api-key"] = api_key;
              }
              const response = await fetch(testUrl, {
                headers,
                signal: AbortSignal.timeout(10000)
              });
              if (!response.ok) {
                const errorText = await response.text();
                testResult = {
                  success: false,
                  message: `CoinGecko API returned error: HTTP ${response.status}`,
                  details: errorText.substring(0, 200)
                };
              } else {
                const data = await response.json();
                testResult = {
                  success: true,
                  message: `Successfully connected to CoinGecko API`,
                  details: data
                };
              }
            } catch (error) {
              testResult = {
                success: false,
                message: `CoinGecko API test failed: ${error.message}`,
                details: error instanceof Error ? error.stack : null
              };
            }
          } else {
            testResult = {
              success: false,
              message: `Unknown finance provider type: ${type}`
            };
          }
          break;
        }
      default:
        {
          testResult = {
            success: false,
            message: `Unknown provider category: ${category}`
          };
        }
    }
    console.log(`🧪 Test result:`, testResult);
    return c.json(testResult);
  } catch (error) {
    console.error("Error testing provider:", error);
    return c.json({
      success: false,
      error: "Failed to test provider",
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
/**
 * Mask API key for safe display (show first 3 and last 4 characters)
 */ function maskApiKey(apiKey) {
  if (!apiKey) return '';
  if (apiKey.length <= 8) return '••••';
  return `${apiKey.slice(0, 3)}•••${apiKey.slice(-4)}`;
}
/**
 * Format AI provider data for safe client response (masks API keys)
 */ function formatAIProvider(provider) {
  return {
    id: provider.id,
    name: provider.name,
    providerName: provider.provider_name,
    type: provider.type,
    description: provider.description || "",
    apiKeyMasked: maskApiKey(provider.api_key),
    apiSecretMasked: provider.api_secret ? maskApiKey(provider.api_secret) : undefined,
    apiKeyConfigured: !!provider.api_key,
    apiSecretConfigured: !!provider.api_secret,
    endpoint: provider.endpoint || "",
    model: provider.model || "",
    availableModels: provider.available_models || [],
    enabled: provider.enabled ?? true,
    rateLimitPerMinute: provider.rate_limit_per_minute,
    maxTokens: provider.max_tokens,
    temperature: provider.temperature,
    topP: provider.top_p,
    dashboardAssignments: provider.dashboard_assignments || [],
    createdAt: provider.created_at,
    updatedAt: provider.updated_at
  };
}
/**
 * Safe JSON parsing helper for Hono/Deno requests
 */ async function safeJson(c) {
  try {
    return await c.req.json();
  } catch  {
    return {};
  }
}
/**
 * Error response helper with logging
 */ function jsonErr(c, status, code, detail) {
  console.error(`[${code}]`, detail ?? '');
  return c.json({
    ok: false,
    error: code,
    detail: String(detail ?? '')
  }, status);
}
/**
 * Sleep utility for rate limiting
 */ const sleep = (ms)=>{
  return new Promise((resolve)=>setTimeout(resolve, ms));
};
// ============================================================================
// ALPACA API BASE URLS
// ============================================================================
/**
 * Alpaca base URLs (configurable via environment variables)
 * Trading API: For account info, orders, positions
 * Data API: For market data, quotes, snapshots
 */ const ALPACA_TRADING_BASE = Deno.env.get("ALPACA_TRADING_BASE_URL") ?? "https://paper-api.alpaca.markets";
const ALPACA_DATA_BASE = Deno.env.get("ALPACA_DATA_BASE_URL") ?? "https://data.alpaca.markets";
console.log(`📊 Alpaca Trading Base: ${ALPACA_TRADING_BASE}`);
console.log(`📊 Alpaca Data Base: ${ALPACA_DATA_BASE}`);
// ============================================================================
// INITIALIZATION - Default Providers
// ============================================================================
async function initializeDefaultWeatherProvider() {
  // Weather providers now stored in data_providers table (migration 008)
  console.log("=== Weather Provider (Database) ===");
  console.log("✓ Weather providers seeded via migration 008");
}
async function initializeDefaultAIProviders() {
  try {
    console.log("=== AI Providers Initialization (Database) ===");
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    // Check if Claude provider exists
    const { data: existingClaude } = await supabase.from("ai_providers").select("id").eq("id", "claude-default").single();
    if (!existingClaude) {
      console.log("Initializing default Claude AI provider...");
      const claudeApiKey = "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";
      let availableModels = [];
      try {
        const response = await fetch('https://api.anthropic.com/v1/models', {
          headers: {
            'x-api-key': claudeApiKey,
            'anthropic-version': '2023-06-01'
          }
        });
        if (response.ok) {
          const data = await response.json();
          availableModels = data.data.map((m)=>({
              id: m.id,
              name: m.display_name || m.id,
              description: m.created_at ? `Created: ${new Date(m.created_at).toLocaleDateString()}` : '',
              contextWindow: m.max_tokens || 200000,
              capabilities: [
                'text',
                'vision'
              ]
            }));
        }
      } catch (error) {
        console.error('Error fetching Claude models:', error);
        availableModels = [
          {
            id: 'claude-3-7-sonnet-20250219',
            name: 'Claude 3.7 Sonnet',
            description: 'Latest Claude model with enhanced capabilities',
            contextWindow: 200000,
            capabilities: [
              'text',
              'vision'
            ]
          },
          {
            id: 'claude-3-5-sonnet-20241022',
            name: 'Claude 3.5 Sonnet',
            description: 'Advanced reasoning and multimodal model',
            contextWindow: 200000,
            capabilities: [
              'text',
              'vision'
            ]
          }
        ];
      }
      await supabase.from("ai_providers").insert({
        id: "claude-default",
        name: "Anthropic Claude (Production)",
        provider_name: "claude",
        type: "multimodal",
        description: "Anthropic Claude AI for advanced text and vision tasks",
        api_key: claudeApiKey,
        endpoint: "https://api.anthropic.com/v1",
        model: availableModels[0]?.id || "claude-3-7-sonnet-20250219",
        available_models: availableModels,
        enabled: true,
        dashboard_assignments: []
      });
      console.log("✓ Default Claude AI provider initialized");
    } else {
      console.log("✓ Claude AI provider already exists");
    }
    // Initialize Gemini if not exists
    const { data: existingGemini } = await supabase.from("ai_providers").select("id").eq("id", "gemini-default").single();
    if (!existingGemini) {
      console.log("Initializing default Gemini AI provider...");
      const geminiApiKey = "AIzaSyD0KVlIBYDqmjN7iQx_Ybi4EQbQ-lhPuH0";
      await supabase.from("ai_providers").insert({
        id: "gemini-default",
        name: "Google Gemini (Production)",
        provider_name: "gemini",
        type: "multimodal",
        description: "Google Gemini AI for text, image, and video generation",
        api_key: geminiApiKey,
        endpoint: "https://generativelanguage.googleapis.com/v1beta",
        model: "gemini-2.0-flash-exp",
        available_models: [
          {
            id: 'gemini-2.0-flash-exp',
            name: 'Gemini 2.0 Flash (Experimental)',
            description: 'Latest experimental multimodal model',
            contextWindow: 1048576,
            capabilities: [
              'text',
              'image',
              'video'
            ]
          },
          {
            id: 'gemini-1.5-pro',
            name: 'Gemini 1.5 Pro',
            description: 'Advanced reasoning and multimodal model',
            contextWindow: 2097152,
            capabilities: [
              'text',
              'image',
              'video'
            ]
          }
        ],
        enabled: true,
        dashboard_assignments: []
      });
      console.log("✓ Default Gemini AI provider initialized");
    } else {
      console.log("✓ Gemini AI provider already exists");
    }
    // Initialize OpenAI if not exists
    const { data: existingOpenAI } = await supabase.from("ai_providers").select("id").eq("id", "openai-default").single();
    if (!existingOpenAI) {
      console.log("Initializing default OpenAI provider...");
      const openaiApiKey = "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";
      await supabase.from("ai_providers").insert({
        id: "openai-default",
        name: "OpenAI GPT (Production)",
        provider_name: "openai",
        type: "multimodal",
        description: "OpenAI GPT models for text and vision tasks",
        api_key: openaiApiKey,
        endpoint: "https://api.openai.com/v1",
        model: "gpt-4o",
        available_models: [
          {
            id: 'gpt-4o',
            name: 'GPT-4o',
            description: 'Most capable multimodal model',
            contextWindow: 128000,
            capabilities: [
              'text',
              'vision'
            ]
          },
          {
            id: 'gpt-4-turbo',
            name: 'GPT-4 Turbo',
            description: 'Fast and capable model',
            contextWindow: 128000,
            capabilities: [
              'text',
              'vision'
            ]
          }
        ],
        enabled: true,
        dashboard_assignments: []
      });
      console.log("✓ Default OpenAI provider initialized");
    } else {
      console.log("✓ OpenAI provider already exists");
    }
  } catch (error) {
    console.error("Error initializing AI providers:", error);
  }
}
// ============================================================================
// FEEDS ROUTES
// ============================================================================
app.get("/make-server-cbef71cf/feeds", async (c)=>{
  try {
    const feeds = await kv.getByPrefix("feed:");
    return c.json({
      ok: true,
      feeds: feeds || []
    });
  } catch (error) {
    console.error("Error fetching feeds:", error);
    return c.json({
      error: "Failed to fetch feeds",
      details: String(error)
    }, 500);
  }
});
app.post("/make-server-cbef71cf/feeds", async (c)=>{
  try {
    const body = await safeJson(c);
    if (!body.id) return jsonErr(c, 400, 'MISSING_ID', 'Feed ID is required');
    await kv.set(`feed:${body.id}`, body);
    return c.json({
      ok: true,
      success: true,
      id: body.id
    });
  } catch (error) {
    return jsonErr(c, 500, 'FEED_SAVE_FAILED', error);
  }
});
app.put("/make-server-cbef71cf/feeds/:id", async (c)=>{
  try {
    const id = c.req.param("id");
    const body = await safeJson(c);
    const existingFeed = await kv.get(`feed:${id}`);
    if (!existingFeed) {
      return jsonErr(c, 404, 'FEED_NOT_FOUND', id);
    }
    const updatedFeed = {
      ...existingFeed,
      ...body,
      updatedAt: new Date().toISOString()
    };
    await kv.set(`feed:${id}`, updatedFeed);
    return c.json({
      ok: true,
      success: true,
      feed: updatedFeed
    });
  } catch (error) {
    return jsonErr(c, 500, 'FEED_UPDATE_FAILED', error);
  }
});
app.delete("/make-server-cbef71cf/feeds/:id", async (c)=>{
  try {
    const id = c.req.param("id");
    await kv.del(`feed:${id}`);
    return c.json({
      success: true
    });
  } catch (error) {
    console.error("Error deleting feed:", error);
    return c.json({
      error: "Failed to delete feed",
      details: String(error)
    }, 500);
  }
});
// ============================================================================
// AGGREGATED DATA PROVIDERS ENDPOINT (for Feeds UI)
// ============================================================================
app.get("/make-server-cbef71cf/data-providers", async (c)=>{
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    // ALL data providers now in database (migration 008)
    const { data: dbProviders, error } = await supabase.from("data_providers").select("*").order("category", {
      ascending: true
    }).order("name", {
      ascending: true
    });
    if (error) {
      console.error("Error fetching data providers:", error);
      return c.json({
        error: "Failed to fetch data providers",
        details: error.message
      }, 500);
    }
    // Transform database format to API format for backward compatibility
    const providers = (dbProviders || []).map((dp)=>({
        id: dp.id,
        name: dp.name,
        type: dp.type,
        category: dp.category,
        description: dp.description,
        configured: !!dp.api_key,
        apiKeyConfigured: !!dp.api_key,
        apiSecretConfigured: !!dp.api_secret,
        status: dp.is_active ? "active" : "inactive",
        isActive: dp.is_active,
        baseUrl: dp.base_url,
        apiVersion: dp.api_version,
        config: dp.config || {},
        createdAt: dp.created_at,
        updatedAt: dp.updated_at
      }));
    // Note: AI providers are still in separate ai_providers table
    const { data: aiProviders } = await supabase.from("ai_providers").select("*").order("name", {
      ascending: true
    });
    if (aiProviders) {
      aiProviders.forEach((ap)=>{
        providers.push({
          id: ap.id,
          name: ap.name,
          type: ap.provider_name,
          category: "ai",
          description: ap.description || "AI provider",
          configured: !!ap.api_key,
          apiKeyConfigured: !!ap.api_key,
          apiSecretConfigured: !!ap.api_secret,
          status: ap.enabled ? "active" : "inactive",
          isActive: ap.enabled,
          config: {
            endpoint: ap.endpoint,
            model: ap.model,
            type: ap.type
          }
        });
      });
    }
    // Calculate stats
    const stats = {
      totalProviders: providers.length,
      activeProviders: providers.filter((p)=>p.isActive).length,
      stocksTracked: 0,
      cryptosTracked: 0
    };
    return c.json({
      ok: true,
      providers,
      stats
    });
  } catch (error) {
    console.error("Error fetching data providers:", error);
    return c.json({
      error: "Failed to fetch data providers",
      details: String(error)
    }, 500);
  }
});
// Reveal unmasked finance provider credentials (for debug dialog)
app.post("/make-server-cbef71cf/finance-providers/reveal", async (c)=>{
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    // Fetch finance providers with unmasked credentials
    const { data: financeProviders, error } = await supabase.from("data_providers").select("*").eq("category", "finance").order("name", {
      ascending: true
    });
    if (error) {
      console.error("Error fetching finance providers:", error);
      return c.json({
        error: "Failed to fetch finance providers",
        details: error.message
      }, 500);
    }
    // Return providers with unmasked API keys
    const providers = (financeProviders || []).map((dp)=>({
        id: dp.id,
        name: dp.name,
        type: dp.type,
        category: dp.category,
        description: dp.description,
        apiKey: dp.api_key || null,
        apiSecret: dp.api_secret || null,
        apiKeyConfigured: !!dp.api_key,
        apiSecretConfigured: !!dp.api_secret,
        status: dp.is_active ? "active" : "inactive",
        isActive: dp.is_active,
        baseUrl: dp.base_url,
        apiVersion: dp.api_version,
        config: dp.config || {},
        createdAt: dp.created_at,
        updatedAt: dp.updated_at
      }));
    return c.json({
      ok: true,
      providers
    });
  } catch (error) {
    console.error("Error revealing finance provider credentials:", error);
    return c.json({
      error: "Failed to reveal credentials",
      details: String(error)
    }, 500);
  }
});
// Update data provider (unified endpoint for all provider types)
app.put("/make-server-cbef71cf/data-providers/:id", async (c)=>{
  try {
    const id = c.req.param("id");
    const body = await safeJson(c);
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    // Determine provider type from ID prefix or body
    const category = body.category || (id.startsWith("weather_provider:") ? "weather" : id.startsWith("sports_provider:") ? "sports" : id.startsWith("news_provider:") ? "news" : id.startsWith("finance_provider:") ? "finance" : "ai");
    if (category === "ai") {
      // Update AI provider in database
      const updateData = {};
      if (body.name !== undefined) updateData.name = body.name;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.apiKey !== undefined) updateData.api_key = body.apiKey;
      if (body.apiSecret !== undefined) updateData.api_secret = body.apiSecret;
      if (body.endpoint !== undefined) updateData.endpoint = body.endpoint;
      if (body.model !== undefined) updateData.model = body.model;
      if (body.isActive !== undefined) updateData.enabled = body.isActive;
      if (body.rateLimit !== undefined) updateData.rate_limit_per_minute = body.rateLimit;
      if (body.maxTokens !== undefined) updateData.max_tokens = body.maxTokens;
      if (body.temperature !== undefined) updateData.temperature = body.temperature;
      if (body.topP !== undefined) updateData.top_p = body.topP;
      const { error } = await supabase.from("ai_providers").update(updateData).eq("id", id);
      if (error) throw error;
    } else {
      // Update KV store provider (weather, sports, news, finance)
      const prefix = category === "weather" ? "weather_provider:" : category === "sports" ? "sports_provider:" : category === "finance" ? "finance_provider:" : "news_provider:";
      const key = id.startsWith(prefix) ? id : `${prefix}${id}`;
      // UPSERT: Get existing or create new
      const existingProvider = await kv.get(key);
      // Determine provider type from key if not in body
      const providerType = body.type || (key.includes('weatherapi') ? 'weatherapi' : key.includes('sportsradar') ? 'sportsradar' : key.includes('sportmonks') ? 'sportmonks' : key.includes('newsapi') ? 'newsapi' : key.includes('newsdata') ? 'newsdata' : 'unknown');
      // Build base provider if doesn't exist
      const baseProvider = existingProvider || {
        id: key,
        type: providerType,
        createdAt: new Date().toISOString()
      };
      // Merge with updates
      const updatedProvider = {
        ...baseProvider,
        name: body.name !== undefined ? body.name : baseProvider.name,
        type: body.type !== undefined ? body.type : baseProvider.type,
        description: body.description !== undefined ? body.description : baseProvider.description,
        isActive: body.isActive !== undefined ? body.isActive : baseProvider.isActive ?? true,
        apiKey: body.apiKey !== undefined ? body.apiKey : baseProvider.apiKey,
        apiSecret: body.apiSecret !== undefined ? body.apiSecret : baseProvider.apiSecret,
        updatedAt: new Date().toISOString()
      };
      // Add category-specific fields
      if (category === "weather") {
        updatedProvider.language = body.language !== undefined ? body.language : baseProvider.language || "en";
        updatedProvider.temperatureUnit = body.temperatureUnit !== undefined ? body.temperatureUnit : baseProvider.temperatureUnit || "f";
        updatedProvider.baseUrl = baseProvider.baseUrl || "https://api.weatherapi.com/v1";
      } else if (category === "sports") {
        updatedProvider.selectedLeagues = body.selectedLeagues !== undefined ? body.selectedLeagues : baseProvider.selectedLeagues || [];
        updatedProvider.sport = baseProvider.sport || (providerType === 'sportsradar' ? 'soccer' : 'soccer');
        updatedProvider.baseUrl = baseProvider.baseUrl || (providerType === 'sportsradar' ? 'https://api.sportradar.com' : 'https://api.sportmonks.com/v3');
      } else if (category === "news") {
        updatedProvider.country = body.country !== undefined ? body.country : baseProvider.country || "us";
        updatedProvider.language = body.language !== undefined ? body.language : baseProvider.language || "en";
        updatedProvider.pageSize = body.pageSize !== undefined ? body.pageSize : baseProvider.pageSize || 20;
        updatedProvider.defaultQuery = body.defaultQuery !== undefined ? body.defaultQuery : baseProvider.defaultQuery || "";
      } else if (category === "finance") {
        updatedProvider.baseUrl = baseProvider.baseUrl || (providerType === 'alpaca' ? ALPACA_TRADING_BASE : 'https://api.coingecko.com/api/v3');
        updatedProvider.apiVersion = baseProvider.apiVersion || 'v2';
        updatedProvider.dataTypes = baseProvider.dataTypes || [];
      }
      await kv.set(key, updatedProvider);
    }
    return c.json({
      success: true,
      ok: true
    });
  } catch (error) {
    return jsonErr(c, 500, 'PROVIDER_UPDATE_FAILED', error);
  }
});
/**
 * Initialize default finance providers in data_providers table
 */ async function initializeDefaultFinanceProviders() {
  try {
    console.log("=== Finance Providers Initialization (Database) ===");
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    // Check if Alpaca provider exists
    const { data: existingAlpaca } = await supabase.from("data_providers").select("id").eq("id", "finance_provider:alpaca").single();
    if (!existingAlpaca) {
      console.log("Initializing Alpaca finance provider...");
      const alpacaApiKey = Deno.env.get("ALPACA_API_KEY");
      const alpacaApiSecret = Deno.env.get("ALPACA_API_SECRET");
      await supabase.from("data_providers").insert({
        id: "finance_provider:alpaca",
        type: "alpaca",
        category: "finance",
        name: "Alpaca Markets",
        description: "Stock and ETF market data from Alpaca Markets",
        is_active: !!(alpacaApiKey && alpacaApiSecret),
        api_key: alpacaApiKey,
        api_secret: alpacaApiSecret,
        base_url: ALPACA_TRADING_BASE,
        api_version: "v2",
        config: JSON.stringify({
          dataTypes: [
            "stocks",
            "etfs"
          ]
        })
      });
      console.log("✓ Alpaca provider initialized");
    } else {
      console.log("✓ Alpaca provider already exists");
    }
    // Check if CoinGecko provider exists
    const { data: existingCoinGecko } = await supabase.from("data_providers").select("id").eq("id", "finance_provider:coingecko").single();
    if (!existingCoinGecko) {
      console.log("Initializing CoinGecko finance provider...");
      const coinGeckoApiKey = "CG-Us9jV37RzC7EVUb6BJiMVaF1"; // Hardcoded as per guidelines
      await supabase.from("data_providers").insert({
        id: "finance_provider:coingecko",
        type: "coingecko",
        category: "finance",
        name: "CoinGecko",
        description: "Cryptocurrency market data from CoinGecko",
        is_active: true,
        api_key: coinGeckoApiKey,
        base_url: "https://api.coingecko.com/api/v3",
        api_version: "v3",
        config: JSON.stringify({
          dataTypes: [
            "crypto"
          ]
        })
      });
      console.log("✓ CoinGecko provider initialized");
    } else {
      console.log("✓ CoinGecko provider already exists");
    }
  } catch (error) {
    console.error("Error initializing finance providers:", error);
  }
}
// Initialize default AI providers
app.post("/make-server-cbef71cf/ai-providers/initialize", async (c)=>{
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    // Check if Claude provider exists
    const { data: existingClaude } = await supabase.from("ai_providers").select("id").eq("id", "claude-default").single();
    if (!existingClaude) {
      console.log("Creating default Claude provider...");
      const { error } = await supabase.from("ai_providers").insert({
        id: "claude-default",
        name: "Claude (Anthropic)",
        provider_name: "claude",
        type: "text",
        description: "Claude AI by Anthropic - Advanced reasoning and analysis",
        api_key: "",
        endpoint: "https://api.anthropic.com/v1",
        model: "claude-3-5-sonnet-20241022",
        enabled: true,
        rate_limit_per_minute: 50,
        max_tokens: 4096,
        temperature: 0.7,
        top_p: 1,
        dashboard_assignments: []
      });
      if (error) throw error;
      console.log("✓ Default Claude provider created");
    }
    return c.json({
      success: true
    });
  } catch (error) {
    console.error("Error initializing AI providers:", error);
    return c.json({
      error: "Failed to initialize AI providers",
      details: String(error)
    }, 500);
  }
});
// Migrate AI providers from KV store to database table (ONE-TIME MIGRATION)
app.post("/make-server-cbef71cf/ai-providers/migrate-from-kv", async (c)=>{
  try {
    console.log("=== Starting AI Providers KV → Database Migration ===");
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    // Read all AI providers from KV store
    const kvProviders = await kv.getByPrefix("ai_provider:");
    if (!kvProviders || kvProviders.length === 0) {
      console.log("No AI providers found in KV store - nothing to migrate");
      return c.json({
        ok: true,
        migrated: 0,
        note: 'No KV providers found'
      });
    }
    console.log(`Found ${kvProviders.length} AI provider(s) in KV store`);
    // Normalize and prepare for database insert
    const upserts = kvProviders.map((provider)=>({
        id: provider.id,
        name: provider.name,
        provider_name: provider.providerName || provider.provider_name,
        type: provider.type,
        description: provider.description || '',
        api_key: provider.apiKey || provider.api_key || '',
        api_secret: provider.apiSecret || provider.api_secret || null,
        endpoint: provider.endpoint || null,
        model: provider.model || null,
        available_models: Array.isArray(provider.availableModels || provider.available_models) ? provider.availableModels || provider.available_models : [],
        enabled: provider.enabled ?? true,
        rate_limit_per_minute: provider.rateLimitPerMinute || provider.rate_limit_per_minute || null,
        max_tokens: provider.maxTokens || provider.max_tokens || null,
        temperature: provider.temperature || null,
        top_p: provider.topP || provider.top_p || null,
        dashboard_assignments: provider.dashboardAssignments || provider.dashboard_assignments || []
      }));
    // Upsert to database (conflict on id = update)
    const { error } = await supabase.from('ai_providers').upsert(upserts, {
      onConflict: 'id'
    });
    if (error) {
      return jsonErr(c, 500, 'DB_UPSERT_FAILED', error.message);
    }
    console.log(`✓ Successfully migrated ${upserts.length} AI provider(s) to database`);
    return c.json({
      ok: true,
      migrated: upserts.length,
      providers: upserts.map((p)=>({
          id: p.id,
          name: p.name
        }))
    });
  } catch (error) {
    return jsonErr(c, 500, 'MIGRATION_FAILED', error);
  }
});
// Fetch available models from AI provider API
app.post("/make-server-cbef71cf/ai-providers/fetch-models", async (c)=>{
  let body = {};
  try {
    body = await c.req.json();
  } catch  {
    body = {};
  }
  const providerName = body?.providerName;
  const apiKey = body?.apiKey;
  const endpoint = body?.endpoint; // optional
  if (!providerName) {
    return c.json({
      ok: false,
      error: "MISSING_PROVIDER_NAME",
      detail: "providerName is required"
    }, 400);
  }
  if (!apiKey && providerName !== "claude") {
    // Claude returns a static list below; allow missing key only there
    return c.json({
      ok: false,
      error: "MISSING_API_KEY",
      detail: "apiKey is required"
    }, 400);
  }
  let models = [];
  switch(providerName){
    case "openai":
      {
        const r = await fetch("https://api.openai.com/v1/models", {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          }
        });
        if (!r.ok) {
          const t = await r.text();
          return c.json({
            ok: false,
            error: "OPENAI_BAD_STATUS",
            detail: `${r.status}: ${t}`
          }, 502);
        }
        const data = await r.json();
        // Helper function to get friendly model names and descriptions
        const getModelInfo = (modelId)=>{
          if (modelId.includes("gpt-4o")) {
            return {
              name: "GPT-4o",
              description: "Multimodal flagship model"
            };
          } else if (modelId.includes("gpt-4-turbo")) {
            return {
              name: "GPT-4 Turbo",
              description: "Fast and powerful"
            };
          } else if (modelId.includes("gpt-4")) {
            return {
              name: "GPT-4",
              description: "Advanced reasoning"
            };
          } else if (modelId.includes("gpt-3.5-turbo")) {
            return {
              name: "GPT-3.5 Turbo",
              description: "Fast and efficient"
            };
          } else if (modelId.includes("dall-e-3")) {
            return {
              name: "DALL-E 3",
              description: "Latest image generation"
            };
          } else if (modelId.includes("dall-e-2")) {
            return {
              name: "DALL-E 2",
              description: "Image generation"
            };
          } else if (modelId.includes("whisper")) {
            return {
              name: modelId,
              description: "Speech to text"
            };
          } else if (modelId.includes("tts")) {
            return {
              name: modelId,
              description: "Text to speech"
            };
          } else if (modelId.includes("embedding")) {
            return {
              name: modelId,
              description: "Text embeddings"
            };
          } else if (modelId.includes("davinci") || modelId.includes("curie") || modelId.includes("babbage") || modelId.includes("ada")) {
            return {
              name: modelId,
              description: "Legacy model"
            };
          }
          return {
            name: modelId,
            description: ""
          };
        };
        models = (data?.data ?? []).filter((m)=>typeof m?.id === "string").map((m)=>{
          const info = getModelInfo(m.id);
          return {
            id: m.id,
            name: info.name,
            description: info.description,
            type: m.id.includes("dall-e") ? "image" : "text"
          };
        })// Remove duplicates (OpenAI API returns many versions of same model)
        .filter((m, index, self)=>self.findIndex((t)=>t.id === m.id) === index);
        break;
      }
    case "gemini":
      {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (!r.ok) {
          const t = await r.text();
          return c.json({
            ok: false,
            error: "GEMINI_BAD_STATUS",
            detail: `${r.status}: ${t}`
          }, 502);
        }
        const data = await r.json();
        // Map and enhance model information
        const allModels = (data?.models ?? []).filter((m)=>{
          // Only include models with valid names
          return typeof m?.name === "string";
        }).map((m)=>{
          const modelId = String(m.name).replace("models/", "");
          const displayName = m.displayName ?? modelId;
          // Build description from available metadata
          let description = m.description || "";
          // Add specific descriptions for known models
          if (modelId.includes("2.0-flash-exp")) {
            description = "Latest experimental multimodal model";
          } else if (modelId.includes("1.5-pro")) {
            description = "Advanced reasoning and multimodal model";
          } else if (modelId.includes("1.5-flash")) {
            description = "Fast and efficient multimodal model";
          } else if (modelId.includes("embedding")) {
            description = description || "Text embedding model";
          } else if (!description && m.supportedGenerationMethods) {
            // Create description from capabilities
            const capabilities = [];
            if (m.supportedGenerationMethods.includes("generateContent")) capabilities.push("generation");
            if (m.supportedGenerationMethods.includes("embedContent")) capabilities.push("embedding");
            if (m.supportedGenerationMethods.includes("countTokens")) capabilities.push("tokenization");
            description = capabilities.join(", ") || "AI model";
          }
          return {
            id: modelId,
            name: displayName,
            description: description || "Multimodal AI model",
            type: "multimodal",
            rawName: m.name,
            version: m.version
          };
        });
        // Remove exact duplicates by ID (keep first occurrence)
        // Then remove duplicates by display name (keep the most recent/experimental version)
        const uniqueById = allModels.filter((m, index, self)=>self.findIndex((t)=>t.id === m.id) === index);
        // For models with same display name, prefer experimental/latest versions
        const uniqueByName = uniqueById.filter((m, index, self)=>{
          const sameNameIndex = self.findIndex((t)=>t.name === m.name);
          if (sameNameIndex === index) return true;
          // If there's a duplicate name, prefer experimental or latest version
          const current = self[index];
          const first = self[sameNameIndex];
          // Prefer experimental versions
          if (current.id.includes("-exp") && !first.id.includes("-exp")) return true;
          if (!current.id.includes("-exp") && first.id.includes("-exp")) return false;
          // Otherwise keep the first one
          return false;
        });
        // Clean up by removing temporary fields
        models = uniqueByName.map(({ rawName, version, ...model })=>model);
        break;
      }
    case "mistral":
      {
        const r = await fetch("https://api.mistral.ai/v1/models", {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          }
        });
        if (!r.ok) {
          const t = await r.text();
          return c.json({
            ok: false,
            error: "MISTRAL_BAD_STATUS",
            detail: `${r.status}: ${t}`
          }, 502);
        }
        const data = await r.json();
        // Helper function to get friendly descriptions
        const getMistralInfo = (modelId)=>{
          if (modelId.includes("mistral-large")) {
            return {
              description: "Most capable model for complex tasks"
            };
          } else if (modelId.includes("mistral-medium")) {
            return {
              description: "Balanced performance and cost"
            };
          } else if (modelId.includes("mistral-small")) {
            return {
              description: "Fast and cost-effective"
            };
          } else if (modelId.includes("mistral-tiny")) {
            return {
              description: "Fastest model for simple tasks"
            };
          }
          return {
            description: ""
          };
        };
        models = (data?.data ?? []).filter((m)=>typeof m?.id === "string").map((m)=>{
          const info = getMistralInfo(m.id);
          return {
            id: m.id,
            name: m.id,
            description: info.description,
            type: "text"
          };
        }).filter((m, index, self)=>self.findIndex((t)=>t.id === m.id) === index);
        break;
      }
    case "claude":
      {
        // Static list since the public models endpoint is limited
        models = [
          {
            id: "claude-3-7-sonnet-20250219",
            name: "Claude 3.7 Sonnet",
            description: "Latest model with extended thinking and improved performance",
            type: "text"
          },
          {
            id: "claude-3-5-sonnet-20241022",
            name: "Claude 3.5 Sonnet (New)",
            description: "Updated version with better coding and analysis",
            type: "text"
          },
          {
            id: "claude-3-5-sonnet-20240620",
            name: "Claude 3.5 Sonnet",
            description: "Balanced performance and speed",
            type: "text"
          },
          {
            id: "claude-3-opus-20240229",
            name: "Claude 3 Opus",
            description: "Most capable model for complex tasks",
            type: "text"
          },
          {
            id: "claude-3-sonnet-20240229",
            name: "Claude 3 Sonnet",
            description: "Balanced intelligence and speed",
            type: "text"
          },
          {
            id: "claude-3-haiku-20240307",
            name: "Claude 3 Haiku",
            description: "Fastest model for simple tasks",
            type: "text"
          }
        ];
        break;
      }
    case "cohere":
      {
        const r = await fetch("https://api.cohere.com/v1/models", {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "Accept": "application/json"
          }
        });
        if (!r.ok) {
          const t = await r.text();
          return c.json({
            ok: false,
            error: "COHERE_BAD_STATUS",
            detail: `${r.status}: ${t}`
          }, 502);
        }
        const data = await r.json();
        // Helper function to get friendly descriptions
        const getCohereInfo = (modelName)=>{
          if (modelName.includes("command-r-plus")) {
            return {
              description: "Most powerful model for complex tasks, multilingual"
            };
          } else if (modelName.includes("command-r")) {
            return {
              description: "Balanced model for retrieval and generation"
            };
          } else if (modelName.includes("command-light")) {
            return {
              description: "Faster, smaller model for simple tasks"
            };
          } else if (modelName.includes("command")) {
            return {
              description: "General-purpose text generation"
            };
          } else if (modelName.includes("embed")) {
            return {
              description: "Text embedding model"
            };
          } else if (modelName.includes("rerank")) {
            return {
              description: "Document reranking model"
            };
          }
          return {
            description: ""
          };
        };
        models = (data?.models ?? []).filter((m)=>{
          // Only include models with valid names
          return typeof m?.name === "string";
        }).map((m)=>{
          const info = getCohereInfo(m.name);
          return {
            id: m.name,
            name: m.name,
            description: info.description,
            type: "text",
            contextLength: m.context_length
          };
        }).filter((m, index, self)=>self.findIndex((t)=>t.id === m.id) === index);
        break;
      }
    default:
      return c.json({
        ok: false,
        error: "UNSUPPORTED_PROVIDER",
        detail: providerName
      }, 400);
  }
  console.log(`✅ Returning ${models.length} models for provider: ${providerName}`);
  console.log(`📋 Model IDs:`, models.map((m)=>m.id));
  return c.json({
    ok: true,
    models
  });
});
// ============================================================================
// WEATHER PROVIDER ROUTES (KV Store)
// ============================================================================
// DEPRECATED: Weather providers now in data_providers table (migration 008)
// Use unified endpoints instead:
// - GET    /make-server-cbef71cf/data-providers?category=weather
// - POST   /make-server-cbef71cf/data-providers
// - PUT    /make-server-cbef71cf/data-providers/:id
// - DELETE /make-server-cbef71cf/data-providers/:id
// ============================================================================
// WEATHER LOCATION ROUTES (Database Table)
// ============================================================================
// List all weather locations
app.get("/make-server-cbef71cf/weather-locations", async (c)=>{
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const { data: locations, error } = await supabase.from("weather_locations").select("*").eq("is_active", true).order("name");
    if (error) {
      console.error("Error fetching weather locations:", error);
      return c.json({
        error: "Failed to fetch weather locations",
        details: error.message
      }, 500);
    }
    return c.json({
      locations: locations || []
    });
  } catch (error) {
    console.error("Error fetching weather locations:", error);
    return c.json({
      error: "Failed to fetch weather locations",
      details: String(error)
    }, 500);
  }
});
// Add weather location
app.post("/make-server-cbef71cf/weather-locations", async (c)=>{
  try {
    const body = await safeJson(c);
    if (!body.lat || !body.lon) {
      return jsonErr(c, 400, 'MISSING_COORDINATES', 'Latitude and longitude are required');
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const locationId = `${body.lat},${body.lon}`;
    const location = {
      id: locationId,
      name: body.name,
      admin1: body.admin1 || "",
      country: body.country || "",
      lat: body.lat,
      lon: body.lon,
      custom_name: body.custom_name || null,
      is_active: true
    };
    // Upsert to handle duplicate coordinates
    const { data, error } = await supabase.from("weather_locations").upsert(location, {
      onConflict: "id"
    }).select().single();
    if (error) {
      console.error("Error adding weather location:", error);
      return jsonErr(c, 500, 'WEATHER_LOCATION_ADD_FAILED', error.message);
    }
    return c.json({
      ok: true,
      success: true,
      location: data
    });
  } catch (error) {
    return jsonErr(c, 500, 'WEATHER_LOCATION_ADD_FAILED', error);
  }
});
// Update weather location (for custom_name)
app.put("/make-server-cbef71cf/weather-locations/:id", async (c)=>{
  try {
    const id = c.req.param("id");
    const body = await safeJson(c);
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const { data, error } = await supabase.from("weather_locations").update({
      custom_name: body.custom_name,
      updated_at: new Date().toISOString()
    }).eq("id", id).select().single();
    if (error) {
      if (error.code === 'PGRST116') {
        return jsonErr(c, 404, 'LOCATION_NOT_FOUND', id);
      }
      return jsonErr(c, 500, 'WEATHER_LOCATION_UPDATE_FAILED', error.message);
    }
    return c.json({
      ok: true,
      success: true,
      location: data
    });
  } catch (error) {
    return jsonErr(c, 500, 'WEATHER_LOCATION_UPDATE_FAILED', error);
  }
});
// Delete weather location (CASCADE delete from database)
app.delete("/make-server-cbef71cf/weather-locations/:id", async (c)=>{
  try {
    const id = c.req.param("id");
    console.log(`🗑️ DELETE request received for weather location: ${id} (type: ${typeof id})`);
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    // Check if location exists first
    const { data: existingLocation, error: checkError } = await supabase.from("weather_locations").select("id, name").eq("id", id).single();
    if (checkError) {
      if (checkError.code === 'PGRST116') {
        console.error(`🗑️ Location not found: ${id}`);
        return c.json({
          error: "Location not found",
          details: `No location exists with id: ${id}`
        }, 404);
      }
      console.error("🗑️ Error checking location:", checkError);
      return c.json({
        error: "Database error",
        details: checkError.message
      }, 500);
    }
    console.log(`🗑️ Found location to delete:`, existingLocation);
    // Delete from weather_locations table (CASCADE will handle child tables)
    const { error } = await supabase.from("weather_locations").delete().eq("id", id);
    if (error) {
      console.error("🗑️ Error deleting weather location:", error);
      return c.json({
        error: "Failed to delete weather location",
        details: error.message
      }, 500);
    }
    console.log(`✅ Successfully deleted weather location and all associated data: ${id} (${existingLocation.name})`);
    return c.json({
      success: true
    });
  } catch (error) {
    console.error("Error deleting weather location:", error);
    return c.json({
      error: "Failed to delete weather location",
      details: String(error)
    }, 500);
  }
});
// Get weather providers from data_providers table
app.get("/make-server-cbef71cf/weather-providers", async (c)=>{
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const { data: providers, error } = await supabase.from("data_providers").select("*").eq("category", "weather");
    if (error) {
      console.error("Error fetching weather providers:", error);
      return c.json({
        error: "Failed to fetch weather providers",
        details: String(error)
      }, 500);
    }
    // Transform to match expected format
    const formattedProviders = (providers || []).map((p)=>{
      const config = typeof p.config === 'string' ? JSON.parse(p.config) : p.config || {};
      return {
        id: p.id,
        name: p.name,
        type: p.type,
        isActive: p.is_active,
        language: config.language || 'en'
      };
    });
    return c.json({
      providers: formattedProviders
    });
  } catch (error) {
    console.error("Error fetching weather providers:", error);
    return c.json({
      error: "Failed to fetch weather providers",
      details: String(error)
    }, 500);
  }
});
// Search for weather locations using active provider from database
app.get("/make-server-cbef71cf/weather-locations/search", async (c)=>{
  try {
    const query = c.req.query("q");
    if (!query || query.trim().length === 0) {
      return c.json({
        error: "Search query is required"
      }, 400);
    }
    console.log(`Searching for weather locations: "${query}"`);
    // Get active weather provider from data_providers table
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const { data: providers, error: providerError } = await supabase.from("data_providers").select("*").eq("category", "weather").eq("is_active", true);
    if (providerError) {
      console.error("Error fetching weather provider:", providerError);
      return c.json({
        error: "Failed to fetch weather provider configuration"
      }, 500);
    }
    const activeProvider = providers?.[0];
    if (!activeProvider) {
      return c.json({
        error: "No active weather provider configured"
      }, 400);
    }
    console.log(`Using weather provider: ${activeProvider.name}`);
    // Get API key from provider
    const apiKey = activeProvider.api_key;
    if (!apiKey) {
      return c.json({
        error: "Weather provider API key not configured"
      }, 400);
    }
    // Search using WeatherAPI.com search/autocomplete endpoint
    const searchUrl = `https://api.weatherapi.com/v1/search.json?key=${apiKey}&q=${encodeURIComponent(query)}`;
    const response = await fetch(searchUrl);
    if (!response.ok) {
      const errorText = await response.text();
      console.error("WeatherAPI search error:", response.status, errorText);
      return c.json({
        error: "Failed to search locations",
        details: errorText
      }, response.status);
    }
    const searchResults = await response.json();
    // Transform results to match expected format
    const results = searchResults.map((result)=>({
        id: `${result.lat},${result.lon}`,
        name: result.name,
        admin1: result.region || "",
        country: result.country || "",
        lat: result.lat,
        lon: result.lon
      }));
    console.log(`Found ${results.length} locations for query "${query}"`);
    return c.json({
      results
    });
  } catch (error) {
    console.error("Error searching weather locations:", error);
    return c.json({
      error: "Failed to search locations",
      details: String(error)
    }, 500);
  }
});
// Get saved weather AI insights
app.get("/make-server-cbef71cf/weather-ai-insights", async (c)=>{
  try {
    const insights = await kv.getByPrefix("weather_ai_insight:");
    return c.json({
      ok: true,
      insights: insights.map((i)=>({
          id: i.key.replace('weather_ai_insight:', ''),
          ...i.value
        }))
    });
  } catch (error) {
    console.error("Error fetching weather AI insights:", error);
    return c.json({
      error: "Failed to fetch AI insights",
      details: String(error)
    }, 500);
  }
});
// Save a new weather AI insight
app.post("/make-server-cbef71cf/weather-ai-insights", async (c)=>{
  try {
    const body = await safeJson(c);
    const { question, response, selectedLocations, insightType, provider, model } = body;
    if (!question || !response) {
      return jsonErr(c, 400, 'INVALID_INSIGHT', 'question and response are required');
    }
    const insightId = `insight_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const insight = {
      id: insightId,
      question,
      response,
      selectedLocations: selectedLocations || [],
      insightType: insightType || 'all',
      provider: provider || 'Unknown',
      model: model || '',
      createdAt: new Date().toISOString()
    };
    await kv.set(`weather_ai_insight:${insightId}`, insight);
    return c.json({
      ok: true,
      insight
    });
  } catch (error) {
    console.error("Error saving weather AI insight:", error);
    return jsonErr(c, 500, 'WEATHER_INSIGHT_SAVE_FAILED', error);
  }
});
// Delete a weather AI insight
app.delete("/make-server-cbef71cf/weather-ai-insights/:id", async (c)=>{
  try {
    const id = c.req.param("id");
    console.log(`Deleting weather AI insight with ID: ${id}`);
    const kvKey = `weather_ai_insight:${id}`;
    console.log(`KV key: ${kvKey}`);
    await kv.del(kvKey);
    console.log(`Successfully deleted weather AI insight: ${id}`);
    return c.json({
      ok: true,
      message: 'Insight deleted successfully'
    });
  } catch (error) {
    console.error("Error deleting weather AI insight:", error);
    return jsonErr(c, 500, 'WEATHER_INSIGHT_DELETE_FAILED', error);
  }
});
// Get cached weather data for a specific location from database
// Location metadata comes from KV store, weather data comes from database tables
// Provider info comes from data_providers table
app.get("/make-server-cbef71cf/weather/cached/:locationId", async (c)=>{
  try {
    const locationId = c.req.param("locationId");
    console.log(`Fetching cached weather data for location: ${locationId}`);
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    // STEP 1: Get active weather provider from data_providers table
    const { data: providers, error: providerError } = await supabase.from("data_providers").select("*").eq("category", "weather").eq("is_active", true);
    if (providerError) {
      console.error("Error fetching weather provider:", providerError);
      return c.json({
        error: "Failed to fetch weather provider configuration",
        details: String(providerError)
      }, 500);
    }
    const activeProvider = providers?.[0];
    if (!activeProvider) {
      return c.json({
        error: "No active weather provider configured",
        message: "Please configure and activate a weather provider in Data Feeds first."
      }, 400);
    }
    console.log(`Active weather provider: ${activeProvider.name} (${activeProvider.type})`);
    // STEP 2: Get location metadata from KV store
    const locationData = await kv.get(`weather_location:${locationId}`);
    if (!locationData) {
      return c.json({
        error: "Location not found in KV store",
        message: "This location doesn't exist. It may have been deleted."
      }, 404);
    }
    const location = locationData;
    const { lat, lon } = location;
    console.log(`Found location in KV: ${location.custom_name || location.name} (${lat}, ${lon})`);
    // STEP 3: Get weather data from database tables
    // Fetch all weather data from database tables using location_id
    const [currentResult, airQualityResult, hourlyResult, dailyResult, alertsResult] = await Promise.all([
      supabase.from("weather_current").select("*").eq("location_id", locationId).maybeSingle(),
      supabase.from("weather_air_quality").select("*").eq("location_id", locationId).maybeSingle(),
      supabase.from("weather_hourly_forecast").select("*").eq("location_id", locationId).order("forecast_time", {
        ascending: true
      }),
      supabase.from("weather_daily_forecast").select("*").eq("location_id", locationId).order("forecast_date", {
        ascending: true
      }),
      supabase.from("weather_alerts").select("*").eq("location_id", locationId).order("start_time", {
        ascending: false
      })
    ]);
    // Check for errors
    if (currentResult.error) throw currentResult.error;
    if (airQualityResult.error) throw airQualityResult.error;
    if (hourlyResult.error) throw hourlyResult.error;
    if (dailyResult.error) throw dailyResult.error;
    if (alertsResult.error) throw alertsResult.error;
    // If no current data, location hasn't been synced yet
    if (!currentResult.data) {
      return c.json({
        error: "No weather data in database",
        message: "This location exists but hasn't been synced to the database yet. Try refreshing the weather data on the Weather Dashboard first.",
        location: {
          id: locationId,
          name: location.custom_name || location.name,
          lat: location.lat,
          lon: location.lon
        }
      }, 404);
    }
    // STEP 4: Merge location metadata (from KV) with weather data (from database)
    const current = currentResult.data;
    const airQuality = airQualityResult.data;
    const response = {
      // Provider information from data_providers table
      provider: {
        id: activeProvider.id,
        name: activeProvider.name,
        type: activeProvider.type,
        category: activeProvider.category,
        is_active: activeProvider.is_active
      },
      // Location information from KV store
      location: {
        id: locationId,
        lat: location.lat,
        lon: location.lon,
        // Use custom_name if set, otherwise use name from KV store
        name: location.custom_name || location.name,
        admin1: location.admin1,
        country: location.country,
        elevation_m: location.elevation_m || 0,
        // Include KV metadata
        timezone: location.timezone,
        custom_name: location.custom_name
      },
      current: {
        asOf: current.as_of,
        summary: current.summary,
        icon: current.icon,
        temperature: {
          value: current.temperature_value,
          unit: current.temperature_unit || "°C"
        },
        feelsLike: {
          value: current.feels_like_value,
          unit: current.feels_like_unit || "°C"
        },
        dewPoint: {
          value: current.dew_point_value,
          unit: current.dew_point_unit || "°C"
        },
        humidity: current.humidity,
        pressure: {
          value: current.pressure_value,
          unit: current.pressure_unit || "mb"
        },
        wind: {
          speed: {
            value: current.wind_speed_value,
            unit: current.wind_speed_unit || "kph"
          },
          gust: current.wind_gust_value ? {
            value: current.wind_gust_value,
            unit: current.wind_gust_unit || "kph"
          } : null,
          direction_deg: current.wind_direction_deg,
          direction_cardinal: current.wind_direction_cardinal
        },
        visibility: {
          value: current.visibility_value,
          unit: current.visibility_unit || "km"
        },
        cloudCover: current.cloud_cover,
        uvIndex: current.uv_index,
        airQuality: airQuality ? {
          aqi: airQuality.aqi,
          category: airQuality.aqi_category,
          pm25: airQuality.pm25,
          pm10: airQuality.pm10,
          o3: airQuality.o3,
          no2: airQuality.no2,
          so2: airQuality.so2,
          co: airQuality.co
        } : null
      },
      hourly: {
        items: hourlyResult.data?.map((h)=>({
            time: h.forecast_time,
            summary: h.summary,
            icon: h.icon,
            temperature: {
              value: h.temperature_value,
              unit: h.temperature_unit || "°C"
            },
            feelsLike: {
              value: h.feels_like_value,
              unit: h.feels_like_unit || "°C"
            },
            dewPoint: {
              value: h.dew_point_value,
              unit: h.dew_point_unit || "°C"
            },
            humidity: h.humidity,
            wind: {
              speed: {
                value: h.wind_speed_value,
                unit: h.wind_speed_unit || "kph"
              },
              direction_deg: h.wind_direction_deg
            },
            precipProbability: h.precip_probability,
            precipAmount: {
              value: h.precip_intensity_value,
              unit: h.precip_intensity_unit || "mm"
            },
            cloudCover: h.cloud_cover,
            uvIndex: h.uv_index
          })) || []
      },
      daily: {
        items: dailyResult.data?.map((d)=>({
            date: d.forecast_date,
            summary: d.summary,
            icon: d.icon,
            tempMax: {
              value: d.temp_max_value,
              unit: d.temp_max_unit || "°C"
            },
            tempMin: {
              value: d.temp_min_value,
              unit: d.temp_min_unit || "°C"
            },
            precipProbability: d.precip_probability,
            precipAmount: {
              value: d.precip_accumulation_value,
              unit: d.precip_accumulation_unit || "mm"
            },
            uvIndexMax: d.uv_index_max,
            sunrise: d.sunrise,
            sunset: d.sunset
          })) || []
      },
      alerts: alertsResult.data?.map((a)=>({
          event: a.event,
          headline: a.headline,
          description: a.description,
          severity: a.severity,
          urgency: a.urgency,
          certainty: a.certainty,
          areas: a.areas,
          start_time: a.start_time,
          end_time: a.end_time
        })) || []
    };
    console.log(`✓ Fetched cached data for ${response.location.name}: ${hourlyResult.data?.length || 0} hourly, ${dailyResult.data?.length || 0} daily, ${alertsResult.data?.length || 0} alerts`);
    return c.json(response);
  } catch (error) {
    console.error("Error fetching cached weather data:", error);
    return c.json({
      error: "Failed to fetch cached weather data",
      details: String(error)
    }, 500);
  }
});
// ============================================================================
// WEATHER DATA ROUTES (Fetch + UPSERT to Database)
// ============================================================================
// Helper function to convert WeatherAPI timestamp to ISO format
function convertToISOTimestamp(weatherApiTimestamp) {
  if (!weatherApiTimestamp) return new Date().toISOString();
  if (weatherApiTimestamp.includes('T')) return weatherApiTimestamp;
  return weatherApiTimestamp.replace(' ', 'T') + ':00Z';
}
// Helper to safely convert to integer
function toInt(value) {
  if (value === null || value === undefined) return null;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(num) ? null : Math.round(num);
}
// Fetch weather data for all locations (with UPSERT to database)
app.get("/make-server-cbef71cf/weather-data", async (c)=>{
  try {
    console.log("=== Fetching Weather Data ===");
    // Get locations from database table
    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const { data: locations, error: locationsError } = await supabaseClient.from("weather_locations").select("*").eq("is_active", true);
    if (locationsError) {
      console.error("Error fetching weather locations:", locationsError);
      return c.json({
        error: "Failed to fetch weather locations",
        details: locationsError.message
      }, 500);
    }
    console.log(`Found ${locations?.length || 0} active locations from database`);
    if (!locations || locations.length === 0) {
      return c.json({
        error: "No active weather locations configured. Please add locations first."
      }, 400);
    }
    // Convert database format to expected format
    const validLocations = locations.map((loc)=>({
        id: loc.id,
        name: loc.name,
        admin1: loc.admin1,
        country: loc.country,
        lat: loc.lat,
        lon: loc.lon,
        custom_name: loc.custom_name,
        elevation_m: loc.elevation_m,
        station_id: loc.station_id,
        timezone: loc.timezone
      }));
    console.log(`Processed ${validLocations.length} valid locations`);
    if (validLocations.length > 0) {
      console.log('Sample location:', JSON.stringify(validLocations[0]).substring(0, 300));
    }
    // Get active weather provider from data_providers table
    const { data: providers, error: providerError } = await supabaseClient.from("data_providers").select("*").eq("category", "weather").eq("is_active", true);
    if (providerError) {
      console.error("Error fetching weather provider:", providerError);
      return c.json({
        error: "Failed to fetch weather provider configuration"
      }, 500);
    }
    const activeProvider = providers?.[0];
    if (!activeProvider) {
      return c.json({
        error: "No active weather provider configured"
      }, 400);
    }
    console.log(`Found ${validLocations.length} valid locations and active provider: ${activeProvider.name}`);
    // Get config from provider (parse JSON if needed)
    const providerConfig = typeof activeProvider.config === 'string' ? JSON.parse(activeProvider.config) : activeProvider.config || {};
    const language = providerConfig.language || "en";
    const supabase = supabaseClient; // Reuse client
    // Fetch weather for each location with retry and timeout handling
    const weatherDataPromises = validLocations.map(async (location)=>{
      try {
        const { lat, lon } = location;
        console.log(`🌤️ [Weather] Fetching data for ${location.name} (${lat},${lon})`);
        // Fetch current + forecast with retry logic
        const maxRetries = 3;
        let currentResponse, forecastResponse;
        let lastError;
        for(let attempt = 1; attempt <= maxRetries; attempt++){
          try {
            const currentUrl = `${activeProvider.base_url}/current.json?key=${activeProvider.api_key}&q=${lat},${lon}&lang=${language}&aqi=yes`;
            const forecastUrl = `${activeProvider.base_url}/forecast.json?key=${activeProvider.api_key}&q=${lat},${lon}&days=14&lang=${language}&aqi=yes&alerts=yes`;
            // Add timeout to prevent hanging requests
            const controller = new AbortController();
            const timeoutId = setTimeout(()=>controller.abort(), 15000); // 15s timeout
            const responses = await Promise.all([
              fetch(currentUrl, {
                signal: controller.signal
              }),
              fetch(forecastUrl, {
                signal: controller.signal
              })
            ]);
            clearTimeout(timeoutId);
            currentResponse = responses[0];
            forecastResponse = responses[1];
            if (currentResponse.ok && forecastResponse.ok) {
              console.log(`✅ [Weather] Successfully fetched ${location.name} (attempt ${attempt})`);
              break;
            }
            const failedResponse = !currentResponse.ok ? currentResponse : forecastResponse;
            const errorText = await failedResponse.text().catch(()=>'No error details');
            lastError = `HTTP ${failedResponse.status} ${failedResponse.statusText}: ${errorText.substring(0, 200)}`;
            console.warn(`⚠️ [Weather] ${location.name} attempt ${attempt} failed: ${lastError}`);
            if (attempt < maxRetries) {
              await new Promise((resolve)=>setTimeout(resolve, 2000 * attempt)); // 2s, 4s, 6s backoff
            }
          } catch (fetchError) {
            lastError = fetchError.message || 'Unknown error';
            console.error(`❌ [Weather] ${location.name} attempt ${attempt} error:`, lastError);
            if (fetchError.name === 'AbortError') {
              lastError = 'Request timeout (>15s) - WeatherAPI may be overloaded';
            }
            if (attempt < maxRetries) {
              await new Promise((resolve)=>setTimeout(resolve, 2000 * attempt));
            }
          }
        }
        if (!currentResponse || !forecastResponse || !currentResponse.ok || !forecastResponse.ok) {
          throw new Error(`WeatherAPI error for ${location.name} after ${maxRetries} attempts: ${lastError}`);
        }
        const currentData = await currentResponse.json();
        const forecastData = await forecastResponse.json();
        // Check for API errors in response body (WeatherAPI returns errors with 200 status)
        if (currentData.error) {
          throw new Error(`WeatherAPI error for ${location.name}: ${currentData.error.message} (code: ${currentData.error.code})`);
        }
        if (forecastData.error) {
          throw new Error(`WeatherAPI forecast error for ${location.name}: ${forecastData.error.message} (code: ${forecastData.error.code})`);
        }
        // UPSERT current weather
        const currentWeather = {
          location_id: `${lat},${lon}`,
          lat,
          lon,
          name: location.name,
          admin1: location.admin1 || currentData.location.region,
          country: location.country || currentData.location.country,
          as_of: convertToISOTimestamp(currentData.current.last_updated),
          summary: currentData.current.condition.text,
          icon: currentData.current.condition.icon,
          temperature: currentData.current.temp_c,
          feels_like: currentData.current.feelslike_c,
          dew_point: currentData.current.dewpoint_c || 0,
          humidity: currentData.current.humidity,
          pressure: currentData.current.pressure_mb,
          wind_speed: currentData.current.wind_kph,
          wind_gust: currentData.current.gust_kph,
          wind_direction: toInt(currentData.current.wind_degree),
          wind_direction_text: currentData.current.wind_dir,
          visibility: currentData.current.vis_km,
          cloud_cover: currentData.current.cloud,
          uv_index: currentData.current.uv,
          precipitation_mm: currentData.current.precip_mm,
          updated_at: new Date().toISOString()
        };
        await supabase.from("weather_current").upsert(currentWeather, {
          onConflict: "lat,lon"
        });
        // UPSERT air quality
        if (currentData.current.air_quality) {
          const aq = currentData.current.air_quality;
          await supabase.from("weather_air_quality").upsert({
            location_id: `${lat},${lon}`,
            lat,
            lon,
            as_of: convertToISOTimestamp(currentData.current.last_updated),
            aqi: toInt(aq['us-epa-index']) || toInt(aq['gb-defra-index']),
            pm2_5: aq.pm2_5,
            pm10: aq.pm10,
            o3: aq.o3,
            no2: aq.no2,
            so2: aq.so2,
            co: aq.co,
            updated_at: new Date().toISOString()
          }, {
            onConflict: "lat,lon"
          });
        }
        // Transform and return data matching frontend TypeScript types
        const weatherData = {
          version: "1.0",
          product: "weather",
          location: {
            id: `${lat},${lon}`,
            name: location.name,
            admin1: location.admin1 || currentData.location.region,
            country: location.country || currentData.location.country,
            lat,
            lon,
            elevation_m: 0
          },
          current: {
            asOf: convertToISOTimestamp(currentData.current.last_updated),
            summary: currentData.current.condition.text,
            icon: currentData.current.condition.icon,
            temperature: {
              value: currentData.current.temp_c,
              unit: "°C"
            },
            feelsLike: {
              value: currentData.current.feelslike_c,
              unit: "°C"
            },
            dewPoint: {
              value: currentData.current.dewpoint_c || 0,
              unit: "°C"
            },
            humidity: currentData.current.humidity,
            pressure: {
              value: currentData.current.pressure_mb,
              unit: "mb"
            },
            wind: {
              speed: {
                value: currentData.current.wind_kph,
                unit: "km/h"
              },
              gust: {
                value: currentData.current.gust_kph,
                unit: "km/h"
              },
              direction_deg: toInt(currentData.current.wind_degree) || 0,
              direction_cardinal: currentData.current.wind_dir
            },
            visibility: {
              value: currentData.current.vis_km,
              unit: "km"
            },
            cloudCover: currentData.current.cloud,
            uvIndex: currentData.current.uv,
            precipLastHr: {
              value: currentData.current.precip_mm,
              unit: "mm"
            },
            precipType: "rain",
            snowDepth: {
              value: 0,
              unit: "cm"
            },
            sun: {
              sunrise: forecastData.forecast.forecastday[0]?.astro?.sunrise || "",
              sunset: forecastData.forecast.forecastday[0]?.astro?.sunset || "",
              moonPhase: forecastData.forecast.forecastday[0]?.astro?.moon_phase || "",
              illumination: parseInt(forecastData.forecast.forecastday[0]?.astro?.moon_illumination) || 0
            },
            airQuality: currentData.current.air_quality ? {
              aqi: toInt(currentData.current.air_quality['us-epa-index']) || toInt(currentData.current.air_quality['gb-defra-index']) || 0,
              category: "Unknown",
              pm25: currentData.current.air_quality.pm2_5 || 0,
              pm10: currentData.current.air_quality.pm10 || 0,
              o3: currentData.current.air_quality.o3 || 0,
              no2: currentData.current.air_quality.no2 || 0,
              so2: currentData.current.air_quality.so2 || 0,
              co: currentData.current.air_quality.co || 0,
              standard: "US EPA"
            } : {
              aqi: 0,
              category: "Unknown",
              pm25: 0,
              pm10: 0,
              o3: 0,
              no2: 0,
              so2: 0,
              co: 0,
              standard: "US EPA"
            },
            pollen: {
              tree: 0,
              grass: 0,
              weed: 0,
              risk: "Low"
            }
          },
          hourly: {
            stepHours: 1,
            items: forecastData.forecast.forecastday.flatMap((day)=>day.hour.slice(0, 24).map((hour)=>({
                  time: convertToISOTimestamp(hour.time),
                  summary: hour.condition.text,
                  icon: hour.condition.icon,
                  temperature: {
                    value: hour.temp_c,
                    unit: "°C"
                  },
                  feelsLike: {
                    value: hour.feelslike_c,
                    unit: "°C"
                  },
                  dewPoint: {
                    value: hour.dewpoint_c || 0,
                    unit: "°C"
                  },
                  humidity: hour.humidity,
                  wind: {
                    speed: {
                      value: hour.wind_kph,
                      unit: "km/h"
                    },
                    gust: {
                      value: hour.gust_kph,
                      unit: "km/h"
                    },
                    direction_deg: toInt(hour.wind_degree) || 0,
                    direction_cardinal: hour.wind_dir
                  },
                  pressure: {
                    value: hour.pressure_mb,
                    unit: "mb"
                  },
                  cloudCover: hour.cloud,
                  precipProbability: hour.chance_of_rain / 100,
                  precipIntensity: {
                    value: hour.precip_mm,
                    unit: "mm"
                  },
                  uvIndex: hour.uv
                }))).slice(0, 48)
          },
          daily: {
            items: forecastData.forecast.forecastday.map((day)=>({
                date: day.date,
                summary: day.day.condition.text,
                icon: day.day.condition.icon,
                tempMax: {
                  value: day.day.maxtemp_c,
                  unit: "°C"
                },
                tempMin: {
                  value: day.day.mintemp_c,
                  unit: "°C"
                },
                sunrise: day.astro.sunrise,
                sunset: day.astro.sunset,
                moonPhase: day.astro.moon_phase,
                uvIndexMax: day.day.uv,
                precipProbability: day.day.daily_chance_of_rain / 100,
                precipType: "rain",
                precipAccumulation: {
                  value: day.day.totalprecip_mm,
                  unit: "mm"
                },
                snowAccumulation: {
                  value: day.day.totalsnow_cm || 0,
                  unit: "cm"
                },
                wind: {
                  speedAvg: {
                    value: day.day.maxwind_kph,
                    unit: "km/h"
                  },
                  gustMax: {
                    value: day.day.maxwind_kph,
                    unit: "km/h"
                  },
                  direction_deg: 0
                }
              }))
          },
          alerts: forecastData.alerts?.alert?.map((alert)=>({
              id: `${location.id}-${alert.event}`,
              source: "WeatherAPI",
              event: alert.event,
              severity: alert.severity,
              urgency: alert.urgency,
              certainty: alert.certainty,
              start: alert.effective,
              end: alert.expires,
              headline: alert.headline,
              description: alert.desc,
              areas: alert.areas ? [
                alert.areas
              ] : [],
              instruction: alert.instruction || "",
              links: []
            })) || []
        };
        return {
          location,
          success: true,
          data: weatherData
        };
      } catch (error) {
        const locationLabel = location.name || `${location.lat},${location.lon}` || location.id || 'unknown location';
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ [Weather] Failed to fetch weather for ${locationLabel}:`, {
          locationId: location.id,
          name: location.name,
          lat: location.lat,
          lon: location.lon,
          error: errorMessage
        });
        // Provide user-friendly error messages
        let userMessage = errorMessage;
        if (errorMessage.includes('timeout') || errorMessage.includes('AbortError')) {
          userMessage = `Weather service timeout for ${locationLabel}. The provider may be experiencing high load. This location will retry on next refresh.`;
        } else if (errorMessage.includes('408')) {
          userMessage = `Weather provider is busy (408 timeout) for ${locationLabel}. Try refreshing in a few moments.`;
        } else if (errorMessage.includes('429')) {
          userMessage = `Rate limit reached for ${locationLabel}. Please wait before refreshing.`;
        } else if (errorMessage.includes('401') || errorMessage.includes('403')) {
          userMessage = `Weather API authentication failed for ${locationLabel}. Check your API key configuration.`;
        }
        return {
          location,
          success: false,
          error: userMessage
        };
      }
    });
    const results = await Promise.all(weatherDataPromises);
    const successCount = results.filter((r)=>r.success).length;
    const failCount = results.filter((r)=>!r.success).length;
    console.log(`📊 [Weather Summary] ${successCount} succeeded, ${failCount} failed out of ${validLocations.length} locations`);
    if (failCount > 0) {
      const failedLocations = results.filter((r)=>!r.success);
      console.warn(`⚠️ [Weather] Failed locations:`, failedLocations.map((r)=>({
          name: r.location.name,
          error: r.error?.substring(0, 100)
        })));
    }
    return c.json({
      locations: results,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error in weather-data endpoint:", error);
    return c.json({
      error: "Failed to fetch weather data",
      details: String(error)
    }, 500);
  }
});
// ============================================================================
// NEWS PROVIDER ROUTES (KV Store)
// ============================================================================
// List news providers
app.get("/make-server-cbef71cf/news-providers", async (c)=>{
  try {
    const providers = await kv.getByPrefix("news_provider:");
    const maskedProviders = (providers || []).map((provider)=>({
        ...provider,
        apiKey: maskApiKey(provider?.apiKey)
      }));
    return c.json({
      ok: true,
      providers: maskedProviders
    });
  } catch (error) {
    return jsonErr(c, 500, 'NEWS_PROVIDERS_FETCH_FAILED', error);
  }
});
// Create/update news provider
app.post("/make-server-cbef71cf/news-providers", async (c)=>{
  try {
    const body = await safeJson(c);
    if (!body.id) return jsonErr(c, 400, 'MISSING_ID', 'Provider ID is required');
    await kv.set(`news_provider:${body.id}`, body);
    return c.json({
      ok: true,
      success: true,
      id: body.id
    });
  } catch (error) {
    return jsonErr(c, 500, 'NEWS_PROVIDER_SAVE_FAILED', error);
  }
});
// Delete news provider
app.delete("/make-server-cbef71cf/news-providers/:id", async (c)=>{
  try {
    const id = c.req.param("id");
    await kv.del(`news_provider:${id}`);
    return c.json({
      success: true
    });
  } catch (error) {
    console.error("Error deleting news provider:", error);
    return c.json({
      error: "Failed to delete news provider",
      details: String(error)
    }, 500);
  }
});
// Fetch news articles from all active providers
// Expects providers with credentials to be sent in request body
app.post("/make-server-cbef71cf/news-articles", async (c)=>{
  try {
    const body = await c.req.json();
    const { providers: providersWithCredentials, q, country, language, perProviderLimit = 20, totalLimit = 100 } = body;
    if (!providersWithCredentials || providersWithCredentials.length === 0) {
      return c.json({
        articles: [],
        message: 'No news providers provided'
      });
    }
    console.log(`[NEWS] Fetching from ${providersWithCredentials.length} provider(s):`, providersWithCredentials.map((p)=>p.type));
    const allArticles = [];
    // Fetch from each provider
    for (const provider of providersWithCredentials){
      try {
        let articles = [];
        if (provider.type === 'newsapi') {
          // NewsAPI.org
          if (!provider.api_key) {
            console.warn(`[NEWS] NewsAPI provider missing API key`);
            continue;
          }
          const url = new URL('https://newsapi.org/v2/top-headlines');
          if (q) url.searchParams.set('q', q);
          if (country) url.searchParams.set('country', country);
          if (language) url.searchParams.set('language', language);
          url.searchParams.set('pageSize', String(perProviderLimit));
          url.searchParams.set('apiKey', provider.api_key);
          const response = await fetch(url.toString());
          if (response.ok) {
            const data = await response.json();
            articles = (data.articles || []).map((a)=>({
                id: `newsapi-${a.url}`,
                provider: 'newsapi',
                title: a.title,
                description: a.description,
                url: a.url,
                imageUrl: a.urlToImage,
                sourceName: a.source?.name,
                publishedAt: a.publishedAt
              }));
          } else {
            console.error(`[NEWS] NewsAPI error: ${response.status}`);
          }
        } else if (provider.type === 'newsdata') {
          // NewsData.io
          if (!provider.api_key) {
            console.warn(`[NEWS] NewsData provider missing API key`);
            continue;
          }
          const url = new URL('https://newsdata.io/api/1/news');
          if (q) url.searchParams.set('q', q);
          if (country) url.searchParams.set('country', country);
          if (language) url.searchParams.set('language', language);
          url.searchParams.set('size', String(perProviderLimit));
          url.searchParams.set('apikey', provider.api_key);
          const response = await fetch(url.toString());
          if (response.ok) {
            const data = await response.json();
            articles = (data.results || []).map((a)=>({
                id: `newsdata-${a.article_id || a.link}`,
                provider: 'newsdata',
                title: a.title,
                description: a.description,
                url: a.link,
                imageUrl: a.image_url,
                sourceName: a.source_id,
                publishedAt: a.pubDate
              }));
          } else {
            console.error(`[NEWS] NewsData error: ${response.status}`);
          }
        }
        console.log(`[NEWS] Fetched ${articles.length} articles from ${provider.type}`);
        allArticles.push(...articles);
      } catch (providerError) {
        console.error(`[NEWS] Error fetching from ${provider.type}:`, providerError);
      // Continue with other providers
      }
    }
    // Limit total articles
    const limitedArticles = allArticles.slice(0, totalLimit);
    console.log(`[NEWS] Total articles: ${allArticles.length}, returning: ${limitedArticles.length}`);
    // Save articles to database (UPSERT to avoid duplicates)
    try {
      const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
      const articlesToSave = limitedArticles.map((article)=>({
          provider: article.provider,
          provider_article_id: article.id,
          title: article.title,
          description: article.description || null,
          url: article.url,
          image_url: article.imageUrl || null,
          source_name: article.sourceName || null,
          published_at: article.publishedAt || null,
          fetched_at: new Date().toISOString(),
          language: language || null,
          country: country || null
        }));
      const { data: savedArticles, error: saveError } = await supabase.from('news_articles').upsert(articlesToSave, {
        onConflict: 'provider,url',
        ignoreDuplicates: false
      }).select();
      if (saveError) {
        console.error('[NEWS] Error saving articles to database:', saveError);
      // Don't fail the request if save fails, just log it
      } else {
        console.log(`[NEWS] Saved ${savedArticles?.length || 0} articles to database`);
      }
    } catch (dbError) {
      console.error('[NEWS] Database save failed:', dbError);
    // Continue anyway - fetching is more important than saving
    }
    return c.json({
      articles: limitedArticles
    });
  } catch (error) {
    console.error('[NEWS] Error fetching articles:', error);
    return jsonErr(c, 500, 'NEWS_ARTICLES_FETCH_FAILED', error);
  }
});
// Get news articles from database
app.get("/make-server-cbef71cf/news-articles/stored", async (c)=>{
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    // Get query parameters for filtering
    const provider = c.req.query('provider');
    const language = c.req.query('language');
    const country = c.req.query('country');
    const limit = parseInt(c.req.query('limit') || '100');
    const offset = parseInt(c.req.query('offset') || '0');
    // Build query
    let query = supabase.from('news_articles').select('*', {
      count: 'exact'
    }).order('fetched_at', {
      ascending: false
    }).range(offset, offset + limit - 1);
    // Apply filters
    if (provider && provider !== 'all') {
      query = query.eq('provider', provider);
    }
    if (language && language !== 'all') {
      query = query.eq('language', language);
    }
    if (country && country !== 'all') {
      query = query.eq('country', country);
    }
    const { data: articles, error, count } = await query;
    if (error) {
      console.error('[NEWS] Error fetching stored articles:', error);
      return c.json({
        error: 'Failed to fetch stored articles',
        details: error.message
      }, 500);
    }
    // Transform to match frontend Article interface
    const transformedArticles = (articles || []).map((a)=>({
        id: a.provider_article_id || a.id,
        provider: a.provider,
        title: a.title,
        description: a.description,
        url: a.url,
        imageUrl: a.image_url,
        sourceName: a.source_name,
        publishedAt: a.published_at,
        fetchedAt: a.fetched_at
      }));
    return c.json({
      articles: transformedArticles,
      total: count || 0,
      limit,
      offset
    });
  } catch (error) {
    console.error('[NEWS] Error in stored articles endpoint:', error);
    return jsonErr(c, 500, 'NEWS_STORED_ARTICLES_FETCH_FAILED', error);
  }
});
// ============================================================================
// NEWS AI INSIGHTS ROUTES (KV Store)
// ============================================================================
// Get all saved news AI insights
app.get("/make-server-cbef71cf/news-ai-insights", async (c)=>{
  try {
    const results = await kv.getByPrefix("news_ai_insight:");
    // Extract values from { key, value } objects
    const insights = (results || []).map((r)=>r.value);
    // Sort by created_at descending (newest first)
    const sortedInsights = insights.sort((a, b)=>{
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return c.json({
      ok: true,
      insights: sortedInsights
    });
  } catch (error) {
    console.error('[NEWS] Error fetching AI insights:', error);
    return jsonErr(c, 500, 'NEWS_AI_INSIGHTS_FETCH_FAILED', error);
  }
});
// Save a new news AI insight
app.post("/make-server-cbef71cf/news-ai-insights", async (c)=>{
  try {
    const body = await safeJson(c);
    const { question, response, model, article_ids } = body;
    if (!question || !response) {
      return jsonErr(c, 400, 'MISSING_FIELDS', 'Question and response are required');
    }
    const insightId = `news_ai_insight:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const insight = {
      id: insightId,
      question,
      response,
      model: model || 'Unknown',
      article_ids: article_ids || [],
      created_at: new Date().toISOString()
    };
    await kv.set(insightId, insight);
    console.log(`[NEWS] Saved AI insight: ${insightId}`);
    return c.json({
      ok: true,
      insight
    });
  } catch (error) {
    console.error('[NEWS] Error saving AI insight:', error);
    return jsonErr(c, 500, 'NEWS_AI_INSIGHT_SAVE_FAILED', error);
  }
});
// Delete a news AI insight
app.delete("/make-server-cbef71cf/news-ai-insights/:id", async (c)=>{
  try {
    const id = c.req.param("id");
    await kv.del(id);
    console.log(`[NEWS] Deleted AI insight: ${id}`);
    return c.json({
      ok: true,
      success: true
    });
  } catch (error) {
    console.error('[NEWS] Error deleting AI insight:', error);
    return jsonErr(c, 500, 'NEWS_AI_INSIGHT_DELETE_FAILED', error);
  }
});
// ============================================================================
// SPORTS PROVIDER ROUTES (KV Store)
// ============================================================================
// List sports providers
app.get("/make-server-cbef71cf/sports-providers", async (c)=>{
  try {
    const providers = await kv.getByPrefix("sports_provider:");
    // Ensure providers is always an array
    const providersList = Array.isArray(providers) ? providers : [];
    const maskedProviders = providersList.map((provider)=>({
        ...provider,
        apiKey: maskApiKey(provider?.apiKey),
        apiSecret: maskApiKey(provider?.apiSecret)
      }));
    return c.json(maskedProviders);
  } catch (error) {
    return jsonErr(c, 500, 'SPORTS_PROVIDERS_FETCH_FAILED', error);
  }
});
// Create/update sports provider
app.post("/make-server-cbef71cf/sports-providers", async (c)=>{
  try {
    const body = await safeJson(c);
    if (!body.id) return jsonErr(c, 400, 'MISSING_ID', 'Provider ID is required');
    await kv.set(`sports_provider:${body.id}`, body);
    return c.json({
      ok: true,
      success: true,
      id: body.id
    });
  } catch (error) {
    return jsonErr(c, 500, 'SPORTS_PROVIDER_SAVE_FAILED', error);
  }
});
// Delete sports provider
app.delete("/make-server-cbef71cf/sports-providers/:id", async (c)=>{
  try {
    const id = c.req.param("id");
    await kv.del(`sports_provider:${id}`);
    return c.json({
      success: true
    });
  } catch (error) {
    console.error("Error deleting sports provider:", error);
    return c.json({
      error: "Failed to delete sports provider",
      details: String(error)
    }, 500);
  }
});
// ============================================================================
// SPORTS ROUTES (Provider-Agnostic)
// ============================================================================
// Get teams for a season
app.get("/make-server-cbef71cf/sports/teams", async (c)=>{
  return c.json({
    ok: false,
    error: "SPORTS_FEATURE_NOT_CONFIGURED"
  }, 501);
});
// Get standings for a league/season
app.get("/make-server-cbef71cf/sports/standings/:leagueId", async (c)=>{
  try {
    const leagueId = c.req.param("leagueId");
    console.log(`[Standings] Fetching standings for league: ${leagueId}`);
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    // Get league info from database
    const { data: league, error: leagueError } = await supabase.from("sports_leagues").select("*").eq("id", leagueId).maybeSingle();
    if (leagueError || !league) {
      console.error(`[Standings] League not found:`, leagueError);
      return c.json({
        error: "League not found"
      }, 404);
    }
    if (!league.active_season_id) {
      console.error(`[Standings] League has no active_season_id`);
      return c.json({
        error: "League has no active season configured"
      }, 400);
    }
    console.log(`[Standings] Using season ID: ${league.active_season_id}`);
    // Get active sports provider
    const { data: providers, error: providerError } = await supabase.from("data_providers").select("*").eq("category", "sports").eq("is_active", true);
    if (providerError || !providers || providers.length === 0) {
      console.error(`[Standings] No active sports provider found`, providerError);
      return c.json({
        error: "No active sports provider configured"
      }, 400);
    }
    const provider = providers[0];
    console.log(`[Standings] Using provider: ${provider.name} (${provider.type})`);
    const providerType = provider.type.toLowerCase();
    const apiKey = provider.api_key;
    if (!apiKey) {
      console.error(`[Standings] Provider has no API key`);
      return c.json({
        error: "Provider API key not configured"
      }, 400);
    }
    // Fetch standings based on provider type
    if (providerType === "sportmonks") {
      const seasonId = league.active_season_id;
      // Use correct SportMonks v3 endpoint per documentation with per_page=200 to fetch all standings
      const standingsUrl = `https://api.sportmonks.com/v3/football/standings/seasons/${seasonId}?api_token=${apiKey}&include=participant;details.type&per_page=200`;
      console.log(`[Standings] Fetching from SportMonks: ${standingsUrl.replace(apiKey, '***')}`);
      const response = await fetch(standingsUrl);
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Standings] SportMonks API error: HTTP ${response.status}`, errorText);
        return c.json({
          error: `SportMonks API error: ${response.status}`,
          details: errorText
        }, response.status);
      }
      const data = await response.json();
      console.log(`[Standings] Received ${data?.data?.length || 0} standing groups`);
      // Parse standings data
      const groups = data?.data || [];
      const standings = [];
      for (const group of groups){
        const groupName = group.name ?? group.type ?? "overall";
        const rows = group.standings ?? [];
        // Only process "overall" standings
        if (groupName.toLowerCase() !== "overall") continue;
        for (const row of rows){
          // Extract participant info
          const participant = row.participant?.data ?? row.participant ?? {};
          const teamId = row.participant_id ?? participant.id;
          const teamName = participant.name ?? "Unknown Team";
          // Extract W/D/L from details array by type.id
          const detailsArray = row.details?.data || row.details || [];
          let wins = 0;
          let draws = 0;
          let losses = 0;
          for (const detail of detailsArray){
            const typeId = detail.type_id ?? detail.type?.data?.id ?? detail.type?.id;
            const value = detail.value ?? 0;
            // Type IDs per SportMonks documentation
            if (typeId === 214) wins = value; // Type 214 = wins
            else if (typeId === 215) draws = value; // Type 215 = draws
            else if (typeId === 216) losses = value; // Type 216 = losses
          }
          standings.push({
            position: row.position ?? 0,
            team: {
              id: teamId,
              name: teamName,
              logo: participant.image_path ?? null
            },
            stats: {
              played: row.games_played ?? 0,
              wins: wins,
              draws: draws,
              losses: losses,
              points: row.points ?? 0,
              goals_for: row.goals_for ?? 0,
              goals_against: row.goals_against ?? 0,
              goal_difference: row.goal_difference ?? 0
            }
          });
        }
      }
      console.log(`[Standings] Parsed ${standings.length} standings entries`);
      return c.json({
        leagueId,
        seasonId,
        standings: standings.sort((a, b)=>a.position - b.position)
      });
    } else if (providerType === "sportsradar") {
      // Sportsradar implementation (existing logic can be added here)
      return c.json({
        error: "Sportsradar standings not yet implemented"
      }, 501);
    } else {
      return c.json({
        error: `Unsupported provider type: ${providerType}`
      }, 400);
    }
  } catch (error) {
    console.error("[Standings] Error:", error);
    return c.json({
      error: "Failed to fetch standings",
      details: String(error)
    }, 500);
  }
});
// Get seasons for a competition
app.get("/make-server-cbef71cf/sports/seasons", async (c)=>{
  return c.json({
    ok: false,
    error: "SPORTS_FEATURE_NOT_CONFIGURED"
  }, 501);
});
// ============================================================================
// SPORTS PROVIDER-SPECIFIC ROUTES
// ============================================================================
// Get active sports provider
app.get("/make-server-cbef71cf/sports/providers/active", async (c)=>{
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    console.log("[Sports Providers] Fetching active sports providers...");
    // Get active sports providers (any type)
    const { data: providers, error: listError } = await supabase.from("data_providers").select("id, name, type").eq("category", "sports").eq("is_active", true);
    if (listError) {
      console.error("[Sports Providers] Error listing providers:", listError);
      return c.json({
        error: "Failed to list sports providers"
      }, 500);
    }
    if (!providers || providers.length === 0) {
      console.log("[Sports Providers] No active sports providers found");
      return c.json({
        providers: []
      });
    }
    console.log(`[Sports Providers] Found ${providers.length} active provider(s)`);
    // Get full details for the first active provider using RPC
    const { data: providerDetails, error: rpcError } = await supabase.rpc('get_provider_details', {
      p_id: providers[0].id
    });
    if (rpcError || !providerDetails || providerDetails.length === 0) {
      console.error("[Sports Providers] RPC error:", rpcError);
      return c.json({
        error: "Failed to fetch provider details"
      }, 500);
    }
    const provider = providerDetails[0];
    console.log("[Sports Providers] Active provider:", provider.name, `(${provider.type})`);
    return c.json({
      provider: {
        id: provider.id,
        name: provider.name,
        type: provider.type,
        category: provider.category,
        is_active: provider.is_active,
        api_key: provider.api_key,
        base_url: provider.base_url,
        api_version: provider.api_version,
        config: provider.config || {}
      }
    });
  } catch (error) {
    console.error("[Sports Providers] Error:", error);
    return c.json({
      error: "Failed to fetch sports providers",
      details: String(error)
    }, 500);
  }
});
// SportMonks soccer leagues endpoint
app.get("/make-server-cbef71cf/sports/sportmonks/soccer/leagues", async (c)=>{
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    // Get active SportMonks provider using secure RPC
    const { data: providers, error: listError } = await supabase.from("data_providers").select("id").ilike("type", "sportmonks").eq("category", "sports").eq("is_active", true);
    if (listError || !providers || providers.length === 0) {
      console.error("[SportMonks Leagues] No active provider found:", listError);
      return c.json({
        error: "No active SportMonks provider configured"
      }, 400);
    }
    // Fetch provider details with credentials using RPC
    const { data: providerDetails, error: rpcError } = await supabase.rpc('get_provider_details', {
      p_id: providers[0].id
    });
    if (rpcError || !providerDetails || providerDetails.length === 0) {
      console.error("[SportMonks Leagues] RPC error:", rpcError);
      return c.json({
        error: "Failed to fetch provider credentials"
      }, 500);
    }
    const provider = providerDetails[0];
    if (!provider.api_key) {
      return c.json({
        error: "SportMonks API key not configured"
      }, 400);
    }
    // Fetch leagues from SportMonks API with seasons included (single call)
    const apiUrl = `https://api.sportmonks.com/v3/football/leagues?api_token=${provider.api_key}&include=seasons&per_page=200`;
    console.log("[SportMonks Leagues] Fetching from:", apiUrl.replace(provider.api_key, "***"));
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json'
      }
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("[SportMonks Leagues] API error:", response.status, errorText);
      return c.json({
        error: `SportMonks API error: ${response.status}`
      }, response.status);
    }
    const leaguesData = await response.json();
    const leagues = leaguesData.data || [];
    console.log(`[SportMonks Leagues] Fetched ${leagues.length} leagues with seasons included`);
    // Log sample to verify seasons are included
    if (leagues.length > 0) {
      console.log(`[SportMonks Leagues] Sample league:`, {
        id: leagues[0].id,
        name: leagues[0].name,
        seasonsCount: leagues[0].seasons?.data?.length || 0
      });
    }
    return c.json(leaguesData);
  } catch (error) {
    console.error("[SportMonks Leagues] Error:", error);
    return c.json({
      error: "Failed to fetch SportMonks leagues",
      details: String(error)
    }, 500);
  }
});
// Sportsradar soccer competitions endpoint
app.get("/make-server-cbef71cf/sports/sportsradar/soccer/competitions", async (c)=>{
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    // Get active Sportsradar provider using secure RPC
    const { data: providers, error: listError } = await supabase.from("data_providers").select("id").eq("type", "Sportsradar").eq("category", "sports").eq("is_active", true);
    if (listError || !providers || providers.length === 0) {
      console.error("[Sportsradar Competitions] No active provider found:", listError);
      return c.json({
        error: "No active Sportsradar provider configured"
      }, 400);
    }
    // Fetch provider details with credentials using RPC
    const { data: providerDetails, error: rpcError } = await supabase.rpc('get_provider_details', {
      p_id: providers[0].id
    });
    if (rpcError || !providerDetails || providerDetails.length === 0) {
      console.error("[Sportsradar Competitions] RPC error:", rpcError);
      return c.json({
        error: "Failed to fetch provider credentials"
      }, 500);
    }
    const provider = providerDetails[0];
    if (!provider.api_key) {
      return c.json({
        error: "Sportsradar API key not configured"
      }, 400);
    }
    // Fetch competitions from Sportsradar API
    // Use base_url from provider config (e.g., https://api.sportradar.com/soccer/trial/v4/en)
    const apiUrl = `${provider.base_url}/competitions.json?api_key=${provider.api_key}`;
    console.log("[Sportsradar Competitions] Fetching from:", apiUrl.replace(provider.api_key, "***"));
    const response = await fetch(apiUrl);
    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Sportsradar Competitions] API error:", response.status, errorText);
      return c.json({
        error: `Sportsradar API error: ${response.status}`
      }, response.status);
    }
    const competitionsData = await response.json();
    console.log(`[Sportsradar Competitions] Fetched ${competitionsData?.competitions?.length || 0} competitions`);
    // Fetch seasons for each competition
    const competitions = competitionsData.competitions || [];
    const competitionsWithSeasons = await Promise.all(competitions.map(async (competition)=>{
      try {
        // Extract tournament ID from competition.id (format: sr:competition:8)
        const tournamentId = competition.id;
        const seasonsUrl = `${provider.base_url}/tournaments/${tournamentId}/seasons.json?api_key=${provider.api_key}`;
        const seasonsResponse = await fetch(seasonsUrl);
        if (seasonsResponse.ok) {
          const seasonsData = await seasonsResponse.json();
          return {
            ...competition,
            seasons: seasonsData.seasons || []
          };
        } else {
          console.warn(`[Sportsradar Competitions] Failed to fetch seasons for competition ${competition.id}`);
          return {
            ...competition,
            seasons: []
          };
        }
      } catch (error) {
        console.error(`[Sportsradar Competitions] Error fetching seasons for competition ${competition.id}:`, error);
        return {
          ...competition,
          seasons: []
        };
      }
    }));
    console.log(`[Sportsradar Competitions] Enriched ${competitionsWithSeasons.length} competitions with season data`);
    return c.json({
      ...competitionsData,
      competitions: competitionsWithSeasons
    });
  } catch (error) {
    console.error("[Sportsradar Competitions] Error:", error);
    return c.json({
      error: "Failed to fetch Sportsradar competitions",
      details: String(error)
    }, 500);
  }
});
// ============================================================================
// SPORTS DATA MANAGEMENT ROUTES (KV Store)
// ============================================================================
// Add all teams from a league (Database)
app.post("/make-server-cbef71cf/sports/add-league", async (c)=>{
  try {
    const body = await safeJson(c);
    const { leagueId, leagueData, seasonId } = body;
    console.log(`[Add League] Starting bulk team import for league: ${leagueId}`);
    console.log(`[Add League] League data:`, leagueData);
    console.log(`[Add League] Season ID:`, seasonId);
    if (!leagueId) {
      return c.json({
        error: "Missing leagueId parameter"
      }, 400);
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    // Step 1: Get or create league in sports_leagues table
    let league = null;
    // Try to find existing league
    const { data: existingLeague, error: findError } = await supabase.from("sports_leagues").select("*").eq("id", leagueId).maybeSingle();
    if (existingLeague) {
      console.log(`[Add League] Found existing league:`, existingLeague);
      league = existingLeague;
    } else {
      console.log(`[Add League] League not found in database, creating from API data...`);
      // Create league from the provided leagueData
      if (!leagueData) {
        return c.json({
          error: "League not found in database and no leagueData provided to create it",
          hint: "Pass leagueData with league details to auto-create"
        }, 400);
      }
      // Prepare league record
      const leagueRecord = {
        id: leagueId,
        name: leagueData.name || leagueData.displayName || `League ${leagueId}`,
        sport: leagueData.sport || 'soccer',
        abbrev: leagueData.abbrev || leagueData.name?.substring(0, 3).toUpperCase() || 'N/A',
        active_season_id: seasonId || leagueData.seasonId || null,
        provider_id: leagueId,
        ext_id: leagueId
      };
      console.log(`[Add League] Creating league record:`, leagueRecord);
      const { data: newLeague, error: createError } = await supabase.from("sports_leagues").insert([
        leagueRecord
      ]).select().single();
      if (createError) {
        console.error(`[Add League] Failed to create league:`, createError);
        return c.json({
          error: "Failed to create league in database",
          details: createError
        }, 500);
      }
      console.log(`[Add League] Created new league:`, newLeague);
      league = newLeague;
    }
    console.log(`[Add League] Using league:`, league);
    // Step 2: Get active sports provider credentials from data_providers table
    const { data: providers, error: providerError } = await supabase.from("data_providers").select("*").eq("category", "sports").eq("is_active", true);
    if (providerError || !providers || providers.length === 0) {
      console.error(`[Add League] No active sports provider found`, providerError);
      return c.json({
        error: "No active sports provider configured",
        message: "Please configure and activate a sports provider (SportMonks or Sportsradar) in Data Feeds"
      }, 400);
    }
    // Use the first active provider
    const provider = providers[0];
    console.log(`[Add League] Using provider: ${provider.name} (${provider.type})`);
    // Step 3: Determine provider type and get necessary info from league
    const providerType = provider.type.toLowerCase(); // "sportmonks" or "sportsradar"
    const apiKey = provider.api_key;
    const apiSecret = provider.api_secret || null;
    if (!apiKey) {
      console.error(`[Add League] Provider ${provider.name} has no API key`);
      return c.json({
        error: "Provider API key not configured",
        message: `The ${provider.name} provider is missing an API key`
      }, 400);
    }
    // Extract provider-specific league ID from league data
    // League data should have provider_id like "sm_271" or "sr:competition:8"
    const providerId = league.provider_id || league.ext_id || league.id;
    console.log(`[Add League] Provider ID: ${providerId}`);
    let teams = [];
    // Note: seasonId already declared from request body on line 2680
    // Step 4: Fetch teams based on provider type
    if (providerType === "sportmonks") {
      console.log(`[Add League] Fetching teams from SportMonks for league ${providerId}...`);
      // SportMonks flow: Use saved active_season_id from league
      try {
        // Use seasonId from request body, or fall back to active_season_id from league record
        const activeSeasonId = seasonId || league.active_season_id;
        if (!activeSeasonId) {
          throw new Error("League has no active_season_id configured and no seasonId provided in request");
        }
        const finalSeasonId = String(activeSeasonId);
        console.log(`[Add League] Using season ID: ${finalSeasonId}`);
        // Fetch teams for this season
        const teamsUrl = `https://api.sportmonks.com/v3/football/teams/seasons/${finalSeasonId}?api_token=${apiKey}`;
        console.log(`[Add League] Fetching teams: ${teamsUrl.replace(apiKey, '***')}`);
        const teamsResponse = await fetch(teamsUrl);
        if (!teamsResponse.ok) {
          throw new Error(`Failed to fetch teams: HTTP ${teamsResponse.status}`);
        }
        const teamsData = await teamsResponse.json();
        const rawTeams = teamsData.data || [];
        console.log(`[Add League] Fetched ${rawTeams.length} teams from SportMonks`);
        // Fetch standings (W-D-L, points) - use correct SportMonks v3 endpoint per docs with per_page=200
        console.log(`[Add League] Fetching standings for season ${finalSeasonId}...`);
        const standingsUrl = `https://api.sportmonks.com/v3/football/standings/seasons/${finalSeasonId}?api_token=${apiKey}&include=participant;details.type&per_page=200`;
        const standingsResponse = await fetch(standingsUrl);
        let standings = [];
        if (standingsResponse.ok) {
          const standingsData = await standingsResponse.json();
          standings = standingsData.data || [];
          console.log(`[Add League] Fetched ${standings.length} standings entries`);
        } else {
          console.warn(`[Add League] Failed to fetch standings: HTTP ${standingsResponse.status}`);
        }
        // Helper function to fetch last 5 results for a team
        async function fetchLast5(teamId) {
          try {
            // Use fixtures endpoint with date range filter (per SportMonks API docs)
            const fixturesUrl = `https://api.sportmonks.com/v3/football/fixtures/between/2000-01-01/2099-12-31/${teamId}?api_token=${apiKey}&include=participants;scores&filters=fixtureStates:5&sortBy=starting_at:desc&per_page=5`;
            const fixturesResponse = await fetch(fixturesUrl);
            if (!fixturesResponse.ok) {
              console.warn(`[Add League] Fixtures API failed for team ${teamId}: HTTP ${fixturesResponse.status}`);
              return "";
            }
            const fixturesData = await fixturesResponse.json();
            const fixtures = fixturesData.data || [];
            // Build W/D/L string from the 5 most recent finished fixtures
            return fixtures.map((fixture)=>{
              const participants = fixture.participants?.data || [];
              const scores = fixture.scores?.data || [];
              // Find this team in participants
              const teamParticipant = participants.find((p)=>p.id === teamId);
              if (!teamParticipant) return "?";
              // Find opponent
              const opponentParticipant = participants.find((p)=>p.id !== teamId);
              if (!opponentParticipant) return "?";
              // Get final score (CURRENT = final score in SportMonks v3)
              const teamScore = scores.find((s)=>s.participant_id === teamId && s.description === "CURRENT");
              const opponentScore = scores.find((s)=>s.participant_id === opponentParticipant.id && s.description === "CURRENT");
              if (!teamScore || !opponentScore) return "?";
              const teamGoals = teamScore.score?.goals || 0;
              const opponentGoals = opponentScore.score?.goals || 0;
              if (teamGoals > opponentGoals) return "W";
              if (teamGoals < opponentGoals) return "L";
              return "D";
            }).join("");
          } catch (error) {
            console.warn(`[Add League] Failed to fetch last 5 for team ${teamId}:`, error);
            return "";
          }
        }
        // Transform SportMonks teams to our schema with enriched data
        teams = await Promise.all(rawTeams.map(async (t)=>{
          // Find standing for this team
          const standing = standings.find((s)=>s.participant_id === t.id);
          // Fetch last 5 results
          const last5 = await fetchLast5(t.id);
          // Build statistics object
          const stats = {};
          if (standing) {
            // Extract W/D/L from details array by type.id (per SportMonks API docs)
            const detailsArray = standing.details?.data || standing.details || [];
            let wins = 0;
            let draws = 0;
            let losses = 0;
            for (const detail of detailsArray){
              const typeId = detail.type_id ?? detail.type?.data?.id ?? detail.type?.id;
              const value = detail.value ?? 0;
              // Type IDs per SportMonks documentation
              if (typeId === 214) wins = value; // Type 214 = wins
              else if (typeId === 215) draws = value; // Type 215 = draws
              else if (typeId === 216) losses = value; // Type 216 = losses
            }
            stats.wins = wins;
            stats.draws = draws;
            stats.losses = losses;
            stats.points = standing.points ?? 0;
            stats.record = `${wins}-${draws}-${losses}`;
            stats.position = standing.position || null;
          }
          if (last5) {
            stats.last5 = last5;
          }
          return {
            id: `sportsmonks:team:${t.id}`,
            league_id: leagueId,
            name: t.name,
            short_name: t.short_name || t.shortname || null,
            abbreviation: t.short_code || null,
            logo_url: t.image_path || null,
            venue: null,
            city: null,
            country: null,
            founded: null,
            sport: "football",
            season_id: league.season || "2023/2024",
            provider_type: "sportsmonks",
            colors: {
              primary: "#000000",
              secondary: "#FFFFFF",
              text: "#FFFFFF"
            },
            statistics: stats
          };
        }));
      } catch (error) {
        console.error(`[Add League] SportMonks error:`, error);
        return c.json({
          error: "Failed to fetch teams from SportMonks",
          details: String(error)
        }, 500);
      }
    } else if (providerType === "sportsradar") {
      console.log(`[Add League] Fetching teams from Sportsradar for league ${providerId}...`);
      // Sportsradar flow:
      // 1. Get seasons for tournament/competition
      // 2. Find current season
      // 3. Fetch competitors for that season
      try {
        const accessLevel = provider.config?.access_level || "trial";
        const locale = provider.config?.locale || "en";
        const baseUrl = provider.base_url || "https://api.sportradar.com/soccer";
        // Normalize Sportsradar ID (remove "sr:" prefix if present)
        let srId = providerId.replace(/^sr:/, "");
        // Get seasons
        const seasonsUrl = `${baseUrl}/${accessLevel}/v4/${locale}/tournaments/${srId}/seasons.json?api_key=${apiKey}`;
        console.log(`[Add League] Fetching seasons: ${seasonsUrl.replace(apiKey, '***')}`);
        const seasonsResponse = await fetch(seasonsUrl);
        if (!seasonsResponse.ok) {
          throw new Error(`Failed to fetch seasons: HTTP ${seasonsResponse.status}`);
        }
        const seasonsData = await seasonsResponse.json();
        const seasons = seasonsData?.seasons || [];
        // Find current season
        let currentSeason = seasons.find((s)=>s.current === true);
        if (!currentSeason && seasons.length > 0) {
          currentSeason = seasons[seasons.length - 1];
        }
        if (!currentSeason) {
          throw new Error("No seasons found for this league");
        }
        const srSeasonId = currentSeason.id.replace(/^sr:season:/, "");
        seasonId = currentSeason.id;
        console.log(`[Add League] Using season: ${currentSeason.name} (ID: ${seasonId})`);
        // Fetch competitors for this season
        const competitorsUrl = `${baseUrl}/${accessLevel}/v4/${locale}/seasons/sr:season:${srSeasonId}/competitors.json?api_key=${apiKey}`;
        console.log(`[Add League] Fetching competitors: ${competitorsUrl.replace(apiKey, '***')}`);
        const competitorsResponse = await fetch(competitorsUrl);
        if (!competitorsResponse.ok) {
          throw new Error(`Failed to fetch competitors: HTTP ${competitorsResponse.status}`);
        }
        const competitorsData = await competitorsResponse.json();
        const rawCompetitors = competitorsData?.season_competitors || [];
        console.log(`[Add League] Fetched ${rawCompetitors.length} competitors from Sportsradar`);
        // Transform Sportsradar teams to our schema
        teams = rawCompetitors.map((c)=>({
            id: c.id,
            league_id: leagueId,
            name: c.name,
            short_name: c.short_name || c.abbreviation || null,
            abbreviation: c.abbreviation || null,
            logo_url: null,
            venue: null,
            city: null,
            country: c.country || null,
            founded: null,
            sport: league.sport || "Football",
            season_id: seasonId,
            provider_type: "sportsradar",
            colors: {
              primary: c.jersey?.primary || "#000000",
              secondary: c.jersey?.secondary || "#FFFFFF",
              text: "#FFFFFF"
            },
            statistics: {}
          }));
      } catch (error) {
        console.error(`[Add League] Sportsradar error:`, error);
        return c.json({
          error: "Failed to fetch teams from Sportsradar",
          details: String(error)
        }, 500);
      }
    } else {
      return c.json({
        error: `Unsupported provider type: ${providerType}`,
        message: "Only SportMonks and Sportsradar are supported"
      }, 400);
    }
    // Step 5: Bulk insert teams into sports_teams table
    if (teams.length === 0) {
      console.log(`[Add League] No teams found for league ${leagueId}`);
      return c.json({
        success: true,
        teamsAdded: 0,
        message: "No teams found for this league",
        seasonId: seasonId
      });
    }
    console.log(`[Add League] Inserting ${teams.length} teams into database...`);
    // Use upsert to handle duplicates (in case teams already exist)
    const { data: insertedTeams, error: insertError } = await supabase.from("sports_teams").upsert(teams, {
      onConflict: "id",
      ignoreDuplicates: false // Update existing teams
    }).select();
    if (insertError) {
      console.error(`[Add League] Error inserting teams:`, insertError);
      return c.json({
        error: "Failed to insert teams into database",
        details: String(insertError)
      }, 500);
    }
    const teamsAdded = insertedTeams?.length || 0;
    console.log(`[Add League] Successfully added ${teamsAdded} teams to database`);
    return c.json({
      success: true,
      teamsAdded,
      message: `Successfully added ${teamsAdded} teams from ${league.name}`,
      league: {
        id: league.id,
        name: league.name,
        sport: league.sport
      },
      seasonId: seasonId,
      provider: provider.name
    });
  } catch (error) {
    console.error("[Add League] Error:", error);
    return c.json({
      error: "Failed to add league teams",
      details: String(error)
    }, 500);
  }
});
// Remove all teams from a league (Database)
app.post("/make-server-cbef71cf/sports/remove-league", async (c)=>{
  try {
    const body = await safeJson(c);
    const { leagueId } = body;
    console.log(`[Remove League] Removing all teams from league: ${leagueId}`);
    if (!leagueId) {
      return c.json({
        error: "Missing leagueId parameter"
      }, 400);
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    // Delete all teams for this league (CASCADE will handle this automatically)
    const { data, error } = await supabase.from("sports_teams").delete().eq("league_id", leagueId).select();
    if (error) {
      console.error(`[Remove League] Error deleting teams:`, error);
      throw error;
    }
    const teamsRemoved = data?.length || 0;
    console.log(`[Remove League] Removed ${teamsRemoved} teams from league ${leagueId}`);
    return c.json({
      success: true,
      teamsRemoved,
      message: `Removed ${teamsRemoved} teams from league`
    });
  } catch (error) {
    console.error("[Remove League] Error:", error);
    return c.json({
      error: "Failed to remove league teams",
      details: String(error)
    }, 500);
  }
});
// Add sports team (Database)
app.post("/make-server-cbef71cf/sports/add-team", async (c)=>{
  try {
    const body = await safeJson(c);
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const team = {
      id: body.id,
      name: body.name,
      short_name: body.short_name || body.name,
      abbreviation: body.abbreviation,
      logo_url: body.logo,
      venue: body.venue,
      city: body.city,
      country: body.country,
      founded: body.founded,
      sport: body.sport,
      league_id: body.league_id,
      season_id: body.season_id,
      statistics: body.statistics || {},
      colors: body.colors || {},
      provider_type: body.provider_type,
      updated_at: new Date().toISOString()
    };
    // Insert into database (UPSERT on conflict)
    const { data, error } = await supabase.from("sports_teams").upsert(team, {
      onConflict: "id"
    }).select().single();
    if (error) throw error;
    return c.json({
      success: true,
      team: data
    });
  } catch (error) {
    console.error("Error adding sports team:", error);
    return c.json({
      error: "Failed to add sports team",
      details: String(error)
    }, 500);
  }
});
// List sports teams (Database)
app.get("/make-server-cbef71cf/sports-teams", async (c)=>{
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const { data: teams, error } = await supabase.from("sports_teams").select("*").order("name");
    if (error) throw error;
    return c.json({
      teams: teams || []
    });
  } catch (error) {
    console.error("Error fetching sports teams:", error);
    return c.json({
      error: "Failed to fetch sports teams",
      details: String(error)
    }, 500);
  }
});
// Delete sports team (Database)
app.delete("/make-server-cbef71cf/sports-teams/:id", async (c)=>{
  try {
    const id = c.req.param("id");
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const { error } = await supabase.from("sports_teams").delete().eq("id", id);
    if (error) throw error;
    return c.json({
      success: true
    });
  } catch (error) {
    console.error("Error deleting sports team:", error);
    return c.json({
      error: "Failed to delete sports team",
      details: String(error)
    }, 500);
  }
});
// ============================================================================
// SPORTS DATA COMPATIBILITY ENDPOINTS (Database)
// ============================================================================
// Get all teams (compatibility endpoint for /sports-data/teams)
app.get("/make-server-cbef71cf/sports-data/teams", async (c)=>{
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const { data: teams, error } = await supabase.from("sports_teams").select("*").order("name");
    if (error) throw error;
    return c.json({
      teams: teams || []
    });
  } catch (error) {
    console.error("Error fetching sports teams:", error);
    return c.json({
      error: "Failed to fetch sports teams",
      details: String(error)
    }, 500);
  }
});
// Get all games (placeholder - returns empty array for now)
app.get("/make-server-cbef71cf/sports-data/games", async (c)=>{
  try {
    // TODO: Implement games table when needed
    return c.json({
      games: []
    });
  } catch (error) {
    console.error("Error fetching games:", error);
    return c.json({
      error: "Failed to fetch games",
      details: String(error)
    }, 500);
  }
});
// Get all venues (placeholder - returns empty array for now)
app.get("/make-server-cbef71cf/sports-data/venues", async (c)=>{
  try {
    // TODO: Implement venues table when needed
    return c.json({
      venues: []
    });
  } catch (error) {
    console.error("Error fetching venues:", error);
    return c.json({
      error: "Failed to fetch venues",
      details: String(error)
    }, 500);
  }
});
// Get all tournaments (returns leagues from sports_leagues table)
app.get("/make-server-cbef71cf/sports-data/tournaments", async (c)=>{
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const { data: leagues, error } = await supabase.from("sports_leagues").select("*").order("name");
    if (error) throw error;
    // Map sports_leagues to tournaments format
    const tournaments = leagues?.map((league)=>({
        id: String(league.id),
        name: league.name,
        country: league.country_name,
        sport: league.sport || 'football',
        provider_type: league.api_source
      })) || [];
    return c.json({
      tournaments
    });
  } catch (error) {
    console.error("Error fetching tournaments:", error);
    return c.json({
      error: "Failed to fetch tournaments",
      details: String(error)
    }, 500);
  }
});
// Save leagues to sports_leagues table
app.post("/make-server-cbef71cf/sports/save-leagues", async (c)=>{
  try {
    const body = await safeJson(c);
    const { leagues } = body;
    if (!Array.isArray(leagues) || leagues.length === 0) {
      return c.json({
        error: "Invalid request: leagues array required"
      }, 400);
    }
    console.log(`[Save Leagues] Saving ${leagues.length} league-season combinations`);
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    // Transform league-season combos into sports_leagues records
    // Match actual Supabase schema
    const leagueRecords = leagues.map((league)=>({
        id: league.id,
        name: league.name,
        type: league.abbrev || 'league',
        sport: league.sport || 'football',
        api_source: 'sportmonks',
        logo: null,
        country_name: null,
        season_id: league.seasonId || null,
        active_season_id: league.seasonId || null,
        active_season_name: league.seasonName || null,
        active: true
      }));
    console.log('[Save Leagues] Sample record:', leagueRecords[0]);
    // Use upsert to handle duplicates - ignore existing entries
    const { data, error } = await supabase.from("sports_leagues").upsert(leagueRecords, {
      onConflict: 'id',
      ignoreDuplicates: true // Skip existing leagues, only insert new ones
    }).select();
    if (error) {
      console.error("[Save Leagues] Database error:", error);
      throw error;
    }
    console.log(`[Save Leagues] Successfully saved ${data?.length || 0} leagues`);
    return c.json({
      success: true,
      saved: data?.length || 0,
      leagues: data
    });
  } catch (error) {
    console.error("[Save Leagues] Error:", error);
    return c.json({
      error: "Failed to save leagues",
      details: String(error)
    }, 500);
  }
});
// ============================================================================
// ALPACA STOCKS ROUTES (Database)
// ============================================================================
// List Alpaca stocks
app.get("/make-server-cbef71cf/alpaca-stocks", async (c)=>{
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const { data: stocks, error } = await supabase.from("alpaca_stocks").select("*").order("symbol");
    if (error) throw error;
    return c.json({
      stocks: stocks || []
    });
  } catch (error) {
    console.error("Error fetching Alpaca stocks:", error);
    return c.json({
      error: "Failed to fetch Alpaca stocks",
      details: String(error)
    }, 500);
  }
});
// Fetch latest stock prices from Alpaca
app.post("/make-server-cbef71cf/alpaca-stocks/fetch", async (c)=>{
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    // Get Alpaca credentials from data_providers table
    const { data: alpacaProvider } = await supabase.from("data_providers").select("api_key, api_secret, is_active").eq("id", "finance_provider:alpaca").single();
    if (!alpacaProvider || !alpacaProvider.is_active) {
      return c.json({
        error: "Alpaca provider not configured or inactive"
      }, 400);
    }
    const alpacaKey = alpacaProvider.api_key;
    const alpacaSecret = alpacaProvider.api_secret;
    if (!alpacaKey || !alpacaSecret) {
      return c.json({
        error: "Alpaca API credentials not set in database"
      }, 400);
    }
    // Get configured stocks
    const { data: stocks } = await supabase.from("alpaca_stocks").select("symbol");
    if (!stocks || stocks.length === 0) {
      return c.json({
        message: "No stocks configured"
      });
    }
    const symbols = stocks.map((s)=>s.symbol).join(",");
    const response = await fetch(`${ALPACA_DATA_BASE}/v2/stocks/snapshots?symbols=${symbols}`, {
      headers: {
        "APCA-API-KEY-ID": alpacaKey,
        "APCA-API-SECRET-KEY": alpacaSecret
      }
    });
    if (!response.ok) {
      throw new Error(`Alpaca API error: ${response.status}`);
    }
    const data = await response.json();
    // Update database
    const updates = Object.entries(data).map(([symbol, snapshot])=>({
        symbol,
        current_price: snapshot.latestTrade?.p || 0,
        previous_close: snapshot.prevDailyBar?.c || 0,
        volume: snapshot.latestTrade?.s || 0,
        last_updated: new Date().toISOString()
      }));
    for (const update of updates){
      await supabase.from("alpaca_stocks").update(update).eq("symbol", update.symbol);
    }
    return c.json({
      success: true,
      updated: updates.length
    });
  } catch (error) {
    console.error("Error fetching Alpaca stock data:", error);
    return c.json({
      error: "Failed to fetch stock data",
      details: String(error)
    }, 500);
  }
});
// ============================================================================
// FINANCE ENDPOINTS (Stocks & Crypto from KV Store + External APIs)
// ============================================================================
// Check finance provider status
app.get("/make-server-cbef71cf/finance-providers/status", async (c)=>{
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const { data: financeProviders, error } = await supabase.from("data_providers").select("*").eq("category", "finance").order("name");
    if (error) throw error;
    // Get credentials from database instead of environment
    const alpacaProvider = financeProviders?.find((p)=>p.id === "finance_provider:alpaca");
    const alpacaKey = alpacaProvider?.api_key;
    const alpacaSecret = alpacaProvider?.api_secret;
    const status = {
      providers: financeProviders || [],
      credentials: {
        alpaca: {
          keyConfigured: !!alpacaKey,
          secretConfigured: !!alpacaSecret,
          bothConfigured: !!(alpacaKey && alpacaSecret),
          isActive: alpacaProvider?.is_active || false
        }
      },
      kvData: {
        stocks: (await kv.getByPrefix("stock:")).length,
        cryptos: (await kv.getByPrefix("crypto:")).length
      }
    };
    return c.json(status);
  } catch (error) {
    console.error("Error checking finance provider status:", error);
    return jsonErr(c, 500, 'FINANCE_STATUS_FAILED', error);
  }
});
// Get all stocks with latest data
app.get("/make-server-cbef71cf/stocks", async (c)=>{
  try {
    console.log("📊 Fetching stocks from KV store...");
    // Fetch all stocks from KV store (individual stock:symbol keys)
    const stocks = await kv.getByPrefix("stock:");
    console.log(`📊 Found ${stocks?.length || 0} stocks in KV store`);
    return c.json({
      stocks: stocks || []
    });
  } catch (error) {
    console.error("Error fetching stocks:", error);
    return jsonErr(c, 500, 'STOCKS_FETCH_FAILED', error);
  }
});
// NOTE: Duplicate stock add endpoint removed - using database version at line ~3747
// NOTE: Old KV-based refresh endpoint removed - using database version at line ~3448
// Get/Set custom stock names
app.get("/make-server-cbef71cf/stocks/custom-names/all", async (c)=>{
  try {
    const customNames = await kv.get("stock_custom_names") || {};
    return c.json({
      customNames
    });
  } catch (error) {
    console.error("Error fetching custom names:", error);
    return jsonErr(c, 500, 'CUSTOM_NAMES_FETCH_FAILED', error);
  }
});
app.post("/make-server-cbef71cf/stocks/:symbol/custom-name", async (c)=>{
  try {
    const symbol = c.req.param("symbol");
    const body = await safeJson(c);
    const { customName } = body;
    const customNames = await kv.get("stock_custom_names") || {};
    if (customName === null || customName === "") {
      delete customNames[symbol];
    } else {
      customNames[symbol] = customName;
    }
    await kv.set("stock_custom_names", customNames);
    return c.json({
      success: true
    });
  } catch (error) {
    console.error("Error setting custom name:", error);
    return jsonErr(c, 500, 'CUSTOM_NAME_SET_FAILED', error);
  }
});
// Search stocks
app.get("/make-server-cbef71cf/stocks/search", async (c)=>{
  try {
    const query = c.req.query("q") || "";
    if (query.length < 1) {
      return c.json({
        results: []
      });
    }
    console.log(`🔍 [Alpaca Search] Searching for: "${query}"`);
    // Get Alpaca credentials using RPC (same pattern as debug panel)
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const { data: alpacaProvider } = await supabase.from("data_providers").select("api_key, api_secret, is_active").eq("id", "finance_provider:alpaca").single();
    if (!alpacaProvider || !alpacaProvider.is_active) {
      console.error("❌ [Alpaca Search] Provider not configured or inactive");
      return jsonErr(c, 500, 'ALPACA_NOT_CONFIGURED', 'Alpaca provider not configured or inactive');
    }
    const apiKey = alpacaProvider.api_key;
    const apiSecret = alpacaProvider.api_secret;
    if (!apiKey || !apiSecret) {
      console.error("❌ [Alpaca Search] Credentials missing");
      return jsonErr(c, 500, 'ALPACA_CREDENTIALS_MISSING', 'Alpaca API credentials not set in database');
    }
    console.log(`✅ [Alpaca Search] Provider configured, fetching assets...`);
    // Search assets on Alpaca with timeout and retry
    let response;
    let lastError;
    const maxRetries = 2;
    for(let attempt = 1; attempt <= maxRetries; attempt++){
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(()=>controller.abort(), 10000); // 10s timeout
        response = await fetch(`${ALPACA_TRADING_BASE}/v2/assets?status=active&asset_class=us_equity`, {
          headers: {
            "APCA-API-KEY-ID": apiKey,
            "APCA-API-SECRET-KEY": apiSecret
          },
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (response.ok) {
          console.log(`✅ [Alpaca Search] Successfully fetched assets (attempt ${attempt})`);
          break;
        }
        const errorText = await response.text().catch(()=>'No error details');
        lastError = `HTTP ${response.status}: ${errorText}`;
        console.warn(`⚠️ [Alpaca Search] Attempt ${attempt} failed: ${lastError}`);
        if (attempt < maxRetries) {
          await new Promise((resolve)=>setTimeout(resolve, 1000 * attempt)); // Exponential backoff
        }
      } catch (error) {
        lastError = error.message || 'Unknown error';
        console.error(`❌ [Alpaca Search] Attempt ${attempt} error:`, lastError);
        if (error.name === 'AbortError') {
          lastError = 'Request timeout (>10s)';
        }
        if (attempt < maxRetries) {
          await new Promise((resolve)=>setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    if (!response || !response.ok) {
      console.error(`❌ [Alpaca Search] All ${maxRetries} attempts failed. Last error: ${lastError}`);
      return jsonErr(c, 500, 'ALPACA_SEARCH_FAILED', `Failed to search Alpaca after ${maxRetries} attempts: ${lastError}`);
    }
    const assets = await response.json();
    console.log(`📊 [Alpaca Search] Fetched ${assets.length} total assets, filtering for "${query}"...`);
    // Filter and sort by query relevance
    const queryLower = query.toLowerCase();
    const results = assets.filter((a)=>{
      const symbolMatch = a.symbol && a.symbol.toLowerCase().includes(queryLower);
      const nameMatch = a.name && a.name.toLowerCase().includes(queryLower);
      return symbolMatch || nameMatch;
    }).sort((a, b)=>{
      const aSymbol = (a.symbol || '').toLowerCase();
      const bSymbol = (b.symbol || '').toLowerCase();
      const aName = (a.name || '').toLowerCase();
      const bName = (b.name || '').toLowerCase();
      // Priority 1: Exact symbol match
      if (aSymbol === queryLower && bSymbol !== queryLower) return -1;
      if (bSymbol === queryLower && aSymbol !== queryLower) return 1;
      // Priority 2: Symbol starts with query
      const aSymbolStarts = aSymbol.startsWith(queryLower);
      const bSymbolStarts = bSymbol.startsWith(queryLower);
      if (aSymbolStarts && !bSymbolStarts) return -1;
      if (bSymbolStarts && !aSymbolStarts) return 1;
      // Priority 3: Name starts with query
      const aNameStarts = aName.startsWith(queryLower);
      const bNameStarts = bName.startsWith(queryLower);
      if (aNameStarts && !bNameStarts) return -1;
      if (bNameStarts && !aNameStarts) return 1;
      // Priority 4: Symbol contains query
      const aSymbolContains = aSymbol.includes(queryLower);
      const bSymbolContains = bSymbol.includes(queryLower);
      if (aSymbolContains && !bSymbolContains) return -1;
      if (bSymbolContains && !aSymbolContains) return 1;
      // Priority 5: Alphabetical by symbol
      return aSymbol.localeCompare(bSymbol);
    }).slice(0, 20).map((a)=>{
      // Detect ETFs using multiple indicators
      // 1. Check attributes array (most reliable)
      const hasETFAttribute = Array.isArray(a.attributes) && a.attributes.includes('etf');
      // 2. Check name patterns as fallback
      const nameLower = a.name?.toLowerCase() || '';
      const nameIndicatesETF = nameLower.includes(' etf') || nameLower.endsWith('etf') || nameLower.includes('ishares') || nameLower.includes('spdr') || nameLower.includes('vanguard') && (nameLower.includes('fund') || nameLower.includes('etf'));
      // 3. Check if symbol starts with ^ for indices
      const isIndex = a.symbol?.startsWith('^');
      // Determine final type
      let type = 'EQUITY';
      if (hasETFAttribute || nameIndicatesETF) {
        type = 'ETF';
      } else if (isIndex) {
        type = 'INDEX';
      }
      return {
        symbol: a.symbol,
        name: a.name,
        exchange: a.exchange || 'NASDAQ',
        type
      };
    });
    console.log(`✅ [Alpaca Search] Found ${results.length} matches for "${query}"`);
    if (results.length > 0) {
      console.log(`   Top results: ${results.slice(0, 3).map((r)=>`${r.symbol} (${r.name})`).join(', ')}`);
    }
    return c.json({
      results
    });
  } catch (error) {
    console.error("❌ [Alpaca Search] Error:", error);
    return jsonErr(c, 500, 'STOCK_SEARCH_FAILED', error);
  }
});
// Search crypto
app.get("/make-server-cbef71cf/crypto/search", async (c)=>{
  try {
    const query = c.req.query("q") || "";
    if (query.length < 2) {
      return c.json({
        results: []
      });
    }
    // Get CoinGecko credentials from database
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const { data: coinGeckoProvider } = await supabase.from("data_providers").select("api_key, is_active").eq("id", "finance_provider:coingecko").single();
    if (!coinGeckoProvider || !coinGeckoProvider.is_active) {
      return jsonErr(c, 500, 'COINGECKO_NOT_CONFIGURED', 'CoinGecko provider not configured or inactive');
    }
    const apiKey = coinGeckoProvider.api_key;
    if (!apiKey) {
      return jsonErr(c, 500, 'COINGECKO_CREDENTIALS_MISSING', 'CoinGecko API key not set in database');
    }
    // Use /coins/markets endpoint which includes price data
    // Search by matching query against name/symbol
    const response = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false&price_change_percentage=24h`, {
      headers: {
        "x-cg-demo-api-key": apiKey
      }
    });
    if (!response.ok) {
      return jsonErr(c, 500, 'COINGECKO_SEARCH_FAILED', 'Failed to search CoinGecko');
    }
    const coins = await response.json();
    // Filter by query and return top 10 matches
    const lowerQuery = query.toLowerCase();
    const results = coins.filter((coin)=>coin.name.toLowerCase().includes(lowerQuery) || coin.symbol.toLowerCase().includes(lowerQuery) || coin.id.toLowerCase().includes(lowerQuery)).slice(0, 10).map((coin)=>({
        id: coin.id,
        symbol: coin.symbol?.toUpperCase() || '',
        name: coin.name,
        image: coin.image || '',
        current_price: coin.current_price || 0,
        market_cap: coin.market_cap || 0,
        market_cap_rank: coin.market_cap_rank || 0,
        price_change_percentage_24h: coin.price_change_percentage_24h || 0
      }));
    return c.json({
      results
    });
  } catch (error) {
    console.error("Error searching crypto:", error);
    return jsonErr(c, 500, 'CRYPTO_SEARCH_FAILED', error);
  }
});
// ============================================================================
// STARTUP INITIALIZATION
// ============================================================================
// Run initialization on startup
(async ()=>{
  try {
    console.log("=== Server Startup Initialization ===");
    await initializeDefaultWeatherProvider();
    await initializeDefaultFinanceProviders();
    await initializeDefaultAIProviders();
    console.log("=== Initialization Complete ===");
  } catch (error) {
    console.error("Error during initialization:", error);
  }
})();
// ============================================================================
// AI PROVIDER ROUTES (Database Table)
// ============================================================================
// List AI providers (from database table - masks sensitive fields in response)
app.get("/make-server-cbef71cf/ai-providers", async (c)=>{
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    // Fetch from ai_providers table (not view) - we'll mask sensitive fields
    const { data, error } = await supabase.from("ai_providers").select("*").order("name");
    if (error) {
      console.error("Database error fetching AI providers:", error);
      return jsonErr(c, 500, 'AI_PROVIDERS_FETCH_FAILED', error.message);
    }
    // Mask API keys in the response using helper
    const providers = (data || []).map(formatAIProvider);
    return c.json({
      providers
    });
  } catch (error) {
    return jsonErr(c, 500, 'AI_PROVIDERS_FETCH_FAILED', error);
  }
});
// Generate image with AI provider
app.post("/make-server-cbef71cf/ai-providers/generate-image", async (c)=>{
  try {
    const body = await safeJson(c);
    const { providerId, prompt, dashboard } = body;
    if (!providerId || !prompt) {
      return jsonErr(c, 400, 'AI_IMAGE_INVALID_INPUT', 'providerId and prompt are required');
    }
    // Get the AI provider from database
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const { data: provider, error } = await supabase.from("ai_providers").select("*").eq("id", providerId).single();
    if (error || !provider) {
      return jsonErr(c, 404, 'AI_PROVIDER_NOT_FOUND', error?.message);
    }
    if (!provider.enabled) {
      return jsonErr(c, 400, 'AI_PROVIDER_DISABLED', 'This AI provider is disabled');
    }
    console.log(`🎨 Generating image with ${provider.provider_name} for dashboard: ${dashboard}`);
    let imageUrl = '';
    // Handle different image generation providers
    if (provider.provider_name === 'dalle' || provider.provider_name === 'openai' && provider.type === 'image') {
      // OpenAI DALL-E API
      const response = await fetch(`${provider.endpoint || 'https://api.openai.com/v1'}/images/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${provider.api_key}`
        },
        body: JSON.stringify({
          model: provider.model || 'dall-e-3',
          prompt: prompt,
          n: 1,
          size: '1024x1024'
        })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(()=>({}));
        console.error('DALL-E API error:', errorData);
        return jsonErr(c, response.status, 'DALLE_API_ERROR', errorData.error?.message || 'DALL-E API error');
      }
      const data = await response.json();
      imageUrl = data.data[0]?.url || '';
    } else if (provider.provider_name === 'stability') {
      // Stability AI API
      const response = await fetch(`${provider.endpoint || 'https://api.stability.ai/v1'}/generation/${provider.model || 'stable-diffusion-xl-1024-v1-0'}/text-to-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${provider.api_key}`
        },
        body: JSON.stringify({
          text_prompts: [
            {
              text: prompt,
              weight: 1
            }
          ],
          cfg_scale: 7,
          height: 1024,
          width: 1024,
          steps: 30,
          samples: 1
        })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(()=>({}));
        console.error('Stability AI API error:', errorData);
        return jsonErr(c, response.status, 'STABILITY_API_ERROR', errorData.message || 'Stability AI API error');
      }
      const data = await response.json();
      // Stability AI returns base64 images
      if (data.artifacts && data.artifacts[0]) {
        imageUrl = `data:image/png;base64,${data.artifacts[0].base64}`;
      }
    } else if (provider.provider_name === 'gemini') {
      // Google AI Studio (Gemini) Image Generation
      // Uses simple API key authentication (not Vertex AI)
      // Get the model from the provider's model column
      // Common models: gemini-2.0-flash-image-exp-001, imagen-3.0-generate-001, gemini-2.0-flash-exp
      const imageModel = provider.model;
      if (!imageModel) {
        return jsonErr(c, 400, 'MISSING_MODEL', 'Model name is required for image generation. Set the model field in the AI provider.');
      }
      // Use the generativelanguage API (Google AI Studio), not Vertex AI
      const geminiEndpoint = `${provider.endpoint || 'https://generativelanguage.googleapis.com/v1beta'}/models/${imageModel}:generateContent?key=${provider.api_key}`;
      console.log(`🎨 Calling Google AI Studio (Gemini) image generation`);
      console.log(`   Model: ${imageModel}`);
      console.log(`   Endpoint: ${geminiEndpoint.replace(provider.api_key, 'API_KEY_HIDDEN')}`);
      const response = await fetch(geminiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: provider.temperature || 0.7,
            topK: provider.config?.topK || 40,
            topP: provider.top_p || 0.95
          }
        })
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error:', errorText);
        let errorMessage = errorText;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error?.message || errorText;
        } catch (e) {
        // Keep original error text
        }
        // Provide helpful error messages
        if (response.status === 404) {
          errorMessage = `404 Not Found - Model "${imageModel}" not found. Try using "gemini-2.0-flash-exp" or check if image generation is supported.`;
        } else if (response.status === 400) {
          errorMessage = `400 Bad Request - ${errorMessage}. Check if the model supports image generation.`;
        } else if (response.status === 403 || response.status === 401) {
          errorMessage = `${response.status} Authentication Error - Check that your API key is valid and has permission to use this model.`;
        }
        return jsonErr(c, response.status, 'GEMINI_API_ERROR', errorMessage);
      }
      const data = await response.json();
      console.log('Gemini API response:', JSON.stringify(data, null, 2));
      // Gemini returns image data in candidates[0].content.parts[0].inline_data.data
      // or candidates[0].content.parts[].inline_data for multiple parts
      if (data.candidates && data.candidates[0]?.content?.parts) {
        const parts = data.candidates[0].content.parts;
        // Find the first part with inline_data (image)
        for (const part of parts){
          if (part.inline_data?.data) {
            // The data is already base64 encoded
            const mimeType = part.inline_data.mime_type || 'image/png';
            imageUrl = `data:${mimeType};base64,${part.inline_data.data}`;
            console.log(`✅ Found image in response (${mimeType})`);
            break;
          }
        }
      }
      if (!imageUrl) {
        // Check if the response contains text instead of an image
        if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
          const textResponse = data.candidates[0].content.parts[0].text;
          return jsonErr(c, 400, 'GEMINI_NO_IMAGE', `Model returned text instead of image. The model "${imageModel}" may not support image generation. Response: ${textResponse.substring(0, 200)}`);
        }
        return jsonErr(c, 500, 'GEMINI_NO_IMAGE', `Gemini did not return an image. Check if model "${imageModel}" supports image generation. Response: ` + JSON.stringify(data));
      }
    } else {
      return jsonErr(c, 400, 'UNSUPPORTED_PROVIDER', `Image generation not supported for provider: ${provider.provider_name}`);
    }
    if (!imageUrl) {
      return jsonErr(c, 500, 'IMAGE_GENERATION_FAILED', 'No image URL returned from provider');
    }
    console.log(`✅ Image generated successfully with ${provider.provider_name}`);
    return c.json({
      ok: true,
      imageUrl,
      provider: provider.name,
      model: provider.model
    });
  } catch (error) {
    console.error("Error in AI image generation:", error);
    return jsonErr(c, 500, 'AI_IMAGE_GENERATION_FAILED', error);
  }
});
// Create AI provider
app.post("/make-server-cbef71cf/ai-providers", async (c)=>{
  try {
    const body = await safeJson(c);
    console.log("📝 Creating AI provider:", {
      name: body.name,
      providerName: body.providerName
    });
    if (!body.name || !body.providerName) {
      return jsonErr(c, 400, 'MISSING_REQUIRED_FIELDS', 'Name and providerName are required');
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const { data, error } = await supabase.from("ai_providers").insert({
      name: body.name,
      provider_name: body.providerName,
      type: body.type || 'text',
      description: body.description || '',
      api_key: body.apiKey || null,
      api_secret: body.apiSecret || null,
      endpoint: body.endpoint || null,
      model: body.model || null,
      enabled: body.enabled !== false,
      rate_limit_per_minute: body.rateLimitPerMinute || 60,
      max_tokens: body.maxTokens || 4096,
      temperature: body.temperature || 0.7,
      top_p: body.topP || 1,
      available_models: body.availableModels || [],
      dashboard_assignments: body.dashboardAssignments || []
    }).select().single();
    if (error) {
      console.error("❌ Database error creating AI provider:", error);
      return jsonErr(c, 500, 'AI_PROVIDER_CREATE_FAILED', error.message);
    }
    console.log("✅ AI provider created successfully:", data.id);
    // Return formatted response with masked API keys
    return c.json({
      success: true,
      provider: formatAIProvider(data)
    });
  } catch (error) {
    console.error("❌ Unexpected error creating AI provider:", error);
    return jsonErr(c, 500, 'AI_PROVIDER_CREATE_FAILED', error);
  }
});
// Update AI provider
app.put("/make-server-cbef71cf/ai-providers/:id", async (c)=>{
  try {
    const id = c.req.param("id");
    const body = await safeJson(c);
    console.log("🔄 Updating AI provider:", id);
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    // Build update object - only include provided fields
    const updateData = {
      updated_at: new Date().toISOString()
    };
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.apiKey) updateData.api_key = body.apiKey;
    if (body.apiSecret !== undefined) updateData.api_secret = body.apiSecret;
    if (body.endpoint !== undefined) updateData.endpoint = body.endpoint;
    if (body.model !== undefined) updateData.model = body.model;
    if (body.enabled !== undefined) updateData.enabled = body.enabled;
    if (body.rateLimitPerMinute !== undefined) updateData.rate_limit_per_minute = body.rateLimitPerMinute;
    if (body.maxTokens !== undefined) updateData.max_tokens = body.maxTokens;
    if (body.temperature !== undefined) updateData.temperature = body.temperature;
    if (body.topP !== undefined) updateData.top_p = body.topP;
    if (body.availableModels !== undefined) updateData.available_models = body.availableModels;
    if (body.dashboardAssignments !== undefined) updateData.dashboard_assignments = body.dashboardAssignments;
    const { data, error } = await supabase.from("ai_providers").update(updateData).eq("id", id).select().single();
    if (error) {
      console.error("❌ Database error updating AI provider:", error);
      return jsonErr(c, 500, 'AI_PROVIDER_UPDATE_FAILED', error.message);
    }
    console.log("✅ AI provider updated successfully:", id);
    // Return formatted response with masked API keys
    return c.json({
      success: true,
      provider: formatAIProvider(data)
    });
  } catch (error) {
    console.error("❌ Unexpected error updating AI provider:", error);
    return jsonErr(c, 500, 'AI_PROVIDER_UPDATE_FAILED', error);
  }
});
// Delete AI provider
app.delete("/make-server-cbef71cf/ai-providers/:id", async (c)=>{
  try {
    const id = c.req.param("id");
    console.log("🗑️ Deleting AI provider from database:", id);
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    // Check if provider exists first
    const { data: existing, error: checkError } = await supabase.from("ai_providers").select("id, name").eq("id", id).single();
    if (checkError || !existing) {
      console.error("❌ AI provider not found:", id, checkError);
      return jsonErr(c, 404, 'AI_PROVIDER_NOT_FOUND', `Provider ${id} not found`);
    }
    console.log("✓ Found provider to delete:", existing.name);
    const { error } = await supabase.from("ai_providers").delete().eq("id", id);
    if (error) {
      console.error("❌ Database error deleting AI provider:", error);
      return jsonErr(c, 500, 'AI_PROVIDER_DELETE_FAILED', error.message);
    }
    console.log("✅ Successfully deleted AI provider:", existing.name);
    return c.json({
      success: true,
      deleted: true,
      id
    });
  } catch (error) {
    console.error("❌ Unexpected error deleting AI provider:", error);
    return jsonErr(c, 500, 'AI_PROVIDER_DELETE_FAILED', error);
  }
});
// Reveal both API key and secret (return full unmasked credentials)
app.post("/make-server-cbef71cf/ai-providers/:id/reveal", async (c)=>{
  try {
    const id = c.req.param("id");
    console.log("🔓 Revealing credentials for AI provider:", id);
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const { data, error } = await supabase.from("ai_providers").select("api_key, api_secret").eq("id", id).single();
    if (error) {
      console.error("❌ Database error revealing credentials:", error);
      return jsonErr(c, 500, 'AI_CREDENTIALS_REVEAL_FAILED', error.message);
    }
    if (!data) {
      console.error("❌ AI provider not found:", id);
      return jsonErr(c, 404, 'AI_PROVIDER_NOT_FOUND', `Provider ${id} not found`);
    }
    console.log("✅ Successfully revealed credentials for provider:", id);
    return c.json({
      apiKey: data.api_key || '',
      apiSecret: data.api_secret || ''
    });
  } catch (error) {
    console.error("❌ Unexpected error revealing credentials:", error);
    return jsonErr(c, 500, 'AI_CREDENTIALS_REVEAL_FAILED', error);
  }
});
// Reveal API key only (return full unmasked key)
app.get("/make-server-cbef71cf/ai-providers/:id/reveal-key", async (c)=>{
  try {
    const id = c.req.param("id");
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const { data, error } = await supabase.from("ai_providers").select("api_key").eq("id", id).single();
    if (error) {
      console.error("Database error revealing API key:", error);
      return jsonErr(c, 500, 'AI_KEY_REVEAL_FAILED', error.message);
    }
    return c.json({
      apiKey: data?.api_key || ''
    });
  } catch (error) {
    return jsonErr(c, 500, 'AI_KEY_REVEAL_FAILED', error);
  }
});
// Reveal API secret only (return full unmasked secret)
app.get("/make-server-cbef71cf/ai-providers/:id/reveal-secret", async (c)=>{
  try {
    const id = c.req.param("id");
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const { data, error } = await supabase.from("ai_providers").select("api_secret").eq("id", id).single();
    if (error) {
      console.error("Database error revealing API secret:", error);
      return jsonErr(c, 500, 'AI_SECRET_REVEAL_FAILED', error.message);
    }
    return c.json({
      apiSecret: data?.api_secret || ''
    });
  } catch (error) {
    return jsonErr(c, 500, 'AI_SECRET_REVEAL_FAILED', error);
  }
});
// ============================================================================
// AI CHAT ENDPOINT (For AI Insights)
// ============================================================================
// Chat with AI provider
app.post("/make-server-cbef71cf/ai-providers/chat", async (c)=>{
  try {
    const body = await safeJson(c);
    const { providerId, message, context, dashboard } = body;
    if (!providerId || !message) {
      return jsonErr(c, 400, 'AI_CHAT_INVALID_INPUT', 'providerId and message are required');
    }
    // Get the AI provider from database
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const { data: provider, error } = await supabase.from("ai_providers").select("*").eq("id", providerId).single();
    if (error || !provider) {
      return jsonErr(c, 404, 'AI_PROVIDER_NOT_FOUND', error?.message);
    }
    if (!provider.enabled) {
      return jsonErr(c, 400, 'AI_PROVIDER_DISABLED', 'This AI provider is disabled');
    }
    if (!provider.api_key) {
      return jsonErr(c, 400, 'AI_PROVIDER_NO_KEY', 'This AI provider has no API key configured');
    }
    // Prepare the full message with context
    const fullMessage = context ? `${context}\n\n${message}` : message;
    console.log(`Sending chat to ${provider.provider_name} (${provider.model})`);
    let aiResponse = '';
    // Call the appropriate AI API based on provider type
    if (provider.provider_name === 'claude') {
      // Anthropic Claude API
      const response = await fetch(`${provider.endpoint}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': provider.api_key,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: provider.model,
          max_tokens: provider.max_tokens || 4096,
          temperature: provider.temperature || 0.7,
          messages: [
            {
              role: 'user',
              content: fullMessage
            }
          ]
        })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(()=>({}));
        // Check for quota/rate limit errors
        if (response.status === 429 || errorData.error?.type === 'rate_limit_error') {
          return c.json({
            ok: false,
            error: 'Rate limit exceeded',
            details: errorData.error?.message || 'Too many requests',
            isQuotaError: true
          }, 429);
        }
        console.error('Claude API error:', errorData);
        return jsonErr(c, response.status, 'CLAUDE_API_ERROR', errorData.error?.message || 'Claude API error');
      }
      const data = await response.json();
      aiResponse = data.content[0]?.text || '';
    } else if (provider.provider_name === 'openai') {
      // OpenAI API
      const response = await fetch(`${provider.endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${provider.api_key}`
        },
        body: JSON.stringify({
          model: provider.model,
          max_tokens: provider.max_tokens || 4096,
          temperature: provider.temperature || 0.7,
          messages: [
            {
              role: 'user',
              content: fullMessage
            }
          ]
        })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(()=>({}));
        // Check for quota/rate limit errors
        if (response.status === 429) {
          return c.json({
            ok: false,
            error: 'Rate limit exceeded',
            details: errorData.error?.message || 'Too many requests',
            isQuotaError: true
          }, 429);
        }
        console.error('OpenAI API error:', errorData);
        return jsonErr(c, response.status, 'OPENAI_API_ERROR', errorData.error?.message || 'OpenAI API error');
      }
      const data = await response.json();
      aiResponse = data.choices[0]?.message?.content || '';
    } else if (provider.provider_name === 'gemini') {
      // Google Gemini API
      const apiUrl = `${provider.endpoint}/${provider.model}:generateContent?key=${provider.api_key}`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: fullMessage
                }
              ]
            }
          ],
          generationConfig: {
            temperature: provider.temperature || 0.7,
            maxOutputTokens: provider.max_tokens || 4096
          }
        })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(()=>({}));
        // Check for quota/rate limit errors
        if (response.status === 429 || errorData.error?.status === 'RESOURCE_EXHAUSTED') {
          return c.json({
            ok: false,
            error: 'API quota exceeded',
            details: errorData.error?.message || 'Quota exceeded for Gemini API',
            isQuotaError: true
          }, 429);
        }
        console.error('Gemini API error:', errorData);
        return jsonErr(c, response.status, 'GEMINI_API_ERROR', errorData.error?.message || 'Gemini API error');
      }
      const data = await response.json();
      aiResponse = data.candidates[0]?.content?.parts[0]?.text || '';
    } else {
      return jsonErr(c, 400, 'UNSUPPORTED_PROVIDER', `Provider ${provider.provider_name} is not supported for chat`);
    }
    return c.json({
      ok: true,
      response: aiResponse,
      provider: provider.provider_name,
      model: provider.model
    });
  } catch (error) {
    console.error("Error in AI chat:", error);
    return jsonErr(c, 500, 'AI_CHAT_FAILED', error);
  }
});
// ============================================================================
// FINANCE AI INSIGHTS ROUTES (KV Store)
// ============================================================================
// Get all saved finance AI insights
app.get("/make-server-cbef71cf/finance-ai-insights", async (c)=>{
  try {
    const insights = await kv.getByPrefix("finance_ai_insight:");
    return c.json({
      ok: true,
      insights: insights.map((i)=>({
          id: i.key.replace('finance_ai_insight:', ''),
          ...i.value
        }))
    });
  } catch (error) {
    console.error("Error loading finance AI insights:", error);
    return jsonErr(c, 500, 'FINANCE_INSIGHTS_LOAD_FAILED', error);
  }
});
// Save a new finance AI insight
app.post("/make-server-cbef71cf/finance-ai-insights", async (c)=>{
  try {
    const body = await safeJson(c);
    const { question, response, selectedIndex, selectedAssets, provider, model } = body;
    if (!question || !response) {
      return jsonErr(c, 400, 'INVALID_INSIGHT', 'question and response are required');
    }
    const insightId = `insight_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const insight = {
      id: insightId,
      question,
      response,
      selectedIndex: selectedIndex || null,
      selectedAssets: selectedAssets || [],
      provider: provider || 'Unknown',
      model: model || '',
      createdAt: new Date().toISOString()
    };
    await kv.set(`finance_ai_insight:${insightId}`, insight);
    return c.json({
      ok: true,
      insight
    });
  } catch (error) {
    console.error("Error saving finance AI insight:", error);
    return jsonErr(c, 500, 'FINANCE_INSIGHT_SAVE_FAILED', error);
  }
});
// Delete a finance AI insight
app.delete("/make-server-cbef71cf/finance-ai-insights/:id", async (c)=>{
  try {
    const id = c.req.param("id");
    await kv.del(`finance_ai_insight:${id}`);
    return c.json({
      ok: true,
      message: 'Insight deleted successfully'
    });
  } catch (error) {
    console.error("Error deleting finance AI insight:", error);
    return jsonErr(c, 500, 'FINANCE_INSIGHT_DELETE_FAILED', error);
  }
});
// ============================================================================
// SPORTS AI INSIGHTS ROUTES
// ============================================================================
// Get all saved sports AI insights
app.get("/make-server-cbef71cf/sports-ai-insights", async (c)=>{
  try {
    const insights = await kv.getByPrefix("sports_ai_insight:");
    return c.json({
      ok: true,
      insights: insights.map((i)=>({
          id: i.key.replace('sports_ai_insight:', ''),
          ...i.value
        }))
    });
  } catch (error) {
    console.error("Error loading sports AI insights:", error);
    return jsonErr(c, 500, 'SPORTS_INSIGHTS_LOAD_FAILED', error);
  }
});
// Save a new sports AI insight
app.post("/make-server-cbef71cf/sports-ai-insights", async (c)=>{
  try {
    const body = await safeJson(c);
    const { question, response, selectedLeagues, selectedTeams, provider, model } = body;
    if (!question || !response) {
      return jsonErr(c, 400, 'INVALID_INSIGHT', 'question and response are required');
    }
    const insightId = `insight_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const insight = {
      id: insightId,
      question,
      response,
      selectedLeagues: selectedLeagues || [],
      selectedTeams: selectedTeams || [],
      provider: provider || 'Unknown',
      model: model || '',
      createdAt: new Date().toISOString()
    };
    await kv.set(`sports_ai_insight:${insightId}`, insight);
    return c.json({
      ok: true,
      insight
    });
  } catch (error) {
    console.error("Error saving sports AI insight:", error);
    return jsonErr(c, 500, 'SPORTS_INSIGHT_SAVE_FAILED', error);
  }
});
// Delete a sports AI insight
app.delete("/make-server-cbef71cf/sports-ai-insights/:id", async (c)=>{
  try {
    const id = c.req.param("id");
    await kv.del(`sports_ai_insight:${id}`);
    return c.json({
      ok: true,
      message: 'Insight deleted successfully'
    });
  } catch (error) {
    console.error("Error deleting sports AI insight:", error);
    return jsonErr(c, 500, 'SPORTS_INSIGHT_DELETE_FAILED', error);
  }
});
// ============================================================================
// FINANCE ROUTES (STOCKS & CRYPTO) - Database Tables
// ============================================================================
// Get all stocks from database
app.get("/make-server-cbef71cf/stocks", async (c)=>{
  try {
    console.log("📈 Fetching all stocks from database...");
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const { data, error } = await supabase.from("alpaca_stocks").select("*").order("symbol");
    if (error) {
      console.error("Database error fetching stocks:", error);
      return jsonErr(c, 500, 'STOCKS_FETCH_FAILED', error.message);
    }
    // Transform database format to match frontend expectations
    const stocks = (data || []).map((row)=>({
        symbol: row.symbol,
        name: row.name,
        type: row.type,
        exchange: row.exchange,
        price: row.price ? Number(row.price) : 0,
        change1d: row.change_1d ? Number(row.change_1d) : 0,
        change1dPct: row.change_1d_pct ? Number(row.change_1d_pct) : 0,
        change1wPct: row.change_1w_pct ? Number(row.change_1w_pct) : undefined,
        change1yPct: row.change_1y_pct ? Number(row.change_1y_pct) : undefined,
        yearHigh: row.year_high ? Number(row.year_high) : undefined,
        yearLow: row.year_low ? Number(row.year_low) : undefined,
        chart1y: row.chart_1y,
        rating: row.rating,
        customName: row.custom_name,
        lastUpdate: row.last_update || row.updated_at
      }));
    console.log(`📊 Found ${stocks.length} stocks in database`);
    return c.json({
      ok: true,
      stocks
    });
  } catch (error) {
    console.error("Error fetching stocks:", error);
    return jsonErr(c, 500, 'STOCKS_FETCH_FAILED', error);
  }
});
// Get all cryptos from alpaca_stocks table (OLD ENDPOINT - USE NEW ONE AT LINE 4401)
app.get("/make-server-cbef71cf/crypto-old", async (c)=>{
  try {
    console.log("🪙 Fetching all cryptos from alpaca_stocks table...");
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const { data, error } = await supabase.from("alpaca_stocks").select("*").eq("type", "CRYPTO").order("symbol");
    if (error) {
      console.error("Database error fetching cryptos:", error);
      return jsonErr(c, 500, 'CRYPTOS_FETCH_FAILED', error.message);
    }
    // Transform alpaca_stocks format to match frontend expectations
    const cryptos = (data || []).map((row)=>({
        id: row.symbol,
        cgId: row.symbol,
        symbol: row.symbol,
        name: row.name,
        customName: row.custom_name,
        image: '',
        currentPrice: row.price ? Number(row.price) : 0,
        priceChange24h: row.change_1d ? Number(row.change_1d) : 0,
        priceChangePercentage24h: row.change_1d_pct ? Number(row.change_1d_pct) : 0,
        priceChangePercentage7d: undefined,
        priceChangePercentage30d: undefined,
        marketCap: 0,
        marketCapRank: 0,
        totalVolume: 0,
        high24h: row.year_high ? Number(row.year_high) : 0,
        low24h: row.year_low ? Number(row.year_low) : 0,
        ath: undefined,
        athDate: undefined,
        atl: undefined,
        atlDate: undefined,
        lastUpdated: row.last_update || row.updated_at
      }));
    console.log(`💰 Found ${cryptos.length} cryptos in database`);
    return c.json({
      ok: true,
      cryptos
    });
  } catch (error) {
    console.error("Error fetching cryptos:", error);
    return jsonErr(c, 500, 'CRYPTOS_FETCH_FAILED', error);
  }
});
// Get all custom names for stocks (from database)
app.get("/make-server-cbef71cf/stocks/custom-names/all", async (c)=>{
  try {
    console.log("🏷️ Fetching custom stock names from database...");
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const { data, error } = await supabase.from("alpaca_stocks").select("symbol, custom_name").not("custom_name", "is", null);
    if (error) {
      console.error("Database error fetching custom names:", error);
      return jsonErr(c, 500, 'CUSTOM_NAMES_FETCH_FAILED', error.message);
    }
    // Convert to object format: { symbol: customName }
    const customNames = {};
    (data || []).forEach((row)=>{
      if (row.custom_name) {
        customNames[row.symbol] = row.custom_name;
      }
    });
    console.log(`📝 Found ${Object.keys(customNames).length} custom names`);
    return c.json({
      ok: true,
      customNames
    });
  } catch (error) {
    console.error("Error fetching custom names:", error);
    return jsonErr(c, 500, 'CUSTOM_NAMES_FETCH_FAILED', error);
  }
});
// Refresh stocks data (POST) - Database version
app.post("/make-server-cbef71cf/stocks/refresh", async (c)=>{
  try {
    const body = await safeJson(c);
    const forceClear = body.forceClear || c.req.query('forceClear') === 'true';
    console.log(`🔄 Refreshing stocks data${forceClear ? ' (force clear)' : ''}...`);
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    // Get current stocks from database
    const { data: stocks, error: fetchError } = await supabase.from("alpaca_stocks").select("symbol");
    if (fetchError) {
      console.error("Database error:", fetchError);
      return jsonErr(c, 500, 'STOCKS_FETCH_FAILED', fetchError.message);
    }
    const symbols = (stocks || []).map((s)=>s.symbol);
    if (symbols.length === 0) {
      console.log("⚠️ No stocks found to refresh");
      return c.json({
        ok: true,
        message: "No stocks to refresh"
      });
    }
    console.log(`📊 Refreshing ${symbols.length} stocks: ${symbols.join(', ')}`);
    // Get Alpaca credentials from database
    const { data: alpacaProvider } = await supabase.from("data_providers").select("api_key, api_secret, is_active").eq("id", "finance_provider:alpaca").single();
    if (!alpacaProvider || !alpacaProvider.is_active) {
      console.error("❌ Alpaca provider not configured or inactive");
      return jsonErr(c, 500, 'ALPACA_NOT_CONFIGURED', 'Alpaca provider not configured or inactive');
    }
    const alpacaApiKey = alpacaProvider.api_key;
    const alpacaApiSecret = alpacaProvider.api_secret;
    if (!alpacaApiKey || !alpacaApiSecret) {
      console.error("❌ Missing Alpaca API credentials in database");
      return jsonErr(c, 500, 'ALPACA_CREDENTIALS_MISSING', 'Alpaca API credentials not set in database');
    }
    // Fetch latest data from Alpaca and update database
    let refreshedCount = 0;
    for (const symbol of symbols){
      try {
        // Get latest quote for current price
        const quoteResponse = await fetch(`${ALPACA_DATA_BASE}/v2/stocks/${symbol}/quotes/latest`, {
          headers: {
            'APCA-API-KEY-ID': alpacaApiKey,
            'APCA-API-SECRET-KEY': alpacaApiSecret
          }
        });
        let price = 0;
        if (quoteResponse.ok) {
          const quoteData = await quoteResponse.json();
          const quote = quoteData.quote;
          price = quote?.bp || quote?.ap || 0;
        }
        // Get historical bars for performance metrics and 52-week range
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        const startDate = oneYearAgo.toISOString().split('T')[0];
        const barsResponse = await fetch(`${ALPACA_DATA_BASE}/v2/stocks/${symbol}/bars?start=${startDate}&timeframe=1Day&limit=365`, {
          headers: {
            'APCA-API-KEY-ID': alpacaApiKey,
            'APCA-API-SECRET-KEY': alpacaApiSecret
          }
        });
        let change_1d = 0;
        let change_1d_pct = 0;
        let change_1w_pct = 0;
        let change_1y_pct = 0;
        let year_high = 0;
        let year_low = 0;
        if (barsResponse.ok) {
          const barsData = await barsResponse.json();
          const bars = barsData.bars || [];
          if (bars.length > 0) {
            // Sort bars by date (oldest to newest)
            bars.sort((a, b)=>new Date(a.t).getTime() - new Date(b.t).getTime());
            const latestBar = bars[bars.length - 1];
            const currentPrice = latestBar.c; // Use close price if we don't have live quote
            // Calculate 52-week high and low
            year_high = Math.max(...bars.map((b)=>b.h));
            year_low = Math.min(...bars.map((b)=>b.l));
            // Calculate 1-day change (compare to previous day)
            if (bars.length >= 2) {
              const prevBar = bars[bars.length - 2];
              change_1d = currentPrice - prevBar.c;
              change_1d_pct = prevBar.c !== 0 ? change_1d / prevBar.c * 100 : 0;
            }
            // Calculate 1-week change (approximately 5 trading days)
            if (bars.length >= 6) {
              const weekAgoBar = bars[bars.length - 6];
              const weekChange = currentPrice - weekAgoBar.c;
              change_1w_pct = weekAgoBar.c !== 0 ? weekChange / weekAgoBar.c * 100 : 0;
            }
            // Calculate 1-year change (first bar to latest)
            const firstBar = bars[0];
            const yearChange = currentPrice - firstBar.c;
            change_1y_pct = firstBar.c !== 0 ? yearChange / firstBar.c * 100 : 0;
            // Use the latest bar close as price if we didn't get a quote
            if (!price) {
              price = currentPrice;
            }
          }
        }
        // Update in database
        const { error: updateError } = await supabase.from("alpaca_stocks").update({
          price,
          change_1d,
          change_1d_pct,
          change_1w_pct,
          change_1y_pct,
          year_high,
          year_low,
          last_update: new Date().toISOString()
        }).eq("symbol", symbol);
        if (!updateError) {
          refreshedCount++;
          console.log(`✅ Refreshed ${symbol}: ${price} (1D: ${change_1d_pct.toFixed(2)}%, 1W: ${change_1w_pct.toFixed(2)}%, 1Y: ${change_1y_pct.toFixed(2)}%)`);
        } else {
          console.error(`❌ Error updating ${symbol}:`, updateError);
        }
        // Rate limiting - increased due to multiple API calls
        await sleep(200); // 200ms between stocks to avoid rate limits
      } catch (error) {
        console.error(`❌ Error refreshing ${symbol}:`, error);
      }
    }
    console.log(`✅ Refresh complete: ${refreshedCount}/${symbols.length} stocks updated`);
    return c.json({
      ok: true,
      message: `Refreshed ${refreshedCount} out of ${symbols.length} stocks`,
      refreshedCount,
      totalCount: symbols.length
    });
  } catch (error) {
    console.error("Error refreshing stocks:", error);
    return jsonErr(c, 500, 'STOCKS_REFRESH_FAILED', error);
  }
});
// Refresh crypto data (POST) - OLD ENDPOINT (USE NEW ONE AT LINE 4267)
app.post("/make-server-cbef71cf/crypto/refresh-old", async (c)=>{
  try {
    console.log("🔄 Refreshing crypto data (OLD ENDPOINT)...");
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    // Get current cryptos from alpaca_stocks table
    const { data: cryptos, error: fetchError } = await supabase.from("alpaca_stocks").select("symbol").eq("type", "CRYPTO");
    if (fetchError) {
      console.error("Database error:", fetchError);
      return jsonErr(c, 500, 'CRYPTOS_FETCH_FAILED', fetchError.message);
    }
    const cryptoSymbols = (cryptos || []).map((c)=>c.symbol.toLowerCase());
    if (cryptoSymbols.length === 0) {
      console.log("⚠️ No cryptos found to refresh");
      return c.json({
        ok: true,
        message: "No cryptos to refresh"
      });
    }
    console.log(`💰 Refreshing ${cryptoSymbols.length} cryptos: ${cryptoSymbols.join(', ')}`);
    // Get CoinGecko credentials from database
    const { data: coinGeckoProvider } = await supabase.from("data_providers").select("api_key, is_active").eq("id", "finance_provider:coingecko").single();
    if (!coinGeckoProvider || !coinGeckoProvider.is_active) {
      return jsonErr(c, 500, 'COINGECKO_NOT_CONFIGURED', 'CoinGecko provider not configured or inactive');
    }
    const cgApiKey = coinGeckoProvider.api_key;
    if (!cgApiKey) {
      return jsonErr(c, 500, 'COINGECKO_CREDENTIALS_MISSING', 'CoinGecko API key not set in database');
    }
    // Fetch latest data from CoinGecko (OLD - not functional with new schema)
    const idsParam = cryptoSymbols.join(',');
    const response = await fetch(`https://api.coingecko.com/api/v3/coins/markets?ids=${idsParam}&vs_currency=usd&order=market_cap_desc&per_page=${cryptoSymbols.length}&page=1&sparkline=false&price_change_percentage=1h,24h,7d,30d`, {
      headers: {
        'X-CG-DEMO-API-KEY': cgApiKey
      }
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ CoinGecko API error:", errorText);
      return jsonErr(c, response.status, 'COINGECKO_API_ERROR', errorText);
    }
    const marketData = await response.json();
    console.log(`📊 Received data for ${marketData.length} cryptos from CoinGecko`);
    // Update database with fresh data
    let refreshedCount = 0;
    for (const crypto of marketData){
      try {
        const { error: updateError } = await supabase.from("alpaca_stocks").update({
          name: crypto.name,
          price: crypto.current_price,
          change_1d: crypto.price_change_24h,
          change_1d_pct: crypto.price_change_percentage_24h,
          last_update: crypto.last_updated
        }).eq("symbol", crypto.symbol.toUpperCase()).eq("type", "CRYPTO");
        if (!updateError) {
          refreshedCount++;
          console.log(`✅ Refreshed ${crypto.symbol}: ${crypto.current_price}`);
        } else {
          console.error(`❌ Error updating ${crypto.id}:`, updateError);
        }
      } catch (error) {
        console.error(`❌ Error updating ${crypto.id}:`, error);
      }
    }
    console.log(`✅ Crypto refresh complete: ${refreshedCount}/${cryptoIds.length} cryptos updated`);
    return c.json({
      ok: true,
      message: `Refreshed ${refreshedCount} out of ${cryptoIds.length} cryptos`,
      refreshedCount,
      totalCount: cryptoIds.length
    });
  } catch (error) {
    console.error("Error refreshing cryptos:", error);
    return jsonErr(c, 500, 'CRYPTOS_REFRESH_FAILED', error);
  }
});
// Debug endpoint for Alpaca credentials - NOW TESTS ACTUAL API
app.get("/make-server-cbef71cf/stocks/debug", async (c)=>{
  try {
    console.log("🔍 Debug: Checking Alpaca credentials...");
    // Get Alpaca credentials from database
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const { data: alpacaProvider } = await supabase.from("data_providers").select("api_key, api_secret, is_active").eq("id", "finance_provider:alpaca").single();
    const apiKey = alpacaProvider?.api_key || '';
    const apiSecret = alpacaProvider?.api_secret || '';
    const isActive = alpacaProvider?.is_active || false;
    const apiKeySet = !!apiKey;
    const apiSecretSet = !!apiSecret;
    const configured = apiKeySet && apiSecretSet && isActive;
    // Expected correct values for Paper Trading
    const expectedKeyPrefix = 'PKOSFDGF5FUEN3AUWIIZ6B3TVB';
    const expectedSecretPrefix = 'UeEvRxjcjV8LADoiXeinnk2aSL41EPT8sr5ZGbjW';
    // NEW: Actually test the API credentials
    let apiWorking = false;
    let apiError = null;
    let apiStatusCode = null;
    if (configured) {
      try {
        console.log("🧪 Testing Alpaca API with credentials...");
        const testResponse = await fetch(`${ALPACA_TRADING_BASE}/v2/account`, {
          headers: {
            "APCA-API-KEY-ID": apiKey,
            "APCA-API-SECRET-KEY": apiSecret
          }
        });
        apiStatusCode = testResponse.status;
        if (testResponse.ok) {
          const account = await testResponse.json();
          apiWorking = true;
          console.log("✅ Alpaca API working! Account status:", account.status);
        } else {
          const errorText = await testResponse.text();
          apiError = `HTTP ${testResponse.status}: ${errorText}`;
          console.error("❌ Alpaca API test failed:", apiError);
        }
      } catch (error) {
        apiError = error.message || "Unknown error";
        console.error("❌ Alpaca API test error:", error);
      }
    }
    return c.json({
      configured,
      apiKeySet,
      apiSecretSet,
      apiKeyPrefix: apiKey ? apiKey.slice(0, 6) : '',
      apiSecretPrefix: apiSecret ? apiSecret.slice(0, 6) : '',
      baseUrl: ALPACA_TRADING_BASE,
      dataBaseUrl: ALPACA_DATA_BASE,
      brokerUrl: 'https://broker-api.sandbox.alpaca.markets',
      expectedKeyPrefix: expectedKeyPrefix.slice(0, 6),
      expectedSecretPrefix: expectedSecretPrefix.slice(0, 6),
      // NEW: API test results
      apiWorking,
      apiError,
      apiStatusCode
    });
  } catch (error) {
    console.error("Error in debug endpoint:", error);
    return jsonErr(c, 500, 'DEBUG_FAILED', error);
  }
});
// Search stocks - DUPLICATE ENDPOINT (USE ONE AT LINE 2377)
app.get("/make-server-cbef71cf/stocks/search-old", async (c)=>{
  try {
    const query = c.req.query("q");
    if (!query) {
      return jsonErr(c, 400, 'MISSING_QUERY', 'Search query is required');
    }
    console.log(`🔍 Searching stocks: ${query}`);
    // Get Alpaca credentials from database
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const { data: alpacaProvider } = await supabase.from("data_providers").select("api_key, api_secret, is_active").eq("id", "finance_provider:alpaca").single();
    if (!alpacaProvider || !alpacaProvider.is_active) {
      return jsonErr(c, 500, 'ALPACA_NOT_CONFIGURED', 'Alpaca provider not configured or inactive');
    }
    const alpacaApiKey = alpacaProvider.api_key;
    const alpacaApiSecret = alpacaProvider.api_secret;
    if (!alpacaApiKey || !alpacaApiSecret) {
      return jsonErr(c, 500, 'ALPACA_CREDENTIALS_MISSING', 'Alpaca API credentials not set in database');
    }
    // Search for assets using Alpaca API
    const searchResponse = await fetch(`${ALPACA_TRADING_BASE}/v2/assets?status=active&asset_class=us_equity`, {
      headers: {
        'APCA-API-KEY-ID': alpacaApiKey,
        'APCA-API-SECRET-KEY': alpacaApiSecret
      }
    });
    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error(`❌ Alpaca search failed:`, errorText);
      return jsonErr(c, searchResponse.status, 'ALPACA_SEARCH_ERROR', errorText);
    }
    const allAssets = await searchResponse.json();
    // Filter assets by query (case-insensitive match on symbol or name)
    const queryLower = query.toLowerCase();
    const matchedAssets = allAssets.filter((asset)=>{
      const symbolMatch = asset.symbol?.toLowerCase().includes(queryLower);
      const nameMatch = asset.name?.toLowerCase().includes(queryLower);
      return symbolMatch || nameMatch;
    }).slice(0, 20); // Limit to 20 results
    // Map to SearchResult format
    const results = matchedAssets.map((asset)=>{
      // Determine type based on asset attributes
      let type = 'EQUITY';
      if (asset.attributes && asset.attributes.includes('etf')) {
        type = 'ETF';
      }
      return {
        symbol: asset.symbol,
        name: asset.name,
        exchange: asset.exchange || 'NASDAQ',
        type: type
      };
    });
    console.log(`✅ Found ${results.length} matching stocks`);
    return c.json({
      ok: true,
      results
    });
  } catch (error) {
    console.error("Error searching stocks:", error);
    return jsonErr(c, 500, 'STOCK_SEARCH_FAILED', error);
  }
});
// Add stock (for SecuritySearch component)
app.post("/make-server-cbef71cf/stocks/add", async (c)=>{
  try {
    const body = await safeJson(c);
    const { symbol } = body;
    if (!symbol) {
      return jsonErr(c, 400, 'MISSING_SYMBOL', 'Symbol is required');
    }
    console.log(`📈 Adding stock: ${symbol}`);
    // Get Alpaca credentials from database
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const { data: alpacaProvider } = await supabase.from("data_providers").select("api_key, api_secret, is_active").eq("id", "finance_provider:alpaca").single();
    if (!alpacaProvider || !alpacaProvider.is_active) {
      return jsonErr(c, 500, 'ALPACA_NOT_CONFIGURED', 'Alpaca provider not configured or inactive');
    }
    const alpacaApiKey = alpacaProvider.api_key;
    const alpacaApiSecret = alpacaProvider.api_secret;
    if (!alpacaApiKey || !alpacaApiSecret) {
      return jsonErr(c, 500, 'ALPACA_CREDENTIALS_MISSING', 'Alpaca API credentials not set in database');
    }
    // Get asset info from Alpaca
    const assetResponse = await fetch(`${ALPACA_TRADING_BASE}/v2/assets/${symbol}`, {
      headers: {
        'APCA-API-KEY-ID': alpacaApiKey,
        'APCA-API-SECRET-KEY': alpacaApiSecret
      }
    });
    if (!assetResponse.ok) {
      const errorText = await assetResponse.text();
      console.error(`❌ Asset lookup failed for ${symbol}:`, errorText);
      return jsonErr(c, 400, 'ASSET_NOT_FOUND', `Asset ${symbol} not found`);
    }
    const asset = await assetResponse.json();
    // Normalize Alpaca asset class to database type
    // Alpaca API returns: us_equity, us_option, crypto, fx
    // Database allows: EQUITY, ETF, INDEX, CRYPTO
    const normalizeAssetType = (alpacaClass, assetName, assetAttributes)=>{
      const classLower = alpacaClass?.toLowerCase() || '';
      const nameLower = assetName?.toLowerCase() || '';
      // 1. Check if it's an ETF based on attributes (most reliable)
      const attributes = assetAttributes || [];
      if (attributes.includes('etf')) {
        return 'ETF';
      }
      // 2. Check name patterns for ETFs as fallback
      const nameIndicatesETF = nameLower.includes(' etf') || nameLower.endsWith('etf') || nameLower.includes('ishares') || nameLower.includes('spdr') || nameLower.includes('vanguard') && (nameLower.includes('fund') || nameLower.includes('etf')) || nameLower.includes('proshares') || nameLower.includes('invesco') || nameLower.includes('schwab etf');
      if (nameIndicatesETF) {
        return 'ETF';
      }
      // 3. Map class to type
      const typeMap = {
        'us_equity': 'EQUITY',
        'crypto': 'CRYPTO'
      };
      // Return mapped value or default to EQUITY
      return typeMap[classLower] || 'EQUITY';
    };
    // Get latest quote for current price
    const quoteResponse = await fetch(`${ALPACA_DATA_BASE}/v2/stocks/${symbol}/quotes/latest`, {
      headers: {
        'APCA-API-KEY-ID': alpacaApiKey,
        'APCA-API-SECRET-KEY': alpacaApiSecret
      }
    });
    let price = 0;
    if (quoteResponse.ok) {
      const quoteData = await quoteResponse.json();
      const quote = quoteData.quote;
      price = quote?.bp || quote?.ap || 0;
    }
    // Get historical bars for performance metrics and 52-week range
    // Fetch 1 year of daily bars
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const startDate = oneYearAgo.toISOString().split('T')[0];
    const barsResponse = await fetch(`${ALPACA_DATA_BASE}/v2/stocks/${symbol}/bars?start=${startDate}&timeframe=1Day&limit=365`, {
      headers: {
        'APCA-API-KEY-ID': alpacaApiKey,
        'APCA-API-SECRET-KEY': alpacaApiSecret
      }
    });
    let change_1d = 0;
    let change_1d_pct = 0;
    let change_1w_pct = 0;
    let change_1y_pct = 0;
    let year_high = 0;
    let year_low = 0;
    if (barsResponse.ok) {
      const barsData = await barsResponse.json();
      const bars = barsData.bars || [];
      if (bars.length > 0) {
        // Sort bars by date (oldest to newest)
        bars.sort((a, b)=>new Date(a.t).getTime() - new Date(b.t).getTime());
        const latestBar = bars[bars.length - 1];
        const currentPrice = latestBar.c; // Use close price if we don't have live quote
        // Calculate 52-week high and low
        year_high = Math.max(...bars.map((b)=>b.h));
        year_low = Math.min(...bars.map((b)=>b.l));
        // Calculate 1-day change (compare to previous day)
        if (bars.length >= 2) {
          const prevBar = bars[bars.length - 2];
          change_1d = currentPrice - prevBar.c;
          change_1d_pct = prevBar.c !== 0 ? change_1d / prevBar.c * 100 : 0;
        }
        // Calculate 1-week change (approximately 5 trading days)
        if (bars.length >= 6) {
          const weekAgoBar = bars[bars.length - 6];
          const weekChange = currentPrice - weekAgoBar.c;
          change_1w_pct = weekAgoBar.c !== 0 ? weekChange / weekAgoBar.c * 100 : 0;
        }
        // Calculate 1-year change (first bar to latest)
        const firstBar = bars[0];
        const yearChange = currentPrice - firstBar.c;
        change_1y_pct = firstBar.c !== 0 ? yearChange / firstBar.c * 100 : 0;
        // Use the latest bar close as price if we didn't get a quote
        if (!price) {
          price = currentPrice;
        }
      }
    }
    // Check if stock already exists
    const { data: existing } = await supabase.from("alpaca_stocks").select("symbol").eq("symbol", symbol).single();
    if (existing) {
      return jsonErr(c, 400, 'STOCK_EXISTS', `Stock ${symbol} already exists`);
    }
    // Normalize the type for database, checking attributes and name for ETF
    const normalizedType = normalizeAssetType(asset.class, asset.name, asset.attributes);
    console.log(`📊 Stock type mapping: ${asset.class} (name: ${asset.name}, attrs: ${asset.attributes?.join(',') || 'none'}) → ${normalizedType}`);
    console.log(`📈 Stock metrics: Price=${price}, 1D=${change_1d_pct.toFixed(2)}%, 1W=${change_1w_pct.toFixed(2)}%, 1Y=${change_1y_pct.toFixed(2)}%, 52W Range=${year_low}-${year_high}`);
    // Insert stock into database
    const { data: stock, error } = await supabase.from("alpaca_stocks").insert({
      symbol: asset.symbol,
      name: asset.name,
      type: normalizedType,
      exchange: asset.exchange,
      price,
      change_1d,
      change_1d_pct,
      change_1w_pct,
      change_1y_pct,
      year_high,
      year_low,
      last_update: new Date().toISOString()
    }).select().single();
    if (error) {
      console.error("Database error:", error);
      return jsonErr(c, 500, 'STOCK_ADD_FAILED', error.message);
    }
    console.log(`✅ Added stock: ${symbol} - ${asset.name}`);
    return c.json({
      ok: true,
      stock
    });
  } catch (error) {
    console.error("Error adding stock:", error);
    return jsonErr(c, 500, 'STOCK_ADD_FAILED', error);
  }
});
// Delete stock by symbol
app.delete("/make-server-cbef71cf/stocks/:symbol", async (c)=>{
  try {
    const symbol = c.req.param("symbol");
    if (!symbol) {
      return jsonErr(c, 400, 'MISSING_SYMBOL', 'Stock symbol is required');
    }
    console.log(`🗑️ Deleting stock: ${symbol}`);
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    // Delete from database
    const { error } = await supabase.from("alpaca_stocks").delete().eq("symbol", symbol);
    if (error) {
      console.error("Database delete error:", error);
      return jsonErr(c, 500, 'STOCK_DELETE_FAILED', error.message);
    }
    console.log(`✅ Deleted stock: ${symbol}`);
    return c.json({
      ok: true,
      message: `Stock ${symbol} deleted`
    });
  } catch (error) {
    console.error("Error deleting stock:", error);
    return jsonErr(c, 500, 'STOCK_DELETE_FAILED', error);
  }
});
// Delete crypto by ID
app.delete("/make-server-cbef71cf/crypto/:id", async (c)=>{
  try {
    const id = c.req.param("id");
    if (!id) {
      return jsonErr(c, 400, 'MISSING_ID', 'Crypto ID is required');
    }
    console.log(`🗑️ Deleting crypto: ${id}`);
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    // Delete from database (alpaca_stocks table stores crypto with type='CRYPTO')
    const { error } = await supabase.from("alpaca_stocks").delete().eq("symbol", id).eq("type", "CRYPTO");
    if (error) {
      console.error("Database delete error:", error);
      return jsonErr(c, 500, 'CRYPTO_DELETE_FAILED', error.message);
    }
    console.log(`✅ Deleted crypto: ${id}`);
    return c.json({
      ok: true,
      message: `Crypto ${id} deleted`
    });
  } catch (error) {
    console.error("Error deleting crypto:", error);
    return jsonErr(c, 500, 'CRYPTO_DELETE_FAILED', error);
  }
});
// Add crypto - OLD ENDPOINT (USE NEW ONE AT LINE 4195)
app.post("/make-server-cbef71cf/crypto/add-old", async (c)=>{
  try {
    const body = await safeJson(c);
    const { id } = body;
    if (!id) {
      return jsonErr(c, 400, 'MISSING_ID', 'Crypto ID is required');
    }
    console.log(`🪙 Adding crypto: ${id}`);
    // Get CoinGecko credentials from database
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const { data: coinGeckoProvider } = await supabase.from("data_providers").select("api_key, is_active").eq("id", "finance_provider:coingecko").single();
    if (!coinGeckoProvider || !coinGeckoProvider.is_active) {
      return jsonErr(c, 500, 'COINGECKO_NOT_CONFIGURED', 'CoinGecko provider not configured or inactive');
    }
    const cgApiKey = coinGeckoProvider.api_key;
    if (!cgApiKey) {
      return jsonErr(c, 500, 'COINGECKO_CREDENTIALS_MISSING', 'CoinGecko API key not set in database');
    }
    // Fetch from CoinGecko
    const response = await fetch(`https://api.coingecko.com/api/v3/coins/markets?ids=${id}&vs_currency=usd&order=market_cap_desc&per_page=1&page=1&sparkline=false&price_change_percentage=1h,24h,7d,30d`, {
      headers: {
        'X-CG-DEMO-API-KEY': cgApiKey
      }
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ CoinGecko API error for ${id}:`, errorText);
      return jsonErr(c, response.status, 'COINGECKO_API_ERROR', errorText);
    }
    const marketData = await response.json();
    if (!marketData || marketData.length === 0) {
      return jsonErr(c, 404, 'CRYPTO_NOT_FOUND', `Crypto ${id} not found`);
    }
    const crypto = marketData[0];
    // Check if crypto already exists in alpaca_stocks
    const { data: existing } = await supabase.from("alpaca_stocks").select("symbol").eq("symbol", crypto.symbol.toUpperCase()).eq("type", "CRYPTO").single();
    if (existing) {
      return jsonErr(c, 400, 'CRYPTO_EXISTS', `Crypto ${crypto.symbol} already exists`);
    }
    // Insert crypto into alpaca_stocks table
    const { data: cryptoEntry, error } = await supabase.from("alpaca_stocks").insert({
      symbol: crypto.symbol.toUpperCase(),
      name: crypto.name,
      type: 'CRYPTO',
      price: crypto.current_price,
      change_1d: crypto.price_change_24h,
      change_1d_pct: crypto.price_change_percentage_24h,
      last_update: crypto.last_updated
    }).select().single();
    if (error) {
      console.error("Database error:", error);
      return jsonErr(c, 500, 'CRYPTO_ADD_FAILED', error.message);
    }
    console.log(`✅ Added crypto: ${crypto.symbol} - ${crypto.name}`);
    return c.json({
      ok: true,
      crypto: cryptoEntry
    });
  } catch (error) {
    console.error("Error adding crypto:", error);
    return jsonErr(c, 500, 'CRYPTO_ADD_FAILED', error);
  }
});
// Delete crypto - OLD ENDPOINT (USE NEW ONE AT LINE 4370)
app.delete("/make-server-cbef71cf/crypto-old/:id", async (c)=>{
  try {
    const symbol = c.req.param("id");
    console.log(`🗑️ Deleting crypto: ${symbol}`);
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const { error } = await supabase.from("alpaca_stocks").delete().eq("symbol", symbol.toUpperCase()).eq("type", "CRYPTO");
    if (error) {
      console.error("Database error:", error);
      return jsonErr(c, 500, 'CRYPTO_DELETE_FAILED', error.message);
    }
    console.log(`✅ Deleted crypto: ${symbol}`);
    return c.json({
      ok: true,
      message: `Crypto ${symbol} deleted`
    });
  } catch (error) {
    console.error("Error deleting crypto:", error);
    return jsonErr(c, 500, 'CRYPTO_DELETE_FAILED', error);
  }
});
// Save custom name for stock - Direct database update
app.post("/make-server-cbef71cf/stocks/:symbol/custom-name", async (c)=>{
  try {
    console.log(`📝 POST /stocks/:symbol/custom-name - Starting...`);
    const symbol = c.req.param("symbol");
    console.log(`   Symbol from URL: ${symbol}`);
    const body = await safeJson(c);
    console.log(`   Request body:`, body);
    const { custom_name } = body;
    console.log(`   Extracted custom_name: "${custom_name}" (type: ${typeof custom_name})`);
    if (!symbol) {
      console.error(`❌ Missing symbol`);
      return jsonErr(c, 400, 'MISSING_SYMBOL', 'Symbol is required');
    }
    if (typeof custom_name !== "string") {
      console.error(`❌ Invalid custom_name type: ${typeof custom_name}`);
      return jsonErr(c, 400, 'INVALID_CUSTOM_NAME', 'custom_name must be a string');
    }
    console.log(`🏷️ Setting custom name for stock ${symbol}: "${custom_name || '(clear)'}"`);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    console.log(`   Supabase URL: ${supabaseUrl ? 'exists' : 'MISSING'}`);
    console.log(`   Service role key: ${supabaseKey ? 'exists' : 'MISSING'}`);
    const supabase = createClient(supabaseUrl, supabaseKey);
    // Direct database update (SERVICE_ROLE_KEY bypasses RLS)
    console.log(`   Updating alpaca_stocks table...`);
    const updateData = {
      custom_name: custom_name || null,
      updated_at: new Date().toISOString()
    };
    console.log(`   Update data:`, updateData);
    const { data, error, count } = await supabase.from("alpaca_stocks").update(updateData).eq("symbol", symbol).select();
    console.log(`   Update result - error:`, error);
    console.log(`   Update result - data:`, data);
    console.log(`   Update result - count:`, count);
    if (error) {
      console.error(`❌ Database update error:`, error);
      return jsonErr(c, 500, 'CUSTOM_NAME_SAVE_FAILED', error.message);
    }
    if (!data || data.length === 0) {
      console.error(`⚠️ No rows updated - symbol "${symbol}" not found in alpaca_stocks table`);
      return jsonErr(c, 404, 'STOCK_NOT_FOUND', `Stock with symbol "${symbol}" not found in database`);
    }
    console.log(`✅ Custom name ${custom_name ? 'set' : 'cleared'} for ${symbol}`);
    console.log(`   Returning: { ok: true }`);
    return c.json({
      ok: true
    });
  } catch (error) {
    console.error(`❌ Exception in custom name endpoint:`, error);
    return jsonErr(c, 500, 'CUSTOM_NAME_SAVE_FAILED', String(error));
  }
});
// NEW: Save custom name for stock (drop-in pattern with optimistic update support)
app.post("/make-server-cbef71cf/stocks/custom-name", async (c)=>{
  try {
    console.log(`📝 POST /stocks/custom-name - Starting (drop-in pattern)...`);
    const body = await safeJson(c);
    console.log(`   Request body:`, body);
    const { id, symbol, custom_name } = body;
    console.log(`   Extracted - id: "${id}", symbol: "${symbol}", custom_name: "${custom_name}"`);
    // Use symbol (required) since table uses symbol as PK
    if (!symbol) {
      console.error(`❌ Missing symbol`);
      return c.json({
        ok: false,
        error: 'Symbol is required'
      }, 400);
    }
    // custom_name can be null (to clear), empty string (to clear), or a value
    const finalCustomName = custom_name?.trim() || null;
    console.log(`🏷️ Setting custom name for stock ${symbol}: "${finalCustomName || '(clear)'}"`);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      console.error(`❌ Missing Supabase credentials`);
      return c.json({
        ok: false,
        error: 'Server configuration error'
      }, 500);
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
    // Update database
    console.log(`   Updating alpaca_stocks table...`);
    const updateData = {
      custom_name: finalCustomName,
      last_update: new Date().toISOString()
    };
    console.log(`   Update data:`, updateData);
    const { data, error } = await supabase.from("alpaca_stocks").update(updateData).eq("symbol", symbol).select("symbol, name, custom_name").single();
    console.log(`   Update result - error:`, error);
    console.log(`   Update result - data:`, data);
    if (error) {
      console.error(`❌ Database update error:`, error);
      return c.json({
        ok: false,
        error: error.message
      }, 500);
    }
    if (!data) {
      console.error(`⚠️ No rows updated - symbol "${symbol}" not found`);
      return c.json({
        ok: false,
        error: `Stock with symbol "${symbol}" not found`
      }, 404);
    }
    console.log(`✅ Custom name ${finalCustomName ? 'set' : 'cleared'} for ${symbol}`);
    // Return format expected by drop-in code
    return c.json({
      ok: true,
      updated: {
        updated_custom_name: data.custom_name,
        symbol: data.symbol,
        name: data.name
      }
    });
  } catch (error) {
    console.error(`❌ Exception in custom name endpoint:`, error);
    return c.json({
      ok: false,
      error: String(error)
    }, 500);
  }
});
// Save custom name for crypto - Direct database update
app.post("/make-server-cbef71cf/crypto/:id/custom-name", async (c)=>{
  try {
    console.log(`📝 POST /crypto/:id/custom-name - Starting...`);
    const symbol = c.req.param("id");
    console.log(`   Symbol from URL: ${symbol}`);
    const body = await safeJson(c);
    console.log(`   Request body:`, body);
    const { custom_name } = body;
    console.log(`   Extracted custom_name: "${custom_name}" (type: ${typeof custom_name})`);
    if (!symbol) {
      console.error(`❌ Missing symbol`);
      return jsonErr(c, 400, 'MISSING_SYMBOL', 'Symbol is required');
    }
    if (typeof custom_name !== "string") {
      console.error(`❌ Invalid custom_name type: ${typeof custom_name}`);
      return jsonErr(c, 400, 'INVALID_CUSTOM_NAME', 'custom_name must be a string');
    }
    const upperSymbol = symbol.toUpperCase();
    console.log(`🏷️ Setting custom name for crypto ${upperSymbol}: "${custom_name || '(clear)'}"`);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    console.log(`   Supabase URL: ${supabaseUrl ? 'exists' : 'MISSING'}`);
    console.log(`   Service role key: ${supabaseKey ? 'exists' : 'MISSING'}`);
    const supabase = createClient(supabaseUrl, supabaseKey);
    // Direct database update (SERVICE_ROLE_KEY bypasses RLS)
    console.log(`   Updating alpaca_stocks table for CRYPTO...`);
    const updateData = {
      custom_name: custom_name || null,
      updated_at: new Date().toISOString()
    };
    console.log(`   Update data:`, updateData);
    const { data, error, count } = await supabase.from("alpaca_stocks").update(updateData).eq("symbol", upperSymbol).eq("type", "CRYPTO").select();
    console.log(`   Update result - error:`, error);
    console.log(`   Update result - data:`, data);
    console.log(`   Update result - count:`, count);
    if (error) {
      console.error(`❌ Database update error:`, error);
      return jsonErr(c, 500, 'CRYPTO_CUSTOM_NAME_SAVE_FAILED', error.message);
    }
    if (!data || data.length === 0) {
      console.error(`⚠️ No rows updated - crypto "${upperSymbol}" not found in alpaca_stocks table`);
      return jsonErr(c, 404, 'CRYPTO_NOT_FOUND', `Crypto with symbol "${upperSymbol}" not found in database`);
    }
    console.log(`✅ Custom name ${custom_name ? 'set' : 'cleared'} for ${upperSymbol}`);
    console.log(`   Returning: { ok: true }`);
    return c.json({
      ok: true
    });
  } catch (error) {
    console.error(`❌ Exception in crypto custom name endpoint:`, error);
    return jsonErr(c, 500, 'CRYPTO_CUSTOM_NAME_SAVE_FAILED', String(error));
  }
});
// Database-based stocks endpoint (alternative storage)
app.get("/make-server-cbef71cf/alpaca-stocks", async (c)=>{
  try {
    console.log("📊 Fetching stocks from database...");
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const { data, error } = await supabase.from("alpaca_stocks").select("*").order("symbol");
    if (error) {
      console.error("Database error:", error);
      return jsonErr(c, 500, 'DATABASE_ERROR', error.message);
    }
    console.log(`📈 Found ${data?.length || 0} stocks in database`);
    return c.json({
      ok: true,
      stocks: data || []
    });
  } catch (error) {
    console.error("Error fetching database stocks:", error);
    return jsonErr(c, 500, 'DB_STOCKS_FETCH_FAILED', error);
  }
});
// ============================================================================
// CRYPTO ENDPOINTS (Database-based)
// ============================================================================
// Search cryptocurrencies via CoinGecko
app.get("/make-server-cbef71cf/crypto/search", async (c)=>{
  try {
    const query = c.req.query("q");
    if (!query) {
      return jsonErr(c, 400, 'MISSING_QUERY', 'Search query is required');
    }
    console.log(`🔍 Searching crypto: ${query}`);
    // Get CoinGecko credentials from database
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const { data: coinGeckoProvider } = await supabase.from("data_providers").select("api_key, is_active").eq("id", "finance_provider:coingecko").single();
    if (!coinGeckoProvider || !coinGeckoProvider.is_active) {
      return jsonErr(c, 500, 'COINGECKO_NOT_CONFIGURED', 'CoinGecko provider not configured or inactive');
    }
    const apiKey = coinGeckoProvider.api_key;
    if (!apiKey) {
      return jsonErr(c, 500, 'COINGECKO_CREDENTIALS_MISSING', 'CoinGecko API key not set in database');
    }
    // Use /coins/markets endpoint which includes price data
    // Search by matching query against name/symbol
    const response = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false&price_change_percentage=24h`, {
      headers: {
        "x-cg-demo-api-key": apiKey
      }
    });
    if (!response.ok) {
      return jsonErr(c, 500, 'COINGECKO_SEARCH_FAILED', 'Failed to search CoinGecko');
    }
    const coins = await response.json();
    // Filter by search query
    const queryLower = query.toLowerCase();
    const results = coins.filter((coin)=>coin.name?.toLowerCase().includes(queryLower) || coin.symbol?.toLowerCase().includes(queryLower) || coin.id?.toLowerCase().includes(queryLower)).slice(0, 10).map((coin)=>({
        id: coin.id,
        symbol: coin.symbol?.toUpperCase() || '',
        name: coin.name,
        image: coin.image || '',
        current_price: coin.current_price || 0,
        market_cap: coin.market_cap || 0,
        market_cap_rank: coin.market_cap_rank || 0,
        price_change_percentage_24h: coin.price_change_percentage_24h || 0
      }));
    console.log(`✅ Found ${results.length} matching cryptos`);
    return c.json({
      ok: true,
      results
    });
  } catch (error) {
    console.error("Error searching crypto:", error);
    return jsonErr(c, 500, 'CRYPTO_SEARCH_FAILED', error);
  }
});
// Add cryptocurrency to database
app.post("/make-server-cbef71cf/crypto/add", async (c)=>{
  try {
    const body = await safeJson(c);
    const { cgId } = body;
    if (!cgId) {
      return jsonErr(c, 400, 'MISSING_ID', 'Crypto ID is required');
    }
    console.log(`💰 Adding crypto: ${cgId}`);
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    // Get CoinGecko credentials from database
    const { data: coinGeckoProvider } = await supabase.from("data_providers").select("api_key, is_active").eq("id", "finance_provider:coingecko").single();
    if (!coinGeckoProvider || !coinGeckoProvider.is_active) {
      return jsonErr(c, 500, 'COINGECKO_NOT_CONFIGURED', 'CoinGecko provider not configured or inactive');
    }
    const apiKey = coinGeckoProvider.api_key;
    if (!apiKey) {
      return jsonErr(c, 500, 'COINGECKO_CREDENTIALS_MISSING', 'CoinGecko API key not set in database');
    }
    // Fetch crypto data from CoinGecko
    const response = await fetch(`https://api.coingecko.com/api/v3/coins/${cgId}?localization=false&tickers=false&community_data=false&developer_data=false`, {
      headers: {
        "x-cg-demo-api-key": apiKey
      }
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ CoinGecko fetch failed for ${cgId}:`, errorText);
      return jsonErr(c, 400, 'CRYPTO_NOT_FOUND', `Cryptocurrency ${cgId} not found`);
    }
    const data = await response.json();
    // Check if crypto already exists in alpaca_stocks
    const { data: existing } = await supabase.from("alpaca_stocks").select("symbol").eq("symbol", data.symbol.toUpperCase()).eq("type", "CRYPTO").single();
    if (existing) {
      return jsonErr(c, 400, 'CRYPTO_ALREADY_EXISTS', `${data.name} is already in your watchlist`);
    }
    // Fetch 365-day market chart for 52-week high/low
    let yearHigh = null;
    let yearLow = null;
    try {
      const chartResponse = await fetch(`https://api.coingecko.com/api/v3/coins/${cgId}/market_chart?vs_currency=usd&days=365&interval=daily`, {
        headers: {
          "x-cg-demo-api-key": apiKey
        }
      });
      if (chartResponse.ok) {
        const chartData = await chartResponse.json();
        const prices = chartData.prices?.map((p)=>p[1]) || [];
        if (prices.length > 0) {
          yearHigh = Math.max(...prices);
          yearLow = Math.min(...prices);
          console.log(`📊 52-week range for ${data.symbol}: ${yearLow?.toFixed(2)} - ${yearHigh?.toFixed(2)}`);
        }
      }
    } catch (error) {
      console.warn(`⚠️ Could not fetch 52-week range for ${cgId}:`, error);
    }
    // Insert into alpaca_stocks table with type='CRYPTO' and comprehensive data
    const { error: insertError } = await supabase.from("alpaca_stocks").insert({
      symbol: data.symbol.toUpperCase(),
      name: data.name,
      type: 'CRYPTO',
      price: data.market_data?.current_price?.usd || 0,
      change_1d: data.market_data?.price_change_24h || 0,
      change_1d_pct: data.market_data?.price_change_percentage_24h || 0,
      change_1w_pct: data.market_data?.price_change_percentage_7d_in_currency?.usd || null,
      change_1y_pct: data.market_data?.price_change_percentage_1y_in_currency?.usd || null,
      year_high: yearHigh,
      year_low: yearLow,
      last_update: new Date().toISOString()
    });
    if (insertError) {
      console.error(`❌ Database insert failed:`, insertError);
      return jsonErr(c, 500, 'DATABASE_INSERT_FAILED', insertError.message);
    }
    console.log(`✅ Added crypto: ${data.name} (${data.symbol})`);
    return c.json({
      ok: true,
      message: `${data.name} added successfully`
    });
  } catch (error) {
    console.error("Error adding crypto:", error);
    return jsonErr(c, 500, 'CRYPTO_ADD_FAILED', error);
  }
});
// Refresh crypto prices from CoinGecko
app.post("/make-server-cbef71cf/crypto/refresh", async (c)=>{
  try {
    console.log(`🔄 Refreshing crypto data...`);
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    // Get current cryptos from alpaca_stocks table
    const { data: cryptos, error: fetchError } = await supabase.from("alpaca_stocks").select("symbol, name").eq("type", "CRYPTO");
    if (fetchError) {
      console.error("Database error:", fetchError);
      return jsonErr(c, 500, 'CRYPTOS_FETCH_FAILED', fetchError.message);
    }
    const cryptoSymbols = (cryptos || []).map((c)=>c.symbol.toLowerCase());
    if (cryptoSymbols.length === 0) {
      console.log("⚠️ No cryptos found to refresh");
      return c.json({
        ok: true,
        message: "No cryptos to refresh"
      });
    }
    console.log(`💰 Refreshing ${cryptoSymbols.length} cryptos: ${cryptoSymbols.join(', ')}`);
    // Get CoinGecko credentials from database
    const { data: coinGeckoProvider } = await supabase.from("data_providers").select("api_key, is_active").eq("id", "finance_provider:coingecko").single();
    if (!coinGeckoProvider || !coinGeckoProvider.is_active) {
      console.error("❌ CoinGecko provider not configured or inactive");
      return jsonErr(c, 500, 'COINGECKO_NOT_CONFIGURED', 'CoinGecko provider not configured or inactive');
    }
    const apiKey = coinGeckoProvider.api_key;
    if (!apiKey) {
      console.error("❌ Missing CoinGecko API key in database");
      return jsonErr(c, 500, 'COINGECKO_CREDENTIALS_MISSING', 'CoinGecko API key not set in database');
    }
    // Fetch latest data from CoinGecko and update alpaca_stocks table
    let refreshedCount = 0;
    for (const symbol of cryptoSymbols){
      try {
        const response = await fetch(`https://api.coingecko.com/api/v3/coins/${symbol}?localization=false&tickers=false&community_data=false&developer_data=false`, {
          headers: {
            "x-cg-demo-api-key": apiKey
          }
        });
        if (response.ok) {
          const data = await response.json();
          // Fetch 365-day market chart for 52-week high/low
          let yearHigh = null;
          let yearLow = null;
          try {
            const chartResponse = await fetch(`https://api.coingecko.com/api/v3/coins/${symbol}/market_chart?vs_currency=usd&days=365&interval=daily`, {
              headers: {
                "x-cg-demo-api-key": apiKey
              }
            });
            if (chartResponse.ok) {
              const chartData = await chartResponse.json();
              const prices = chartData.prices?.map((p)=>p[1]) || [];
              if (prices.length > 0) {
                yearHigh = Math.max(...prices);
                yearLow = Math.min(...prices);
              }
            }
          } catch (error) {
            console.warn(`⚠️ Could not fetch 52-week range for ${symbol}:`, error);
          }
          // Update in alpaca_stocks table with comprehensive data
          const { error: updateError } = await supabase.from("alpaca_stocks").update({
            name: data.name,
            price: data.market_data?.current_price?.usd || 0,
            change_1d: data.market_data?.price_change_24h || 0,
            change_1d_pct: data.market_data?.price_change_percentage_24h || 0,
            change_1w_pct: data.market_data?.price_change_percentage_7d_in_currency?.usd || null,
            change_1y_pct: data.market_data?.price_change_percentage_1y_in_currency?.usd || null,
            year_high: yearHigh,
            year_low: yearLow,
            last_update: new Date().toISOString()
          }).eq("symbol", symbol.toUpperCase()).eq("type", "CRYPTO");
          if (!updateError) {
            refreshedCount++;
            console.log(`✅ Refreshed ${data.name} (${symbol.toUpperCase()}): ${data.market_data?.current_price?.usd || 0}, 1W: ${data.market_data?.price_change_percentage_7d_in_currency?.usd?.toFixed(2)}%, 1Y: ${data.market_data?.price_change_percentage_1y_in_currency?.usd?.toFixed(2)}%`);
          } else {
            console.error(`❌ Error updating ${symbol}:`, updateError);
          }
        } else {
          console.warn(`⚠️ Failed to refresh ${symbol}: ${response.status}`);
        }
        // Rate limiting
        await sleep(100); // 100ms between requests
      } catch (error) {
        console.error(`❌ Error refreshing ${symbol}:`, error);
      }
    }
    console.log(`✅ Refreshed ${refreshedCount}/${cryptoSymbols.length} cryptos`);
    return c.json({
      ok: true,
      refreshed: refreshedCount,
      total: cryptoSymbols.length
    });
  } catch (error) {
    console.error("Error refreshing cryptos:", error);
    return jsonErr(c, 500, 'CRYPTO_REFRESH_FAILED', error);
  }
});
// Get all cryptocurrencies from alpaca_stocks table
app.get("/make-server-cbef71cf/crypto", async (c)=>{
  try {
    console.log("💰 Fetching cryptos from alpaca_stocks table...");
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const { data, error } = await supabase.from("alpaca_stocks").select("*").eq("type", "CRYPTO").order("symbol");
    if (error) {
      console.error("Database error:", error);
      return jsonErr(c, 500, 'DATABASE_ERROR', error.message);
    }
    console.log(`💰 Found ${data?.length || 0} cryptos in alpaca_stocks table`);
    return c.json({
      ok: true,
      cryptos: data || []
    });
  } catch (error) {
    console.error("Error fetching cryptos from alpaca_stocks:", error);
    return jsonErr(c, 500, 'DB_CRYPTOS_FETCH_FAILED', error);
  }
});
// ============================================================================
// START SERVER
// ============================================================================
Deno.serve(app.fetch);
