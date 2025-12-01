// Handles fetching data from different source types
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import type { DataSource } from "../types.ts";

// Deno global type declaration (available in Deno runtime)
declare const Deno: any;

export async function fetchDataFromSource(
  dataSource: DataSource,
  supabase: any,
  queryParams: Record<string, string> = {}
): Promise<any> {
  console.log(`Fetching from source: ${dataSource.name} (${dataSource.type})`);
  console.log(`Query params for source:`, queryParams);

  switch (dataSource.type) {
    case "api":
      return await fetchFromAPI(dataSource, queryParams);
    case "database":
      return await fetchFromDatabase(dataSource, supabase, queryParams);
    case "rss":
      return await fetchFromRSS(dataSource);
    case "file":
      return await fetchFromFile(dataSource);
    default:
      console.error(`Unsupported source type: ${dataSource.type}`);
      return null;
  }
}

async function fetchFromAPI(source: DataSource, queryParams: Record<string, string> = {}): Promise<any> {
  const apiConfig = source.api_config || source.config;
  if (!apiConfig?.url) {
    throw new Error("API URL not configured");
  }

  // Handle dynamic URL parameters
  let url = apiConfig.url;
  let isNovaElectionUrl = false;
  let isNovaWeatherUrl = false;

  // Helper function to merge query parameters
  // Agent URL params (queryParams) override configured URL params
  const mergeNovaQueryParams = (configuredUrl: string, agentQueryParams: Record<string, string>): string => {
    const urlObj = new URL(configuredUrl);
    const configuredParams = new URLSearchParams(urlObj.search);

    // Start with configured params, then override with agent query params
    const mergedParams = new URLSearchParams();

    // Add all configured params first
    configuredParams.forEach((value, key) => {
      mergedParams.set(key, value);
    });

    // Override with agent query params (these take precedence)
    Object.entries(agentQueryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        mergedParams.set(key, value);
        console.log(`Query param override: ${key}=${value}`);
      }
    });

    return mergedParams.toString() ? `?${mergedParams.toString()}` : '';
  };

  // Transform /nova/election URLs to actual Supabase Edge Function URLs
  // This allows users to use any domain (localhost, dev server, etc.) for testing
  // and it will automatically use the correct Supabase Edge Function URL
  if (url.includes('/nova/election')) {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    if (supabaseUrl) {
      // Merge configured params with agent query params (agent params override)
      const mergedQueryString = mergeNovaQueryParams(url, queryParams);

      // Replace with Supabase Edge Function URL
      url = `${supabaseUrl}/functions/v1/nova-election${mergedQueryString}`;
      isNovaElectionUrl = true;
      console.log(`Transformed /nova/election URL to: ${url}`);
    } else {
      console.warn("SUPABASE_URL not found, cannot transform /nova/election URL");
    }
  }

  // Transform /nova/weather URLs to actual Supabase Edge Function URLs
  // This allows users to use any domain (localhost, dev server, etc.) for testing
  // and it will automatically use the correct Supabase Edge Function URL
  if (url.includes('/nova/weather')) {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    if (supabaseUrl) {
      // Merge configured params with agent query params (agent params override)
      const mergedQueryString = mergeNovaQueryParams(url, queryParams);

      // Replace with Supabase Edge Function URL
      url = `${supabaseUrl}/functions/v1/nova-weather${mergedQueryString}`;
      isNovaWeatherUrl = true;
      console.log(`Transformed /nova/weather URL to: ${url}`);
    } else {
      console.warn("SUPABASE_URL not found, cannot transform /nova/weather URL");
    }
  }

  // Transform /nova/finance URLs to actual Supabase Edge Function URLs
  // This allows users to use any domain (localhost, dev server, etc.) for testing
  // and it will automatically use the correct Supabase Edge Function URL
  let isNovaFinanceUrl = false;
  if (url.includes('/nova/finance')) {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    if (supabaseUrl) {
      // Merge configured params with agent query params (agent params override)
      const mergedQueryString = mergeNovaQueryParams(url, queryParams);

      // Replace with Supabase Edge Function URL
      url = `${supabaseUrl}/functions/v1/nova-finance${mergedQueryString}`;
      isNovaFinanceUrl = true;
      console.log(`Transformed /nova/finance URL to: ${url}`);
    } else {
      console.warn("SUPABASE_URL not found, cannot transform /nova/finance URL");
    }
  }

  // Check if there are parameter mappings configured
  if (apiConfig.parameter_mappings && Array.isArray(apiConfig.parameter_mappings)) {
    console.log("Processing parameter mappings:", apiConfig.parameter_mappings);

    for (const mapping of apiConfig.parameter_mappings) {
      const { queryParam, urlPlaceholder, required } = mapping;

      // Get the value from query parameters
      const paramValue = queryParams[queryParam];

      // Check if required parameter is missing
      if (required && !paramValue) {
        throw new Error(`Required query parameter '${queryParam}' is missing`);
      }

      // Replace placeholder in URL if value exists
      if (paramValue) {
        // Support both {placeholder} and just placeholder formats
        url = url.replace(`{${urlPlaceholder}}`, paramValue);
        url = url.replace(`{${urlPlaceholder}}`, paramValue); // Handle double braces
        console.log(`Replaced {${urlPlaceholder}} with ${paramValue}`);
      }
    }

    console.log(`Final URL after parameter substitution: ${url}`);
  }

  const headers: Record<string, string> = {};

  // Add authentication headers
  if (isNovaElectionUrl) {
    // For transformed nova-election URLs, use Supabase anon key
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    if (anonKey) {
      headers["Authorization"] = `Bearer ${anonKey}`;
      headers["apikey"] = anonKey;
      console.log("Added Supabase authentication headers for nova-election");
    }
  } else if (isNovaWeatherUrl) {
    // For transformed nova-weather URLs, use Supabase anon key
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    if (anonKey) {
      headers["Authorization"] = `Bearer ${anonKey}`;
      headers["apikey"] = anonKey;
      console.log("Added Supabase authentication headers for nova-weather");
    }
  } else if (isNovaFinanceUrl) {
    // For transformed nova-finance URLs, use Supabase anon key
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    if (anonKey) {
      headers["Authorization"] = `Bearer ${anonKey}`;
      headers["apikey"] = anonKey;
      console.log("Added Supabase authentication headers for nova-finance");
    }
  } else if (apiConfig.auth_type === "bearer" && apiConfig.auth_token) {
    headers["Authorization"] = `Bearer ${apiConfig.auth_token}`;
  } else if (apiConfig.auth_type === "api_key") {
    if (apiConfig.api_key_header && apiConfig.api_key_value) {
      headers[apiConfig.api_key_header] = apiConfig.api_key_value;
    }
  }

  // Add custom headers
  if (apiConfig.headers) {
    Object.assign(headers, apiConfig.headers);
  }

  const response = await fetch(url, {
    method: apiConfig.method || "GET",
    headers,
    ...(apiConfig.body && { body: JSON.stringify(apiConfig.body) })
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} - ${response.statusText}`);
  }

  return await response.json();
}

async function fetchFromDatabase(source: DataSource, supabase: any, queryParams: Record<string, string> = {}): Promise<any> {
  const dbConfig = source.database_config || source.config;
  if (!dbConfig?.table) {
    throw new Error("Database table not configured");
  }

  let query = supabase.from(dbConfig.table).select(dbConfig.columns || "*");
  
  // Apply filters
  if (dbConfig.filters) {
    for (const filter of dbConfig.filters) {
      query = query.filter(filter.column, filter.operator, filter.value);
    }
  }

  // Apply ordering
  if (dbConfig.order_by) {
    query = query.order(dbConfig.order_by, { 
      ascending: dbConfig.order_ascending !== false 
    });
  }

  // Apply limit
  if (dbConfig.limit) {
    query = query.limit(dbConfig.limit);
  }

  const { data, error } = await query;
  
  if (error) {
    throw new Error(`Database query failed: ${error.message}`);
  }

  return data;
}

async function fetchFromRSS(source: DataSource): Promise<any> {
  const rssConfig = source.rss_config || source.config;
  if (!rssConfig?.url) {
    throw new Error("RSS URL not configured");
  }

  const response = await fetch(rssConfig.url);
  if (!response.ok) {
    throw new Error(`RSS fetch failed: ${response.status}`);
  }

  const text = await response.text();
  // Parse RSS to JSON
  return parseRSSToJSON(text);
}

async function fetchFromFile(source: DataSource): Promise<any> {
  const fileConfig = source.file_config || source.config;
  if (!fileConfig?.url) {
    throw new Error("File URL not configured");
  }

  const response = await fetch(fileConfig.url);
  if (!response.ok) {
    throw new Error(`File fetch failed: ${response.status}`);
  }

  const contentType = response.headers.get("content-type");
  
  if (contentType?.includes("json")) {
    return await response.json();
  } else if (contentType?.includes("csv")) {
    const text = await response.text();
    return parseCSVToJSON(text);
  } else {
    return await response.text();
  }
}

function parseRSSToJSON(rssText: string): any {
  // RSS parsing logic here
  const items: any[] = [];
  const itemMatches = rssText.matchAll(/<item>(.*?)<\/item>/gs);
  
  for (const match of itemMatches) {
    const itemXml = match[1];
    items.push({
      title: extractXMLValue(itemXml, "title"),
      description: extractXMLValue(itemXml, "description"),
      link: extractXMLValue(itemXml, "link"),
      pubDate: extractXMLValue(itemXml, "pubDate"),
      guid: extractXMLValue(itemXml, "guid"),
      author: extractXMLValue(itemXml, "author"),
      category: extractXMLValue(itemXml, "category")
    });
  }
  
  return items;
}

function extractXMLValue(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`, "s"));
  if (match) {
    return match[1]
      .replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&");
  }
  return "";
}

function parseCSVToJSON(csv: string): any[] {
  const lines = csv.split("\n");
  const headers = lines[0].split(",").map(h => h.trim());
  const results = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = lines[i].split(",");
    const obj: any = {};
    
    headers.forEach((header, index) => {
      obj[header] = values[index]?.trim() || "";
    });
    
    results.push(obj);
  }
  
  return results;
}
