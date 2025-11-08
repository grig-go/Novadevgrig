-- Nova Dashboard - Initial Database Setup
-- Migration 001: Core tables and schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- KEY-VALUE STORE TABLE (Pre-existing)
-- ============================================================
CREATE TABLE IF NOT EXISTS kv_store_cbef71cf (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DATA FEEDS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS feeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('REST API', 'Database', 'File', 'Webhook')),
  category TEXT NOT NULL CHECK (category IN ('Elections', 'Finance', 'Sports', 'Weather', 'News')),
  active BOOLEAN DEFAULT true,
  configuration JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on category for faster filtering
CREATE INDEX IF NOT EXISTS idx_feeds_category ON feeds(category);
CREATE INDEX IF NOT EXISTS idx_feeds_type ON feeds(type);
CREATE INDEX IF NOT EXISTS idx_feeds_active ON feeds(active);

-- ============================================================
-- ALPACA STOCKS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS alpaca_stocks (
  symbol TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('EQUITY', 'ETF', 'INDEX', 'CRYPTO')),
  exchange TEXT,
  price DECIMAL(12, 4),
  change_1d DECIMAL(12, 4),
  change_1d_pct DECIMAL(8, 4),
  change_1w_pct DECIMAL(8, 4),
  change_1y_pct DECIMAL(8, 4),
  year_high DECIMAL(12, 4),
  year_low DECIMAL(12, 4),
  chart_1y JSONB,
  rating JSONB,
  custom_name TEXT,
  last_update TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_alpaca_stocks_type ON alpaca_stocks(type);
CREATE INDEX IF NOT EXISTS idx_alpaca_stocks_name ON alpaca_stocks(name);

-- ============================================================
-- FINANCE SECURITIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS finance_securities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unique_key TEXT UNIQUE NOT NULL,
  symbol TEXT,
  cg_id TEXT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('EQUITY', 'ETF', 'INDEX', 'CRYPTO')),
  exchange TEXT,
  snapshot JSONB NOT NULL,
  news JSONB,
  configuration JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_finance_securities_type ON finance_securities(type);
CREATE INDEX IF NOT EXISTS idx_finance_securities_symbol ON finance_securities(symbol);

-- ============================================================
-- SPORTS EVENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS sports_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  sport TEXT NOT NULL CHECK (sport IN ('NFL', 'NBA', 'MLB', 'NHL', 'NCAA', 'SOCCER', 'TENNIS', 'GOLF')),
  league TEXT,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('SCHEDULED', 'LIVE', 'FINAL', 'POSTPONED', 'CANCELLED')),
  start_time TIMESTAMPTZ,
  venue JSONB,
  teams JSONB,
  score JSONB,
  prediction JSONB,
  configuration JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sports_events_sport ON sports_events(sport);
CREATE INDEX IF NOT EXISTS idx_sports_events_status ON sports_events(status);
CREATE INDEX IF NOT EXISTS idx_sports_events_start_time ON sports_events(start_time);

-- ============================================================
-- WEATHER LOCATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS weather_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT UNIQUE NOT NULL,
  city TEXT NOT NULL,
  state TEXT,
  country TEXT NOT NULL,
  coordinates JSONB,
  current_weather JSONB NOT NULL,
  forecast JSONB,
  alerts JSONB,
  configuration JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_weather_locations_city ON weather_locations(city);
CREATE INDEX IF NOT EXISTS idx_weather_locations_state ON weather_locations(state);

-- ============================================================
-- NEWS ARTICLES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS news_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  source TEXT NOT NULL,
  author TEXT,
  url TEXT,
  image_url TEXT,
  published_at TIMESTAMPTZ,
  category TEXT CHECK (category IN ('Elections', 'Finance', 'Sports', 'Weather', 'General')),
  sentiment JSONB,
  entities JSONB,
  configuration JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_news_articles_category ON news_articles(category);
CREATE INDEX IF NOT EXISTS idx_news_articles_source ON news_articles(source);
CREATE INDEX IF NOT EXISTS idx_news_articles_published_at ON news_articles(published_at);

-- ============================================================
-- AGENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  agent_type TEXT NOT NULL CHECK (agent_type IN ('DATA_COLLECTOR', 'ANALYZER', 'PREDICTOR', 'NOTIFIER', 'CUSTOM')),
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'PAUSED', 'STOPPED', 'ERROR')) DEFAULT 'PAUSED',
  schedule TEXT,
  configuration JSONB NOT NULL,
  last_run TIMESTAMPTZ,
  next_run TIMESTAMPTZ,
  run_count INT DEFAULT 0,
  error_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_type ON agents(agent_type);

-- ============================================================
-- AGENT RUNS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('RUNNING', 'COMPLETED', 'FAILED')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INT,
  logs JSONB,
  error_message TEXT,
  results JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_agent_runs_agent_id ON agent_runs(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON agent_runs(status);
CREATE INDEX IF NOT EXISTS idx_agent_runs_started_at ON agent_runs(started_at);

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'EDITOR', 'VIEWER', 'ANALYST')) DEFAULT 'VIEWER',
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')) DEFAULT 'ACTIVE',
  groups TEXT[] DEFAULT '{}',
  permissions JSONB,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- ============================================================
-- GROUPS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB,
  member_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_feeds_updated_at BEFORE UPDATE ON feeds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alpaca_stocks_updated_at BEFORE UPDATE ON alpaca_stocks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_finance_securities_updated_at BEFORE UPDATE ON finance_securities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sports_events_updated_at BEFORE UPDATE ON sports_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weather_locations_updated_at BEFORE UPDATE ON weather_locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_news_articles_updated_at BEFORE UPDATE ON news_articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
-- Enable RLS on all tables
ALTER TABLE feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE alpaca_stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_securities ENABLE ROW LEVEL SECURITY;
ALTER TABLE sports_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for authenticated users - adjust based on your needs)
CREATE POLICY "Allow all for authenticated users" ON feeds FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON alpaca_stocks FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON finance_securities FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON sports_events FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON weather_locations FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON news_articles FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON agents FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON agent_runs FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON users FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON groups FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- COMMENTS
-- ============================================================
COMMENT ON TABLE feeds IS 'Data feed configurations for various data sources';
COMMENT ON TABLE alpaca_stocks IS 'Alpaca Markets stock data with real-time pricing';
COMMENT ON TABLE finance_securities IS 'Financial securities including stocks, ETFs, indices, and crypto';
COMMENT ON TABLE sports_events IS 'Sports events across multiple leagues';
COMMENT ON TABLE weather_locations IS 'Weather data for monitored locations';
COMMENT ON TABLE news_articles IS 'News articles aggregated from various sources';
COMMENT ON TABLE agents IS 'Agentic feed configurations and automation';
COMMENT ON TABLE agent_runs IS 'Historical log of agent execution runs';
COMMENT ON TABLE users IS 'Application users with roles and permissions';
COMMENT ON TABLE groups IS 'User groups for permission management';
