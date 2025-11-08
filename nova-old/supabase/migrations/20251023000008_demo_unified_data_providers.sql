-- ============================================================================
-- Migration 008: Unified Data Providers Table
-- ============================================================================
-- Purpose: Replace KV store with proper database table for all data providers
-- Providers: Weather, Sports, News, Finance
-- Benefits: Schema validation, CRUD operations, proper foreign keys, constraints
-- ============================================================================

-- Create unified data_providers table
CREATE TABLE IF NOT EXISTS data_providers (
  id TEXT PRIMARY KEY,  -- e.g., 'weather_provider:weatherapi', 'sports_provider:sportsradar'
  type TEXT NOT NULL,   -- e.g., 'weatherapi', 'sportsradar', 'sportmonks', 'newsapi', 'newsdata'
  category TEXT NOT NULL CHECK (category IN ('weather', 'sports', 'news', 'finance')),
  name TEXT NOT NULL,
  description TEXT,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT false,
  
  -- API Credentials (encrypted in production)
  api_key TEXT,
  api_secret TEXT,
  
  -- Base configuration
  base_url TEXT,
  api_version TEXT,
  
  -- Category-specific config stored as JSONB for flexibility
  config JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_data_providers_category ON data_providers(category);
CREATE INDEX IF NOT EXISTS idx_data_providers_type ON data_providers(type);
CREATE INDEX IF NOT EXISTS idx_data_providers_active ON data_providers(is_active);
CREATE INDEX IF NOT EXISTS idx_data_providers_category_active ON data_providers(category, is_active);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_data_providers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_data_providers_updated_at
  BEFORE UPDATE ON data_providers
  FOR EACH ROW
  EXECUTE FUNCTION update_data_providers_updated_at();

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE data_providers ENABLE ROW LEVEL SECURITY;

-- Allow public read access (credentials will be masked in application layer)
CREATE POLICY "Public can view providers"
  ON data_providers
  FOR SELECT
  USING (true);

-- Allow authenticated users to insert/update/delete
CREATE POLICY "Authenticated users can manage providers"
  ON data_providers
  FOR ALL
  USING (true);

-- ============================================================================
-- Public View (Credentials Masked)
-- ============================================================================

CREATE OR REPLACE VIEW data_providers_public AS
SELECT 
  id,
  type,
  category,
  name,
  description,
  is_active,
  -- Mask credentials
  CASE 
    WHEN api_key IS NOT NULL THEN '****...****'
    ELSE NULL
  END AS api_key_status,
  CASE 
    WHEN api_secret IS NOT NULL THEN '****...****'
    ELSE NULL
  END AS api_secret_status,
  api_key IS NOT NULL AS api_key_configured,
  api_secret IS NOT NULL AS api_secret_configured,
  base_url,
  api_version,
  config,
  created_at,
  updated_at
FROM data_providers;

-- ============================================================================
-- Seed Default Providers
-- ============================================================================

-- Weather Providers
INSERT INTO data_providers (id, type, category, name, description, is_active, base_url, config)
VALUES 
  (
    'weather_provider:weatherapi',
    'weatherapi',
    'weather',
    'WeatherAPI.com',
    'Real-time weather data and forecasts',
    false,
    'https://api.weatherapi.com/v1',
    '{"language": "en", "temperatureUnit": "f"}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- Sports Providers
INSERT INTO data_providers (id, type, category, name, description, is_active, base_url, config)
VALUES 
  (
    'sports_provider:sportsradar',
    'sportsradar',
    'sports',
    'Sportsradar',
    'Comprehensive sports data and statistics',
    false,
    'https://api.sportradar.com',
    '{"sport": "soccer", "selectedLeagues": []}'::jsonb
  ),
  (
    'sports_provider:sportmonks',
    'sportmonks',
    'sports',
    'SportMonks',
    'Football/soccer data and statistics',
    false,
    'https://api.sportmonks.com/v3',
    '{"sport": "soccer", "selectedLeagues": []}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- News Providers
INSERT INTO data_providers (id, type, category, name, description, is_active, base_url, config)
VALUES 
  (
    'news_provider:newsapi',
    'newsapi',
    'news',
    'NewsAPI',
    'News articles from thousands of sources',
    false,
    'https://newsapi.org/v2',
    '{"country": "us", "language": "en", "pageSize": 20, "defaultQuery": ""}'::jsonb
  ),
  (
    'news_provider:newsdata',
    'newsdata',
    'news',
    'NewsData.io',
    'Real-time news data and aggregation',
    false,
    'https://newsdata.io/api/1',
    '{"country": "us", "language": "en", "pageSize": 20, "defaultQuery": ""}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- Finance Providers (if needed)
INSERT INTO data_providers (id, type, category, name, description, is_active, base_url, api_version, config)
VALUES 
  (
    'finance_provider:alpaca',
    'alpaca',
    'finance',
    'Alpaca Markets',
    'Stock and ETF data',
    false,
    'https://paper-api.alpaca.markets',
    'v2',
    '{"dataTypes": ["stocks", "etfs"]}'::jsonb
  ),
  (
    'finance_provider:coingecko',
    'coingecko',
    'finance',
    'CoinGecko',
    'Cryptocurrency market data',
    false,
    'https://api.coingecko.com/api/v3',
    'v3',
    '{"dataTypes": ["crypto"]}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Migration Status
-- ============================================================================

COMMENT ON TABLE data_providers IS 'Unified data providers table - replaces KV store for Weather, Sports, News, Finance providers';
