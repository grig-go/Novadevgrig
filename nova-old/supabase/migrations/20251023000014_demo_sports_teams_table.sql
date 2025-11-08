-- Migration 013: Sports Teams Table
-- Creates database table for sports teams (replacing KV store)

-- Drop table if exists (for re-running migration)
DROP TABLE IF EXISTS sports_teams CASCADE;

-- Create sports_teams table
CREATE TABLE sports_teams (
  id TEXT PRIMARY KEY,                          -- Team ID (e.g., "sm_123" or "sr:team:456")
  league_id BIGINT NOT NULL,                    -- Reference to sports_leagues.id (BIGINT)
  name TEXT NOT NULL,                           -- Full team name
  short_name TEXT,                              -- Short name
  abbreviation TEXT,                            -- Team abbreviation (3-4 letters)
  logo_url TEXT,                                -- Team logo URL
  venue TEXT,                                   -- Home venue/stadium
  city TEXT,                                    -- City
  country TEXT,                                 -- Country
  founded INTEGER,                              -- Year founded
  sport TEXT NOT NULL,                          -- Sport type (Football, Basketball, etc.)
  season_id TEXT,                               -- Current/active season ID
  provider_type TEXT NOT NULL,                  -- Provider (sportmonks, sportsradar)
  colors JSONB DEFAULT '{}'::jsonb,             -- Team colors {primary, secondary, text}
  statistics JSONB DEFAULT '{}'::jsonb,         -- Team stats (flexible)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Foreign key to sports_leagues
  CONSTRAINT fk_league
    FOREIGN KEY (league_id)
    REFERENCES sports_leagues(id)
    ON DELETE CASCADE,
    
  -- Unique constraint on team ID (prevent duplicates)
  CONSTRAINT unique_team_id UNIQUE (id)
);

-- Create indexes for common queries
CREATE INDEX idx_sports_teams_league_id ON sports_teams(league_id);
CREATE INDEX idx_sports_teams_provider ON sports_teams(provider_type);
CREATE INDEX idx_sports_teams_sport ON sports_teams(sport);
CREATE INDEX idx_sports_teams_name ON sports_teams(name);

-- Enable RLS
ALTER TABLE sports_teams ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for now - same as other tables)
CREATE POLICY "Allow public read access to sports_teams"
  ON sports_teams FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to sports_teams"
  ON sports_teams FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to sports_teams"
  ON sports_teams FOR UPDATE
  USING (true);

CREATE POLICY "Allow public delete access to sports_teams"
  ON sports_teams FOR DELETE
  USING (true);

-- Add helpful comment
COMMENT ON TABLE sports_teams IS 'Sports teams data (migrated from KV store sports_team:*)';
COMMENT ON COLUMN sports_teams.id IS 'Provider-specific team ID (e.g., sm_123 for SportMonks, sr:team:456 for Sportsradar)';
COMMENT ON COLUMN sports_teams.league_id IS 'References sports_leagues.id (BIGINT) - CASCADE DELETE when league removed';
COMMENT ON COLUMN sports_teams.colors IS 'Team colors in format: {primary: "#hex", secondary: "#hex", text: "#hex"}';
COMMENT ON COLUMN sports_teams.statistics IS 'Flexible JSONB for provider-specific stats';
