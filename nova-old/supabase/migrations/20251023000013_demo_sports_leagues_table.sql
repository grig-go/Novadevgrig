-- Migration 014: Sports Leagues Table
-- Creates database table for sports leagues/competitions

-- Drop table if exists (for re-running migration)
DROP TABLE IF EXISTS sports_leagues CASCADE;

-- Create sports_leagues table (matching actual Supabase schema)
CREATE TABLE sports_leagues (
  id BIGINT PRIMARY KEY,                        -- League/competition ID from provider
  name TEXT NOT NULL,                           -- Full league name
  type TEXT,                                    -- League type/abbreviation (e.g., "league", "cup")
  sport TEXT NOT NULL,                          -- Sport type (football, basketball, etc.)
  api_source TEXT NOT NULL,                     -- Provider (sportmonks, sportsradar, etc.)
  logo TEXT,                                    -- League logo URL
  country_name TEXT,                            -- Country name
  season_id BIGINT,                             -- Current season ID
  active_season_id BIGINT,                      -- Active season ID (SportMonks specific)
  active_season_name TEXT,                      -- Season name (e.g., "2023/2024")
  active BOOLEAN DEFAULT true,                  -- Is league active
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_sports_leagues_sport ON sports_leagues(sport);
CREATE INDEX idx_sports_leagues_api_source ON sports_leagues(api_source);
CREATE INDEX idx_sports_leagues_active ON sports_leagues(active);
CREATE INDEX idx_sports_leagues_season ON sports_leagues(season_id);
CREATE INDEX idx_sports_leagues_active_season ON sports_leagues(active_season_id);

-- Enable RLS
ALTER TABLE sports_leagues ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for public access (since this is for sports data)
CREATE POLICY "Allow public read access to sports_leagues"
  ON sports_leagues FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to sports_leagues"
  ON sports_leagues FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to sports_leagues"
  ON sports_leagues FOR UPDATE
  USING (true);

CREATE POLICY "Allow public delete access to sports_leagues"
  ON sports_leagues FOR DELETE
  USING (true);

-- Add updated_at trigger
CREATE TRIGGER update_sports_leagues_updated_at 
  BEFORE UPDATE ON sports_leagues
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Add helpful comments
COMMENT ON TABLE sports_leagues IS 'Sports leagues and competitions from various providers';
COMMENT ON COLUMN sports_leagues.id IS 'Provider-specific league ID (e.g., 8 for Premier League in SportMonks)';
COMMENT ON COLUMN sports_leagues.type IS 'League type or abbreviation (e.g., "league", "cup")';
COMMENT ON COLUMN sports_leagues.season_id IS 'Current season ID (e.g., 130281)';
COMMENT ON COLUMN sports_leagues.active_season_id IS 'Active season ID from SportMonks (e.g., 21646)';
COMMENT ON COLUMN sports_leagues.active_season_name IS 'Active season display name (e.g., "2023/2024")';
COMMENT ON COLUMN sports_leagues.api_source IS 'Data provider (sportmonks, sportsradar, etc.)';
COMMENT ON COLUMN sports_leagues.active IS 'Whether this league is currently active';
