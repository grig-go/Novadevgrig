// trigger redeploy 2025-11-11 - migrated AI insights to ai_insights_news table
import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

// ============================================================================
// SUPABASE CLIENT
// ============================================================================
const getSupabaseClient = () => createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// ============================================================================
// SERVER SETUP
// ============================================================================
const BUILD_ID = new Date().toISOString();
console.log("[news_dashboard] boot", BUILD_ID);

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// CORS configuration
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
// HELPER FUNCTIONS
// ============================================================================
async function safeJson(c: any) {
  try {
    return await c.req.json();
  } catch {
    return {};
  }
}

function jsonErr(c: any, status: number, code: string, detail?: any) {
  console.error(`[${code}]`, detail ?? '');
  return c.json({
    ok: false,
    error: code,
    detail: String(detail ?? '')
  }, status);
}

// ============================================================================
// HEALTH CHECK
// ============================================================================
app.get("/news_dashboard/health", (c) => {
  return c.json({
    status: "ok",
    service: "news_dashboard",
    build: BUILD_ID
  });
});

// ============================================================================
// NEWS ARTICLES ROUTES
// ============================================================================

// Fetch fresh news articles from external APIs
app.post("/news_dashboard/news-articles", async (c) => {
  try {
    const body = await safeJson(c);
    const { providers, q, country, language, perProviderLimit = 10, totalLimit = 50 } = body;

    console.log('[NEWS FETCH] Request:', { 
      providerCount: providers?.length, 
      q, 
      country, 
      language, 
      perProviderLimit, 
      totalLimit 
    });

    if (!Array.isArray(providers) || providers.length === 0) {
      return jsonErr(c, 400, 'INVALID_PROVIDERS', 'providers array is required');
    }

    const supabase = getSupabaseClient();

    // Fetch from all providers in parallel
    const fetchPromises = providers.map(async (provider: any) => {
      try {
        const { name, type, apiKey, country: providerCountry, language: providerLanguage } = provider;

        if (!apiKey) {
          console.log(`[NEWS FETCH] Skipping ${name} - no API key`);
          return [];
        }

        let url: string;
        
        if (type === 'newsapi') {
          // NewsAPI.org
          url = `https://newsapi.org/v2/top-headlines?apiKey=${apiKey}`;
          if (q) url += `&q=${encodeURIComponent(q)}`;
          if (country || providerCountry) url += `&country=${country || providerCountry}`;
          if (language || providerLanguage) url += `&language=${language || providerLanguage}`;
          url += `&pageSize=${perProviderLimit}`;
        } else if (type === 'gnews') {
          // GNews.io
          url = `https://gnews.io/api/v4/top-headlines?token=${apiKey}`;
          if (q) url += `&q=${encodeURIComponent(q)}`;
          if (country || providerCountry) url += `&country=${country || providerCountry}`;
          if (language || providerLanguage) url += `&lang=${language || providerLanguage}`;
          url += `&max=${perProviderLimit}`;
        } else if (type === 'newsdata') {
          // NewsData.io
          url = `https://newsdata.io/api/1/news?apikey=${apiKey}`;
          if (q) url += `&q=${encodeURIComponent(q)}`;
          if (country || providerCountry) url += `&country=${country || providerCountry}`;
          if (language || providerLanguage) url += `&language=${language || providerLanguage}`;
          url += `&size=${perProviderLimit}`;
        } else if (type === 'currents') {
          // CurrentsAPI
          url = `https://api.currentsapi.services/v1/latest-news?apiKey=${apiKey}`;
          if (q) url += `&keywords=${encodeURIComponent(q)}`;
          if (country || providerCountry) url += `&country=${country || providerCountry}`;
          if (language || providerLanguage) url += `&language=${language || providerLanguage}`;
          url += `&page_size=${perProviderLimit}`;
        } else {
          console.log(`[NEWS FETCH] Unknown provider type: ${type}`);
          return [];
        }

        console.log(`[NEWS FETCH] Fetching from ${name} (${type})`);
        
        const response = await fetch(url);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[NEWS FETCH] ${name} failed:`, response.status, errorText);
          return [];
        }

        const data = await response.json();
        
        // Normalize articles based on provider type
        let articles: any[] = [];
        
        if (type === 'newsapi') {
          articles = (data.articles || []).map((a: any) => {
            const providerArticleId = `${name.toLowerCase()}-${a.url}`;
            return {
              provider: name.toLowerCase(),
              provider_article_id: providerArticleId,
              title: a.title,
              description: a.description,
              content: a.content,
              url: a.url,
              image_url: a.urlToImage,
              published_at: a.publishedAt,
              source: a.source?.name || name,
              author: a.author,
              country: country || providerCountry || null,
              language: language || providerLanguage || null
            };
          });
        } else if (type === 'gnews') {
          articles = (data.articles || []).map((a: any) => {
            const providerArticleId = `${name.toLowerCase()}-${a.url}`;
            return {
              provider: name.toLowerCase(),
              provider_article_id: providerArticleId,
              title: a.title,
              description: a.description,
              content: a.content,
              url: a.url,
              image_url: a.image,
              published_at: a.publishedAt,
              source: a.source?.name || name,
              author: null,
              country: country || providerCountry || null,
              language: language || providerLanguage || null
            };
          });
        } else if (type === 'newsdata') {
          articles = (data.results || []).map((a: any) => {
            const providerArticleId = `${name.toLowerCase()}-${a.link}`;
            return {
              provider: name.toLowerCase(),
              provider_article_id: providerArticleId,
              title: a.title,
              description: a.description,
              content: a.content,
              url: a.link,
              image_url: a.image_url,
              published_at: a.pubDate,
              source: a.source_id || name,
              author: a.creator?.[0],
              country: country || providerCountry || null,
              language: language || providerLanguage || null
            };
          });
        } else if (type === 'currents') {
          articles = (data.news || []).map((a: any) => {
            const providerArticleId = `${name.toLowerCase()}-${a.url}`;
            return {
              provider: name.toLowerCase(),
              provider_article_id: providerArticleId,
              title: a.title,
              description: a.description,
              content: a.description,
              url: a.url,
              image_url: a.image,
              published_at: a.published,
              source: name,
              author: a.author,
              country: country || providerCountry || null,
              language: language || providerLanguage || null
            };
          });
        }

        console.log(`[NEWS FETCH] ${name} returned ${articles.length} articles`);
        return articles;

      } catch (error) {
        console.error(`[NEWS FETCH] Error fetching from ${provider.name}:`, error);
        return [];
      }
    });

    const results = await Promise.all(fetchPromises);
    const allArticles = results.flat();

    // Apply total limit
    const limitedArticles = allArticles.slice(0, totalLimit);

    // Save articles to news_articles table (upsert to avoid duplicates)
    if (limitedArticles.length > 0) {
      const { data: inserted, error: insertError } = await supabase
        .from('news_articles')
        .upsert(limitedArticles, { 
          onConflict: 'provider_article_id',
          ignoreDuplicates: false 
        })
        .select();

      if (insertError) {
        console.error('[NEWS FETCH] Error saving articles:', insertError);
        return jsonErr(c, 500, 'DB_INSERT_FAILED', insertError.message);
      }

      console.log(`[NEWS FETCH] Saved ${inserted?.length || 0} articles to database`);
    }

    // Fetch the saved articles to return with IDs
    const { data: savedArticles, error: fetchError } = await supabase
      .from('news_articles')
      .select('*')
      .in('provider_article_id', limitedArticles.map(a => a.provider_article_id))
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('[NEWS FETCH] Error fetching saved articles:', fetchError);
    }

    return c.json({
      ok: true,
      articles: savedArticles || limitedArticles,
      total: savedArticles?.length || limitedArticles.length
    });

  } catch (error) {
    return jsonErr(c, 500, 'NEWS_FETCH_FAILED', error);
  }
});

// Get stored news articles with filters
app.get("/news_dashboard/news-articles/stored", async (c) => {
  try {
    const provider = c.req.query('provider');
    const language = c.req.query('language');
    const country = c.req.query('country');
    const limit = parseInt(c.req.query('limit') || '100');

    console.log('[NEWS STORED] Query params:', { provider, language, country, limit });

    const supabase = getSupabaseClient();
    let query = supabase.from('news_articles').select('*');

    if (provider && provider !== 'all') {
      query = query.eq('provider', provider);
    }
    if (language) {
      query = query.eq('language', language);
    }
    if (country) {
      query = query.eq('country', country);
    }

    const { data: articles, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[NEWS STORED] Error fetching articles:', error);
      return c.json({
        error: "Failed to fetch news articles",
        details: error.message
      }, 500);
    }

    console.log(`[NEWS STORED] Returning ${articles?.length || 0} articles`);

    return c.json({
      ok: true,
      articles: articles || []
    });
  } catch (error) {
    console.error('[NEWS STORED] Error:', error);
    return c.json({
      error: "Failed to fetch news articles",
      details: String(error)
    }, 500);
  }
});

// Delete a news article
app.delete("/news_dashboard/news-articles/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('news_articles')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[NEWS DELETE] Error:', error);
      return c.json({
        error: "Failed to delete news article",
        details: error.message
      }, 500);
    }

    return c.json({
      success: true
    });
  } catch (error) {
    return c.json({
      error: "Failed to delete news article",
      details: String(error)
    }, 500);
  }
});

// ============================================================================
// NEWS AI INSIGHTS ROUTES (ai_insights_news table)
// ============================================================================

// GET all AI insights
app.get("/news_dashboard/news-ai-insights", async (c) => {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("ai_insights_news")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return jsonErr(c, 500, "INSIGHTS_FETCH_FAILED", error.message);
    }

    console.log(`[NEWS AI INSIGHTS] Returning ${data?.length || 0} insights`);

    return c.json({
      ok: true,
      insights: data || []
    });
  } catch (error) {
    return jsonErr(c, 500, "INSIGHTS_FETCH_FAILED", error);
  }
});

// GET single AI insight by ID
app.get("/news_dashboard/news-ai-insights/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from("ai_insights_news")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return jsonErr(c, 404, "INSIGHT_NOT_FOUND", `Insight ${id} not found`);
      }
      return jsonErr(c, 500, "INSIGHT_FETCH_FAILED", error.message);
    }

    return c.json({
      ok: true,
      data
    });
  } catch (error) {
    return jsonErr(c, 500, "INSIGHT_FETCH_FAILED", error);
  }
});

// POST create a new AI insight
app.post("/news_dashboard/news-ai-insights", async (c) => {
  try {
    const body = await safeJson(c);
    const { question, response, selectedArticles, provider, model, category } = body;
    
    if (!question || !response) {
      return jsonErr(c, 400, "INVALID_INPUT", "question and response are required");
    }

    console.log(`💾 Saving news AI insight: "${question.substring(0, 50)}..."`);

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("ai_insights_news")
      .insert({
        topic: question,
        insight: response,
        category: category || "general",
        metadata: JSON.stringify({
          question,
          response,
          selectedArticles: selectedArticles || [],
          aiProvider: provider || "Unknown",
          model: model || null
        }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error("❌ Error saving insight:", error);
      return jsonErr(c, 500, "INSIGHT_CREATE_FAILED", error.message);
    }

    console.log(`✅ News insight saved with ID: ${data.id}`);

    return c.json({
      ok: true,
      insight: data
    });
  } catch (error) {
    console.error("❌ Exception saving insight:", error);
    return jsonErr(c, 500, "INSIGHT_CREATE_FAILED", error);
  }
});

// DELETE an AI insight
app.delete("/news_dashboard/news-ai-insights/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from("ai_insights_news")
      .delete()
      .eq("id", id);

    if (error) {
      return jsonErr(c, 500, "INSIGHT_DELETE_FAILED", error.message);
    }

    console.log(`✅ Deleted news AI insight: ${id}`);

    return c.json({
      ok: true,
      message: `Insight ${id} deleted successfully`
    });
  } catch (error) {
    return jsonErr(c, 500, "INSIGHT_DELETE_FAILED", error);
  }
});

// ============================================================================
// NEWS PROVIDERS ROUTES
// ============================================================================

// Get all news providers from data_providers table
app.get("/news_dashboard/news-providers", async (c) => {
  try {
    const supabase = getSupabaseClient();
    
    // Get provider data from data_providers table (has API keys and actual config)
    const { data: providers, error: providerError } = await supabase
      .from("data_providers")
      .select("*")
      .eq("category", "news")
      .order("name");

    if (providerError) {
      console.error('[NEWS PROVIDERS] Error fetching providers:', providerError);
      return c.json({
        error: "Failed to fetch news providers",
        details: providerError.message
      }, 500);
    }

    // Optionally get config overrides from news_provider_configs
    const { data: configs } = await supabase
      .from("news_provider_configs")
      .select("*");

    const configMap = new Map(configs?.map(c => [c.provider, c]) || []);
    
    const formattedProviders = (providers || []).map((p) => {
      const config = typeof p.config === 'string' ? JSON.parse(p.config) : p.config || {};
      const providerConfig = configMap.get(p.name.toLowerCase());
      
      return {
        id: p.id,
        name: p.name,
        type: p.type,
        isActive: p.is_active,
        apiKey: p.api_key || null,
        baseUrl: p.base_url,
        country: config.country || 'us',
        language: config.language || 'en',
        pageSize: providerConfig?.page_size || config.pageSize || 20,
        defaultQuery: providerConfig?.default_query || config.defaultQuery || ''
      };
    });

    console.log(`[NEWS PROVIDERS] Returning ${formattedProviders.length} providers`);

    return c.json({
      ok: true,
      providers: formattedProviders
    });
  } catch (error) {
    console.error('[NEWS PROVIDERS] Error:', error);
    return c.json({
      error: "Failed to fetch news providers",
      details: String(error)
    }, 500);
  }
});

// ============================================================================
// START SERVER
// ============================================================================
// Export the handler for Supabase Edge Functions
export default { fetch: app.fetch };